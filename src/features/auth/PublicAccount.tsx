'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { logoutPublic } from './actions';

export default function PublicAccount({
  level,
  destination,
}: {
  level: string | null;
  destination: string;
}) {
  const [result, action, pending] = useActionState(logoutPublic, null);
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {level && (
        <span className="text-slate-600">
          {level === 'guest' ? 'Akun tamu' : level === 'admin' ? 'Administrator' : 'Pengurus'}
        </span>
      )}
      <Link
        href={level === 'guest' ? '/login' : destination}
        className="rounded-xl bg-primera-navy px-4 py-3 text-xs font-bold text-white sm:text-sm"
      >
        {level === 'guest' ? 'Periksa akses pengurus' : level ? 'Buka portal' : 'Masuk / daftar'}
      </Link>
      {level && (
        <form action={action}>
          <button disabled={pending} className="font-semibold text-genre-blue">
            {pending ? 'Keluar…' : 'Keluar'}
          </button>
        </form>
      )}
      {result && !result.ok && (
        <p role="alert" className="text-rose-700">
          {result.error}
        </p>
      )}
    </div>
  );
}
