import React, { useState } from 'react';
import { X, Send, FileText, AlertCircle } from 'lucide-react';

export default function CreateSuratModal({ isOpen, onClose, onSubmit, currentRole }) {
  const [formData, setFormData] = useState({
    jenis: 'Surat Tugas',
    perihal: '',
    tujuan: '',
    urgensi: 'Sedang',
    keterangan: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.perihal || !formData.tujuan) {
      alert('Mohon lengkapi perihal dan tujuan surat!');
      return;
    }

    // Auto-generate nomor surat resmi
    const randomSeq = Math.floor(10 + Math.random() * 89);
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const currentMonth = romanMonths[new Date().getMonth()];
    const typeCode = formData.jenis === 'Surat Tugas' ? 'ST' : formData.jenis === 'Surat Undangan' ? 'SU' : 'SPm';
    const generatedNo = `0${randomSeq}/${typeCode}/FG-DPK/${currentMonth}/2026`;

    const newSurat = {
      id: `SRT-0${randomSeq}`,
      nomor: generatedNo,
      jenis: formData.jenis,
      perihal: formData.perihal,
      pemohon: `${currentRole.name} (${currentRole.role})`,
      divisi: currentRole.group,
      tanggal: '03 November 2026',
      status: 'Menunggu Review Kabid',
      tujuan: formData.tujuan,
      keterangan: formData.keterangan || 'Permohonan kegiatan resmi organisasi.',
      urgensi: formData.urgensi,
      approvalHistory: [
        { step: 'Pengajuan oleh Divisi', actor: currentRole.name, status: 'Diajukan', time: 'Baru saja' },
        { step: 'Verifikasi Kabid Terkait', actor: 'Menunggu Kabid', status: 'Pending', time: '-' }
      ]
    };

    if (await onSubmit(newSurat)) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-genre-blue flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pengajuan Draf Surat Resmi</h3>
              <p className="text-xs text-slate-500">Penomoran otomatis & format baku Forum GenRe Depok</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Jenis Surat</label>
              <select
                value={formData.jenis}
                onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
              >
                <option value="Surat Tugas">Surat Tugas (ST)</option>
                <option value="Surat Undangan">Surat Undangan (SU)</option>
                <option value="Surat Permohonan">Surat Permohonan (SPm)</option>
                <option value="Surat Rekomendasi">Surat Rekomendasi (SR)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tingkat Urgensi</label>
              <select
                value={formData.urgensi}
                onChange={(e) => setFormData({ ...formData, urgensi: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
              >
                <option value="Biasa">Biasa (3-5 Hari)</option>
                <option value="Sedang">Sedang (1-2 Hari)</option>
                <option value="Tinggi">Tinggi / Mendesak (&lt; 24 Jam)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Perihal / Pokok Surat</label>
            <input
              type="text"
              placeholder="Contoh: Permohonan Peminjaman Aula BJB Margonda"
              value={formData.perihal}
              onChange={(e) => setFormData({ ...formData, perihal: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Tujuan / Pihak yang Dituju</label>
            <input
              type="text"
              placeholder="Contoh: Pimpinan Cabang Bank BJB Kota Depok"
              value={formData.tujuan}
              onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Rincian Kegiatan / Keterangan Tambahan</label>
            <textarea
              rows={3}
              placeholder="Uraikan detail tanggal, lokasi kegiatan, sasaran audiens, atau latar belakang pembuatan surat..."
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-2 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Surat akan otomatis didisposisikan ke Kabid terkait untuk divalidasi, lalu diverifikasi Sekretariat sebelum masuk ke antrean tanda tangan Ketua Umum.
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
    </div>
  );
}
