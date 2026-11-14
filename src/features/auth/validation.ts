import { z } from 'zod';
import { INPUT_LIMITS } from '@/features/portal/validation';

export const gmailSchema = z
  .email()
  .max(INPUT_LIMITS.EMAIL)
  .refine((value) => value.endsWith('@gmail.com'), 'Gunakan alamat @gmail.com.');
export const passwordSchema = z
  .string()
  .min(8, 'Kata sandi minimal 8 karakter.')
  .max(INPUT_LIMITS.PASSWORD);
export const registrationSchema = z
  .object({
    nama_lengkap: z.string().trim().min(1).max(200),
    email: gmailSchema,
    password: passwordSchema,
    confirmation: z.string(),
  })
  .strict()
  .refine((value) => value.password === value.confirmation, 'Konfirmasi kata sandi tidak cocok.');
export const resetSchema = z
  .object({ password: passwordSchema, confirmation: z.string() })
  .strict()
  .refine((value) => value.password === value.confirmation, 'Konfirmasi kata sandi tidak cocok.');
export const accessInput = z
  .object({
    id: z.uuid(),
    expected_version: z.number().int().nonnegative(),
    level: z.enum(['guest', 'inti', 'kabid', 'kadiv', 'staff']),
    jabatan: z.string().trim().min(1).max(200),
    bidang_id: z.string().min(1).max(100).nullable(),
    divisi_id: z.string().min(1).max(100).nullable(),
  })
  .strict()
  .refine((value) => {
    if (value.level === 'guest' || value.level === 'inti')
      return !value.bidang_id && !value.divisi_id;
    if (value.level === 'kabid') return !!value.bidang_id && !value.divisi_id;
    return !!value.bidang_id && !!value.divisi_id;
  }, 'Penempatan bidang/divisi tidak sesuai role.');
