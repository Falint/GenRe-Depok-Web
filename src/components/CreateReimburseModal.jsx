import React, { useState } from 'react';
import { X, Receipt, Upload, CreditCard, AlertCircle } from 'lucide-react';

export default function CreateReimburseModal({ isOpen, onClose, onSubmit, currentRole }) {
  const [formData, setFormData] = useState({
    proker: '',
    nominal: '',
    keterangan: '',
    bank: 'Bank BCA',
    rekening: '',
    namaPemilik: currentRole.name
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.proker || !formData.nominal || !formData.rekening) {
      alert('Mohon lengkapi semua field bertanda bintang!');
      return;
    }

    const nominalNumber = parseInt(formData.nominal.replace(/[^0-9]/g, ''), 10) || 0;
    const randomId = Math.floor(100 + Math.random() * 899);

    const newReimburse = {
      id: `RMB-${randomId}`,
      proker: formData.proker,
      pemohon: `${currentRole.name} (${currentRole.role})`,
      divisi: currentRole.group,
      nominal: nominalNumber,
      keterangan: formData.keterangan || 'Pembelian perlengkapan proker resmi.',
      bank: formData.bank,
      rekening: `${formData.rekening} a.n ${formData.namaPemilik}`,
      status: nominalNumber > 500000 ? 'Menunggu Approval Bendahara & Ketua' : 'Menunggu Approval Bendahara',
      tanggal: '03 November 2026',
      buktiStruk: 'https://images.unsplash.com/photo-1554415707-9e49fe832807?w=500&auto=format&fit=crop&q=60',
      approvalChain: [
        { role: 'Kadiv / Inisiator', name: currentRole.name, status: 'Diajukan', date: 'Hari ini' },
        { role: 'Kabid Terkait', name: 'Validasi', status: 'Pending', date: '-' },
        { role: 'Bendahara 1', name: 'Verifikasi Berkas', status: 'Pending', date: '-' },
        { role: 'Bendahara 2', name: 'Pencairan Kas', status: 'Pending', date: '-' }
      ]
    };

    onSubmit(newReimburse);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pengajuan Reimbursement Dana</h3>
              <p className="text-xs text-slate-500">Klaim penggantian dana operasional & program kerja</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Program Kerja / Kegiatan *</label>
            <input
              type="text"
              placeholder="Contoh: Roadshow Duta GenRe Goes to School SMAN 1"
              value={formData.proker}
              onChange={(e) => setFormData({ ...formData, proker: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nominal Pengeluaran (Rp) *</label>
              <input
                type="number"
                placeholder="Contoh: 350000"
                value={formData.nominal}
                onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-semibold focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Pilihan Bank / Dompet Digital *</label>
              <select
                value={formData.bank}
                onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
              >
                <option value="Bank BCA">Bank BCA</option>
                <option value="Bank Mandiri">Bank Mandiri</option>
                <option value="Bank BJB">Bank BJB (Kas Daerah)</option>
                <option value="Bank BSI">Bank Syariah Indonesia (BSI)</option>
                <option value="Bank BRI">Bank BRI</option>
                <option value="GoPay / OVO / Dana">E-Wallet (GoPay/Dana)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nomor Rekening / No. HP E-Wallet *</label>
              <input
                type="text"
                placeholder="Contoh: 8801928371"
                value={formData.rekening}
                onChange={(e) => setFormData({ ...formData, rekening: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Atas Nama Rekening</label>
              <input
                type="text"
                value={formData.namaPemilik}
                onChange={(e) => setFormData({ ...formData, namaPemilik: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Rincian Pengeluaran</label>
            <textarea
              rows={2}
              placeholder="Contoh: Bensin kendaraan operasional survey dan print banner kegiatan..."
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
            />
          </div>

          {/* Struk Upload Preview Simulator */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Foto Bukti Struk / Kuitansi Fisik</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer flex flex-col items-center">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <p className="font-semibold text-slate-700 text-xs">Klik untuk upload foto nota atau ambil via kamera HP</p>
              <p className="text-[10px] text-slate-400">Format: JPG, PNG, atau PDF (Maks. 5MB)</p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-start space-x-2 text-blue-900 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-genre-blue" />
            <p>
              Pengeluaran di atas Rp 500.000 secara otomatis membutuhkan persetujuan tambahan dari Ketua Umum sebelum dieksekusi Bendahara 2.
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>Kirim Klaim Reimburse</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
