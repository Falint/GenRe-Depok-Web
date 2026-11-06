'use client';
import type { CreateModalProps } from './modal-types';
import type { ReimburseInput } from '@/features/portal/validation';
import Dialog from './Dialog';
import React, { useState } from 'react';
import { X, Receipt, Upload, CreditCard, AlertCircle } from 'lucide-react';

export default function CreateReimburseModal({
  isOpen,
  onClose,
  onSubmit,
  currentRole,
  busy,
}: CreateModalProps<ReimburseInput>) {
  const [formData, setFormData] = useState({
    proker: '',
    nominal: '',
    keterangan: '',
    bank: 'Bank BCA',
    rekening: '',
    namaPemilik: currentRole.name,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.proker || !formData.nominal || !formData.rekening) {
      alert('Mohon lengkapi semua field bertanda bintang!');
      return;
    }

    const nominalNumber = Number(formData.nominal);
    const newReimburse = {
      proker: formData.proker,
      nominal: nominalNumber,
      keterangan: formData.keterangan,
      bank: formData.bank,
      rekening: `${formData.rekening} a.n ${formData.namaPemilik}`,
    };

    if (await onSubmit(newReimburse)) onClose();
  };

  return (
    <Dialog title="Pengajuan reimburse" onClose={onClose} busy={busy}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pengajuan Reimbursement Dana</h3>
              <p className="text-xs text-slate-500">
                Klaim penggantian dana operasional & program kerja
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
          <div>
            <label className="block font-bold text-slate-700 mb-1" htmlFor="createreimbursemodal-1">
              Nama Program Kerja / Kegiatan *
            </label>
            <input
              type="text"
              placeholder="Contoh: Roadshow Duta GenRe Goes to School SMAN 1"
              value={formData.proker}
              onChange={(e) => setFormData({ ...formData, proker: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
              required
              id="createreimbursemodal-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block font-bold text-slate-700 mb-1"
                htmlFor="createreimbursemodal-2"
              >
                Nominal Pengeluaran (Rp) *
              </label>
              <input
                type="number"
                placeholder="Contoh: 350000"
                value={formData.nominal}
                onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-semibold focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                required
                min={1}
                step={1}
                max={Number.MAX_SAFE_INTEGER}
                id="createreimbursemodal-2"
              />
            </div>

            <div>
              <label
                className="block font-bold text-slate-700 mb-1"
                htmlFor="createreimbursemodal-3"
              >
                Pilihan Bank / Dompet Digital *
              </label>
              <select
                value={formData.bank}
                onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                id="createreimbursemodal-3"
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
              <label
                className="block font-bold text-slate-700 mb-1"
                htmlFor="createreimbursemodal-4"
              >
                Nomor Rekening / No. HP E-Wallet *
              </label>
              <input
                type="text"
                placeholder="Contoh: 8801928371"
                value={formData.rekening}
                onChange={(e) => setFormData({ ...formData, rekening: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                required
                id="createreimbursemodal-4"
              />
            </div>

            <div>
              <label
                className="block font-bold text-slate-700 mb-1"
                htmlFor="createreimbursemodal-5"
              >
                Atas Nama Rekening
              </label>
              <input
                type="text"
                value={formData.namaPemilik}
                onChange={(e) => setFormData({ ...formData, namaPemilik: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                required
                id="createreimbursemodal-5"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1" htmlFor="createreimbursemodal-6">
              Rincian Pengeluaran
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Bensin kendaraan operasional survey dan print banner kegiatan..."
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
              id="createreimbursemodal-6"
            />
          </div>

          {/* Struk Upload Preview Simulator */}
          <div>
            <p className="block font-bold text-slate-700 mb-1">Foto Bukti Struk / Kuitansi Fisik</p>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer flex flex-col items-center">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <p className="font-semibold text-slate-700 text-xs">
                Upload bukti belum tersedia. Simpan bukti untuk verifikasi pengurus.
              </p>
              <p className="text-[10px] text-slate-400">
                Klaim ini hanya menyimpan rincian dan rekening.
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-start space-x-2 text-blue-900 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-genre-blue" />
            <p>
              Klaim ditinjau pengurus inti. Pencairan dicatat setelah verifikasi; portal tidak
              melakukan transfer bank.
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
    </Dialog>
  );
}
