export const metadata = { title: 'Kontak' };
export default function Page() {
  return (
    <section className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-extrabold">Terhubung dengan Forum GenRe</h1>
      <p className="leading-7 text-slate-600">
        Untuk informasi kegiatan dan kerja sama, hubungi Forum GenRe Kota Depok melalui kanal
        berikut.
      </p>
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="font-bold">Email</h2>
          <a
            className="mt-2 inline-block break-all text-genre-blue underline"
            href="mailto:genre.depok@gmail.com"
          >
            genre.depok@gmail.com
          </a>
        </div>
        <div>
          <h2 className="font-bold">Instagram</h2>
          <a
            className="mt-2 inline-block text-genre-blue underline"
            href="https://instagram.com/genre_kotadepok"
            target="_blank"
            rel="noopener noreferrer"
          >
            @genre_kotadepok <span className="sr-only">(tab baru)</span>
          </a>
        </div>
      </div>
    </section>
  );
}
