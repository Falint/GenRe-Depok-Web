import { z } from 'zod';

const publicConfig = z.object({
  url: z.url().refine((url) => {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' ||
      (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))
    );
  }),
  key: z
    .string()
    .min(1)
    .refine((key) => {
      if (key.startsWith('sb_secret_')) return false;
      if (!key.startsWith('eyJ')) return key.startsWith('sb_publishable_');
      try {
        const payload: unknown = JSON.parse(
          atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
        );
        return z.object({ role: z.literal('anon') }).safeParse(payload).success;
      } catch {
        return false;
      }
    }),
});

export function getSupabaseConfig() {
  const config = publicConfig.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!config.success)
    throw new Error(
      'Konfigurasi Supabase belum tersedia atau tidak valid. Periksa NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  return config.data;
}

export function hasSupabaseConfig() {
  try {
    getSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}
