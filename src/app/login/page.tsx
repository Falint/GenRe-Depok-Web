import { redirect } from 'next/navigation';
import { safeReturnPath } from '@/features/portal/routes';
import { getProfile } from '@/features/auth/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import LoginPage from '@/features/auth/LoginPage';
export const metadata = { title: 'Masuk' };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const returnPath = safeReturnPath((await searchParams).next);
  if (await getProfile()) redirect(returnPath);
  return <LoginPage returnPath={returnPath} configured={hasSupabaseConfig()} />;
}
