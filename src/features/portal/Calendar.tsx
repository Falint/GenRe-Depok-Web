'use client';
import { useState } from 'react';
import { usePortal } from './PortalProvider';
import { useFeatureData } from './useFeatureData';
import { wibInput, entriesOnDate } from './datetime';
import { formatDate } from './mapping';
import { PANITIA_STATUS } from '@/features/panitia/schema';
import { loadPanitia } from '@/features/panitia/actions';
const TABLES = ['panitia_requests', 'panitia_assignments', 'profiles'] as const;
export type CalendarEntry = {
  id: string;
  title: string;
  date: string;
  end?: string;
  cancelled?: boolean;
  kind: string;
};
export default function Calendar() {
  const { pengumumanList, tiketList } = usePortal();
  const { data, error, refresh } = useFeatureData(loadPanitia, TABLES);
  const [month, setMonth] = useState(() => wibInput(new Date().toISOString()).slice(0, 7));
  const [selected, setSelected] = useState('');
  const entries: CalendarEntry[] = [];
  for (const item of pengumumanList) {
    if (item.mulai_at)
      entries.push({
        id: `event:${item.id}`,
        title: item.judul,
        date: item.mulai_at,
        end: item.selesai_at || undefined,
        cancelled: !!item.cancelled_at,
        kind: 'Kegiatan',
      });
    if (item.deadline_konfirmasi)
      entries.push({
        id: `confirmation:${item.id}`,
        title: item.judul,
        date: item.deadline_konfirmasi,
        cancelled: !!item.cancelled_at,
        kind: 'Deadline konfirmasi',
      });
  }
  for (const item of tiketList)
    if (item.deadline_at)
      entries.push({
        id: `ticket:${item.id}`,
        title: item.judul,
        date: item.deadline_at,
        kind: `Deadline tiket · ${item.status}`,
      });
  for (const item of data?.requests || []) {
    entries.push({
      id: `panitia:${item.id}`,
      title: item.judul,
      date: item.mulai_at,
      end: item.selesai_at,
      kind: `Penugasan panitia · ${PANITIA_STATUS[item.status]}`,
    });
    entries.push({
      id: `response:${item.id}`,
      title: item.judul,
      date: item.deadline_respons,
      kind: `Deadline respons panitia · ${PANITIA_STATUS[item.status]}`,
    });
  }
  const [year, number] = month.split('-').map(Number);
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const label = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00Z`));
  const filtered = (
    selected
      ? entriesOnDate(entries, selected)
      : entries.filter(
          (e) =>
            wibInput(e.date).slice(0, 7) <= month && wibInput(e.end || e.date).slice(0, 7) >= month,
        )
  ).sort((a, b) => a.date.localeCompare(b.date));
  function move(delta: number) {
    setMonth(new Date(Date.UTC(year, number - 1 + delta, 1)).toISOString().slice(0, 7));
    setSelected('');
  }
  return (
    <section
      aria-label="Kalender kegiatan"
      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-slate-900">Kalender & Agenda · WIB</h2>
        <div className="flex items-center gap-3">
          <button
            aria-label="Bulan sebelumnya"
            className="rounded-lg border p-2"
            onClick={() => move(-1)}
          >
            ‹
          </button>
          <span className="text-sm font-semibold" aria-live="polite">
            {label}
          </span>
          <button
            aria-label="Bulan berikutnya"
            className="rounded-lg border p-2"
            onClick={() => move(1)}
          >
            ›
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-amber-800">
          Jadwal panitia belum dapat dimuat.{' '}
          <button onClick={() => void refresh()} className="underline">
            Coba lagi
          </button>
        </p>
      )}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
          <span key={day} className="py-2 font-bold text-slate-500">
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank:${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`;
          const count = entriesOnDate(entries, date).length;
          return (
            <button
              key={date}
              aria-label={`${i + 1} ${label}, ${count} agenda`}
              aria-pressed={selected === date}
              onClick={() => setSelected(selected === date ? '' : date)}
              className={`min-h-12 rounded-lg border p-1 ${selected === date ? 'border-genre-blue bg-blue-50 text-genre-blue' : 'border-slate-100'}`}
            >
              {i + 1}
              {count > 0 && (
                <span className="block text-[10px] font-bold text-genre-blue">{count} agenda</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-sm">
        <h3 className="font-bold">{selected ? `Agenda ${selected}` : 'Agenda bulan ini'}</h3>
        {selected && (
          <button className="text-genre-blue" onClick={() => setSelected('')}>
            Seluruh bulan
          </button>
        )}
      </div>
      {!filtered.length && (
        <p className="text-sm text-slate-500">Belum ada agenda pada periode ini.</p>
      )}
      <ul className="space-y-2">
        {filtered.map((entry) => (
          <li key={entry.id} className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-bold">
              {entry.title}
              {entry.cancelled ? ' · Dibatalkan' : ''}
            </p>
            <p className="text-xs text-slate-600">
              {entry.kind} · {formatDate(entry.date)}
              {entry.end ? ` – ${formatDate(entry.end)}` : ''} WIB
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">
        Deadline tiket lama berupa teks muncul setelah tanggal kalender ditetapkan. Penugasan
        panitia mengikuti akses akun.
      </p>
    </section>
  );
}
