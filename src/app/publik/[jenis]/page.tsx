import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listPublicContent, PAGE_SIZE } from '@/features/publik/data';
import { contentPage } from '@/features/publik/schema';
import { formatDate } from '@/features/portal/mapping';

export async function generateMetadata({ params }: { params: Promise<{ jenis: string }> }) {
  return { title: (await params).jenis === 'berita' ? 'Berita' : 'Agenda' };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ jenis: string }>;
  searchParams: Promise<{ page?: string; periode?: string }>;
}) {
  const { jenis } = await params;
  if (jenis !== 'berita' && jenis !== 'agenda') notFound();
  const search = await searchParams;
  const page = contentPage(search.page);
  const past = jenis === 'agenda' && search.periode === 'lampau';
  const { items, total } = await listPublicContent(jenis, page, past);
  const title = jenis === 'berita' ? 'Berita' : 'Agenda';
  const pageUrl = (n: number) => `/publik/${jenis}?page=${n}${past ? '&periode=lampau' : ''}`;
  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">{title} GenRe Depok</h1>
        <p className="mt-3 text-slate-600">
          {jenis === 'berita'
            ? 'Kabar dan cerita dari Forum GenRe Kota Depok.'
            : 'Jadwal kegiatan publik Forum GenRe Kota Depok.'}
        </p>
      </div>
      {jenis === 'agenda' && (
        <nav aria-label="Periode agenda" className="flex gap-5 text-sm font-bold">
          <Link
            aria-current={!past ? 'page' : undefined}
            className={!past ? 'text-genre-blue underline' : ''}
            href="/publik/agenda"
          >
            Mendatang
          </Link>
          <Link
            aria-current={past ? 'page' : undefined}
            className={past ? 'text-genre-blue underline' : ''}
            href="/publik/agenda?periode=lampau"
          >
            Agenda lampau
          </Link>
        </nav>
      )}
      {!items.length && (
        <p
          role="status"
          className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600"
        >
          {page > 1
            ? 'Tidak ada konten di halaman ini.'
            : `Belum ada ${title.toLowerCase()}${past ? ' lampau' : ''} yang diterbitkan.`}
        </p>
      )}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="min-w-0 border-t-2 border-genre-blue pt-5">
            <p className="text-xs text-slate-600">
              {formatDate(jenis === 'agenda' ? item.mulai_at : item.published_at)} WIB
            </p>
            <h2 className="mt-3 break-words text-xl font-bold">
              <Link href={`/publik/${jenis}/${item.id}`} className="hover:text-genre-blue">
                {item.judul}
              </Link>
            </h2>
            {item.lokasi && <p className="mt-2 break-words text-sm font-semibold">{item.lokasi}</p>}
            <p className="mt-3 break-words text-sm leading-7 text-slate-600">{item.ringkasan}</p>
            <Link
              href={`/publik/${jenis}/${item.id}`}
              className="mt-4 inline-block text-sm font-bold text-genre-blue"
              aria-label={`Baca ${item.judul}`}
            >
              Baca selengkapnya
            </Link>
          </article>
        ))}
      </div>
      <nav aria-label="Halaman konten" className="flex items-center gap-6 text-sm font-semibold">
        {page > 1 && (
          <Link href={pageUrl(page - 1)} className="text-genre-blue">
            Sebelumnya
          </Link>
        )}
        <span>Halaman {page}</span>
        {page * PAGE_SIZE < total && (
          <Link href={pageUrl(page + 1)} className="text-genre-blue">
            Berikutnya
          </Link>
        )}
      </nav>
    </section>
  );
}
