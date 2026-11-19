import 'server-only';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { PortalError, checkWrite } from '@/lib/errors';
import { decryptDriveSecret } from './driveCrypto';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const driveId = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);
export function googleConfig() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const origin = process.env.PORTAL_SITE_URL;
  if (!clientId || !clientSecret || !origin || !URL.canParse(origin))
    throw new PortalError('Konfigurasi OAuth Google Drive belum lengkap. Hubungi admin.');
  const site = new URL(origin);
  if (
    site.protocol !== 'https:' &&
    !(site.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(site.hostname))
  )
    throw new PortalError('PORTAL_SITE_URL harus HTTPS, kecuali untuk localhost.');
  return {
    clientId,
    clientSecret,
    callback: new URL('/auth/google-drive/callback', site.origin).href,
    origin: site.origin,
  };
}

export async function googleToken(params: Record<string, string>) {
  const config = googleConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...params,
    }),
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new PortalError(
      'Izin Google Drive berakhir atau ditolak. Admin perlu menghubungkan ulang akun.',
    );
  return z
    .object({
      access_token: z.string().min(1),
      refresh_token: z.string().optional(),
      scope: z.string().optional(),
    })
    .parse(await response.json());
}

export async function driveConnection(client: SupabaseClient<Database>) {
  const { data, error } = await client.rpc('get_portal_drive_connection');
  checkWrite(error);
  return data;
}

export async function driveAccess(client: SupabaseClient<Database>) {
  const connection = await driveConnection(client);
  if (!connection)
    throw new PortalError('Admin perlu menghubungkan akun Google Drive terlebih dahulu.');
  const token = await googleToken({
    grant_type: 'refresh_token',
    refresh_token: decryptDriveSecret(connection.encrypted_token),
  });
  return { token: token.access_token, connection };
}

export async function driveRequest(token: string, path: string, init: RequestInit = {}) {
  return fetch(`https://www.googleapis.com/${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  });
}

export async function readDriveFolder(token: string, folderId: string) {
  const response = await driveRequest(
    token,
    `drive/v3/files/${driveId.parse(folderId)}?fields=id,name,mimeType,trashed,capabilities(canAddChildren)`,
  );
  if (!response.ok)
    throw new PortalError(
      'Folder Drive tidak dapat diakses. Pilih ulang folder melalui Google Picker.',
    );
  const folder = z
    .object({
      id: driveId,
      name: z.string().max(500),
      mimeType: z.string(),
      trashed: z.boolean().optional(),
      capabilities: z.object({ canAddChildren: z.boolean().optional() }).optional(),
    })
    .parse(await response.json());
  if (
    folder.mimeType !== 'application/vnd.google-apps.folder' ||
    folder.trashed ||
    !folder.capabilities?.canAddChildren
  )
    throw new PortalError('Pilih folder Google Drive yang bisa ditulisi akun terhubung.');
  return folder;
}
