'use client';
export default function ErrorBoundary({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div role="alert" className="space-y-4 text-center">
        <h1 className="text-xl font-bold">Portal belum dapat dimuat</h1>
        <p>Periksa koneksi atau hubungi administrator.</p>
        <button onClick={retry} className="rounded-xl bg-genre-blue px-5 py-2 text-white">
          Coba lagi
        </button>
      </div>
    </main>
  );
}
