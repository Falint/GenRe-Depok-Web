import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { PortalError } from '@/lib/errors';

function key() {
  const value = process.env.GOOGLE_DRIVE_TOKEN_KEY || '';
  if (!/^[a-f\d]{64}$/i.test(value))
    throw new PortalError('Konfigurasi enkripsi Google Drive belum tersedia. Hubungi admin.');
  return Buffer.from(value, 'hex');
}

export function encryptDriveSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptDriveSecret(value: string) {
  const [version, iv, tag, data, extra] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !data || extra)
    throw new PortalError('Koneksi Google Drive tidak valid. Hubungkan ulang akun.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
