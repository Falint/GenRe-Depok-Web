import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getProfile } from '@/features/auth/server';
import { isPortalMember } from '@/features/auth/permissions';
import { createClient } from '@/lib/supabase/server';
import { recordId } from '@/features/portal/validation';
import { isSuratApproved, SURAT_SIGNATORIES } from '@/features/administrasi/suratTemplate';
import { safeError } from '@/lib/errors';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; signer: string }> },
) {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  try {
    const profile = await getProfile();
    if (!profile)
      return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401, headers });
    if (!isPortalMember(profile.level))
      return Response.json({ error: 'Akses ditolak.' }, { status: 403, headers });
    const params = await context.params;
    const id = recordId.safeParse(params.id);
    const signer = SURAT_SIGNATORIES.find((item) => item.key === params.signer);
    if (!id.success || !signer)
      return Response.json({ error: 'Surat tidak ditemukan.' }, { status: 404, headers });
    const { data, error } = await (
      await createClient()
    )
      .from('surat')
      .select('status')
      .eq('id', id.data)
      .maybeSingle();
    if (error)
      return Response.json({ error: 'Surat belum dapat dimuat.' }, { status: 503, headers });
    if (!data) return Response.json({ error: 'Surat tidak ditemukan.' }, { status: 404, headers });
    if (!isSuratApproved(data.status))
      return Response.json({ error: 'Surat belum disetujui.' }, { status: 409, headers });
    const file = await readFile(
      path.join(process.cwd(), 'assets', 'surat', `ttd-${signer.key}.png`),
    );
    return new Response(new Uint8Array(file), {
      headers: { ...headers, 'Content-Type': 'image/png' },
    });
  } catch (error) {
    return Response.json({ error: safeError(error, 'surat:signature') }, { status: 500, headers });
  }
}
