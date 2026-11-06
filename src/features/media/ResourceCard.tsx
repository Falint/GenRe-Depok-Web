'use client';
import { useState } from 'react';
import Dialog from '@/components/Dialog';
import { usePortal } from '@/features/portal/PortalProvider';
import { formatDate } from '@/features/portal/mapping';
import { driveFileUrl } from '@/features/portal/validation';
import type { MediaResource } from './schema';
import { mediaInput } from './schema';
import { saveMedia, archiveMedia } from './actions';
import ContentHistory from './ContentHistory';

export function MediaEditor({
  item,
  onClose,
  refresh,
}: {
  item?: MediaResource;
  onClose: () => void;
  refresh: () => Promise<void>;
}) {
  const { busy, runMutation } = usePortal();
  const [error, setError] = useState('');
  const [draftId] = useState(() => crypto.randomUUID());
  return (
    <Dialog title={item ? 'Ubah Media' : 'Tambah Media'} busy={busy} onClose={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white p-6">
        <h2 className="text-lg font-bold">{item ? 'Ubah Media' : 'Tambah Media'}</h2>
        <form
          className="mt-4 space-y-3 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:p-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            const f = new FormData(e.currentTarget);
            const input = mediaInput.safeParse({
              jenis: f.get('jenis'),
              judul: f.get('judul'),
              deskripsi: f.get('deskripsi'),
              url: String(f.get('url')).trim() || null,
            });
            if (!input.success) {
              setError('Periksa judul, deskripsi, dan link.');
              return;
            }
            if (
              await runMutation(
                () => saveMedia(item?.id || draftId, item?.version ?? -1, input.data),
                'Media tersimpan.',
              )
            ) {
              await refresh();
              onClose();
            }
          }}
        >
          <label className="block">
            Jenis
            <select
              name="jenis"
              defaultValue={item?.jenis || 'modul'}
              className="ml-3 rounded-lg border p-2"
            >
              <option value="modul">Modul</option>
              <option value="logo">Logo</option>
              <option value="video">Video / Audio</option>
            </select>
          </label>
          <label className="block">
            Judul media
            <input name="judul" required maxLength={300} defaultValue={item?.judul} />
          </label>
          <label className="block">
            Deskripsi media
            <textarea
              name="deskripsi"
              required
              maxLength={10000}
              defaultValue={item?.deskripsi}
              className="w-full rounded-lg border p-2"
            />
          </label>
          <label className="block">
            Link file Google Drive
            <input name="url" required={!item} maxLength={2048} defaultValue={item?.url || ''} />
          </label>
          <p className="text-xs text-slate-500">
            Upload file ke Drive dan atur aksesnya terlebih dahulu. Link file baru wajib Google
            Drive. Aset lokal lama boleh dipertahankan.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="flex gap-4">
            <button disabled={busy} className="rounded-xl bg-genre-blue px-4 py-2 text-white">
              Simpan Media
            </button>
            <button type="button" onClick={onClose}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
export default function ResourceCard({
  item,
  refresh,
}: {
  item: MediaResource;
  refresh: () => Promise<void>;
}) {
  const { currentRole, busy, runMutation } = usePortal();
  const [editing, setEditing] = useState(false);
  const local = ['/logo-genre-depok.png', '/logo-dp3ap2kb.png', '/logo-depok.png'].includes(
    item.url || '',
  );
  const safeUrl = item.url && (local || driveFileUrl.safeParse(item.url).success) ? item.url : null;
  return (
    <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase text-genre-blue">
        {item.kategori || item.jenis}
        {item.archived_at ? ' · Diarsipkan' : ''}
      </p>
      <h3 className="font-bold text-slate-900">{item.judul}</h3>
      <p className="text-sm text-slate-600">{item.deskripsi}</p>
      <p className="text-xs text-slate-500">
        {[
          item.jenjang,
          item.halaman && `${item.halaman} halaman`,
          item.tahun,
          item.format,
          item.size,
          item.durasi,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <p className="text-xs text-slate-500">
        {item.created_at
          ? `Ditambahkan ke katalog ${formatDate(item.created_at)} WIB`
          : 'Tanggal belum tercatat'}
        {item.updated_at && ` · Diperbarui ${formatDate(item.updated_at)} WIB`}
      </p>
      {safeUrl ? (
        <a
          href={safeUrl}
          target={local ? undefined : '_blank'}
          rel="noopener noreferrer"
          download={local}
          className="inline-block rounded-xl bg-genre-blue px-3 py-2 text-xs font-bold text-white"
        >
          {local ? 'Unduh Logo' : 'Buka File'}
        </a>
      ) : (
        <p className="text-xs text-slate-500">Berkas belum tersedia</p>
      )}
      {currentRole.manageContent && (
        <>
          <div className="flex gap-4 text-xs font-bold">
            <button disabled={busy} onClick={() => setEditing(true)}>
              Ubah Media
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                if (
                  await runMutation(
                    () => archiveMedia(item.id, item.version, !item.archived_at),
                    item.archived_at ? 'Media dipulihkan.' : 'Media diarsipkan.',
                  )
                )
                  await refresh();
              }}
            >
              {item.archived_at ? 'Pulihkan' : 'Arsipkan'}
            </button>
          </div>
          <ContentHistory type="media_resources" id={item.id} />
        </>
      )}
      {editing && <MediaEditor item={item} onClose={() => setEditing(false)} refresh={refresh} />}
    </article>
  );
}
