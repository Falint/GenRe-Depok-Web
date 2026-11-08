'use client';
import type { CreateModalProps } from './modal-types';
import type { MutasiInput } from '@/features/portal/validation';
import Dialog from './Dialog';
import BudgetSelect from './BudgetSelect';
import React, { useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function MutasiKasModal({
  isOpen,
  onClose,
  onSubmit,
  currentRole,
  currentSaldo,
  busy,
}: CreateModalProps<MutasiInput> & { currentSaldo: number }) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [budgetId, setBudgetId] = useState('');
  const [jenis, setJenis] = useState<MutasiInput['jenis']>('Masuk'); // 'Masuk' | 'Keluar'
  const [nominal, setNominal] = useState('');
  const [kategori, setKategori] = useState('Iuran Kas Pengurus');
  const [sumberDana, setSumberDana] = useState('Bank BJB (Kas Daerah)');
  const [deskripsi, setDeskripsi] = useState('');

  if (!isOpen) return null;

  const nominalNum = Number(nominal);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nominalNum || nominalNum <= 0) {
      alert('Mohon masukkan nominal mutasi kas yang valid!');
      return;
    }

    if (!deskripsi.trim()) {
      alert('Mohon masukkan rincian keterangan transaksi!');
      return;
    }

    if (jenis === 'Keluar' && nominalNum > currentSaldo) {
      if (
        !confirm(
          `Peringatan: Pengeluaran Rp ${nominalNum.toLocaleString('id-ID')} melebihi saldo kas saat ini (Rp ${currentSaldo.toLocaleString('id-ID')}). Apakah Anda yakin ingin melanjutkan pencatatan?`,
        )
      ) {
        return;
      }
    }

    const saved = await onSubmit({
      request_id: requestId,
      pagu_anggaran_id: jenis === 'Keluar' ? budgetId : null,
      deskripsi,
      jenis,
      nominal: nominalNum,
      kategori,
      sumberDana,
    });

    if (saved) {
      setNominal('');
      setDeskripsi('');
      onClose();
    }
  };

  return (
    <Dialog title="Pencatatan mutasi kas" onClose={onClose} busy={busy}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                jenis === 'Masuk' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Pencatatan Arus Kas Bendahara</h3>
              <p className="text-xs text-slate-500">
                Otorisasi oleh: <strong className="text-slate-700">{currentRole.name}</strong> (
                {currentRole.role})
              </p>
            </div>
          </div>
          <button
            aria-label="Tutup dialog"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          {/* Toggle Jenis: Pemasukan vs Pengeluaran */}
          <div>
            <p className="block font-bold text-slate-700 mb-1.5">Jenis Mutasi Kas *</p>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setJenis('Masuk');
                  setKategori('Iuran Kas Pengurus');
                }}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  jenis === 'Masuk'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ Pemasukan (Kas Masuk)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setJenis('Keluar');
                  setKategori('Operasional Sekretariat');
                }}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  jenis === 'Keluar'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>- Pengeluaran (Kas Keluar)</span>
              </button>
            </div>
          </div>

          {jenis === 'Keluar' && <BudgetSelect value={budgetId} onChange={setBudgetId} />}
          {/* Nominal Input */}
          <div>
            <label className="block font-bold text-slate-700 mb-1" htmlFor="mutasikasmodal-1">
              Nominal Rupiah (Rp) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                placeholder="Contoh: 1500000"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 font-mono font-black text-slate-900 text-base focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                required
                min={1}
                step={1}
                max={Number.MAX_SAFE_INTEGER}
                id="mutasikasmodal-1"
              />
            </div>
            {nominalNum > 0 && (
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Terbilang: Rp {nominalNum.toLocaleString('id-ID')}
              </p>
            )}
          </div>

          {/* Kategori & Sumber Dana Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1" htmlFor="mutasikasmodal-2">
                Pos Kategori Anggaran
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                id="mutasikasmodal-2"
              >
                {jenis === 'Masuk' ? (
                  <>
                    <option value="Iuran Kas Pengurus">Iuran Kas Pengurus</option>
                    <option value="Hibah DP3AP2KB Kota Depok">Hibah DP3AP2KB Kota Depok</option>
                    <option value="Pendapatan Usaha BUMF">Pendapatan Usaha BUMF</option>
                    <option value="Sponsorship & Donasi">Sponsorship & Donasi</option>
                    <option value="Pendapatan Merchandise">Penjualan Merchandise GenRe</option>
                    <option value="Lain-lain">Penerimaan Lain-lain</option>
                  </>
                ) : (
                  <>
                    <option value="Operasional Sekretariat">Operasional Sekretariat & ATK</option>
                    <option value="Bidang Eksternal (Program)">Bidang Eksternal (Program)</option>
                    <option value="Bidang Internal (Kec/Duta/PIK-R)">
                      Bidang Internal (Kec/Duta/PIK-R)
                    </option>
                    <option value="Bidang Branding (Media & Desain)">
                      Bidang Branding (Media & Desain)
                    </option>
                    <option value="Modal Kerja BUMF">Modal Kerja BUMF</option>
                    <option value="Konsumsi Rapat Pleno">Konsumsi Rapat Pleno</option>
                    <option value="Lain-lain">Pengeluaran Lain-lain</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1" htmlFor="mutasikasmodal-3">
                Rekening / Buku Kas
              </label>
              <select
                value={sumberDana}
                onChange={(e) => setSumberDana(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                id="mutasikasmodal-3"
              >
                <option value="Bank BJB (Kas Daerah)">Bank BJB (Kas Daerah Kota Depok)</option>
                <option value="Kas Tunai Bendahara (Petty Cash)">Kas Tunai (Petty Cash)</option>
                <option value="Rekening BUMF (Unit Usaha)">Rekening Unit Usaha BUMF</option>
                <option value="E-Wallet GenRe Depok">E-Wallet (Dana / GoPay)</option>
              </select>
            </div>
          </div>

          {/* Keterangan Transaksi */}
          <div>
            <label className="block font-bold text-slate-700 mb-1" htmlFor="mutasikasmodal-4">
              Uraian / Keterangan Transaksi *
            </label>
            <textarea
              rows={2}
              placeholder={
                jenis === 'Masuk'
                  ? 'Contoh: Penerimaan iuran kas wajib pengurus bulan November 2026...'
                  : 'Contoh: Pembelian tinta printer dan kertas HVS arsip kesekretariatan...'
              }
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
              required
              id="mutasikasmodal-4"
            />
          </div>

          {/* Info Banner */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-genre-blue shrink-0 mt-0.5" />
            <p>
              Setiap mutasi kas yang dicatat otomatis terarsip dalam Buku Kas Besar dan memperbarui
              saldo kas riil Forum GenRe Kota Depok secara *real-time*.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center space-x-1.5 ${
                jenis === 'Masuk'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Mutasi {jenis === 'Masuk' ? 'Pemasukan' : 'Pengeluaran'}</span>
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
