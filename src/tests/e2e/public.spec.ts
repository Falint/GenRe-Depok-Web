import { test, expect, type Page } from '@playwright/test';
const historicJobdesc =
  'Memberikan pengayoman, perlindungan, serta dukungan kebijakan tertinggi secara kelembagaan dan pemerintahan terhadap seluruh keberlangsungan program Forum GenRe Kota Depok.';

const fixture = 'http://127.0.0.1:54328';
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email resmi').fill('pengurus@example.org');
  await page.getByLabel('Kata sandi', { exact: true }).fill('valid-password');
  await page.getByRole('button', { name: 'Masuk ke portal' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
test.beforeEach(async ({ request }) => {
  await request.get(`${fixture}/__test/reset`);
});

test('guest entry, public navigation, safe structure and internal protection', async ({
  page,
}, testInfo) => {
  const operational: string[] = [];
  page.on('request', (request) => {
    if (/rest\/v1\/(profiles|reimburse|surat|kas_mutasi)/.test(request.url()))
      operational.push(request.url());
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('link', { name: 'Masuk sebagai tamu' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/publik$/);
  await expect(page.getByRole('heading', { name: 'Satu gerak untuk remaja Depok.' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('public-home.png'), fullPage: true });
  for (const label of ['Profil', 'Struktur', 'Berita', 'Agenda', 'Kontak']) {
    await page
      .getByRole('navigation', { name: 'Navigasi publik' })
      .getByRole('link', { name: label, exact: true })
      .click();
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  const response = await page.goto('/publik/struktur');
  const html = await response!.text();
  expect(html).not.toContain(historicJobdesc);
  await page.getByRole('button', { name: 'Direktori Jobdesc Resmi' }).click();
  await expect(page.getByText('Catatan Historis: Jobdesc Lama')).toHaveCount(0);
  await expect(
    page.getByText('Memberikan perlindungan dan dukungan kelembagaan', { exact: false }),
  ).toBeVisible();
  expect(operational).toEqual([]);
  for (const route of ['/dashboard', '/administrasi', '/konten-publik']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  }
});

test('public lists paginate, filter dates, hide drafts and recover from read failure', async ({
  page,
  request,
}) => {
  await request.get(`${fixture}/__test/public-content`);
  await page.goto('/publik/berita');
  await expect(page.locator('main article')).toHaveCount(12);
  await expect(page.locator('main article').first()).toContainText('Berita uji 14');
  await expect(page.getByText('Draft rahasia')).toHaveCount(0);
  await page.getByRole('link', { name: 'Berikutnya' }).click();
  await expect(page.locator('main article')).toHaveCount(2);
  await page.getByRole('link', { name: 'Berita uji 1', exact: true }).click();
  await expect(page.locator('main')).toContainText('<script>alert(1)</script>');
  await page.goto('/publik/berita/00000000-0000-4000-8000-000000000350');
  await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
  await page.goto('/publik/agenda');
  await expect(page.getByRole('heading', { name: 'Agenda mendatang' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Agenda lampau', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Agenda lampau', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Agenda lampau', exact: true })).toBeVisible();
  await request.get(`${fixture}/__test/reset?fail=true`);
  await page.goto('/publik/berita');
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'Informasi belum dapat dimuat',
  );
  await request.get(`${fixture}/__test/reset`);
  await page.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(page.getByRole('status')).toContainText('Belum ada berita');
});

test('Branding creates drafts, publishes, withdraws and validates agenda; other staff cannot manage', async ({
  page,
  request,
  browser,
}) => {
  await request.get(`${fixture}/__test/reset?level=staff&field=branding`);
  await login(page);
  await page.goto('/konten-publik');
  await page.getByRole('button', { name: 'Tambah konten' }).click();
  await page.getByLabel('Judul', { exact: true }).fill('Berita untuk publik');
  await page.getByLabel('Ringkasan', { exact: true }).fill('Kabar Forum');
  await page
    .getByLabel('Isi konten', { exact: true })
    .fill('Isi yang boleh dibaca semua pengunjung.');
  await page.getByRole('button', { name: 'Simpan draft' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('article')).toContainText('Draft');
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  try {
    await guest.goto('/publik/berita');
    await expect(guest.getByRole('status')).toContainText('Belum ada berita');
    await page.getByRole('button', { name: 'Edit Berita untuk publik' }).click();
    await page.getByRole('button', { name: 'Terbitkan', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const href = await page
      .getByRole('link', { name: 'Lihat publik', exact: true })
      .getAttribute('href');
    await guest.goto(href!);
    await expect(guest.getByRole('heading', { name: 'Berita untuk publik' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit Berita untuk publik' }).click();
    await page.getByRole('button', { name: 'Tarik publikasi' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await guest.reload();
    await expect(guest.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
  } finally {
    await guestContext.close();
  }
  await page.getByRole('button', { name: 'Tambah konten' }).click();
  await page.getByLabel('Jenis konten').selectOption('agenda');
  await page.getByLabel('Judul', { exact: true }).fill('Agenda baru');
  await page.getByLabel('Ringkasan', { exact: true }).fill('Kegiatan');
  await page.getByLabel('Isi konten', { exact: true }).fill('Informasi kegiatan');
  await page.getByLabel('Waktu mulai (WIB)', { exact: true }).fill('2099-01-01T09:00');
  await page.getByLabel('Waktu selesai (WIB, opsional)').fill('2099-01-01T08:00');
  await page.getByLabel('Lokasi', { exact: true }).fill('Depok');
  await page.getByRole('button', { name: 'Terbitkan', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Waktu selesai');
  await page.getByLabel('Waktu selesai (WIB, opsional)').fill('2099-01-01T10:00');
  await page.getByRole('button', { name: 'Terbitkan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await request.get(`${fixture}/__test/actor?level=staff&field=internal`);
  await page.goto('/konten-publik');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('link', { name: 'Konten Publik', exact: true })).toHaveCount(0);
});

test('content manager recovers from server read failure', async ({ page, request }) => {
  await login(page);
  await request.get(`${fixture}/__test/reset?fail=true`);
  await page.goto('/konten-publik');
  await expect(page.getByRole('heading', { name: 'Portal belum dapat dimuat' })).toBeVisible();
  await request.get(`${fixture}/__test/reset`);
  await page.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(page.getByRole('heading', { name: 'Konten Publik', exact: true })).toBeVisible();
});
