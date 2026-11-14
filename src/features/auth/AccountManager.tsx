'use client';
import { useRef, useState } from 'react';
import Dialog from '@/components/Dialog';
import { listAccounts, setAccountAccess, type ManagedAccount } from './accountActions';
import type { Result } from '@/lib/errors';

export default function AccountManager({
  initial,
  fields,
  divisions,
}: {
  initial: Result<ManagedAccount[]>;
  fields: { id: string; nama: string }[];
  divisions: { id: string; nama: string; bidang_id: string }[];
}) {
  const [accounts, setAccounts] = useState(initial.ok ? initial.data : []);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState(initial.ok ? '' : initial.error);
  const [failure, setFailure] = useState(!initial.ok);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [active, setActive] = useState<ManagedAccount | null>(null);
  const [level, setLevel] = useState<'guest' | 'inti' | 'kabid' | 'kadiv' | 'staff'>('guest');
  const [field, setField] = useState('');
  const [division, setDivision] = useState('');
  const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm';
  const buttonClass =
    'rounded-xl bg-genre-blue px-4 py-3 text-sm font-bold text-white disabled:opacity-50';
  async function load(targetPage: number) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await listAccounts(search, targetPage);
      setFailure(!result.ok);
      if (result.ok) {
        setAccounts(result.data);
        setPage(targetPage);
      } else setMessage(result.error);
    } catch {
      setFailure(true);
      setMessage('Koneksi terputus. Coba muat ulang.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-black text-primera-navy">Kelola akun</h1>
      <p className="max-w-2xl text-sm text-slate-600">
        Angkat akun dengan Gmail terverifikasi menjadi pengurus. Role admin hanya diatur pemilik.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void load(0);
        }}
      >
        <label className="min-w-0 flex-1 text-sm font-semibold">
          Cari nama atau email
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={200}
            className={inputClass}
          />
        </label>
        <button disabled={busy} className={buttonClass}>
          Cari / muat ulang
        </button>
      </form>
      {message && (
        <p
          role={failure ? 'alert' : 'status'}
          className={failure ? 'text-sm text-rose-700' : 'text-sm text-emerald-700'}
        >
          {message}
        </p>
      )}
      {busy && <p role="status">Memuat…</p>}
      {!busy && !accounts.length && <p>Tidak ada akun ditemukan.</p>}
      <div className="space-y-3">
        {accounts.map((account) => (
          <article
            key={account.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="min-w-0">
              <h2 className="font-bold">{account.nama_lengkap}</h2>
              <p className="break-all text-sm text-slate-600">{account.email}</p>
              <p className="text-sm">
                {account.level} · {account.jabatan} ·{' '}
                {account.email_confirmed ? 'Email terverifikasi' : 'Belum verifikasi'}
              </p>
              <p className="text-xs text-slate-500">{account.bidang_divisi}</p>
            </div>
            {account.level !== 'admin' && (
              <button
                disabled={busy}
                className={buttonClass}
                onClick={() => {
                  setActive(account);
                  setLevel(account.level as typeof level);
                  setField(account.bidang_id || '');
                  setDivision(account.divisi_id || '');
                  setMessage('');
                }}
              >
                Ubah akses
              </button>
            )}
          </article>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <button
          disabled={busy || page === 0}
          onClick={() => void load(page - 1)}
          className={buttonClass}
        >
          Sebelumnya
        </button>
        <span className="text-sm">Halaman {page + 1}</span>
        <button
          disabled={busy || accounts.length < 50}
          onClick={() => void load(page + 1)}
          className={buttonClass}
        >
          Berikutnya
        </button>
      </div>
      {active && (
        <Dialog title="Ubah akses akun" busy={busy} onClose={() => setActive(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6">
            <h2 className="text-xl font-bold">Ubah akses akun</h2>
            <p className="mt-2 break-all text-sm">
              {active.nama_lengkap} · {active.email}
            </p>
            <form
              className="mt-5 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (pending.current) return;
                const form = new FormData(e.currentTarget);
                pending.current = true;
                setBusy(true);
                setMessage('');
                try {
                  const result = await setAccountAccess({
                    id: active.id,
                    expected_version: active.access_version ?? 0,
                    level,
                    jabatan: level === 'guest' ? 'Tamu' : String(form.get('jabatan')),
                    bidang_id: ['kabid', 'kadiv', 'staff'].includes(level) ? field || null : null,
                    divisi_id: ['kadiv', 'staff'].includes(level) ? division || null : null,
                  });
                  setFailure(!result.ok);
                  if (!result.ok) {
                    setMessage(result.error);
                    return;
                  }
                  setActive(null);
                  const updated = await listAccounts(search, page);
                  if (updated.ok) {
                    setAccounts(updated.data);
                    setMessage('Akses akun diperbarui.');
                  } else {
                    setFailure(true);
                    setMessage(`Akses tersimpan. ${updated.error}`);
                  }
                } catch {
                  setFailure(true);
                  setMessage('Koneksi terputus. Muat ulang akun sebelum mengulang perubahan.');
                } finally {
                  pending.current = false;
                  setBusy(false);
                }
              }}
            >
              <fieldset disabled={busy} className="space-y-4">
                <label className="block text-sm">
                  Role
                  <select
                    value={level}
                    onChange={(e) => {
                      setLevel(e.target.value as typeof level);
                      setField('');
                      setDivision('');
                    }}
                    className={inputClass}
                  >
                    {['guest', 'staff', 'kadiv', 'kabid', 'inti'].map((role) => (
                      <option key={role} disabled={!active.email_confirmed && role !== 'guest'}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                {level !== 'guest' && (
                  <label className="block text-sm">
                    Jabatan
                    <input
                      name="jabatan"
                      defaultValue={active.jabatan === 'Tamu' ? '' : active.jabatan}
                      required
                      maxLength={200}
                      className={inputClass}
                    />
                  </label>
                )}
                {['kabid', 'kadiv', 'staff'].includes(level) && (
                  <label className="block text-sm">
                    Bidang
                    <select
                      required
                      value={field}
                      onChange={(e) => {
                        setField(e.target.value);
                        setDivision('');
                      }}
                      className={inputClass}
                    >
                      <option value="">Pilih bidang</option>
                      {fields.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nama}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {['kadiv', 'staff'].includes(level) && (
                  <label className="block text-sm">
                    Divisi
                    <select
                      required
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Pilih divisi</option>
                      {divisions
                        .filter((item) => item.bidang_id === field)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nama}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                {level === 'guest' && (
                  <p className="text-sm text-slate-600">
                    Akses internal dicabut. Riwayat akun tetap disimpan.
                  </p>
                )}
                <button className={buttonClass}>{busy ? 'Menyimpan…' : 'Simpan akses'}</button>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="ml-4 text-sm font-bold"
                >
                  Batal
                </button>
              </fieldset>
              {message && (
                <p role={failure ? 'alert' : 'status'} className="text-sm text-rose-700">
                  {message}
                </p>
              )}
            </form>
          </div>
        </Dialog>
      )}
    </section>
  );
}
