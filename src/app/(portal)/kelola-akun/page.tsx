import { redirect } from 'next/navigation';
import { requireProfile } from '@/features/auth/server';
import { listAccounts } from '@/features/auth/accountActions';
import AccountManager from '@/features/auth/AccountManager';
import { createClient } from '@/lib/supabase/server';
import { divisionSchema } from '@/features/panitia/schema';
import { z } from 'zod';
import { checkWrite } from '@/features/portal/mutations';
export const metadata = { title: 'Kelola akun' };
export default async function Page() {
  const profile = await requireProfile();
  if (profile.level !== 'admin') redirect('/dashboard');
  const client = await createClient();
  const [initial, fields, divisions] = await Promise.all([
    listAccounts('', 0),
    client.from('bidang').select('id,nama').order('nama'),
    client.from('divisi').select('*').order('nama'),
  ]);
  checkWrite(fields.error);
  checkWrite(divisions.error);
  return (
    <AccountManager
      initial={initial}
      fields={z.array(z.object({ id: z.string(), nama: z.string() })).parse(fields.data)}
      divisions={z.array(divisionSchema).parse(divisions.data)}
    />
  );
}
