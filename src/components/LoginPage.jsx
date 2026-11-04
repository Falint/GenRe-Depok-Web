import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { signInWithPassword } from '../lib/supabaseAuth';

export default function LoginPage({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('Masukkan email resmi dan kata sandi Anda.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Gunakan format email yang valid.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const auth = await signInWithPassword(normalizedEmail, password);
      onAuthenticated(auth);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setError(message === 'Invalid login credentials' ? 'Email atau kata sandi tidak sesuai.' : message || 'Login tidak dapat diproses. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell min-h-screen px-5 py-6 sm:p-10 lg:p-14">
      <div className="login-grid mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/15 lg:grid-cols-[1.12fr_.88fr]">
        <section className="login-intro relative flex flex-col justify-between overflow-hidden p-7 sm:p-10 lg:p-14">
          <div className="login-orbit login-orbit-one" aria-hidden="true" />
          <div className="login-orbit login-orbit-two" aria-hidden="true" />
          <div className="relative flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 backdrop-blur-sm">
              <img src="/logo-depok.png" alt="Kota Depok" className="h-8 w-auto" />
              <img src="/logo-salam-genre.png" alt="Salam GenRe" className="h-8 w-auto" />
              <span className="h-6 w-px bg-white/25" />
              <img src="/logo-genre-depok.png" alt="Forum GenRe Kota Depok" className="h-8 w-auto" />
            </div>
          </div>

          <div className="relative my-16 max-w-lg lg:my-0">
            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/20">
              <KeyRound className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-[-0.045em] text-white sm:text-5xl">Ruang kerja untuk gerak yang terarah.</h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-indigo-100 sm:text-base">Akses administrasi, koordinasi, dan sumber daya Forum GenRe Kota Depok dalam satu ruang kerja yang aman.</p>
          </div>

          <div className="relative flex items-center gap-3 text-xs text-indigo-100">
            <ShieldCheck className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <span>Akses sesuai peran kepengurusan Anda.</span>
          </div>
        </section>

        <section className="flex items-center bg-white p-7 sm:p-10 lg:p-14">
          <div className="mx-auto w-full max-w-sm">
            <p className="text-sm font-semibold text-genre-blue">Portal pengurus</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Masuk ke akun Anda</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Gunakan email resmi yang terdaftar di Forum GenRe Kota Depok.</p>

            <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="email">Email resmi</label>
                <div className="login-input-wrap">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} placeholder="nama@genredepok.or.id" className="login-input" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="password">Kata sandi</label>
                <div className="login-input-wrap">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} className="login-input" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="rounded-lg p-1 text-slate-400 hover:text-genre-blue focus:outline-none focus:ring-2 focus:ring-genre-blue/30" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm leading-5 text-rose-700" role="alert">{error}</div>}

              <button type="submit" disabled={loading} className="login-submit">
                {loading ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Memverifikasi akses…</> : <>Masuk ke portal <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <p className="mt-8 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">Akun dibuat oleh administrator Forum. Hubungi pengurus inti jika Anda belum memiliki akses atau memerlukan bantuan akun.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
