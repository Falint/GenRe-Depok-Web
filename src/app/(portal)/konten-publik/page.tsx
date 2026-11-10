import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireProfile } from '@/features/auth/server';
import { canManageContent } from '@/features/auth/permissions';
import { createClient } from '@/lib/supabase/server';
import { PortalError } from '@/lib/errors';
import { contentPage, publicContentSchema } from '@/features/publik/schema';
import ContentManager from '@/features/publik/ContentManager';

export const metadata = { title: 'Konten Publik' };
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!canManageContent(await requireProfile())) redirect('/dashboard');
  const page = contentPage((await searchParams).page);
  const { data, error, count } = await (
    await createClient()
  )
    .from('public_content')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .order('id')
    .range((page - 1) * 12, page * 12 - 1);
  if (error) throw new PortalError('Konten publik belum dapat dimuat. Hubungi administrator.');
  const items = z.array(publicContentSchema).parse(data);
  return (
    <div className="space-y-6 pb-20">
      <ContentManager items={items} />
      <nav
        aria-label="Halaman pengelolaan konten"
        className="flex gap-6 text-sm font-semibold text-genre-blue"
      >
        {page > 1 && <Link href={`/konten-publik?page=${page - 1}`}>Sebelumnya</Link>}
        <span className="text-slate-600">Halaman {page}</span>
        {page * 12 < (count || 0) && (
          <Link href={`/konten-publik?page=${page + 1}`}>Berikutnya</Link>
        )}
      </nav>
    </div>
  );
}
