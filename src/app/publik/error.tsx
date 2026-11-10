'use client';
export default function PublicError({ retry }: { retry: () => void }) {
  return (
    <section role="alert" className="space-y-4">
      <h1 className="text-2xl font-bold">Informasi belum dapat dimuat</h1>
      <p>Periksa koneksi atau coba lagi beberapa saat.</p>
      <button onClick={retry} className="rounded-xl bg-genre-blue px-5 py-3 font-bold text-white">
        Coba lagi
      </button>
    </section>
  );
}
