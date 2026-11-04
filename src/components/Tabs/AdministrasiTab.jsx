import React, { useState } from 'react';
import {
  FileText,
  CreditCard,
  DollarSign,
  Plus,
  Search,
  CheckCircle,
  Clock,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  DownloadCloud,
  Lock,
  Wallet
} from 'lucide-react';
import { canViewAdminFinance, canApproveOrConfirm } from '../../data/mockData';

export default function AdministrasiTab({ 
  currentRole, 
  suratList, 
  reimburseList, 
  keuangan, 
  onOpenCreateSurat, 
  onOpenCreateReimburse,
  onOpenMutasiKas,
  onSelectSurat,
  onApproveReimburse
}) {
  const [subTab, setSubTab] = useState('surat'); // 'surat' | 'reimburse' | 'keuangan'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('semua');

  const isFinanceAdmin = canViewAdminFinance(currentRole.id); // Ketua, Wakil, Sekretaris, Bendahara 1 & 2
  const isLeadership = canApproveOrConfirm(currentRole.id); // Inti + Kabid
  const isBendahara = currentRole.isBendahara;

  // If role is regular staff, block global administrative & financial view
  if (!isFinanceAdmin && !isLeadership) {
    return (
      <div className="py-12 px-4 max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Akses Terbatas: Pengurus Inti</h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Sesuai kebijakan organisasi, antrean surat global, verifikasi reimburse, laporan uang kas, dan pembukuan hanya dapat diakses oleh <strong>Ketua, Wakil Ketua, Sekretaris Umum, dan Bendahara</strong>.
        </p>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2 text-left">
          <p className="font-bold text-slate-900 flex items-center">
            <CheckCircle className="w-4 h-4 mr-1.5 text-genre-blue" /> Wewenang Staf / Anggota:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
            <li>Mengajukan permohonan surat tugas atau surat kegiatan (Request Surat).</li>
            <li>Mengajukan klaim reimbursement dana proker divisi (Request Reimburse).</li>
            <li>Melihat serta mengunduh seluruh materi & logo di Media Library.</li>
          </ul>
        </div>

        <div className="flex justify-center space-x-3 pt-2">
          <button
            onClick={onOpenCreateSurat}
            className="px-4 py-2 bg-genre-blue text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1"
          >
            <FileText className="w-4 h-4" />
            <span>Ajukan Draf Surat</span>
          </button>
          <button
            onClick={onOpenCreateReimburse}
            className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1"
          >
            <CreditCard className="w-4 h-4" />
            <span>Klaim Reimburse</span>
          </button>
        </div>
      </div>
    );
  }

  // Filter logic
  const filteredSurat = suratList.filter(s => {
    const matchSearch = s.perihal.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        s.nomor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.pemohon.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterStatus === 'semua') return matchSearch;
    if (filterStatus === 'pending') return matchSearch && s.status.includes('Menunggu');
    if (filterStatus === 'selesai') return matchSearch && s.status.includes('Selesai');
    return matchSearch;
  });

  const filteredReimburse = reimburseList.filter(r => {
    const matchSearch = r.proker.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        r.pemohon.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterStatus === 'semua') return matchSearch;
    if (filterStatus === 'pending') return matchSearch && r.status.includes('Menunggu');
    if (filterStatus === 'selesai') return matchSearch && r.status.includes('Selesai');
    return matchSearch;
  });

  const canApproveFinance = currentRole.level === 'inti';

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      
      {/* Tab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pusat Administrasi & Keuangan
            </h1>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Pengurus Inti
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola persuratan dinas resmi, verifikasi reimburse pengeluaran, dan buku kas organisasi
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setSubTab('surat')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'surat' 
                ? 'bg-white text-genre-blue shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>E-Surat ({suratList.length})</span>
          </button>
          
          {isFinanceAdmin && (
            <>
              <button
                onClick={() => setSubTab('reimburse')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  subTab === 'reimburse' 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Reimburse ({reimburseList.length})</span>
              </button>
              <button
                onClick={() => setSubTab('keuangan')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  subTab === 'keuangan' 
                    ? 'bg-white text-genre-orange shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Buku Kas</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ===================== SUBTAB 1: E-SURAT ===================== */}
      {subTab === 'surat' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nomor, perihal, atau pemohon..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="semua">Semua Status</option>
                <option value="pending">Menunggu Review</option>
                <option value="selesai">Selesai / Terbit</option>
              </select>
            </div>

            <button
              onClick={onOpenCreateSurat}
              className="px-4 py-2 bg-genre-blue hover:bg-genre-blue-dark text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Pengajuan Surat</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {filteredSurat.map((surat) => (
                <div 
                  key={surat.id}
                  onClick={() => onSelectSurat(surat)}
                  className="p-4 sm:p-5 hover:bg-blue-50/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-genre-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {surat.nomor}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
                        {surat.jenis}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Diajukan: {surat.tanggal}
                      </span>
                    </div>

                    <h3 className="font-black text-sm sm:text-base text-slate-900 group-hover:text-genre-blue transition-colors">
                      {surat.perihal}
                    </h3>

                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      <span>Pemohon: <strong className="text-slate-700">{surat.pemohon}</strong></span>
                      <span>•</span>
                      <span>Tujuan: <strong className="text-slate-700">{surat.tujuan}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-center">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap flex items-center ${
                      surat.status.includes('Selesai')
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {surat.status.includes('Selesai') ? <CheckCircle className="w-3.5 h-3.5 mr-1" /> : <Clock className="w-3.5 h-3.5 mr-1" />}
                      {surat.status}
                    </span>

                    <button className="p-2 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-genre-blue group-hover:text-white transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredSurat.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Tidak ada dokumen surat yang cocok dengan pencarian Anda.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ===================== SUBTAB 2: E-REIMBURSE (KHUSUS PENGURUS INTI) ===================== */}
      {subTab === 'reimburse' && isFinanceAdmin && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari program kerja atau pemohon klaim..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="semua">Semua Status</option>
                <option value="pending">Menunggu Approval</option>
                <option value="selesai">Selesai Dicairkan</option>
              </select>
            </div>

            <button
              onClick={onOpenCreateReimburse}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Ajukan Reimburse Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReimburse.map((item) => (
              <div 
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
                      {item.id}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      item.status.includes('Selesai')
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <h3 className="font-black text-base text-slate-900">
                    {item.proker}
                  </h3>

                  <p className="text-xl font-black text-slate-900 font-mono mt-1 text-emerald-700">
                    Rp {item.nominal.toLocaleString('id-ID')}
                  </p>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                    {item.keterangan}
                  </p>

                  <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl space-y-1 text-xs">
                    <p className="text-slate-500">
                      Pemohon: <strong className="text-slate-800">{item.pemohon}</strong>
                    </p>
                    <p className="text-slate-500 font-mono">
                      Transfer: <strong className="text-slate-800">{item.bank} - {item.rekening}</strong>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Diajukan: {item.tanggal}
                  </span>

                  {canApproveFinance && !item.status.includes('Selesai') && (
                    <button
                      onClick={() => onApproveReimburse(item.id)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Verifikasi & Cairkan Kas</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ===================== SUBTAB 3: LAPORAN KEUANGAN & MANAJEMEN KAS BENDAHARA ===================== */}
      {subTab === 'keuangan' && isFinanceAdmin && (
        <div className="space-y-6">
          
          {/* Bendahara Action Toolbar: Tambah / Kurang Kas */}
          <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-genre-orange border border-white/20">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    KAS & KEUANGAN ORGANISASI
                  </span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
                    Bendahara 1 & 2
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                  Kelola Arus Kas Masuk & Keluar
                </h3>
                <p className="text-xs text-slate-300">
                  Otoritas pencatatan mutasi kas berada di bawah Bendahara Controller & Treasure
                </p>
              </div>
            </div>

            {/* Tombol Tambah & Kurangi Kas */}
            <div className="flex items-center space-x-2.5">
              <button
                onClick={onOpenMutasiKas}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center space-x-1.5"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ Catat Kas Masuk</span>
              </button>

              <button
                onClick={onOpenMutasiKas}
                className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-rose-500/25 transition-all flex items-center space-x-1.5"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>- Catat Kas Keluar</span>
              </button>
            </div>
          </div>

          {/* Cards Ringkasan Saldo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Saldo Kas Bank BJB (Kas Daerah)</span>
              <p className="text-2xl font-black text-slate-900 font-mono mt-1 text-genre-blue">
                Rp {keuangan.saldoUtama.toLocaleString('id-ID')}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Dikelola Bendahara 1 (Nazwa Zahira)</p>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Pemasukan Bulan Ini</span>
              <p className="text-2xl font-black text-emerald-600 font-mono mt-1 flex items-center">
                <ArrowDownLeft className="w-5 h-5 mr-1" />
                Rp {keuangan.pemasukanBulanIni.toLocaleString('id-ID')}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Hibah Pemkot, Iuran, & BUMF</p>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Pengeluaran Bulan Ini</span>
              <p className="text-2xl font-black text-rose-600 font-mono mt-1 flex items-center">
                <ArrowUpRight className="w-5 h-5 mr-1" />
                Rp {keuangan.pengeluaranBulanIni.toLocaleString('id-ID')}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Reimburse kegiatan & perlengkapan</p>
            </div>
          </div>

          {/* Tabel Transaksi Kas Mutasi */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Buku Arus Kas Masuk & Keluar (Buku Kas Umum)
                </h3>
                <p className="text-xs text-slate-500">Verifikasi berkala oleh Bendahara Controller & Treasure (BUMF)</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenMutasiKas}
                  className="px-3.5 py-1.5 bg-genre-blue hover:bg-genre-blue-dark text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Mutasi Baru</span>
                </button>
                <button
                  onClick={() => alert('Mengekspor Laporan Pertanggungjawaban (LPJ) Keuangan format PDF resmi...')}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center space-x-1"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Unduh LPJ</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
              {keuangan.transaksiTerbaru.map((trx, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">{trx.deskripsi}</p>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <span>{trx.tgl}</span>
                      <span>•</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">{trx.kategori}</span>
                      {trx.sumberDana && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400 font-mono text-[10px]">{trx.sumberDana}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-mono font-black text-sm ${
                      trx.jenis === 'Masuk' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {trx.jenis === 'Masuk' ? '+' : '-'} Rp {trx.nominal.toLocaleString('id-ID')}
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400">{trx.jenis === 'Masuk' ? 'Kas Masuk' : 'Kas Keluar'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
