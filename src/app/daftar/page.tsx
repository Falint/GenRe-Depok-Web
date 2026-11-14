import AccountForm from '@/features/auth/AccountForm';
import { hasSupabaseConfig } from '@/lib/supabase/config';
export const metadata = { title: 'Daftar akun' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <AccountForm
      mode="register"
      configured={hasSupabaseConfig()}
      invalid={!!(await searchParams).error}
    />
  );
}
