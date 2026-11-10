import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { KABINET } from '@/features/organisasi/content';

export const metadata = {
  title: { default: 'Portal Publik', template: '%s | GenRe Depok' },
  description: 'Profil, berita, agenda, dan informasi Forum GenRe Kota Depok.',
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 [&_a]:focus-visible:outline [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-genre-blue">
      <a
        href="#konten-publik"
        className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:z-50 focus:bg-white focus:p-4"
      >
        Lewati ke konten
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/publik" className="flex items-center gap-3">
            <Image
              src="/logo-genre-depok.png"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
            <span className="text-sm font-extrabold leading-tight sm:text-base">
              Forum GenRe
              <br />
              Kota Depok
            </span>
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-primera-navy px-4 py-3 text-xs font-bold text-white sm:text-sm"
          >
            Masuk pengurus
          </Link>
        </div>
        <nav
          aria-label="Navigasi publik"
          className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-5 pb-4 text-sm font-semibold sm:px-8"
        >
          {['Beranda', 'Profil', 'Struktur', 'Berita', 'Agenda', 'Kontak'].map((label) => (
            <Link
              key={label}
              href={label === 'Beranda' ? '/publik' : `/publik/${label.toLowerCase()}`}
              className="shrink-0 py-1 hover:text-genre-blue"
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="konten-publik" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        {children}
      </main>
      <footer className="mt-12 border-t border-slate-200 bg-white px-5 py-8 text-sm text-slate-600">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4">
          <p>
            Forum GenRe Kota Depok · Kabinet {KABINET.nama} {KABINET.periode}
          </p>
          <Link href="/publik/kontak" className="font-semibold text-genre-blue">
            Hubungi kami
          </Link>
        </div>
      </footer>
    </div>
  );
}
