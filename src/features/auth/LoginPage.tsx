'use client';
import Image from 'next/image';
import logoDepok from '../../../public/logo-depok.png';
import logoSalamGenre from '../../../public/logo-salam-genre.png';
import logoGenreDepok from '../../../public/logo-genre-depok.png';
import React, { useActionState, useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { loginForm } from '@/features/auth/actions';

export default function LoginPage({
  configured,
  returnPath,
}: {
  configured: boolean;
  returnPath: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [result, action, loading] = useActionState(loginForm, null);
  const error = result && !result.ok ? result.error : '';

  return (
    <main className="login-shell min-h-screen px-5 py-6 sm:p-10 lg:p-14">
      <div className="login-grid mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/15 lg:grid-cols-[1.12fr_.88fr]">
        <section className="login-intro relative flex flex-col justify-between overflow-hidden p-7 sm:p-10 lg:p-14">
          <div className="login-orbit login-orbit-one" aria-hidden="true" />
          <div className="login-orbit login-orbit-two" aria-hidden="true" />
          <div className="relative flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 backdrop-blur-sm">
              <Image sizes="128px" src={logoDepok} alt="Kota Depok" className="h-8 w-auto" />
              <Image sizes="128px" src={logoSalamGenre} alt="Salam GenRe" className="h-8 w-auto" />
              <span className="h-6 w-px bg-white/25" />
              <Image
                sizes="128px"
                src={logoGenreDepok}
                alt="Forum GenRe Kota Depok"
                className="h-8 w-auto"
              />
            </div>
          </div>

          <div className="relative my-16 max-w-lg lg:my-0">
            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/20">
              <KeyRound className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-[-0.045em] text-white sm:text-5xl">
              Ruang kerja untuk gerak yang terarah.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-indigo-100 sm:text-base">
              Akses administrasi, koordinasi, dan sumber daya Forum GenRe Kota Depok dalam satu
              ruang kerja yang aman.
            </p>
          </div>

          <div className="relative flex items-center gap-3 text-xs text-indigo-100">
            <ShieldCheck className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <span>Akses sesuai peran kepengurusan Anda.</span>
          </div>
        </section>

        <section className="flex items-center bg-white p-7 sm:p-10 lg:p-14">
          <div className="mx-auto w-full max-w-sm">
            <p className="text-sm font-semibold text-genre-blue">Portal pengurus</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Masuk ke akun Anda
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Gunakan email resmi yang terdaftar di Forum GenRe Kota Depok.
            </p>

            {!configured && (
              <p role="alert" className="mt-4 text-sm text-rose-700">
                Konfigurasi Supabase belum tersedia atau tidak valid. Hubungi administrator.
              </p>
            )}
            <form className="mt-8 space-y-5" action={action} noValidate>
              <input type="hidden" name="next" value={returnPath} />
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="email">
                  Email resmi
                </label>
                <div className="login-input-wrap">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    name="email"
                    disabled={loading || !configured}
                    placeholder="nama@genredepok.or.id"
                    className="login-input"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="password">
                  Kata sandi
                </label>
                <div className="login-input-wrap">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    name="password"
                    disabled={loading || !configured}
                    className="login-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="rounded-lg p-1 text-slate-400 hover:text-genre-blue focus:outline-none focus:ring-2 focus:ring-genre-blue/30"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm leading-5 text-rose-700"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || !configured} className="login-submit">
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Memverifikasi akses…
                  </>
                ) : (
                  <>
                    Masuk ke portal <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
              Akun dibuat oleh administrator Forum. Hubungi pengurus inti jika Anda belum memiliki
              akses atau memerlukan bantuan akun.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
