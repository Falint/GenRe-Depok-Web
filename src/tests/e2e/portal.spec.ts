import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email resmi').fill('pengurus@example.org');
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
  await expect(page.getByRole('alert').filter({ hasText: 'Masukkan email resmi' })).toBeVisible();
  await page.getByLabel('Email resmi').fill('pengurus@example.org');
  await page.getByLabel('Kata sandi', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Masuk ke portal' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Login gagal' })).toBeVisible();
  await page.getByLabel('Email resmi').fill('pengurus@example.org');
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
  await page.getByLabel('Nomor Rekening').fill('12345');
  await page.getByRole('button', { name: 'Kirim Klaim Reimburse' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/administrasi');
  await page.getByRole('button', { name: 'Reimburse (' }).click();
  await expect(page.getByRole('heading', { name: 'Proker Uji' })).toBeVisible();
  await page.getByRole('button', { name: 'Verifikasi & Cairkan Kas' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Pencairan memerlukan migrasi database transaksi' }),
  ).toBeVisible();
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
  await page.getByRole('button', { name: 'Kirim Tiket Request' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tiket Uji' })).toBeVisible();
  await page.getByRole('button', { name: '+ Berikan Tanggapan' }).click();
  await page.getByPlaceholder('Ketik tanggapan').fill('Materi tersedia di sekretariat');
  await page.getByRole('button', { name: 'Kirim', exact: true }).click();
  await expect(page.getByText('Materi tersedia di sekretariat', { exact: false })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Request Info (' }).click();
  await expect(page.getByText('Selesai', { exact: true })).toBeVisible();
});
