'use server';
import { redirect } from 'next/navigation';
import { safeReturnPath } from '@/features/portal/routes';
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
    return { ok: false, error: 'Masukkan email resmi dan kata sandi Anda.' };
  }
  const result = await authenticate({ email: email.trim().toLowerCase(), password });
  if (!result.ok) return result;
  redirect(safeReturnPath(form.get('next')));
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
