import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { registerHooks } from 'node:module';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/database.types';
import type { Row } from '../features/portal/schema';
import { encryptDriveSecret, decryptDriveSecret } from '../features/administrasi/driveCrypto';
import { readDriveFolder } from '../features/administrasi/drive';

// Next externalizes the PDF renderer with regular React; reproduce that resolution in server-only tests.
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier,
      specifier === 'react' || specifier.startsWith('react/')
        ? {
            ...context,
            conditions: context.conditions.filter((condition) => condition !== 'react-server'),
          }
        : context,
    );
  },
});
const { renderSuratPdf } = await import('../features/administrasi/SuratPdf');
const { exportSurat } = await import('../features/administrasi/suratExport');

const previous = { ...process.env };
const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
  for (const key of [
    'GOOGLE_DRIVE_TOKEN_KEY',
    'GOOGLE_DRIVE_CLIENT_ID',
    'GOOGLE_DRIVE_CLIENT_SECRET',
    'PORTAL_SITE_URL',
  ]) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});
const id = '00000000-0000-4000-8000-000000000001';
const letter: Row<'surat'> = {
  id,
  nomor_surat: '001/ST/FG-DPK/XI/2026',
  jenis: 'Surat Tugas',
  perihal: 'Kegiatan',
  tujuan: 'Sekolah',
  urgensi: 'Sedang',
  keterangan: 'Kegiatan pengurus',
  pemohon_id: id,
  pemohon_nama: 'Pemohon Uji',
  divisi: 'Branding',
  tanggal: '2026-11-19',
  status: 'Selesai / Disetujui',
  created_at: null,
  file_pdf_url: null,
};

test('Drive secrets are authenticated ciphertext and reject invalid keys or tampering', () => {
  process.env.GOOGLE_DRIVE_TOKEN_KEY = 'a'.repeat(64);
  const token = encryptDriveSecret('test-refresh-token');
  assert.ok(!token.includes('test-refresh-token'));
  assert.equal(decryptDriveSecret(token), 'test-refresh-token');
  const parts = token.split('.');
  parts[3] = Buffer.from('tampered').toString('base64url');
  assert.throws(() => decryptDriveSecret(parts.join('.')));
  process.env.GOOGLE_DRIVE_TOKEN_KEY = 'invalid';
  assert.throws(() => encryptDriveSecret('value'), /enkripsi/);
  process.env.GOOGLE_DRIVE_TOKEN_KEY = 'a'.repeat(64);
});

test('surat PDF renders A4 with multiple pages for long activity details', async () => {
  const pdf = await renderSuratPdf({
    ...letter,
    keterangan: 'Rincian kegiatan dan peserta pengurus.\n'.repeat(250),
  });
  const contents = pdf.toString('latin1');
  assert.ok(contents.startsWith('%PDF-'));
  assert.match(contents, /\/MediaBox \[0 0 595\.\d+ 841\.\d+\]/);
  const pageCount = Number(contents.match(/\/Type \/Pages\s*\/Count (\d+)/)?.[1]);
  assert.ok(pageCount > 1, `Expected multiple pages, got ${pageCount}`);
});

test('upload failure preserves approval and retry reuses Drive file ID after lost response', async () => {
  process.env.GOOGLE_DRIVE_CLIENT_ID = 'test-client';
  process.env.GOOGLE_DRIVE_CLIENT_SECRET = 'test-secret';
  process.env.PORTAL_SITE_URL = 'http://localhost:3000';
  const outcomes: string[] = [];
  let fileId: string | null = null;
  let claimNumber = 0;
  let uploadCount = 0;
  let generatedIds = 0;
  let completed = false;
  const mockClient = {
    rpc: async (name: string, args: Record<string, unknown> = {}) => {
      if (name === 'claim_portal_surat_export')
        return {
          data: completed ? null : { claim_id: `claim-${++claimNumber}`, file_id: fileId },
          error: null,
        };
      if (name === 'get_portal_drive_connection')
        return {
          data: {
            encrypted_token: encryptDriveSecret('test-refresh-token'),
            folder_id: 'folder_123',
            folder_name: 'Surat',
          },
          error: null,
        };
      if (name === 'finish_portal_surat_export') {
        fileId = args.file_value as string | null;
        outcomes.push(args.outcome as string);
        if (args.outcome === 'ready') completed = true;
        return { error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: letter, error: null }) }) }),
    }),
  } as unknown as SupabaseClient<Database>;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://oauth2.googleapis.com/token')
      return Response.json({ access_token: 'short-lived-token' });
    if (url.includes('/files/folder_123'))
      return Response.json({
        id: 'folder_123',
        name: 'Surat',
        mimeType: 'application/vnd.google-apps.folder',
        capabilities: { canAddChildren: true },
      });
    if (url.includes('/files/generateIds')) {
      generatedIds++;
      return Response.json({ ids: ['drive_file_123'] });
    }
    if (url.includes('/upload/')) {
      uploadCount++;
      assert.match(Buffer.from(init!.body as Uint8Array).toString('latin1'), /%PDF-/);
      if (uploadCount === 1) throw new Error('Simulated lost response after successful upload');
      return Response.json({}, { status: 409 });
    }
    if (url.includes('/files/drive_file_123'))
      return Response.json({
        id: 'drive_file_123',
        mimeType: 'application/pdf',
        appProperties: { surat_id: id },
      });
    throw new Error(`Unexpected fetch: ${url}`);
  };
  assert.ok(await exportSurat(mockClient, id));
  assert.equal(letter.status, 'Selesai / Disetujui');
  assert.equal(outcomes.at(-1), 'failed');
  assert.equal(fileId, 'drive_file_123');
  assert.equal(await exportSurat(mockClient, id), null);
  assert.equal(generatedIds, 1);
  assert.equal(outcomes.at(-1), 'ready');
  assert.equal(await exportSurat(mockClient, id), null);
  assert.equal(uploadCount, 2);
});

test('folder verification rejects read-only, trashed and non-folder destinations', async () => {
  for (const folder of [
    { mimeType: 'application/pdf', capabilities: { canAddChildren: true } },
    { mimeType: 'application/vnd.google-apps.folder', capabilities: { canAddChildren: false } },
    {
      mimeType: 'application/vnd.google-apps.folder',
      trashed: true,
      capabilities: { canAddChildren: true },
    },
  ]) {
    globalThis.fetch = async () => Response.json({ id: 'folder_123', name: 'Surat', ...folder });
    await assert.rejects(readDriveFolder('token', 'folder_123'), /folder Google Drive/);
  }
});
