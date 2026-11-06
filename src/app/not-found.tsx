import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center">
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
        <Link href="/" className="text-genre-blue underline">
          Kembali ke portal
        </Link>
      </div>
    </main>
  );
}
