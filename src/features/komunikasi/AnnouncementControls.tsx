'use client';
import { useState } from 'react';
import Dialog from '@/components/Dialog';
import { usePortal } from '@/features/portal/PortalProvider';
import type { Pengumuman } from '@/features/portal/mapping';
import { fromWib, wibInput } from '@/features/portal/datetime';
import { pengumumanInput } from '@/features/portal/validation';
import { savePengumuman, cancelPengumuman } from './actions';
import ContentHistory from '@/features/media/ContentHistory';
export default function AnnouncementControls({ item }: { item: Pengumuman }) {
  const { currentRole, busy, runMutation } = usePortal();
  const [mode, setMode] = useState<'edit' | 'cancel' | null>(null);
  const [error, setError] = useState('');
  if (!currentRole.manageContent) return null;
  return (
    <div className="mt-3 space-y-3 text-sm">
      <div className="flex gap-4">
        {!item.cancelled_at && (
          <>
            <button className="font-semibold text-genre-blue" onClick={() => setMode('edit')}>
              Ubah Pengumuman
            </button>
            <button className="font-semibold text-rose-700" onClick={() => setMode('cancel')}>
              Batalkan Kegiatan
            </button>
          </>
        )}
      </div>
      <ContentHistory type="pengumuman" id={item.id} />
      {mode && (
        <Dialog
          title={mode === 'edit' ? 'Ubah Pengumuman' : 'Batalkan Kegiatan'}
          busy={busy}
          onClose={() => setMode(null)}
        >
          <div className="w-full max-w-xl rounded-2xl bg-white p-6">
            <h2 className="text-lg font-bold">
              {mode === 'edit' ? 'Ubah Pengumuman' : 'Batalkan Kegiatan'}
            </h2>
            <form
              className="mt-4 space-y-3 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:p-2 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:p-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setError('');
                const f = new FormData(e.currentTarget);
                try {
                  const work =
                    mode === 'cancel'
                      ? () => cancelPengumuman(item.id, item.version || 0, String(f.get('reason')))
                      : () =>
                          savePengumuman(
                            item.id,
                            item.version || 0,
                            pengumumanInput.parse({
                              judul: f.get('judul'),
                              isi: f.get('isi'),
                              target: f.get('target'),
                              kategori: f.get('kategori'),
                              ...Object.fromEntries(
                                ['deadline_konfirmasi', 'mulai_at', 'selesai_at'].map((key) => [
                                  key,
                                  f.get(key) ? fromWib(String(f.get(key))) : null,
                                ]),
                              ),
                            }),
                          );
                  if (await runMutation(work, 'Pengumuman diperbarui.')) setMode(null);
                } catch {
                  setError('Periksa isian dan urutan jadwal.');
                }
              }}
            >
              {mode === 'cancel' ? (
                <label className="block">
                  Alasan pembatalan
                  <textarea name="reason" required maxLength={10000} />
                </label>
              ) : (
                <>
                  <label className="block">
                    Judul
                    <input name="judul" required maxLength={300} defaultValue={item.judul} />
                  </label>
                  <label className="block">
                    Kategori
                    <select name="kategori" defaultValue={item.kategori}>
                      <option>Umum</option>
                      <option>Urgent</option>
                      <option>Kecamatan</option>
                    </select>
                  </label>
                  <label className="block">
                    Target
                    <input name="target" required maxLength={500} defaultValue={item.target} />
                  </label>
                  <label className="block">
                    Isi
                    <textarea name="isi" required maxLength={10000} defaultValue={item.isi} />
                  </label>
                  {(['deadline_konfirmasi', 'mulai_at', 'selesai_at'] as const).map((key, i) => (
                    <label key={key} className="block">
                      {['Deadline konfirmasi', 'Mulai kegiatan', 'Selesai kegiatan'][i]} (WIB)
                      <input name={key} type="datetime-local" defaultValue={wibInput(item[key])} />
                    </label>
                  ))}
                  <p className="text-xs">
                    Isi seluruh jadwal untuk kegiatan, atau kosongkan ketiganya untuk pengumuman
                    umum.
                  </p>
                </>
              )}
              {error && <p role="alert">{error}</p>}
              <div className="flex gap-4">
                <button className="rounded-xl bg-genre-blue px-4 py-2 text-white" disabled={busy}>
                  Simpan
                </button>
                <button type="button" onClick={() => setMode(null)}>
                  Tutup
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}
    </div>
  );
}
