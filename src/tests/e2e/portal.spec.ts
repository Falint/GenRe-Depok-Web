import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('pengurus@example.org');
  await page.getByLabel('Kata sandi', { exact: true }).fill('valid-password');
  await page.getByRole('button', { name: 'Masuk ke portal' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Halo, Pengurus Uji!' })).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await request.get('http://127.0.0.1:54328/__test/reset');
});
test('protected routes redirect; login validates; missing URL returns 404', async ({ page }) => {
  await page.goto('/administrasi?from=link');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.getByRole('button', { name: 'Masuk ke portal' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Masukkan email' })).toBeVisible();
  await page.getByLabel('Email').fill('pengurus@example.org');
  await page.getByLabel('Kata sandi', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Masuk ke portal' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Login gagal' })).toBeVisible();
  await page.getByLabel('Email').fill('pengurus@example.org');
  await page.getByLabel('Kata sandi', { exact: true }).fill('valid-password');
  await page.getByRole('button', { name: 'Masuk ke portal' }).click();
  await expect(page).toHaveURL(/\/administrasi\?from=link$/);
  const response = await page.goto('/missing-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
});
test('login, route navigation, reload, back, and logout preserve expected behavior', async ({
  page,
  isMobile,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const calendar = page.getByRole('region', { name: 'Kalender kegiatan' });
  const calendarMonth = await calendar.locator('[aria-live=polite]').innerText();
  await calendar.getByRole('button', { name: 'Bulan berikutnya' }).click();
  await expect(calendar.locator('[aria-live=polite]')).not.toHaveText(calendarMonth);
  await calendar.getByRole('button', { name: 'Bulan sebelumnya' }).click();
  await expect(calendar.locator('[aria-live=polite]')).toHaveText(calendarMonth);
  const firstDay = calendar.getByRole('button', { name: /^1 .*agenda$/ });
  await firstDay.click();
  await expect(firstDay).toHaveAttribute('aria-pressed', 'true');
  await calendar.getByRole('button', { name: 'Seluruh bulan' }).click();
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
  const nav = page.getByRole('navigation', {
    name: isMobile ? 'Navigasi mobile' : 'Navigasi utama',
    exact: true,
  });
  const destinations = [
    { name: isMobile ? 'Profil' : 'Profil Organisasi', path: 'profil' },
    { name: isMobile ? 'Struktur' : 'Struktur & 32 Jobdesc', path: 'struktur' },
    { name: isMobile ? 'Kas & Surat' : 'Administrasi & Keuangan', path: 'administrasi' },
    { name: isMobile ? 'Komunikasi' : 'Komunikasi & Tiket Info', path: 'komunikasi' },
    { name: isMobile ? 'Media' : 'Pusat Sumber Daya', path: 'media' },
  ];
  for (const item of destinations) {
    await nav.getByRole('link', { name: item.name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${item.path}$`));
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.reload();
  await expect(page.locator('main h1')).toContainText('Pusat Sumber Daya');
  await page.goBack();
  await expect(page).toHaveURL(/\/komunikasi$/);
  await page.getByRole('button', { name: 'Keluar dari portal' }).click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  expect(errors).toEqual([]);
});
test('surat form, keyboard dialog, attendance persistence and empty ticket state', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('button', { name: 'Konfirmasi Hadir / Mengerti' }).click();
  await expect(page.getByRole('button', { name: 'Sudah Konfirmasi Hadir' })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sudah Konfirmasi Hadir' })).toBeDisabled();
  await page.getByRole('button', { name: '+ Request Surat' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: '+ Request Surat' })).toBeFocused();
  await page.getByRole('button', { name: '+ Request Surat' }).click();
  await page.getByLabel('Perihal / Pokok Surat').fill('Permohonan Aula Uji');
  await page.getByLabel('Tujuan / Pihak yang Dituju').fill('Sekolah');
  await page.getByRole('button', { name: 'Kirim Pengajuan' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('status')).toContainText('Draf surat berhasil diajukan');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/administrasi');
  await expect(page.getByRole('heading', { name: 'Permohonan Aula Uji' })).toBeVisible();
  await page.getByRole('heading', { name: 'Permohonan Aula Uji' }).click();
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'Setujui Surat' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'migrasi database transaksi' }),
  ).toBeVisible();
});
test('staff cannot open administration; data failures show retry state', async ({
  page,
  request,
}) => {
  await request.get('http://127.0.0.1:54328/__test/reset?level=staff');
  await login(page);
  await expect(page.getByRole('link', { name: 'Administrasi & Keuangan' })).toHaveCount(0);
  await page.goto('/administrasi');
  await expect(page).toHaveURL(/\/dashboard$/);
  await request.get('http://127.0.0.1:54328/__test/reset?level=staff&fail=true');
  await page.reload();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Data portal tidak dapat dimuat' }),
  ).toBeVisible();
  await request.get('http://127.0.0.1:54328/__test/reset?level=staff');
  await page.getByRole('button', { name: 'Muat ulang data' }).click();
  await expect(page.getByRole('heading', { name: 'Rapat Uji' })).toBeVisible();
});

test('reimburse, cash, broadcast and ticket forms persist through server operations', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('button', { name: '+ Request Reimburse' }).click();
  await page.getByLabel('Nama Program Kerja / Kegiatan').fill('Proker Uji');
  await page.getByLabel('Nominal Pengeluaran').fill('25000');
  await page
    .getByLabel('Pos anggaran tahun berjalan')
    .selectOption({ label: `Operasional (${new Date().getFullYear()})` });
  await page.getByLabel('Nomor Rekening').fill('12345');
  await page.getByRole('button', { name: 'Kirim Klaim Reimburse' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/administrasi');
  await page.getByRole('button', { name: 'Reimburse (' }).click();
  await expect(page.getByRole('heading', { name: 'Proker Uji' })).toBeVisible();
  await expect(page.getByText('Bukti belum tersedia', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Verifikasi & Cairkan Kas' }).click();
  await expect(page.getByText('Selesai / Dicairkan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Buku Kas' }).click();
  await page.getByRole('button', { name: 'Mutasi Baru' }).click();
  await page.getByLabel('Nominal Rupiah').fill('100000');
  await page.getByLabel('Uraian / Keterangan Transaksi').fill('Iuran uji');
  await page.getByRole('button', { name: 'Simpan Mutasi Pemasukan' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('Iuran uji', { exact: true })).toBeVisible();
  await page.goto('/komunikasi');
  await page.getByRole('button', { name: 'Siarkan Pengumuman Baru' }).click();
  await page.getByPlaceholder('Judul Pengumuman').fill('Siaran Uji');
  await page.getByPlaceholder('Isi instruksi').fill('Agenda baru');
  await page.getByRole('button', { name: 'Kirim Broadcast' }).click();
  await expect(page.getByRole('heading', { name: 'Siaran Uji' })).toBeVisible();
  await page.getByRole('button', { name: 'Request Info (' }).click();
  await expect(page.getByText('Belum ada tiket informasi.')).toBeVisible();
  await page.getByRole('button', { name: 'Buka Tiket Permintaan' }).click();
  await page.getByLabel('Judul Permintaan Informasi').fill('Tiket Uji');
  await page.getByLabel('Rincian Data / Informasi').fill('Minta materi');
  await page.getByLabel('Tenggat Waktu Dibutuhkan (WIB, opsional)').fill('2099-01-01T10:00');
  await page.getByRole('button', { name: 'Kirim Tiket Request' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tiket Uji' })).toBeVisible();
  await expect(page.getByText('Deadline: 1 Jan 2099, 10.00 WIB', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '+ Berikan Tanggapan' }).click();
  await page.getByPlaceholder('Ketik tanggapan').fill('Materi tersedia di sekretariat');
  await page.getByRole('button', { name: 'Kirim', exact: true }).click();
  await expect(page.getByText('Materi tersedia di sekretariat', { exact: false })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Request Info (' }).click();
  await expect(page.getByText('Selesai', { exact: true })).toBeVisible();
});

test('Drive receipt link validates, persists after reload and opens in a new tab', async ({
  page,
  context,
}) => {
  const link = 'https://drive.google.com/file/d/receipt_123-abc/view?usp=sharing&resourcekey=key';
  await context.route('https://drive.google.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Bukti uji</h1>' }),
  );
  await login(page);
  await page.getByRole('button', { name: '+ Request Reimburse' }).click();
  await page.getByLabel('Nama Program Kerja / Kegiatan').fill('Proker dengan bukti');
  await page.getByLabel('Nominal Pengeluaran').fill('25000');
  await page
    .getByLabel('Pos anggaran tahun berjalan')
    .selectOption({ label: `Operasional (${new Date().getFullYear()})` });
  await page.getByLabel('Nomor Rekening').fill('12345');
  const folderPopup = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Buka folder upload' }).click();
  const folder = await folderPopup;
  await expect(folder).toHaveURL(
    'https://drive.google.com/drive/folders/1dwPzew_4AiO-Tfy_AeEgM-BMlWWU4vOb?usp=sharing',
  );
  await folder.close();
  await expect(page.getByLabel('Nama Program Kerja / Kegiatan')).toHaveValue('Proker dengan bukti');
  const proof = page.getByLabel('Link bukti Google Drive');
  await proof.fill('https://drive.google.com/drive/folders/folder_123');
  await page.getByRole('button', { name: 'Kirim Klaim Reimburse' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'bukan link folder' })).toBeVisible();
  await expect(proof).toHaveAttribute('aria-invalid', 'true');
  await proof.fill(link);
  await page.getByRole('button', { name: 'Kirim Klaim Reimburse' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/administrasi');
  await page.reload();
  await page.getByRole('button', { name: 'Reimburse (' }).click();
  await expect(page.getByRole('heading', { name: 'Proker dengan bukti' })).toBeVisible();
  const receipt = page.getByRole('link', { name: 'Lihat bukti' });
  await expect(receipt).toHaveAttribute('href', link);
  await expect(receipt).toHaveAttribute('target', '_blank');
  await expect(receipt).toHaveAttribute('rel', 'noopener noreferrer');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const popupPromise = page.waitForEvent('popup');
  await receipt.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(link);
  await expect(popup.getByRole('heading', { name: 'Bukti uji' })).toBeVisible();
  await popup.close();
});

test('staff can open secretary templates and use the PRIMERA brand kit', async ({
  page,
  context,
  request,
}, testInfo) => {
  await request.get('http://127.0.0.1:54328/__test/reset?level=staff');
  await context.route('https://docs.google.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Template uji</h1>' }),
  );
  await page.goto('/login');
  await expect(
    page.getByRole('heading', { name: 'Forum GenRe Kota Depok', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Kabinet PRIMERA · 2026–2028')).toBeVisible();
  await expect(page.getByText('#EraBaruLebihSeru', { exact: true })).toBeVisible();
  const logo = page.getByRole('img', { name: 'Logo PRIMERA', exact: true });
  await expect(logo).toHaveAttribute('src', /logo-primera\.jpeg/);
  await expect
    .poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('primera-login.png'), fullPage: true });
  await login(page);
  await expect(page.getByText('Masa Bakti 2026–2028')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('primera-dashboard.png'), fullPage: true });
  await page.goto('/media');
  await expect(page).toHaveTitle('Pusat Sumber Daya | Forum GenRe Kota Depok');
  await page.getByRole('button', { name: 'Template Sekretariat', exact: true }).click();
  const templates = [
    ['Notulensi', '14PpPOD7p1jKr5b5wnxbnRbGINcqeuuR2Nm3WhdNm3FE'],
    ['MOU', '1dloC1Me-inrEvHhLf5OoZERjGb1gGnSkaoX3tSuUnSo'],
    ['Surat Dispensasi', '1yMm27xaol27tEkBI-Da7NQkHGo7s3iPg'],
    ['Surat Undangan', '1QxxmqhblQLQIrGTaOZXBrE3YsPcJM8c7Vj3I2lMR8vE'],
  ];
  for (const [name, id] of templates) {
    const link = page.getByRole('link', { name: `Buka template ${name} (tab baru)`, exact: true });
    const url = `https://docs.google.com/document/d/${id}/edit?usp=sharing`;
    await expect(link).toHaveAttribute('href', url);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await link.focus();
    await expect(link).toBeFocused();
    const opened = page.waitForEvent('popup');
    await page.keyboard.press('Enter');
    const popup = await opened;
    await expect(popup).toHaveURL(url);
    await expect(popup.getByRole('heading', { name: 'Template uji' })).toBeVisible();
    await popup.close();
  }
  await page.screenshot({ path: testInfo.outputPath('secretary-templates.png'), fullPage: true });
  await page.getByRole('button', { name: 'Bank Aset & Brand Kit' }).click();
  await expect(page.getByRole('heading', { name: 'Kabinet PRIMERA · PRIME ERA' })).toBeVisible();
  const palette = page.getByRole('region', { name: 'Palet PRIMERA', exact: true });
  for (const hex of ['#172E49', '#C5A15B', '#F4F1E9', '#4C8290']) {
    await expect(palette.getByText(hex, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('region', { name: 'Palet GenRe', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Buka brand guideline' })).toHaveAttribute(
    'href',
    'https://drive.google.com/file/d/1Ixw95Z38p_ydEJvxElf_0maMmJpyua20/view?usp=sharing',
  );
  const downloaded = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Unduh logo PRIMERA' }).click();
  expect((await downloaded).suggestedFilename()).toBe('logo-primera.jpeg');
  await page.screenshot({ path: testInfo.outputPath('primera-brand-kit.png'), fullPage: true });
  for (const width of [320, 640, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto('/profil');
  for (const value of ['Partnership', 'Respect', 'Inclusivity', 'Movement', 'Empowerment']) {
    await expect(page.getByRole('listitem').filter({ hasText: value })).toBeVisible();
  }
  await page.goto('/struktur');
  await expect(page.getByText('Masa Bakti 2026–2028')).toBeVisible();
});

test('panitia requester, target Kadiv and assigned staff have separate actions and views', async ({
  page,
  request,
}, testInfo) => {
  await request.get(
    'http://127.0.0.1:54328/__test/reset?level=kadiv&field=eksternal&division=reguler',
  );
  await login(page);
  await page.goto('/komunikasi');
  await page.getByRole('button', { name: 'Kebutuhan Panitia', exact: true }).click();
  await page.getByRole('button', { name: 'Ajukan Kebutuhan Panitia', exact: true }).click();
  await page.getByLabel('Judul kebutuhan').fill('Dokumentasi Roadshow');
  await page.getByLabel('Divisi tujuan').selectOption('design');
  await page.getByLabel('Jumlah panitia').fill('2');
  await page.getByLabel('Rincian tugas').fill('Bantu dokumentasi dan materi publikasi');
  await page.getByLabel('Deadline respons (WIB)').fill('2099-01-01T10:00');
  await page.getByLabel('Mulai penugasan (WIB)').fill('2099-01-02T10:00');
  await page.getByLabel('Selesai penugasan (WIB)').fill('2099-01-02T16:00');
  await page.getByRole('button', { name: 'Kirim Pengajuan', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dokumentasi Roadshow' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Proses Permintaan' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Atur Panitia', exact: true })).toHaveCount(0);
  await request.get(
    'http://127.0.0.1:54328/__test/actor?id=2&level=kadiv&field=branding&division=design',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Kebutuhan Panitia', exact: true }).click();
  await page.getByRole('button', { name: 'Proses Permintaan', exact: true }).click();
  await page.getByRole('button', { name: 'Setujui', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Atur Panitia', exact: true }).click();
  await page.getByLabel('Anggota Desain A', { exact: true }).check();
  await page.getByLabel('Alasan / catatan').fill('Penugasan tahap pertama');
  await page.getByRole('button', { name: 'Simpan Penugasan', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('Terisi sebagian', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Atur Panitia', exact: true }).click();
  await page.getByLabel('Anggota Desain B', { exact: true }).check();
  await page.getByLabel('Alasan / catatan').fill('Dua anggota siap');
  await page.getByRole('button', { name: 'Simpan Penugasan', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('Panitia lengkap', { exact: true })).toBeVisible();
  await request.get('http://127.0.0.1:54328/__test/place-member?id=3&division=video');
  await page.reload();
  await page.getByRole('button', { name: 'Kebutuhan Panitia', exact: true }).click();
  await page.getByRole('button', { name: 'Atur Panitia', exact: true }).click();
  const movedMember = page.getByRole('checkbox', { name: /Anggota Desain A/ });
  await expect(page.getByText('Sudah pindah divisi/peran. Lepaskan penugasan ini.')).toBeVisible();
  await movedMember.uncheck();
  await expect(movedMember).toBeDisabled();
  await page.getByLabel('Alasan / catatan').fill('Anggota pindah divisi');
  await page.getByRole('button', { name: 'Simpan Penugasan', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('Terisi sebagian', { exact: true })).toBeVisible();
  await request.get('http://127.0.0.1:54328/__test/place-member?id=3&division=design');
  await page.reload();
  await page.getByRole('button', { name: 'Kebutuhan Panitia', exact: true }).click();
  await page.getByRole('button', { name: 'Atur Panitia', exact: true }).click();
  await page.getByLabel('Anggota Desain A', { exact: true }).check();
  await page.getByLabel('Alasan / catatan').fill('Anggota kembali tersedia');
  await page.getByRole('button', { name: 'Simpan Penugasan', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('panitia-target.png'), fullPage: true });
  await request.get(
    'http://127.0.0.1:54328/__test/actor?id=1&level=kadiv&field=eksternal&division=reguler',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Kebutuhan Panitia', exact: true }).click();
  await expect(
    page.getByText('Panitia: Anggota Desain A, Anggota Desain B', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Atur Panitia', exact: true })).toHaveCount(0);
  await request.get(
    'http://127.0.0.1:54328/__test/actor?id=3&level=staff&field=branding&division=design',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Kebutuhan Panitia', exact: true }).click();
  await expect(
    page.getByText('Panitia (penugasan Anda): Anggota Desain A', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Anggota Desain B', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Riwayat perubahan', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Ajukan Kebutuhan Panitia', exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Branding manages scheduled announcements, cancellation and media archives; other kabid cannot', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await request.get(
    'http://127.0.0.1:54328/__test/reset?level=staff&field=branding&division=design',
  );
  await login(page);
  await page.goto('/komunikasi');
  await page.getByRole('button', { name: 'Siarkan Pengumuman Baru' }).click();
  await page.getByPlaceholder('Judul Pengumuman').fill('Kegiatan Terjadwal');
  await page.getByPlaceholder('Isi instruksi').fill('Agenda dengan jadwal WIB');
  await page.getByLabel('Deadline konfirmasi (WIB)').fill('2099-01-01T10:00');
  await page.getByLabel('Mulai kegiatan (WIB)').fill('2099-01-02T10:00');
  await page.getByLabel('Selesai kegiatan (WIB)').fill('2099-01-02T16:00');
  await page.getByRole('button', { name: 'Kirim Broadcast' }).click();
  const card = page
    .getByRole('heading', { name: 'Kegiatan Terjadwal' })
    .locator('..')
    .locator('..')
    .locator('..');
  await expect(card).toContainText('2 Jan 2099');
  await card.getByRole('button', { name: 'Ubah Pengumuman' }).click();
  await page
    .getByRole('dialog')
    .getByRole('textbox', { name: 'Isi', exact: true })
    .fill('Jadwal diperbarui');
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(card).toContainText('Jadwal diperbarui');
  await card.getByRole('button', { name: 'Batalkan Kegiatan' }).click();
  await page.getByLabel('Alasan pembatalan').fill('Lokasi tidak tersedia');
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(card.getByRole('button', { name: 'Konfirmasi Ditutup' })).toBeDisabled();
  await expect(card).toContainText('Dibatalkan · Lokasi tidak tersedia');
  await page.goto('/media');
  await page.getByRole('button', { name: 'Tambah Media', exact: true }).click();
  await page.getByLabel('Judul media').fill('Modul Pelatihan Uji');
  await page.getByLabel('Deskripsi media').fill('Materi fasilitator baru');
  await page
    .getByLabel('Link file Google Drive')
    .fill('https://drive.google.com/drive/folders/abc');
  await page.getByRole('button', { name: 'Simpan Media', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Data tidak valid' })).toBeVisible();
  await page
    .getByLabel('Link file Google Drive')
    .fill('https://drive.google.com/file/d/modul_test/view');
  await page.getByRole('button', { name: 'Simpan Media', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  let mediaCard = page.getByRole('article').filter({ hasText: 'Modul Pelatihan Uji' });
  await expect(mediaCard.getByRole('link', { name: 'Buka File' })).toHaveAttribute(
    'href',
    'https://drive.google.com/file/d/modul_test/view',
  );
  await mediaCard.getByRole('button', { name: 'Arsipkan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Modul Pelatihan Uji' })).toHaveCount(0);
  await page.getByLabel('Tampilkan arsip').check();
  mediaCard = page.getByRole('article').filter({ hasText: 'Modul Pelatihan Uji' });
  await mediaCard.getByRole('button', { name: 'Pulihkan', exact: true }).click();
  await page.getByLabel('Tampilkan arsip').uncheck();
  await expect(page.getByRole('heading', { name: 'Modul Pelatihan Uji' })).toBeVisible();
  await request.get('http://127.0.0.1:54328/__test/actor?id=1&level=kabid&field=internal');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Tambah Media', exact: true })).toHaveCount(0);
  await page.goto('/komunikasi');
  await expect(page.getByRole('button', { name: 'Siarkan Pengumuman Baru' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('new feature read failures do not prevent existing portal actions', async ({
  page,
  request,
}) => {
  await request.get('http://127.0.0.1:54328/__test/reset?features=fail');
  await login(page);
  await expect(page.getByRole('heading', { name: 'Rapat Uji' })).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Jadwal panitia belum dapat dimuat' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Konfirmasi Hadir / Mengerti' }).click();
  await expect(page.getByRole('button', { name: 'Sudah Konfirmasi Hadir' })).toBeDisabled();
  await page.goto('/media');
  await page.getByRole('button', { name: 'Template Sekretariat', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Buka template Notulensi (tab baru)', exact: true }),
  ).toBeVisible();
});

test('personal reimburse retries a lost response once and cancellation stays private', async ({
  page,
  request,
}) => {
  await request.get('http://127.0.0.1:54328/__test/actor?id=1&level=staff');
  await login(page);
  const personal = page.getByRole('region', { name: 'Reimburse Saya' });
  // The local fixture has no Realtime websocket; refresh clears its connection warning.
  await personal.getByRole('button', { name: 'Refresh reimburse' }).click();
  await expect(personal.getByText('Belum ada klaim reimburse.')).toBeVisible();
  await page.getByRole('button', { name: '+ Request Reimburse' }).click();
  await page.getByLabel('Nama Program Kerja / Kegiatan').fill('Klaim retry pribadi');
  await page.getByLabel('Nominal Pengeluaran').fill('25000');
  await page.getByLabel('Nomor Rekening').fill('12345');
  await page.getByLabel('Pos anggaran tahun berjalan').selectOption({ index: 1 });
  await request.get('http://127.0.0.1:54328/__test/lose-creation-response');
  await page.getByRole('button', { name: 'Kirim Klaim Reimburse' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Perubahan gagal disimpan',
  );
  await page.getByRole('button', { name: 'Kirim Klaim Reimburse' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await (await request.get('http://127.0.0.1:54328/__test/finance-counts')).json()).toEqual({
    claims: 1,
    cash: 0,
  });
  await expect(personal.getByRole('heading', { name: 'Klaim retry pribadi' })).toBeVisible();
  await personal.getByRole('button', { name: 'Batalkan klaim' }).click();
  await personal.getByLabel('Alasan pembatalan').fill('Kegiatan dibatalkan');
  await personal.getByRole('button', { name: 'Simpan keputusan' }).click();
  await expect(personal.getByText('Dibatalkan', { exact: true })).toBeVisible();
  await expect(personal.getByText(/Kegiatan dibatalkan/)).toBeVisible();
  await request.get('http://127.0.0.1:54328/__test/actor?id=2&level=kadiv');
  await page.reload();
  await personal.getByRole('button', { name: 'Refresh reimburse' }).click();
  await expect(personal.getByText('Belum ada klaim reimburse.')).toBeVisible();
  await expect(personal.getByText('Klaim retry pribadi')).toHaveCount(0);
});

test('cash retry keeps one ledger entry and budget requires a pos for outgoing cash', async ({
  page,
  request,
}) => {
  await login(page);
  await page.goto('/administrasi');
  await page.getByRole('button', { name: 'Buku Kas' }).click();
  await page.getByRole('button', { name: 'Mutasi Baru' }).click();
  await page.getByLabel('Nominal Rupiah').fill('100000');
  await page.getByLabel('Uraian / Keterangan Transaksi').fill('Kas retry');
  await request.get('http://127.0.0.1:54328/__test/lose-creation-response');
  await page.getByRole('button', { name: 'Simpan Mutasi Pemasukan' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Perubahan gagal disimpan',
  );
  await page.getByRole('button', { name: 'Simpan Mutasi Pemasukan' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await (await request.get('http://127.0.0.1:54328/__test/finance-counts')).json()).toEqual({
    claims: 0,
    cash: 1,
  });
  await page.getByRole('button', { name: 'Mutasi Baru' }).click();
  await page.getByRole('button', { name: '- Pengeluaran (Kas Keluar)' }).click();
  await page.getByLabel('Nominal Rupiah').fill('5000');
  await page.getByLabel('Uraian / Keterangan Transaksi').fill('Kas keluar');
  await page.getByRole('button', { name: 'Simpan Mutasi Pengeluaran' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Pos anggaran tahun berjalan').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Simpan Mutasi Pengeluaran' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/dashboard');
  await expect(page.getByText('Realisasi: Rp 5.000')).toBeVisible();
  await expect(page.getByText('Historis terpisah: Rp 7.000 (belum direkonsiliasi)')).toBeVisible();
});
