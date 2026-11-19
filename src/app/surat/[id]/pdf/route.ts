import { getProfile } from '@/features/auth/server';
import { isPortalMember } from '@/features/auth/permissions';
import { createClient } from '@/lib/supabase/server';
import { rowSchemas, SURAT_STATUS } from '@/features/portal/schema';
import { recordId } from '@/features/portal/validation';
import { renderSuratPdf } from '@/features/administrasi/SuratPdf';
import { safeError } from '@/lib/errors';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const profile = await getProfile();
    if (!profile)
      return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401, headers });
    if (!isPortalMember(profile.level))
      return Response.json({ error: 'Akses ditolak.' }, { status: 403, headers });
    const input = recordId.safeParse((await context.params).id);
    if (!input.success)
      return Response.json({ error: 'Surat tidak ditemukan.' }, { status: 404, headers });
    const { data, error } = await (
      await createClient()
    )
      .from('surat')
      .select('*')
      .eq('id', input.data)
      .maybeSingle();
    if (error)
      return Response.json(
        { error: 'Surat belum dapat dimuat. Coba lagi.' },
        { status: 503, headers },
      );
    if (!data) return Response.json({ error: 'Surat tidak ditemukan.' }, { status: 404, headers });
    const surat = rowSchemas.surat.parse(data);
    if (surat.status !== SURAT_STATUS.COMPLETE && surat.status !== 'Selesai / Terbit (QR ACC)')
      return Response.json({ error: 'Surat belum disetujui.' }, { status: 409, headers });
    // PDF hanya dibuat saat diminta; data surat tetap menjadi sumber dokumen.
    const pdf = await renderSuratPdf(surat);
    const filename = `${surat.nomor_surat.replace(/[^A-Za-z0-9._-]/g, '-')}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...headers,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return Response.json({ error: safeError(error, 'surat:download') }, { status: 500, headers });
  }
}
