'use client';
import { useState } from 'react';
import { loadContentHistory } from './actions';
import { formatDate } from '@/features/portal/mapping';
import type { z } from 'zod';
import type { contentHistorySchema } from './schema';
const labels: Record<string, string> = {
  judul: 'Judul',
  isi: 'Isi',
  kategori: 'Kategori',
  target: 'Sasaran',
  penulis_nama: 'Penulis',
  mulai_at: 'Mulai kegiatan',
  selesai_at: 'Selesai kegiatan',
  deadline_konfirmasi: 'Deadline konfirmasi',
  cancelled_at: 'Waktu pembatalan',
  cancellation_reason: 'Alasan pembatalan',
  jenis: 'Jenis media',
  deskripsi: 'Deskripsi',
  url: 'Link file',
  jenjang: 'Sasaran jenjang',
  halaman: 'Jumlah halaman',
  tahun: 'Tahun materi',
  format: 'Format',
  size: 'Ukuran file',
  durasi: 'Durasi',
  archived_at: 'Waktu arsip',
};
function displayValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === '') return 'Belum diisi';
  return key.endsWith('_at') || key === 'deadline_konfirmasi'
    ? `${formatDate(String(value))} WIB`
    : String(value);
}
export default function ContentHistory({
  type,
  id,
}: {
  type: 'pengumuman' | 'media_resources';
  id: string;
}) {
  const [rows, setRows] = useState<z.infer<typeof contentHistorySchema>[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <details
      className="text-xs"
      onToggle={async (e) => {
        if (!e.currentTarget.open) return;
        setLoading(true);
        setError('');
        try {
          const result = await loadContentHistory(type, id);
          if (result.ok) setRows(result.data);
          else setError(result.error);
        } catch {
          setError('Riwayat gagal dimuat.');
        } finally {
          setLoading(false);
        }
      }}
    >
      <summary className="cursor-pointer font-semibold">Riwayat konten</summary>
      {loading && <p role="status">Memuat…</p>}
      {error && <p role="alert">{error}</p>}
      <ol className="mt-2 space-y-2">
        {rows
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((row) => (
            <li key={row.id} className="rounded-xl bg-slate-50 p-3">
              <p>
                {formatDate(row.created_at)} WIB · {row.actor_name} ·{' '}
                {row.action === 'insert' ? 'Ditambahkan' : 'Diperbarui'}
              </p>
              {Object.keys(row.after_data)
                .filter(
                  (key) =>
                    key in labels &&
                    JSON.stringify(row.before_data?.[key]) !== JSON.stringify(row.after_data[key]),
                )
                .map((key) => (
                  <p key={key} className="break-words">
                    {labels[key]}: {displayValue(key, row.before_data?.[key])} →{' '}
                    {displayValue(key, row.after_data[key])}
                  </p>
                ))}
            </li>
          ))}
      </ol>
      {!loading && !error && rows.length === 0 && <p>Belum ada riwayat tercatat.</p>}
    </details>
  );
}
