'use client';
import type { CreateModalProps } from './modal-types';
import type { SuratInput } from '@/features/portal/validation';
import Dialog from './Dialog';
import { suratInput } from '@/features/portal/validation';
import React, { useState } from 'react';
import { X, Send, FileText, AlertCircle } from 'lucide-react';
import { SURAT_OPENING, SURAT_PARAGRAPH_EXAMPLE } from '@/features/administrasi/suratTemplate';

export default function CreateSuratModal({
  isOpen,
  onClose,
  onSubmit,
  busy,
  currentRole,
}: CreateModalProps<SuratInput>) {
  const [formData, setFormData] = useState<SuratInput>({
    request_id: crypto.randomUUID(),
    jenis: 'Surat Tugas',
    perihal: '',
    tujuan: '',
    urgensi: 'Sedang',
    keterangan: '',
    tanggal_kegiatan: '',
    waktu_kegiatan: '',
    tempat_kegiatan: '',
    sistem_pelaksanaan: '',
  });
  const scheduleRequired = formData.jenis === 'Surat Tugas' || formData.jenis === 'Surat Undangan';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = suratInput.safeParse(formData);
    if (!parsed.success) {
      alert('Lengkapi paragraf pengantar dan rincian kegiatan sesuai jenis surat.');
      return;
    }

    const newSurat = parsed.data;

    if (await onSubmit(newSurat)) onClose();
  };

  return (
    <Dialog title="Pengajuan surat" onClose={onClose} busy={busy}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-genre-blue flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pengajuan Surat</h3>
              <p className="text-xs text-slate-500">Nomor surat otomatis berurutan setiap tahun</p>
            </div>
          </div>
          <button
            aria-label="Tutup dialog"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1" htmlFor="createsuratmodal-1">
                Jenis Surat
              </label>
              <select
                value={formData.jenis}
                onChange={(e) =>
                  setFormData({ ...formData, jenis: suratInput.shape.jenis.parse(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                id="createsuratmodal-1"
              >
                <option value="Surat Tugas">Surat Tugas (ST)</option>
                <option value="Surat Undangan">Surat Undangan (SU)</option>
                <option value="Surat Permohonan">Surat Permohonan (SPm)</option>
                <option value="Surat Rekomendasi">Surat Rekomendasi (SR)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1" htmlFor="createsuratmodal-2">
                Tingkat Urgensi
              </label>
              <select
                value={formData.urgensi}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    urgensi: suratInput.shape.urgensi.parse(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                id="createsuratmodal-2"
              >
                <option value="Rendah">Biasa (3-5 Hari)</option>
                <option value="Sedang">Sedang (1-2 Hari)</option>
                <option value="Tinggi">Tinggi / Mendesak (&lt; 24 Jam)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1" htmlFor="createsuratmodal-3">
              Perihal / Pokok Surat
            </label>
            <input
              type="text"
              placeholder="Contoh: Permohonan Peminjaman Aula BJB Margonda"
              value={formData.perihal}
              onChange={(e) => setFormData({ ...formData, perihal: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
              required
              id="createsuratmodal-3"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1" htmlFor="createsuratmodal-4">
              Tujuan / Pihak yang Dituju
            </label>
            <input
              type="text"
              placeholder="Contoh: Pimpinan Cabang Bank BJB Kota Depok"
              value={formData.tujuan}
              onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
              required
              id="createsuratmodal-4"
            />
          </div>

          <div>
            <details className="mb-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <summary className="cursor-pointer font-bold">Paragraf pembuka tetap</summary>
              <p className="mt-2">Dengan hormat,</p>
              <p className="mt-1">{SURAT_OPENING}</p>
            </details>
            <label className="block font-bold text-slate-700 mb-1" htmlFor="createsuratmodal-5">
              Paragraf Pengantar Kegiatan
            </label>
            <textarea
              rows={5}
              placeholder="Tulis latar belakang, tujuan kegiatan, dan maksud surat."
              required
              maxLength={10000}
              aria-describedby="surat-paragraph-example"
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
              id="createsuratmodal-5"
            />
            <p id="surat-paragraph-example" className="mt-2 text-xs text-slate-500">
              Paragraf ini muncul setelah pembuka dan sebelum rincian kegiatan. Contoh:{' '}
              {SURAT_PARAGRAPH_EXAMPLE}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                ['tanggal_kegiatan', 'Tanggal Kegiatan', 'date', ''],
                ['waktu_kegiatan', 'Waktu Kegiatan', 'text', 'Pukul 19.00–21.00 WIB'],
                [
                  'tempat_kegiatan',
                  'Tempat Kegiatan',
                  'text',
                  'Zoom Cloud Meetings (link menyusul)',
                ],
                ['sistem_pelaksanaan', 'Sistem Pelaksanaan', 'text', 'Breakout Rooms per bidang'],
              ] as const
            ).map(([field, label, type, placeholder]) => (
              <div key={field}>
                <label className="block font-bold text-slate-700 mb-1" htmlFor={`surat-${field}`}>
                  {label}
                </label>
                <input
                  id={`surat-${field}`}
                  type={type}
                  value={formData[field]}
                  placeholder={placeholder}
                  required={field !== 'sistem_pelaksanaan' && scheduleRequired}
                  maxLength={500}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Tanggal, waktu, dan tempat wajib untuk Surat Tugas dan Surat Undangan. Sistem
            pelaksanaan opsional.
          </p>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-2 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              {currentRole.level === 'kabid'
                ? 'Pengajuan menunggu persetujuan pengurus inti atau admin.'
                : 'Pengajuan langsung disetujui. Surat dapat dilihat dan diunduh dari portal.'}
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-genre-blue hover:bg-genre-blue-dark text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Pengajuan</span>
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
