import type { Row } from '@/features/portal/schema';
import { SURAT_STATUS } from '@/features/portal/schema';

export const SURAT_OPENING =
  'Bersama ini disampaikan bahwa kami, Forum Generasi Berencana (GenRe) Kota Depok yang berada dibawah naungan Dinas Pemberdayaan Perempuan, Perlindungan Anak, Pengendalian Penduduk dan Keluarga Berencana (DP3AP2KB) Kota Depok memiliki program yang mengedepankan penguatan karakter, kesehatan reproduksi dan pencegahan perilaku berisiko serta meningkatkan ketahanan keluarga khususnya ketahanan remaja di Kota Depok.';
export const SURAT_PARAGRAPH_EXAMPLE =
  'Oleh karena itu, dalam rangka meningkatkan partisipasi remaja yang bermakna dan inklusif atau Meaningful and Inclusive Youth Participation (MIYP) dan untuk mengoptimalkan struktural keorganisasian Forum Genre Kota Depok dan akan menyelenggarakan Wawancara Calon Pengurus Forum Genre Kota Depok Fase ke-2.';
export const SURAT_SCHEDULE_INTRO =
  'Sehubungan dengan pelaksanaan kegiatan tersebut, berikut kami sampaikan rincian kegiatan:';
export const SURAT_SIGNATORIES = [
  { key: 'ketua', role: 'Ketua Forum GenRe Kota Depok', name: 'M. Ighasta Mughis' },
  { key: 'sekretaris', role: 'Sekretaris', name: 'Raihan Satria Elezar' },
] as const;

export function isSuratApproved(status: string | null) {
  return status === SURAT_STATUS.COMPLETE || status === 'Selesai / Terbit (QR ACC)';
}

export function suratSchedule(
  surat: Pick<
    Row<'surat'>,
    'tanggal_kegiatan' | 'waktu_kegiatan' | 'tempat_kegiatan' | 'sistem_pelaksanaan'
  >,
) {
  return [
    [
      'Hari, Tanggal',
      surat.tanggal_kegiatan
        ? new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Jakarta',
          }).format(new Date(`${surat.tanggal_kegiatan}T00:00:00+07:00`))
        : '',
    ],
    ['Waktu', surat.waktu_kegiatan],
    ['Tempat', surat.tempat_kegiatan],
    ['Sistem Pelaksanaan', surat.sistem_pelaksanaan],
  ].filter((row): row is [string, string] => Boolean(row[1]));
}

export function suratClosing(jenis: string) {
  return `Demikian ${jenis.toLowerCase()} ini kami sampaikan. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.`;
}
