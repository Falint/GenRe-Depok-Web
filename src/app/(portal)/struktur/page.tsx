import StrukturJobdescTab from '@/features/organisasi/StrukturJobdescTab';
import { JOBDESC_DATA } from '@/features/organisasi/jobdescs';
export const metadata = { title: 'Struktur & Jobdesc' };
export default function Page() {
  return <StrukturJobdescTab jobdescs={JOBDESC_DATA} />;
}
