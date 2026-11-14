import AccountForm from '@/features/auth/AccountForm';
import { hasSupabaseConfig } from '@/lib/supabase/config';
export const metadata = { title: 'Lupa kata sandi' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <AccountForm
      mode="recovery"
      configured={hasSupabaseConfig()}
      invalid={!!(await searchParams).error}
    />
  );
}
