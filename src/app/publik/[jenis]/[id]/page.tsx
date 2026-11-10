import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicContent } from '@/features/publik/data';
import { formatDate } from '@/features/portal/mapping';

export default async function Page({ params }: { params: Promise<{ jenis: string; id: string }> }) {
  const { jenis, id } = await params;
  if (jenis !== 'berita' && jenis !== 'agenda') notFound();
  const item = await getPublicContent(jenis, id);
  if (!item) notFound();
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link href={`/publik/${jenis}`} className="text-sm font-bold text-genre-blue">
        Kembali ke {jenis}
      </Link>
      <p className="text-sm text-slate-600">Diterbitkan {formatDate(item.published_at)} WIB</p>
      <h1 className="break-words text-3xl font-black leading-tight sm:text-4xl">{item.judul}</h1>
      <p className="break-words text-lg leading-8 text-slate-600">{item.ringkasan}</p>
      {jenis === 'agenda' && (
        <section
          aria-label="Waktu dan lokasi"
          className="space-y-2 rounded-xl border-l-4 border-genre-blue bg-white p-5 text-sm"
        >
          <p>
            <strong>Mulai:</strong> {formatDate(item.mulai_at)} WIB
          </p>
          {item.selesai_at && (
            <p>
              <strong>Selesai:</strong> {formatDate(item.selesai_at)} WIB
            </p>
          )}
          <p className="break-words">
            <strong>Lokasi:</strong> {item.lokasi}
          </p>
        </section>
      )}
      <div className="whitespace-pre-wrap break-words border-t border-slate-200 pt-6 text-base leading-8">
        {item.isi}
      </div>
    </article>
  );
}
