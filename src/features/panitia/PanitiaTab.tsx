'use client';
import { useNow } from '@/features/portal/useNow';
import { useRef, useState } from 'react';
import Dialog from '@/components/Dialog';
import { usePortal } from '@/features/portal/PortalProvider';
import { useFeatureData } from '@/features/portal/useFeatureData';
import { formatDate } from '@/features/portal/mapping';
import { fromWib } from '@/features/portal/datetime';
import type { Result } from '@/lib/errors';
import { loadPanitia, createRequest, decideRequest, assignMembers } from './actions';
import { PANITIA_STATUS, canAssignMember, type PanitiaRequest } from './schema';

export const PANITIA_TABLES = [
  'panitia_requests',
  'panitia_assignments',
  'panitia_history',
  'profiles',
  'divisi',
] as const;
const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm';
const buttonClass =
  'rounded-xl bg-genre-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50';
export default function PanitiaTab() {
  const now = useNow();
  const { currentRole } = usePortal();
  const { data, error, loading, refresh } = useFeatureData(loadPanitia, PANITIA_TABLES);
  const [creating, setCreating] = useState(false);
  const [origin, setOrigin] = useState('');
  const [active, setActive] = useState<PanitiaRequest | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const draftId = useRef('');
  const [filter, setFilter] = useState('semua');
  async function run(work: () => Promise<Result>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await work();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setCreating(false);
      setActive(null);
      setReason('');
      await refresh();
      setMessage('Perubahan panitia tersimpan.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Koneksi terputus. Muat ulang sebelum mencoba lagi.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const label = (id: string) => data?.divisions.find((d) => d.id === id)?.nama || id;
  return (
    <section className="space-y-4" aria-label="Kebutuhan panitia">
      <div className="flex flex-wrap justify-between gap-3">
        <p className="max-w-xl text-sm text-slate-600">
          Ajukan kebutuhan ke divisi bidang lain. Kadiv tujuan menentukan anggota. Penugasan panitia
          terpisah dari absensi kegiatan.
        </p>
        {(currentRole.level === 'admin' ||
          (currentRole.level === 'kadiv' && currentRole.divisiId)) && (
          <button
            className={buttonClass}
            disabled={!data}
            onClick={() => {
              draftId.current = crypto.randomUUID();
              setMessage('');
              setOrigin('');
              setCreating(true);
            }}
          >
            Ajukan Kebutuhan Panitia
          </button>
        )}
      </div>
      {currentRole.level === 'kadiv' && !currentRole.divisiId && (
        <p role="status">
          Divisi akun belum dipetakan. Administrator perlu menetapkan divisi sebelum Anda mengajukan
          kebutuhan.
        </p>
      )}
      <button className="text-sm font-semibold text-genre-blue" onClick={() => void refresh()}>
        Muat ulang panitia
      </button>
      {loading && <p role="status">Memuat kebutuhan panitia…</p>}
      {error && <p role="alert">{error}</p>}
      {message && !creating && !active && <p role="status">{message}</p>}
      <label className="block text-sm">
        Tampilkan{' '}
        <select className={inputClass} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="semua">Semua yang dapat saya lihat</option>
          <option value="masuk">Permintaan masuk</option>
          <option value="keluar">Pengajuan saya</option>
          <option value="tugas">Penugasan saya</option>
        </select>
      </label>
      {data && !data.requests.length && (
        <p className="rounded-2xl border bg-white p-6 text-slate-500">
          Belum ada kebutuhan panitia yang dapat Anda lihat.
        </p>
      )}
      {data?.requests
        .filter(
          (r) =>
            filter === 'semua' ||
            (filter === 'masuk' && r.divisi_tujuan_id === currentRole.divisiId) ||
            (filter === 'keluar' && r.pemohon_id === currentRole.userId) ||
            (filter === 'tugas' &&
              data.assignments.some(
                (a) => a.request_id === r.id && a.user_id === currentRole.userId,
              )),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((r) => {
          const assignments = data.assignments
            .filter((a) => a.request_id === r.id)
            .sort((a, b) => a.nama.localeCompare(b.nama, 'id-ID'));
          const canProcess =
            (currentRole.level === 'admin' ||
              (currentRole.level === 'kadiv' && currentRole.divisiId === r.divisi_tujuan_id)) &&
            new Date(r.mulai_at).getTime() > now &&
            r.status !== 'rejected';
          return (
            <article
              key={r.id}
              className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-slate-900">{r.judul}</h3>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-genre-blue">
                  {PANITIA_STATUS[r.status]}
                </span>
              </div>
              <p className="text-sm">
                {r.pemohon_nama} · {label(r.divisi_asal_id)} ke {label(r.divisi_tujuan_id)}
              </p>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{r.deskripsi}</p>
              <p className="text-sm">
                Kebutuhan: {r.jumlah} orang · Deadline respons: {formatDate(r.deadline_respons)} WIB
                {r.status === 'pending' && Date.parse(r.deadline_respons) < now
                  ? ' · Terlambat, masih dapat diproses sebelum mulai'
                  : ''}
              </p>
              <p className="text-sm">
                Penugasan: {formatDate(r.mulai_at)} – {formatDate(r.selesai_at)} WIB
              </p>
              <p className="text-sm">
                Panitia{currentRole.level === 'staff' ? ' (penugasan Anda)' : ''}:{' '}
                {assignments.map((a) => a.nama).join(', ') || 'Belum ditetapkan'}
              </p>
              <p className="text-xs text-slate-500">
                Dibuat {formatDate(r.created_at)} · Diperbarui {formatDate(r.updated_at)} WIB
              </p>
              {canProcess && (
                <button
                  className={buttonClass}
                  onClick={() => {
                    setActive(r);
                    setSelected(assignments.map((a) => a.user_id));
                    setReason('');
                    setMessage('');
                  }}
                >
                  {r.status === 'pending' ? 'Proses Permintaan' : 'Atur Panitia'}
                </button>
              )}
              {currentRole.level !== 'staff' && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-semibold">Riwayat perubahan</summary>
                  <ol className="mt-2 space-y-2">
                    {data.history
                      .filter((h) => h.request_id === r.id)
                      .sort((a, b) => a.created_at.localeCompare(b.created_at))
                      .map((h) => (
                        <li key={h.id} className="rounded-lg bg-slate-50 p-3">
                          {formatDate(h.created_at)} WIB · {h.actor_name} ·{' '}
                          {h.old_status ? `${PANITIA_STATUS[h.old_status]} → ` : ''}
                          {PANITIA_STATUS[h.new_status]}
                          {h.reason && <p>{h.reason}</p>}
                          {h.added.length > 0 && (
                            <p>Ditambahkan: {h.added.map((m) => m.nama).join(', ')}</p>
                          )}
                          {h.removed.length > 0 && (
                            <p>Dilepas: {h.removed.map((m) => m.nama).join(', ')}</p>
                          )}
                        </li>
                      ))}
                  </ol>
                </details>
              )}
            </article>
          );
        })}
      {creating && (
        <Dialog title="Ajukan Kebutuhan Panitia" busy={busy} onClose={() => setCreating(false)}>
          <div className="w-full max-w-xl rounded-2xl bg-white p-6">
            <h2 className="text-lg font-bold">Ajukan Kebutuhan Panitia</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run(() =>
                  createRequest(draftId.current, {
                    judul: String(f.get('judul')),
                    deskripsi: String(f.get('deskripsi')),
                    divisi_tujuan_id: String(f.get('divisi')),
                    ...(currentRole.level === 'admin'
                      ? { divisi_asal_id: String(f.get('asal')) }
                      : {}),
                    jumlah: Number(f.get('jumlah')),
                    deadline_respons: fromWib(String(f.get('deadline'))),
                    mulai_at: fromWib(String(f.get('mulai'))),
                    selesai_at: fromWib(String(f.get('selesai'))),
                  }),
                );
              }}
            >
              <label className="block text-sm">
                Judul kebutuhan
                <input name="judul" required maxLength={300} className={inputClass} />
              </label>
              {currentRole.level === 'admin' && (
                <label className="block text-sm">
                  Divisi asal
                  <select
                    name="asal"
                    required
                    className={inputClass}
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                  >
                    <option value="" disabled>
                      Pilih divisi asal
                    </option>
                    {data?.divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-sm">
                Divisi tujuan
                <select name="divisi" required className={inputClass} defaultValue="">
                  <option value="" disabled>
                    Pilih divisi bidang lain
                  </option>
                  {data?.divisions
                    .filter(
                      (d) =>
                        d.bidang_id !==
                        (currentRole.level === 'admin'
                          ? data.divisions.find((item) => item.id === origin)?.bidang_id
                          : currentRole.bidangId),
                    )
                    .map((d) => {
                      const kadiv = data.members.find(
                        (m) => m.divisi_id === d.id && m.level === 'kadiv',
                      );
                      return (
                        <option key={d.id} value={d.id} disabled={!kadiv}>
                          {d.nama} · {d.bidang_id} · {kadiv?.nama_lengkap || 'Belum ada Kadiv'}
                        </option>
                      );
                    })}
                </select>
              </label>
              <label className="block text-sm">
                Jumlah panitia
                <input
                  name="jumlah"
                  type="number"
                  min={1}
                  max={1000}
                  required
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                Rincian tugas
                <textarea name="deskripsi" required maxLength={10000} className={inputClass} />
              </label>
              {(
                [
                  ['deadline', 'Deadline respons'],
                  ['mulai', 'Mulai penugasan'],
                  ['selesai', 'Selesai penugasan'],
                ] as const
              ).map(([name, title]) => (
                <label key={name} className="block text-sm">
                  {title} (WIB)
                  <input name={name} type="datetime-local" required className={inputClass} />
                </label>
              ))}
              <p className="text-xs text-slate-500">
                Deadline respons harus sebelum mulai, dan waktu selesai sesudah mulai.
              </p>
              {message && <p role="alert">{message}</p>}
              <div className="flex gap-3">
                <button className={buttonClass} disabled={busy}>
                  Kirim Pengajuan
                </button>
                <button type="button" onClick={() => setCreating(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}
      {active && (
        <Dialog
          title={active.status === 'pending' ? 'Proses Permintaan' : 'Atur Panitia'}
          busy={busy}
          onClose={() => setActive(null)}
        >
          <div className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6">
            <h2 className="text-lg font-bold">{active.judul}</h2>
            {active.status !== 'pending' && (
              <fieldset>
                <legend>
                  Pilih anggota divisi Anda · {selected.length}/{active.jumlah}
                </legend>
                {data?.members
                  .filter(
                    (m) =>
                      canAssignMember(m, currentRole.divisiId) ||
                      data.assignments.some(
                        (a) => a.request_id === active.id && a.user_id === m.id,
                      ),
                  )
                  .map((m) => (
                    <label key={m.id} className="mt-3 flex gap-3">
                      <input
                        type="checkbox"
                        disabled={
                          !canAssignMember(m, currentRole.divisiId) && !selected.includes(m.id)
                        }
                        checked={selected.includes(m.id)}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id),
                          )
                        }
                      />
                      <span>
                        {m.nama_lengkap}
                        {!canAssignMember(m, currentRole.divisiId) && (
                          <span className="block text-xs text-amber-800">
                            Sudah pindah divisi/peran. Lepaskan penugasan ini.
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
              </fieldset>
            )}
            <label className="block text-sm">
              Alasan / catatan
              <textarea
                className={inputClass}
                maxLength={10000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <p className="text-xs text-slate-500">
              Alasan wajib untuk penolakan dan setiap perubahan panitia. Penugasan boleh bertahap.
            </p>
            {message && <p role="alert">{message}</p>}
            <div className="flex flex-wrap gap-3">
              {active.status === 'pending' ? (
                <>
                  <button
                    className={buttonClass}
                    onClick={() =>
                      void run(() =>
                        decideRequest({
                          id: active.id,
                          version: active.version,
                          approve: true,
                          reason,
                        }),
                      )
                    }
                  >
                    Setujui
                  </button>
                  <button
                    className={buttonClass}
                    disabled={!reason.trim()}
                    onClick={() =>
                      void run(() =>
                        decideRequest({
                          id: active.id,
                          version: active.version,
                          approve: false,
                          reason,
                        }),
                      )
                    }
                  >
                    Tolak
                  </button>
                </>
              ) : (
                <button
                  className={buttonClass}
                  disabled={!reason.trim() || selected.length > active.jumlah}
                  onClick={() =>
                    void run(() =>
                      assignMembers({
                        id: active.id,
                        version: active.version,
                        members: selected,
                        reason,
                      }),
                    )
                  }
                >
                  Simpan Penugasan
                </button>
              )}
              <button onClick={() => setActive(null)}>Tutup</button>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
}
