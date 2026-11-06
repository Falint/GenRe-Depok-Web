'use client';
import type { CreateModalProps } from './modal-types';
import type { SuratInput } from '@/features/portal/validation';
import Dialog from './Dialog';
import { suratInput } from '@/features/portal/validation';
import React, { useState } from 'react';
import { X, Send, FileText, AlertCircle } from 'lucide-react';

export default function CreateSuratModal({
  isOpen,
  onClose,
  onSubmit,
  busy,
}: CreateModalProps<SuratInput>) {
  const [formData, setFormData] = useState<SuratInput>({
    jenis: 'Surat Tugas',
    perihal: '',
    tujuan: '',
    urgensi: 'Sedang',
    keterangan: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.perihal || !formData.tujuan) {
      alert('Mohon lengkapi perihal dan tujuan surat!');
      return;
    }

    const newSurat = formData;

    if (await onSubmit(newSurat)) onClose();
  };

  return (
    <Dialog title="Pengajuan draf surat" onClose={onClose} busy={busy}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-genre-blue flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pengajuan Draf Surat Resmi</h3>
              <p className="text-xs text-slate-500">
                Draf bernomor unik; nomor resmi ditetapkan sekretariat
              </p>
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
            <label className="block font-bold text-slate-700 mb-1" htmlFor="createsuratmodal-5">
              Rincian Kegiatan / Keterangan Tambahan
            </label>
            <textarea
              rows={3}
              placeholder="Uraikan detail tanggal, lokasi kegiatan, sasaran audiens, atau latar belakang pembuatan surat..."
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
              id="createsuratmodal-5"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-2 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Draf masuk ke antrean tinjauan pimpinan. Alur persetujuan bertingkat belum tersedia.
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
