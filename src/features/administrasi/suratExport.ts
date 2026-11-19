import 'server-only';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { PortalError, safeError, checkWrite } from '@/lib/errors';
import { rowSchemas } from '@/features/portal/schema';
import { driveAccess, driveId, driveRequest, readDriveFolder } from './drive';
import { renderSuratPdf } from './SuratPdf';

export async function exportSurat(
  client: SupabaseClient<Database>,
  id: string,
): Promise<string | null> {
  let claim: { claim_id: string; file_id: string | null } | null = null;
  let fileId: string | null = null;
  try {
    const result = await client.rpc('claim_portal_surat_export', { target_id: id });
    checkWrite(result.error);
    claim = result.data;
    if (!claim) return null;
    fileId = claim.file_id;
    const { data, error } = await client.from('surat').select('*').eq('id', id).single();
    checkWrite(error);
    const surat = rowSchemas.surat.parse(data);
    const { token, connection } = await driveAccess(client);
    if (!connection.folder_id)
      throw new PortalError('Admin perlu memilih folder hasil surat di Google Drive.');
    await readDriveFolder(token, connection.folder_id);
    if (!fileId) {
      const generated = await driveRequest(token, 'drive/v3/files/generateIds?count=1&type=files');
      if (!generated.ok) throw new PortalError('ID file Drive belum bisa dibuat. Coba lagi.');
      fileId = z.object({ ids: z.array(driveId).length(1) }).parse(await generated.json()).ids[0];
      checkWrite(
        (
          await client.rpc('finish_portal_surat_export', {
            target_id: id,
            claim_value: claim.claim_id,
            file_value: fileId,
            outcome: 'uploading',
          })
        ).error,
      );
    }
    const pdf = await renderSuratPdf(surat);
    const boundary = `genre-${crypto.randomUUID()}`;
    const metadata = {
      id: fileId,
      name: `${surat.nomor_surat.replaceAll('/', '-')}.pdf`,
      mimeType: 'application/pdf',
      parents: [connection.folder_id],
      appProperties: { surat_id: id },
    };
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
      ),
      pdf,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const upload = await driveRequest(
      token,
      'upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      },
    );
    if (upload.status === 409) {
      // Respons upload dapat hilang setelah Drive menyimpan file; ID tetap membuat retry aman.
      const existing = await driveRequest(
        token,
        `drive/v3/files/${fileId}?fields=id,mimeType,trashed,appProperties`,
      );
      if (!existing.ok) throw new PortalError('File hasil belum dapat dikonfirmasi. Coba lagi.');
      const found = z
        .object({
          id: driveId,
          mimeType: z.string(),
          trashed: z.boolean().optional(),
          appProperties: z.object({ surat_id: z.string() }),
        })
        .parse(await existing.json());
      if (
        found.id !== fileId ||
        found.mimeType !== 'application/pdf' ||
        found.trashed ||
        found.appProperties.surat_id !== id
      )
        throw new PortalError('File Drive tidak cocok dengan surat. Hubungi admin.');
    } else if (!upload.ok) {
      throw new PortalError(
        'PDF gagal diunggah. Periksa akses dan ruang penyimpanan Drive, lalu coba lagi.',
      );
    }
    checkWrite(
      (
        await client.rpc('finish_portal_surat_export', {
          target_id: id,
          claim_value: claim.claim_id,
          file_value: fileId,
          outcome: 'ready',
        })
      ).error,
    );
    return null;
  } catch (error) {
    const message = safeError(error, 'surat:export');
    if (claim) {
      const result = await client.rpc('finish_portal_surat_export', {
        target_id: id,
        claim_value: claim.claim_id,
        file_value: fileId,
        outcome: 'failed',
        error_value: message,
      });
      if (result.error) console.error('[surat:export-state]', { code: result.error.code });
    }
    return message;
  }
}
