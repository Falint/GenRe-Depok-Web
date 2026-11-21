'use client';
import { useEffect, useState } from 'react';
import type { Participant } from './registrationSchema';
import { loadEventParticipants, loadRegistrationEvents } from './actions';

export default function Participants({
  agendaId,
  selectedIds = [],
  onSelect,
}: {
  agendaId: string;
  selectedIds?: string[];
  onSelect?: (ids: string[]) => void;
}) {
  const [items, setItems] = useState<Participant[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    loadEventParticipants(agendaId)
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setItems(result.data);
          setError('');
        } else setError(result.error);
      })
      .catch(() => {
        if (active) setError('Koneksi terputus. Coba muat ulang peserta.');
      });
    return () => {
      active = false;
    };
  }, [agendaId, revision]);
  const filtered = items?.filter((item) =>
    `${item.nama} ${item.instansi} ${item.unsur}`
      .toLocaleLowerCase('id-ID')
      .includes(search.toLocaleLowerCase('id-ID')),
  );
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setRevision((value) => value + 1)}
        className="text-sm font-bold text-genre-blue underline"
      >
        Muat ulang peserta
      </button>
      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : items === null ? (
        <p role="status">Memuat peserta…</p>
      ) : (
        <>
          <p role="status" className="text-sm text-slate-600">
            {items.length} peserta{onSelect ? ` · ${selectedIds.length} dipilih` : ''}
          </p>
          {items.length === 0 ? (
            <p className="text-sm text-slate-600">Belum ada peserta terdaftar.</p>
          ) : (
            <>
              <label className="block text-sm font-semibold">
                Cari peserta
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-2"
                />
              </label>
              {onSelect && (
                <div className="flex flex-wrap gap-4 text-sm font-bold">
                  <button
                    type="button"
                    onClick={() => onSelect(items.map((item) => item.id))}
                    className="text-genre-blue underline"
                  >
                    Pilih semua peserta
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelect([])}
                    className="text-slate-600 underline"
                  >
                    Kosongkan pilihan
                  </button>
                </div>
              )}
              <div className="max-h-80 overflow-auto rounded-lg border border-slate-300">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Daftar peserta kegiatan</caption>
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      {onSelect && (
                        <th scope="col" className="p-2">
                          Pilih
                        </th>
                      )}
                      {['Nama', 'Instansi', 'Unsur'].map((label) => (
                        <th key={label} scope="col" className="p-2">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered?.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200">
                        {onSelect && (
                          <td className="p-2 align-top">
                            <input
                              type="checkbox"
                              aria-label={`Pilih ${item.nama}`}
                              checked={selectedIds.includes(item.id)}
                              onChange={(event) =>
                                onSelect(
                                  event.target.checked
                                    ? [...selectedIds, item.id]
                                    : selectedIds.filter((id) => id !== item.id),
                                )
                              }
                            />
                          </td>
                        )}
                        {[item.nama, item.instansi, item.unsur].map((value, index) => (
                          <td key={index} className="max-w-64 break-words p-2 align-top">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered?.length === 0 && (
                <p role="status" className="text-sm text-slate-600">
                  Peserta tidak ditemukan.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export function ParticipantPicker({
  agendaId,
  selectedIds,
  onChange,
}: {
  agendaId: string | null;
  selectedIds: string[];
  onChange: (agendaId: string | null, ids: string[]) => void;
}) {
  const [events, setEvents] = useState<{ id: string; judul: string }[] | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    loadRegistrationEvents()
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setEvents(result.data);
          setError('');
        } else setError(result.error);
      })
      .catch(() => {
        if (active) setError('Kegiatan belum dapat dimuat. Coba lagi.');
      });
    return () => {
      active = false;
    };
  }, [revision]);
  return (
    <section
      aria-label="Lampiran peserta"
      className="space-y-3 rounded-xl border border-slate-200 p-4"
    >
      <h4 className="font-bold">Lampiran peserta (opsional)</h4>
      <p className="text-xs text-slate-600">
        Pilih kegiatan dan peserta. Lampiran dibekukan saat pengajuan dan mengikuti izin baca surat.
      </p>
      {error ? (
        <>
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
            className="text-sm underline"
          >
            Muat ulang kegiatan
          </button>
        </>
      ) : events === null ? (
        <p role="status">Memuat kegiatan…</p>
      ) : (
        <>
          <label className="block text-sm font-semibold">
            Kegiatan untuk lampiran
            <select
              value={agendaId || ''}
              onChange={(event) => onChange(event.target.value || null, [])}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2"
            >
              <option value="">Tanpa lampiran</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.judul}
                </option>
              ))}
            </select>
          </label>
          {events.length === 0 && (
            <p className="text-sm text-slate-600">Belum ada agenda yang dapat dipilih.</p>
          )}
        </>
      )}
      {agendaId && (
        <Participants
          key={agendaId}
          agendaId={agendaId}
          selectedIds={selectedIds}
          onSelect={(ids) => onChange(agendaId, ids)}
        />
      )}
    </section>
  );
}
