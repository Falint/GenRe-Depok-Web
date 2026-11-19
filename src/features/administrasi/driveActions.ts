'use server';
import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getProfile } from '@/features/auth/server';
import { isAdmin, requirePermission } from '@/features/auth/permissions';
import { createClient } from '@/lib/supabase/server';
import { safeError, PortalError, type Result } from '@/lib/errors';
import { checkWrite, mutate } from '@/features/portal/mutations';
import { encryptDriveSecret } from './driveCrypto';
import {
  DRIVE_SCOPE,
  googleConfig,
  driveConnection,
  driveAccess,
  driveId,
  readDriveFolder,
} from './drive';

export async function connectGoogleDrive(): Promise<Result<string>> {
  try {
    const profile = await getProfile();
    requirePermission(!!profile && isAdmin(profile.level));
    const config = googleConfig();
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const store = await cookies();
    store.set(
      'portal-drive-oauth',
      encryptDriveSecret(
        JSON.stringify({ state, verifier, userId: profile!.id, expires: Date.now() + 600000 }),
      ),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.origin.startsWith('https:'),
        path: '/auth/google-drive/callback',
        maxAge: 600,
      },
    );
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callback,
      response_type: 'code',
      scope: DRIVE_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString();
    return { ok: true, data: url.href };
  } catch (error) {
    return { ok: false, error: safeError(error, 'drive:connect') };
  }
}

export async function getDriveSettings(): Promise<
  Result<{ connected: boolean; folderName: string | null }>
> {
  try {
    const profile = await getProfile();
    requirePermission(!!profile && isAdmin(profile.level));
    const connection = await driveConnection(await createClient());
    return {
      ok: true,
      data: { connected: !!connection, folderName: connection?.folder_name ?? null },
    };
  } catch (error) {
    return { ok: false, error: safeError(error, 'drive:settings') };
  }
}

export async function getDrivePicker(): Promise<
  Result<{ token: string; apiKey: string; appId: string }>
> {
  try {
    const profile = await getProfile();
    requirePermission(!!profile && isAdmin(profile.level));
    const apiKey = process.env.GOOGLE_PICKER_API_KEY;
    const appId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER;
    if (!apiKey || !appId)
      throw new PortalError('Konfigurasi Google Picker belum lengkap. Hubungi admin.');
    const { token } = await driveAccess(await createClient());
    return { ok: true, data: { token, apiKey, appId } };
  } catch (error) {
    return { ok: false, error: safeError(error, 'drive:picker') };
  }
}

export async function selectDriveFolder(input: string) {
  return mutate('drive:folder', async (client, profile) => {
    requirePermission(isAdmin(profile.level));
    const { token } = await driveAccess(client);
    const folder = await readDriveFolder(token, driveId.parse(input));
    const { error } = await client.rpc('save_portal_drive_connection', {
      token_value: null,
      folder_value: folder.id,
      name_value: folder.name,
    });
    checkWrite(error);
    revalidatePath('/administrasi');
  });
}
