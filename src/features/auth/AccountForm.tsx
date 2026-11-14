'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { registerForm, emailForm, resetPasswordForm } from './actions';
import type { Result } from '@/lib/errors';

export default function AccountForm({
  mode,
  configured,
  invalid = false,
}: {
  mode: 'register' | 'resend' | 'recovery' | 'reset';
  configured: boolean;
  invalid?: boolean;
}) {
  const [values, setValues] = useState({
    nama_lengkap: '',
    email: '',
    password: '',
    confirmation: '',
  });
  const handler =
    mode === 'register' ? registerForm : mode === 'reset' ? resetPasswordForm : emailForm;
  const [result, action, pending] = useActionState<Result<string> | null, FormData>(
    async (previous, form) => {
      try {
        const result = await handler(previous, form);
        if (result.ok) setValues((current) => ({ ...current, password: '', confirmation: '' }));
        return result;
      } catch {
        return { ok: false, error: 'Koneksi terputus. Periksa koneksi dan coba lagi.' };
      }
    },
    null,
  );
  const title = {
    register: 'Daftar akun',
    resend: 'Verifikasi Gmail',
    recovery: 'Lupa kata sandi',
    reset: 'Buat kata sandi baru',
  }[mode];
  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-300 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-genre-blue';
  return (
    <main className="login-shell min-h-screen px-5 py-12">
      <section className="mx-auto max-w-md rounded-3xl bg-white p-7 sm:p-10">
        <Link href="/publik" className="text-sm font-bold text-genre-blue">
          Forum GenRe Kota Depok
        </Link>
        <h1 className="mt-5 text-3xl font-black text-primera-navy">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {mode === 'register'
            ? 'Gunakan Gmail aktif. Akun baru menjadi tamu; administrator menetapkan akses pengurus.'
            : mode === 'reset'
              ? 'Gunakan kata sandi khusus portal minimal 12 karakter.'
              : 'Masukkan Gmail terdaftar untuk menerima tautan melalui email.'}
        </p>
        {invalid && (
          <p role="alert" className="mt-4 text-sm text-rose-700">
            Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru.
          </p>
        )}
        {!configured && (
          <p role="alert" className="mt-4 text-sm text-rose-700">
            Layanan belum dikonfigurasi. Hubungi administrator.
          </p>
        )}
        <form action={action} className="mt-6 space-y-4">
          <input type="hidden" name="mode" value={mode} />
          <fieldset
            disabled={pending || !configured || (mode === 'reset' && !!result?.ok)}
            className="space-y-4 disabled:opacity-60"
          >
            {mode === 'register' && (
              <label className="block text-sm font-semibold">
                Nama lengkap
                <input
                  value={values.nama_lengkap}
                  onChange={(e) =>
                    setValues((current) => ({ ...current, nama_lengkap: e.target.value }))
                  }
                  name="nama_lengkap"
                  autoComplete="name"
                  required
                  maxLength={200}
                  className={inputClass}
                />
              </label>
            )}
            {mode !== 'reset' && (
              <label className="block text-sm font-semibold">
                Gmail
                <input
                  value={values.email}
                  onChange={(e) => setValues((current) => ({ ...current, email: e.target.value }))}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="nama@gmail.com"
                  className={inputClass}
                />
              </label>
            )}
            {(mode === 'register' || mode === 'reset') && (
              <>
                <label className="block text-sm font-semibold">
                  Kata sandi portal
                  <input
                    value={values.password}
                    onChange={(e) =>
                      setValues((current) => ({ ...current, password: e.target.value }))
                    }
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={1024}
                    required
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Konfirmasi kata sandi
                  <input
                    value={values.confirmation}
                    onChange={(e) =>
                      setValues((current) => ({ ...current, confirmation: e.target.value }))
                    }
                    name="confirmation"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={1024}
                    required
                    className={inputClass}
                  />
                </label>
                <p className="text-xs text-slate-500">
                  Minimal 12 karakter. Jangan gunakan kata sandi Gmail Anda.
                </p>
              </>
            )}
            <button className="login-submit" type="submit">
              {pending
                ? 'Memproses…'
                : mode === 'register'
                  ? 'Daftar dan kirim verifikasi'
                  : mode === 'reset'
                    ? 'Simpan kata sandi'
                    : 'Kirim tautan'}
            </button>
          </fieldset>
          {result && (
            <p
              role={result.ok ? 'status' : 'alert'}
              className={`text-sm ${result.ok ? 'text-emerald-700' : 'text-rose-700'}`}
            >
              {result.ok ? result.data : result.error}
            </p>
          )}
        </form>
        <Link href="/login" className="mt-6 inline-block text-sm font-bold text-genre-blue">
          Kembali ke login
        </Link>
        {mode === 'resend' && (
          <Link href="/lupa-password" className="mt-4 block text-sm text-genre-blue">
            Minta tautan pemulihan kata sandi
          </Link>
        )}
      </section>
    </main>
  );
}
