import { redirect } from 'next/navigation';
import { accountDestination } from '@/features/auth/policy';
import { getProfile } from '@/features/auth/server';
export default async function Home() {
  const profile = await getProfile();
  redirect(profile ? accountDestination(profile.level) : '/login');
}
