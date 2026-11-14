import { test, expect } from '@playwright/test';
const fixture = 'http://127.0.0.1:54328';

test.beforeEach(async ({ request }) => {
  await request.get(`${fixture}/__test/reset`);
});

test('signup password visibility toggles independently without changing values', async ({
  page,
}) => {
  await page.goto('/daftar');
  const password = page.getByLabel('Kata sandi', { exact: true });
  const confirmation = page.getByLabel('Konfirmasi kata sandi', { exact: true });
  await password.fill('new-strong-password');
  await confirmation.fill('new-strong-password');
  await expect(password).toHaveAttribute('type', 'password');
  await expect(confirmation).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Tampilkan kata sandi', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(confirmation).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Tampilkan konfirmasi kata sandi' }).click();
  await expect(confirmation).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Sembunyikan kata sandi', exact: true }).click();
  await page.getByRole('button', { name: 'Sembunyikan konfirmasi kata sandi' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(confirmation).toHaveAttribute('type', 'password');
  await expect(password).toHaveValue('new-strong-password');
  await expect(confirmation).toHaveValue('new-strong-password');
});

test('Gmail signup, resend, recovery and verification errors are usable', async ({
  page,
  request,
}) => {
  await page.goto('/daftar');
  await page.getByLabel('Nama lengkap').fill('Pengurus Baru');
  await page.getByLabel('Gmail', { exact: true }).fill('baru@example.org');
  await page.getByLabel('Kata sandi', { exact: true }).fill('new-strong-password');
  await page.getByLabel('Konfirmasi kata sandi', { exact: true }).fill('new-strong-password');
  await page.getByRole('button', { name: 'Daftar dan kirim verifikasi' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('@gmail.com');
  await page.getByLabel('Gmail', { exact: true }).fill('baru@gmail.com');
  await page.getByLabel('Konfirmasi kata sandi', { exact: true }).fill('other-strong-password');
  await page.getByRole('button', { name: 'Daftar dan kirim verifikasi' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('tidak cocok');
  await page.getByLabel('Konfirmasi kata sandi', { exact: true }).fill('new-strong-password');
  await request.get(`${fixture}/__test/signup-ready?enabled=false`);
  await page.getByRole('button', { name: 'Daftar dan kirim verifikasi' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('pembaruan database');
  expect(await (await request.get(`${fixture}/__test/email-actions`)).json()).toEqual([]);
  await request.get(`${fixture}/__test/signup-ready?enabled=true`);
  await page.getByRole('button', { name: 'Daftar dan kirim verifikasi' }).click();
  await expect(page.getByRole('status')).toContainText('tautan verifikasi');
  for (const route of ['/verifikasi', '/lupa-password']) {
    await page.goto(route);
    await page.getByLabel('Gmail', { exact: true }).fill('baru@gmail.com');
    await page.getByRole('button', { name: 'Kirim tautan' }).click();
    await expect(page.getByRole('status')).toContainText('tautan dikirim');
  }
  expect(await (await request.get(`${fixture}/__test/email-actions`)).json()).toEqual([
    'signup',
    'resend',
    'recovery',
  ]);
  await page.goto('/auth/confirm?token_hash=expired&type=email&next=https://attacker.test');
  await expect(page).toHaveURL(/\/verifikasi\?error=1$/);
  await expect(page.locator('main').getByRole('alert')).toContainText('kedaluwarsa');
  await page.goto('/auth/confirm?token_hash=fixture-confirm&type=email');
  await expect(page).toHaveURL(/\/login\?verified=1$/);
});

test('guest cannot open portal; promotion and demotion apply to the same session', async ({
  page,
  request,
}, testInfo) => {
  await request.get(`${fixture}/__test/reset?level=guest`);
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('guest@gmail.com');
  await page.getByLabel('Kata sandi', { exact: true }).fill('valid-password');
  await page.getByRole('button', { name: 'Masuk ke portal' }).click();
  await expect(page).toHaveURL(/\/publik$/);
  await expect(page.getByText('Akun tamu', { exact: true })).toBeVisible();
  for (const route of ['/dashboard', '/administrasi', '/kelola-akun']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/publik$/);
  }
  await page.screenshot({ path: testInfo.outputPath('guest-account.png'), fullPage: true });
  await request.get(`${fixture}/__test/actor?id=1&level=staff`);
  await page.getByRole('link', { name: 'Periksa akses pengurus' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await request.get(`${fixture}/__test/actor?id=1&level=guest`);
  await page.reload();
  await expect(page).toHaveURL(/\/publik$/);
  await page.getByRole('button', { name: 'Keluar', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('dedicated admin manages verified guest roles; inti cannot enter management', async ({
  page,
  request,
}, testInfo) => {
  await request.get(`${fixture}/__test/reset?level=admin`);
  await page.goto('/daftar');
  await page.getByLabel('Nama lengkap').fill('Pengurus Baru');
  await page.getByLabel('Gmail', { exact: true }).fill('baru@gmail.com');
  await page.getByLabel('Kata sandi', { exact: true }).fill('new-strong-password');
  await page.getByLabel('Konfirmasi kata sandi', { exact: true }).fill('new-strong-password');
  await page.getByRole('button', { name: 'Daftar dan kirim verifikasi' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@gmail.com');
  await page.getByLabel('Kata sandi', { exact: true }).fill('valid-password');
  await page.getByRole('button', { name: 'Masuk ke portal' }).click();
  await expect(page).toHaveURL(/\/kelola-akun$/);
  await page.getByLabel('Cari nama atau email').fill('baru@gmail.com');
  await page.getByRole('button', { name: 'Cari / muat ulang' }).click();
  const account = page.getByRole('article').filter({ hasText: 'baru@gmail.com' });
  await expect(account).toContainText('guest');
  await account.getByRole('button', { name: 'Ubah akses' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Role', exact: true }).selectOption('staff');
  await dialog.getByLabel('Jabatan', { exact: true }).fill('Staff Design');
  await dialog.getByRole('combobox', { name: 'Bidang', exact: true }).selectOption('branding');
  await dialog.getByRole('combobox', { name: 'Divisi', exact: true }).selectOption('design');
  await dialog.getByRole('button', { name: 'Simpan akses' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(account).toContainText('Staff Design');
  await page.screenshot({ path: testInfo.outputPath('account-manager.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await request.get(`${fixture}/__test/actor?id=1&level=inti`);
  await page.goto('/kelola-akun');
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('password recovery exchanges token, updates password and requires a fresh login', async ({
  page,
}) => {
  await page.goto('/auth/confirm?token_hash=fixture-recovery&type=recovery');
  await expect(page).toHaveURL(/\/reset-password$/);
  expect(new URL(page.url()).origin).toBe('http://127.0.0.1:3100');
  await page.getByLabel('Kata sandi', { exact: true }).fill('new-strong-password');
  await page.getByLabel('Konfirmasi kata sandi', { exact: true }).fill('new-strong-password');
  await page.getByRole('button', { name: 'Simpan kata sandi' }).click();
  await expect(page).toHaveURL(/\/login\?password=changed$/);
  await expect(page.getByRole('status')).toContainText('Kata sandi berubah');
  await page.getByLabel('Email', { exact: true }).fill('pengurus@example.org');
  await page.getByLabel('Kata sandi', { exact: true }).fill('new-strong-password');
  await page.getByRole('button', { name: 'Masuk ke portal' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
