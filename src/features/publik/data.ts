import 'server-only';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { PortalError } from '@/lib/errors';
import { publicContentSchema, type ContentKind } from './schema';

export const PAGE_SIZE = 12;
const columns =
  'id,jenis,judul,ringkasan,isi,status,mulai_at,selesai_at,lokasi,published_at,updated_at,version';

export async function listPublicContent(kind: ContentKind, page: number, past = false) {
  const client = await createClient();
  let query = client
    .from('public_content')
    .select(columns, { count: 'exact' })
    .eq('status', 'published')
    .eq('jenis', kind);
  if (kind === 'agenda') {
    const now = new Date().toISOString();
    query = past ? query.lt('mulai_at', now) : query.gte('mulai_at', now);
    query = query.order('mulai_at', { ascending: !past });
  } else query = query.order('published_at', { ascending: false });
  const { data, error, count } = await query
    .order('id')
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new PortalError('Konten publik belum dapat dimuat. Coba lagi.');
  return { items: z.array(publicContentSchema).parse(data), total: count || 0 };
}

export async function getPublicContent(kind: ContentKind, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const { data, error } = await (
    await createClient()
  )
    .from('public_content')
    .select(columns)
    .eq('id', id)
    .eq('jenis', kind)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw new PortalError('Konten publik belum dapat dimuat. Coba lagi.');
  return data ? publicContentSchema.parse(data) : null;
}
