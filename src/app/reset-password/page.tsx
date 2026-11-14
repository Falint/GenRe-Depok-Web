import { redirect } from 'next/navigation';
import AccountForm from '@/features/auth/AccountForm';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';
export const metadata = { title: 'Kata sandi baru' };
export default async function Page() {
  if (!hasSupabaseConfig()) return <AccountForm mode="reset" configured={false} />;
  const { data, error } = await (await createClient()).auth.getUser();
  if (error || !data.user) redirect('/lupa-password');
  return <AccountForm mode="reset" configured />;
}
