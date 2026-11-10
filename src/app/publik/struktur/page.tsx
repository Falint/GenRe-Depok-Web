import StrukturJobdescTab from '@/features/organisasi/StrukturJobdescTab';
import { JOBDESC_DATA } from '@/features/organisasi/jobdescs';
export const metadata = { title: 'Struktur dan jobdesc resmi' };
export default function Page() {
  const jobdescs = JOBDESC_DATA.map(({ no, jabatan, pejabat, kategori, jobdescPerbaikan }) => ({
    no,
    jabatan,
    pejabat,
    kategori,
    jobdescPerbaikan,
  }));
  return <StrukturJobdescTab jobdescs={jobdescs} publicView />;
}
