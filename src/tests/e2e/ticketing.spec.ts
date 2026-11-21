import { test, expect, type Page } from '@playwright/test';

const fixture = 'http://127.0.0.1:54328';
const eventId = '00000000-0000-4000-8000-000000000360';
async function register(page: Page, nama: string) {
  await page.goto(`/publik/agenda/${eventId}`);
  await page.getByLabel('Nama lengkap').fill(nama);
  await page.getByLabel('Instansi', { exact: true }).fill('SMA Negeri 1 Depok');
  await page.getByLabel('Unsur', { exact: true }).fill('PIK-R');
  await page.getByRole('button', { name: 'Daftar kegiatan', exact: true }).click();
}
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('pengurus@example.org');
  await page.getByLabel('Kata sandi', { exact: true }).fill('valid-password');
  await page.getByRole('button', { name: 'Masuk ke portal' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
test.beforeEach(async ({ request }) => {
  await request.get(`${fixture}/__test/reset`);
  await request.get(`${fixture}/__test/public-content`);
});

test('public registration explains writing, issues proof, rejects duplicates and keeps names private', async ({
  page,
}, testInfo) => {
  await page.goto(`/publik/agenda/${eventId}`);
  await expect(
    page.getByText('Gunakan huruf kapital pada awal setiap unsur nama.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByText('Contoh: SMA Negeri 1 Depok.', { exact: false })).toBeVisible();
  await register(page, 'Raka   Mahendra');
  const receipt = page.getByRole('region', { name: 'Bukti pendaftaran' });
  await expect(receipt).toContainText('Pendaftaran berhasil');
  await expect(receipt).toContainText('Raka Mahendra');
  await expect(receipt).toContainText(/Kode bukti: [a-f0-9-]{36}/);
  await expect(receipt.getByRole('button', { name: 'Salin bukti' })).toBeVisible();
  await expect(receipt.getByRole('button', { name: 'Cetak bukti' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('registration-receipt.png'), fullPage: true });
  await register(page, 'raka mahendra');
  await expect(page.locator('main').getByRole('alert')).toContainText('sudah terdaftar');
  await page.reload();
  await expect(page.locator('main')).not.toContainText('Raka Mahendra');
  await page.goto('/publik/agenda/00000000-0000-4000-8000-000000000361');
  await expect(page.getByRole('button', { name: 'Daftar kegiatan', exact: true })).toHaveCount(0);
});

test('managers close registration and select participants for immutable letter preview and PDF', async ({
  page,
  browser,
}, testInfo) => {
  await register(page, 'Andi Pratama');
  await expect(page.getByRole('heading', { name: 'Pendaftaran berhasil' })).toBeVisible();
  await register(page, 'Budi Santoso');
  await expect(page.getByRole('heading', { name: 'Pendaftaran berhasil' })).toBeVisible();
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  try {
    await login(page);
    await page.goto('/konten-publik?page=2');
    await page.getByRole('button', { name: 'Peserta Agenda mendatang', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Andi Pratama');
    await expect(page.getByRole('dialog')).toContainText('Budi Santoso');
    await page.getByRole('button', { name: 'Tutup', exact: true }).click();
    await page.getByRole('button', { name: 'Edit Agenda mendatang', exact: true }).click();
    // Open the guest form after management UI compilation so dev Fast Refresh cannot erase it.
    await guest.goto(`/publik/agenda/${eventId}`);
    await guest.getByLabel('Nama lengkap').fill('Citra Lestari');
    await guest.getByLabel('Instansi', { exact: true }).fill('Umum');
    await guest.getByLabel('Unsur', { exact: true }).fill('Masyarakat');
    await page.getByLabel('Buka pendaftaran kegiatan').uncheck();
    await page.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await guest.getByRole('button', { name: 'Daftar kegiatan', exact: true }).click();
    await expect(guest.locator('main').getByRole('alert')).toContainText(
      'Pendaftaran sudah ditutup',
    );
    await page.goto('/dashboard');
    await page.getByRole('button', { name: '+ Request Surat' }).click();
    await page.getByLabel('Jenis Surat', { exact: true }).selectOption('Surat Permohonan');
    await page.getByLabel('Perihal / Pokok Surat').fill('Surat dengan peserta');
    await page.getByLabel('Tujuan / Pihak yang Dituju').fill('Sekolah');
    await page
      .getByLabel('Paragraf Pengantar Kegiatan')
      .fill('Permohonan dukungan kegiatan remaja.');
    await page.getByLabel('Kegiatan untuk lampiran').selectOption(eventId);
    await page.getByRole('button', { name: 'Pilih semua peserta' }).click();
    await expect(page.getByRole('checkbox', { name: 'Pilih Andi Pratama' })).toBeChecked();
    await page.getByRole('checkbox', { name: 'Pilih Budi Santoso' }).uncheck();
    await page.getByRole('button', { name: 'Kirim Pengajuan' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page
      .getByRole('region', { name: 'Pengajuan Surat Saya' })
      .getByRole('button', { name: /Surat dengan peserta/ })
      .click();
    await expect(page.getByRole('dialog')).toContainText('1 (satu) berkas');
    const attachment = page.getByRole('article', { name: 'Lampiran peserta surat' });
    await expect(attachment).toContainText('Andi Pratama');
    await expect(attachment).not.toContainText('Budi Santoso');
    await expect(attachment.getByRole('columnheader')).toHaveText([
      'No.',
      'Nama',
      'Instansi',
      'Unsur',
    ]);
    const color = await attachment
      .getByRole('table')
      .evaluate((element) => getComputedStyle(element).color);
    expect(color).toBe('rgb(0, 0, 0)');
    expect(
      await page
        .getByRole('dialog')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await attachment.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('letter-attachment.png'), fullPage: true });
    const pdf = await page.request.get(
      (await page.getByRole('link', { name: 'Unduh PDF' }).getAttribute('href'))!,
    );
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  } finally {
    await guestContext.close();
  }
});
