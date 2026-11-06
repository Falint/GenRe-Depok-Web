import { redirect } from 'next/navigation';
import { getProfile } from '@/features/auth/server';
export default async function Home() {
  redirect((await getProfile()) ? '/dashboard' : '/login');
}
