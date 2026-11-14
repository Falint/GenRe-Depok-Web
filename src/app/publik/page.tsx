import Image from 'next/image';
import Link from 'next/link';
import { KABINET } from '@/features/organisasi/content';

export default function PublicHome() {
  return (
    <div className="space-y-12">
      <section className="grid overflow-hidden rounded-3xl bg-primera-navy text-white md:grid-cols-[1.5fr_1fr]">
        <div className="p-7 sm:p-12 lg:p-16">
          <p className="mb-5 text-sm text-primera-ivory">
            Kabinet {KABINET.nama} · {KABINET.periode}
          </p>
          <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            Satu gerak untuk remaja Depok.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-primera-ivory">
            Kenali Forum GenRe Kota Depok, ikuti kabar terbaru, dan temukan kegiatan untuk tumbuh
            bersama.
          </p>
          <Link
            href="/publik/profil"
            className="mt-8 inline-block rounded-xl bg-white px-5 py-3 text-sm font-bold text-primera-navy hover:bg-primera-ivory"
          >
            Kenali Forum GenRe
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center gap-6 border-t border-white/15 p-8 md:border-l md:border-t-0">
          <Image
            src={KABINET.logoUrl}
            alt="Logo PRIMERA"
            width={180}
            height={99}
            priority
            className="h-auto"
          />
          <p className="max-w-xs text-center text-sm leading-6 text-primera-ivory">
            {KABINET.tagline}
          </p>
        </div>
      </section>
      <section aria-labelledby="jelajahi" className="space-y-6">
        <h2 id="jelajahi" className="text-2xl font-extrabold">
          Ruang informasi GenRe
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            ['Berita', 'Cerita dan kabar terbaru dari Forum GenRe Kota Depok.', '/publik/berita'],
            [
              'Agenda',
              'Lihat jadwal dan lokasi kegiatan yang terbuka untuk publik.',
              '/publik/agenda',
            ],
            ['Kontak', 'Terhubung dengan Forum untuk informasi dan kerja sama.', '/publik/kontak'],
          ].map(([title, description, href]) => (
            <article key={href} className="border-t-2 border-genre-blue pt-5">
              <h3 className="text-xl font-bold">
                <Link href={href} className="hover:text-genre-blue">
                  {title}
                </Link>
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-7 text-slate-600">{description}</p>
              <Link href={href} className="mt-4 inline-block text-sm font-bold text-genre-blue">
                Lihat {title.toLowerCase()}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
