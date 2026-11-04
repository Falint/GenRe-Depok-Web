import React, { useState } from 'react';
import { X, MessageSquare, Send } from 'lucide-react';

export default function CreateTiketModal({ isOpen, onClose, onSubmit, currentRole }) {
  const [formData, setFormData] = useState({
    judul: '',
    tujuan: 'Bidang GenRe Center',
    prioritas: 'Sedang',
    deadline: '',
    deskripsi: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.judul || !formData.deskripsi) {
      alert('Mohon isi judul dan rincian informasi yang diminta!');
      return;
    }

    const randomId = Math.floor(200 + Math.random() * 799);
    const newTiket = {
      id: `REQ-${randomId}`,
      judul: formData.judul,
      dari: `${currentRole.name} (${currentRole.role})`,
      divisiAsal: currentRole.group,
      tujuan: formData.tujuan,
      prioritas: formData.prioritas,
      deadline: formData.deadline || '10 Nov 2026',
      status: 'Open',
      deskripsi: formData.deskripsi,
      respons: 'Tiket baru diajukan. Menunggu respons dari pihak yang dituju.'
    };

    if (await onSubmit(newTiket)) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Buat Tiket Permintaan Informasi</h3>
              <p className="text-xs text-slate-500">Koordinasi data antarbidang terstruktur (No lost in WA chats)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          
          <div>
            <label className="block font-bold text-slate-700 mb-1">Judul Permintaan Informasi / Data *</label>
            <input
              type="text"
              placeholder="Contoh: Permintaan Data Kontak Pengurus PIK-R Kecamatan Bojongsari"
              value={formData.judul}
              onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Bidang / Pihak yang Dituju *</label>
              <select
                value={formData.tujuan}
                onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
              >
                <option value="Pengurus Inti">Pengurus Inti (Ketua/Sekretaris/Bendahara)</option>
                <option value="Bidang Program">Bidang Program (Divisi Reguler & Non-reguler)</option>
                <option value="Bidang GenRe Center">Bidang GenRe Center (Duta & Forum Kecamatan)</option>
                <option value="Divisi Forum GenRe Kecamatan">Divisi Forum GenRe Kecamatan (11 Kec)</option>
                <option value="Bidang Branding">Bidang Branding (Sosmed, Video, Desain)</option>
                <option value="Divisi Desain Grafis">Divisi Desain Grafis (Aset Visual)</option>
                <option value="Divisi Video Editor">Divisi Video Editor</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tingkat Prioritas (SLA)</label>
              <select
                value={formData.prioritas}
                onChange={(e) => setFormData({ ...formData, prioritas: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
              >
                <option value="Rendah">Rendah (Fleksibel 5-7 hari)</option>
                <option value="Sedang">Sedang (2-3 hari kerja)</option>
                <option value="Tinggi">Tinggi (Mendesak &lt; 24 jam)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Tenggat Waktu Dibutuhkan (Target Date)</label>
            <input
              type="text"
              placeholder="Contoh: 08 November 2026, 17:00 WIB"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Rincian Data / Informasi Spesifik yang Diminta *</label>
            <textarea
              rows={3}
              placeholder="Jelaskan kebutuhan informasi, format file yang diharapkan (Excel/Doc/Foto), atau peruntukan data..."
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
              required
            />
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
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center space-x-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Tiket Request</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
