'use client';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/components/Dialog';
import { fromWib, wibInput } from '@/features/portal/datetime';
import { formatDate } from '@/features/portal/mapping';
import { PortalError } from '@/lib/errors';
import { savePublicContent } from './actions';
import type { ContentKind, PublicContent } from './schema';

export default function ContentManager({ items }: { items: PublicContent[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PublicContent | 'new' | null>(null);
  const [message, setMessage] = useState('');
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Konten Publik</h1>
          <p className="mt-2 text-sm text-slate-600">
            Kelola berita dan agenda. Konten yang diterbitkan dapat dibaca semua pengunjung.
          </p>
        </div>
        <button
          onClick={() => {
            setMessage('');
            setEditing('new');
          }}
          className="rounded-xl bg-genre-blue px-5 py-3 text-sm font-bold text-white"
        >
          Tambah konten
        </button>
      </div>
      {message && (
        <p role="status" className="text-sm text-emerald-800">
          {message}
        </p>
      )}
      <button
        onClick={() => router.refresh()}
        className="text-sm font-bold text-genre-blue underline"
      >
        Muat ulang konten
      </button>
      {!items.length && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Belum ada konten. Pilih Tambah konten untuk menulis berita atau agenda.
        </p>
      )}
      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-600">
                {item.jenis === 'berita' ? 'Berita' : 'Agenda'} ·{' '}
                {item.status === 'published' ? 'Terbit' : 'Draft'}
              </p>
              <h2 className="mt-2 break-words font-bold">{item.judul}</h2>
              <p className="mt-2 text-xs text-slate-500">
                Diperbarui {formatDate(item.updated_at)} WIB
              </p>
            </div>
            <div className="flex gap-4 text-sm font-semibold">
              {item.status === 'published' && (
                <Link
                  className="text-genre-blue underline"
                  href={`/publik/${item.jenis}/${item.id}`}
                >
                  Lihat publik
                </Link>
              )}
              <button
                onClick={() => {
                  setMessage('');
                  setEditing(item);
                }}
                className="text-genre-blue underline"
                aria-label={`Edit ${item.judul}`}
              >
                Edit
              </button>
            </div>
          </article>
        ))}
      </div>
      {editing && (
        <ContentEditor
          item={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setMessage('Konten berhasil disimpan.');
            router.refresh();
          }}
        />
      )}
    </section>
  );
}

function ContentEditor({
  item,
  onClose,
  onSaved,
}: {
  item?: PublicContent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [id] = useState(() => item?.id || crypto.randomUUID());
  const [kind, setKind] = useState<ContentKind>(item?.jenis || 'berita');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const button = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const value = (key: string) => String(form.get(key) || '');
    try {
      const result = await savePublicContent(id, item?.version ?? -1, {
        jenis: kind,
        judul: value('judul'),
        ringkasan: value('ringkasan'),
        isi: value('isi'),
        status: button?.value === 'published' ? 'published' : 'draft',
        mulai_at: kind === 'agenda' && value('mulai_at') ? fromWib(value('mulai_at')) : null,
        selesai_at: kind === 'agenda' && value('selesai_at') ? fromWib(value('selesai_at')) : null,
        lokasi: kind === 'agenda' ? value('lokasi') : '',
      });
      if (!result.ok) setError(result.error);
      else onSaved();
    } catch (cause) {
      setError(
        cause instanceof PortalError
          ? cause.message
          : 'Koneksi terputus. Tutup form dan muat ulang konten untuk memeriksa hasil penyimpanan.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={item ? 'Edit konten publik' : 'Tambah konten publik'}
      busy={busy}
      onClose={onClose}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 sm:p-8">
        <h2 className="text-xl font-bold">
          {item ? 'Edit konten publik' : 'Tambah konten publik'}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Terbitkan hanya informasi yang boleh dibaca publik.
        </p>
        <form
          onSubmit={submit}
          className="mt-6 space-y-4 [&_input]:mt-1 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-300 [&_input]:p-3 [&_textarea]:mt-1 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-slate-300 [&_textarea]:p-3 [&_label]:block [&_label]:text-sm [&_label]:font-semibold"
        >
          <label>
            Jenis konten
            <select
              name="jenis"
              value={kind}
              onChange={(event) => setKind(event.target.value as ContentKind)}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-3"
            >
              <option value="berita">Berita</option>
              <option value="agenda">Agenda</option>
            </select>
          </label>
          <label>
            Judul
            <input name="judul" defaultValue={item?.judul} required maxLength={300} />
          </label>
          <label>
            Ringkasan
            <textarea
              name="ringkasan"
              defaultValue={item?.ringkasan}
              required
              maxLength={500}
              rows={2}
            />
          </label>
          <label>
            Isi konten
            <textarea name="isi" defaultValue={item?.isi} required maxLength={20000} rows={8} />
          </label>
          {kind === 'agenda' && (
            <div className="space-y-4">
              <label>
                Waktu mulai (WIB)
                <input
                  name="mulai_at"
                  type="datetime-local"
                  defaultValue={wibInput(item?.mulai_at)}
                  required
                />
              </label>
              <label>
                Waktu selesai (WIB, opsional)
                <input
                  name="selesai_at"
                  type="datetime-local"
                  defaultValue={wibInput(item?.selesai_at)}
                />
              </label>
              <label>
                Lokasi
                <input name="lokasi" defaultValue={item?.lokasi} maxLength={500} required />
              </label>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
          {busy && (
            <p role="status" className="text-sm">
              Menyimpan konten…
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-3">
            <button
              type="submit"
              value="published"
              className="rounded-xl bg-genre-blue px-4 py-3 text-sm font-bold text-white"
            >
              {item?.status === 'published' ? 'Simpan perubahan' : 'Terbitkan'}
            </button>
            <button
              type="submit"
              value="draft"
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold"
            >
              {item?.status === 'published' ? 'Tarik publikasi' : 'Simpan draft'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-3 text-sm font-semibold"
            >
              Tutup
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
