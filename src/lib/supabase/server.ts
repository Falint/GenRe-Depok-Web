import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from './config';
import type { Database } from './database.types';

export async function createClient() {
  const { url, key } = getSupabaseConfig();
  const store = await cookies();
  return createServerClient<Database>(url, key, {
    cookieOptions: { sameSite: 'lax', secure: url.startsWith('https:') },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        // Server Components read cookies; proxy and Server Actions persist refreshes.
        try {
          values.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch (error) {
          if (!(error instanceof Error && error.message.includes('Cookies can only be modified')))
            throw error;
        }
      },
    },
  });
}
