import { redirect } from 'next/navigation';
import { accountDestination } from '@/features/auth/policy';
import { safeReturnPath } from '@/features/portal/routes';
import { getProfile } from '@/features/auth/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import LoginPage from '@/features/auth/LoginPage';
export const metadata = { title: 'Masuk' };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; verified?: string; password?: string }>;
}) {
  const params = await searchParams;
  const returnPath = params.next ? safeReturnPath(params.next) : '';
  const profile = await getProfile();
  if (profile) redirect(accountDestination(profile.level, params.next));
  return (
    <LoginPage
      returnPath={returnPath}
      configured={hasSupabaseConfig()}
      verified={params.verified === '1'}
      passwordChanged={params.password === 'changed'}
    />
  );
}
