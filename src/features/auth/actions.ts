'use server';
import { redirect } from 'next/navigation';
import { accountDestination } from './policy';
import { registrationSchema, resetSchema, gmailSchema } from './validation';
import { ZodError } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from './server';
import { loginSchema, parseInput } from '@/features/portal/validation';
import { PortalError, safeError, type Result } from '@/lib/errors';

async function authenticate(input: unknown): Promise<Result> {
  try {
    const values = parseInput(loginSchema, input);
    const client = await createClient();
    const { error } = await client.auth.signInWithPassword(values);
    if (error) throw new PortalError('Login gagal. Periksa email dan kata sandi, lalu coba lagi.');
    try {
      if (!(await getProfile()))
        throw new PortalError('Profil pengurus tidak ditemukan. Hubungi administrator.');
    } catch (error) {
      await client.auth.signOut({ scope: 'local' });
      throw error;
    }
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: safeError(error, 'login') };
  }
}
export async function loginForm(_previous: Result | null, form: FormData): Promise<Result> {
  const email = form.get('email');
  const password = form.get('password');
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return { ok: false, error: 'Masukkan email dan kata sandi Anda.' };
  }
  const result = await authenticate({ email: email.trim().toLowerCase(), password });
  if (!result.ok) return result;
  const profile = await getProfile();
  if (!profile) return { ok: false, error: 'Sesi tidak ditemukan. Coba masuk kembali.' };
  redirect(accountDestination(profile.level, form.get('next')));
}
export async function logout(): Promise<Result> {
  try {
    const client = await createClient();
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw new PortalError('Keluar gagal. Periksa koneksi dan coba lagi.');
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: safeError(error, 'logout') };
  }
}

function emailDestination() {
  const value = process.env.PORTAL_SITE_URL;
  if (!value || !URL.canParse(value))
    throw new PortalError('Layanan email belum dikonfigurasi. Hubungi administrator.');
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
  )
    throw new PortalError('Alamat layanan email tidak valid. Hubungi administrator.');
  return `${url.origin}/auth/confirm`;
}

export async function registerForm(
  _previous: Result<string> | null,
  form: FormData,
): Promise<Result<string>> {
  try {
    const values = registrationSchema.parse({
      nama_lengkap: form.get('nama_lengkap'),
      email: String(form.get('email') || '')
        .trim()
        .toLowerCase(),
      password: form.get('password'),
      confirmation: form.get('confirmation'),
    });
    const client = await createClient();
    const readiness = await client.rpc('portal_signup_ready');
    if (readiness.error || readiness.data !== true)
      throw new PortalError('Pendaftaran memerlukan pembaruan database. Hubungi administrator.');
    const { data, error } = await client.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: emailDestination(), data: { nama_lengkap: values.nama_lengkap } },
    });
    if (error)
      throw new PortalError('Pendaftaran belum berhasil. Periksa isian atau coba lagi nanti.');
    if (data.session) {
      await client.auth.signOut({ scope: 'local' });
      throw new PortalError('Verifikasi email belum diaktifkan. Hubungi administrator.');
    }
    return {
      ok: true,
      data: 'Jika alamat dapat didaftarkan, tautan verifikasi dikirim ke Gmail Anda. Periksa inbox dan spam.',
    };
  } catch (error) {
    return authFailure(error, 'register');
  }
}

export async function emailForm(
  _previous: Result<string> | null,
  form: FormData,
): Promise<Result<string>> {
  try {
    const email = gmailSchema.parse(
      String(form.get('email') || '')
        .trim()
        .toLowerCase(),
    );
    const mode = form.get('mode');
    if (mode !== 'resend' && mode !== 'recovery') throw new PortalError('Permintaan tidak valid.');
    const destination = emailDestination();
    const client = await createClient();
    const { error } =
      mode === 'resend'
        ? await client.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: destination },
          })
        : await client.auth.resetPasswordForEmail(email, { redirectTo: destination });
    if (error) throw new PortalError('Email belum dapat dikirim. Tunggu sebentar lalu coba lagi.');
    return {
      ok: true,
      data: 'Jika akun memenuhi syarat, tautan dikirim ke Gmail Anda. Periksa inbox dan spam.',
    };
  } catch (error) {
    return authFailure(error, 'auth:email');
  }
}

export async function resetPasswordForm(
  _previous: Result<string> | null,
  form: FormData,
): Promise<Result<string>> {
  try {
    const values = resetSchema.parse({
      password: form.get('password'),
      confirmation: form.get('confirmation'),
    });
    const client = await createClient();
    const { data, error: userError } = await client.auth.getUser();
    if (userError || !data.user)
      throw new PortalError('Sesi pemulihan berakhir. Minta tautan baru.');
    const { error } = await client.auth.updateUser({ password: values.password });
    if (error)
      throw new PortalError('Kata sandi gagal diubah. Gunakan kata sandi kuat dan coba lagi.');
    const { error: logoutError } = await client.auth.signOut({ scope: 'global' });
    if (logoutError)
      throw new PortalError(
        'Kata sandi berubah, tetapi sesi belum berhasil diakhiri. Coba keluar kembali.',
      );
  } catch (error) {
    return authFailure(error, 'auth:reset');
  }
  redirect('/login?password=changed');
}
function authFailure(error: unknown, operation: string): Result<string> {
  return {
    ok: false,
    error: error instanceof ZodError ? error.issues[0].message : safeError(error, operation),
  };
}

export async function logoutPublic(): Promise<Result> {
  const result = await logout();
  if (!result.ok) return result;
  redirect('/login');
}
