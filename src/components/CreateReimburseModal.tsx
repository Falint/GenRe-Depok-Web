'use client';
import type { CreateModalProps } from './modal-types';
import type { ReimburseInput } from '@/features/portal/validation';
import { driveFileUrl } from '@/features/portal/validation';
import Dialog from './Dialog';
import BudgetSelect from './BudgetSelect';
import React, { useState } from 'react';
import { X, Receipt, CreditCard, AlertCircle } from 'lucide-react';

export default function CreateReimburseModal({
  isOpen,
  onClose,
  onSubmit,
  currentRole,
  busy,
}: CreateModalProps<ReimburseInput>) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [budgetId, setBudgetId] = useState('');
  const [formData, setFormData] = useState({
    proker: '',
    nominal: '',
    keterangan: '',
    bank: 'Bank BCA',
    rekening: '',
    namaPemilik: currentRole.name,
    foto_struk_url: '',
  });
  const [proofError, setProofError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.proker || !formData.nominal || !formData.rekening) {
      alert('Mohon lengkapi semua field bertanda bintang!');
      return;
    }

    const proofUrl = formData.foto_struk_url.trim();
    if (proofUrl && !driveFileUrl.safeParse(proofUrl).success) {
      setProofError('Masukkan link file HTTPS Google Drive yang valid, bukan link folder.');
      return;
    }
    setProofError('');
    const nominalNumber = Number(formData.nominal);
    const newReimburse = {
      request_id: requestId,
      pagu_anggaran_id: budgetId,
      proker: formData.proker,
      nominal: nominalNumber,
      keterangan: formData.keterangan,
      bank: formData.bank,
      rekening: `${formData.rekening} a.n ${formData.namaPemilik}`,
      foto_struk_url: proofUrl,
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
          <BudgetSelect value={budgetId} onChange={setBudgetId} />
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
            <a
              href="https://drive.google.com/drive/folders/1dwPzew_4AiO-Tfy_AeEgM-BMlWWU4vOb?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mb-2 px-3 py-2 rounded-xl bg-blue-50 text-genre-blue font-bold text-xs underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Buka folder upload<span className="sr-only"> (buka Google Drive di tab baru)</span>
            </a>
            <label className="block font-bold text-slate-700 mb-1" htmlFor="reimburse-proof">
              Link bukti Google Drive (opsional)
            </label>
            <input
              id="reimburse-proof"
              type="url"
              maxLength={2048}
              placeholder="https://drive.google.com/file/d/.../view"
              value={formData.foto_struk_url}
              onChange={(e) => {
                setFormData({ ...formData, foto_struk_url: e.target.value });
                setProofError('');
              }}
              aria-invalid={Boolean(proofError)}
              aria-describedby={`reimburse-proof-hint${proofError ? ' reimburse-proof-error' : ''}`}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
            />
            <p id="reimburse-proof-hint" className="mt-1 text-xs text-slate-500">
              Upload struk ke folder Drive bersama organisasi, lalu tempel link file fotonya.
              Pastikan pengurus pemeriksa memiliki akses lewat akun Google mereka. Portal hanya
              menyimpan link dan tidak memeriksa izin Drive.
            </p>
            {proofError && (
              <p id="reimburse-proof-error" role="alert" className="mt-1 text-xs text-red-600">
                {proofError}
              </p>
            )}
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
