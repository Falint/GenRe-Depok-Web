import AdministrasiTab from '@/features/administrasi/AdministrasiTab';
import { requireProfile } from '@/features/auth/server';
import { canApproveOrConfirm } from '@/features/auth/permissions';
import { redirect } from 'next/navigation';
export const metadata = { title: 'Administrasi & Keuangan' };
export default async function Page() {
  const profile = await requireProfile();
  if (!canApproveOrConfirm(profile.level)) redirect('/dashboard');
  return <AdministrasiTab />;
}
