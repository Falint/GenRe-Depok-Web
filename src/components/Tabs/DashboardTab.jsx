import React, { useState } from 'react';
import {
  FileText,
  CreditCard,
  MessageSquare,
  FolderDown,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  BookOpen,
  Wallet
} from 'lucide-react';
import { canViewAdminFinance, canApproveOrConfirm } from '../../data/mockData';

export default function DashboardTab({ 
  currentRole, 
  suratList, 
  reimburseList, 
  keuangan, 
  pengumumanList, 
  tiketList,
  onOpenCreateSurat,
  onOpenCreateReimburse,
  onOpenCreateTiket,
  onOpenMutasiKas,
  onSelectSurat,
  onNavigateTab
}) {
  const [acknowledgedUrgent, setAcknowledgedUrgent] = useState(false);

  // RBAC Access Control
  const isFinanceAdmin = canViewAdminFinance(currentRole.id); // Ketua, Wakil, Sekretaris, Bendahara
  const isLeadership = canApproveOrConfirm(currentRole.id); // Inti + Kabid
  const isBendahara = currentRole.isBendahara;

  // Compute pending metrics
  const pendingSurat = suratList.filter(s => s.status.includes('Menunggu'));
  const pendingReimburse = reimburseList.filter(r => r.status.includes('Menunggu'));
  const openTiket = tiketList.filter(t => t.status !== 'Selesai');

  const urgentAnnouncement = pengumumanList.find(p => p.kategori === 'Urgent');

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      
      {/* Role Banner & Dynamic Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-genre-blue to-genre-blue-dark p-6 sm:p-8 text-white shadow-xl shadow-blue-900/10">
        <div className="absolute -right-10 -bottom-10 w-56 h-56 bg-genre-orange/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner border border-white/20">
              {currentRole.avatar}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                  {currentRole.group}
                </span>
                <span className="text-xs text-blue-200">
                  Masa Bakti 2026/2027
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                Halo, {currentRole.name}!
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 max-w-xl mt-1">
                {isBendahara
                  ? 'Anda bertugas sebagai Bendahara Forum GenRe Depok. Anda berwenang mencatat kas masuk/keluar, verifikasi struk reimburse, dan audit kas.'
                  : isFinanceAdmin 
                  ? 'Anda memiliki akses penuh Pengurus Inti untuk mengelola kas, verifikasi persuratan, dan disposisi keuangan.'
                  : isLeadership 
                  ? 'Anda memiliki wewenang verifikasi bidang dan koordinasi program kerja.'
                  : 'Portal mandiri staf: Ajukan permohonan surat, klaim reimburse, dan unduh sumber daya resmi.'}
              </p>
            </div>
          </div>

          {/* Access Badge Indicator */}
          <div className="flex items-center space-x-2 self-start md:self-auto">
            {isBendahara ? (
              <div className="bg-emerald-500/25 backdrop-blur-md px-4 py-2 rounded-2xl border border-emerald-400/40 text-xs text-left">
                <p className="text-emerald-200 font-semibold text-[10px]">Otoritas Bendahara</p>
                <p className="font-bold flex items-center text-white">
                  <Wallet className="w-3.5 h-3.5 mr-1 text-emerald-300" /> Kelola & Mutasi Kas
                </p>
              </div>
            ) : isFinanceAdmin ? (
              <div className="bg-emerald-500/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-emerald-400/30 text-xs text-left">
                <p className="text-emerald-200 font-semibold text-[10px]">Level Pengurus Inti</p>
                <p className="font-bold flex items-center text-white">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Akses Kas & ACC Penuh
                </p>
              </div>
            ) : isLeadership ? (
              <div className="bg-amber-500/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-400/30 text-xs text-left">
                <p className="text-amber-200 font-semibold text-[10px]">Level Kepala Bidang</p>
                <p className="font-bold text-white flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-amber-400" /> Verifikasi Bidang & Kehadiran
                </p>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-xs text-left">
                <p className="text-blue-200 font-semibold text-[10px]">Akses Mandiri Staf</p>
                <p className="font-bold text-white flex items-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-genre-orange" /> Request & Download
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Urgent Announcement Alert */}
      {urgentAnnouncement && (
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          acknowledgedUrgent 
            ? 'bg-slate-50 border-slate-200 text-slate-700' 
            : 'bg-rose-50 border-rose-200 text-rose-900 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-rose-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-800">
                    PENGUMUMAN DARURAT
                  </span>
                  <span className="text-xs text-rose-600 font-medium">
                    {urgentAnnouncement.tanggal}
                  </span>
                </div>
                <h3 className="font-black text-sm sm:text-base mt-1 text-slate-900">
                  {urgentAnnouncement.judul}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  {urgentAnnouncement.isi}
                </p>
              </div>
            </div>

            <button
              onClick={() => setAcknowledgedUrgent(!acknowledgedUrgent)}
              className={`shrink-0 text-xs px-4 py-2 rounded-xl font-bold transition-all self-start sm:self-auto ${
                acknowledgedUrgent
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20'
              }`}
            >
              {acknowledgedUrgent ? 'Sudah Konfirmasi Hadir ✓' : 'Konfirmasi Hadir / Mengerti'}
            </button>
          </div>
        </div>
      )}

      {/* ================= KHUSUS PENGURUS INTI: METRICS KEUANGAN & ANTREAN SURAT ================= */}
      {isFinanceAdmin ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-genre-blue" />
              Ringkasan Eksekutif (Hanya Terlihat untuk Ketua, Wakil, Sekretaris, & Bendahara)
            </span>
            {isBendahara && (
              <button
                onClick={onOpenMutasiKas}
                className="text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1 rounded-xl transition-colors flex items-center space-x-1"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>+ Catat Mutasi Kas</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Card 1: Antrean Surat */}
            <div 
              onClick={() => onNavigateTab('administrasi')}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 hover:border-genre-blue/40 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Antrean Surat</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-genre-blue flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono">
                {pendingSurat.length}
              </p>
              <p className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 inline" /> Menunggu Review / ACC
              </p>
            </div>

            {/* Card 2: Pengajuan Reimburse */}
            <div 
              onClick={() => onNavigateTab('administrasi')}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Klaim Reimburse</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono">
                {pendingReimburse.length}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-1 inline" /> Menunggu Verifikasi Struk
              </p>
            </div>

            {/* Card 3: Saldo Kas Utama */}
            <div 
              onClick={() => onNavigateTab('administrasi')}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 hover:border-genre-orange/40 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Kas Utama Organisasi</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-genre-orange flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg sm:text-xl font-black text-slate-900 mt-2 font-mono truncate">
                Rp {keuangan.saldoUtama.toLocaleString('id-ID')}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Bank BJB • Klik untuk rincian
              </p>
            </div>

            {/* Card 4: Tiket Koordinasi */}
            <div 
              onClick={() => onNavigateTab('komunikasi')}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Tiket Info Aktif</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono">
                {openTiket.length}
              </p>
              <p className="text-[11px] text-purple-600 font-semibold mt-1">
                Permintaan Antarbidang
              </p>
            </div>

          </div>
        </div>
      ) : (
        /* ================= TAMPILAN UNTUK KEPALA BIDANG & STAF ================= */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div 
            onClick={() => onNavigateTab('struktur')}
            className="bg-white p-5 rounded-3xl border border-slate-200 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Struktur & Tugas Saya</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-genre-blue flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base sm:text-lg font-black text-slate-900 mt-2">{currentRole.role}</p>
            <p className="text-[11px] text-genre-blue font-semibold mt-1 flex items-center">
              Lihat 32 Job Description Baku <ArrowRight className="w-3 h-3 ml-1" />
            </p>
          </div>

          <div 
            onClick={() => onNavigateTab('komunikasi')}
            className="bg-white p-5 rounded-3xl border border-slate-200 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Pusat Komunikasi</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base sm:text-lg font-black text-slate-900 mt-2">{openTiket.length} Tiket Aktif</p>
            <p className="text-[11px] text-purple-600 font-semibold mt-1 flex items-center">
              Koordinasi Informasi Antarbidang <ArrowRight className="w-3 h-3 ml-1" />
            </p>
          </div>

          <div 
            onClick={() => onNavigateTab('media')}
            className="bg-white p-5 rounded-3xl border border-slate-200 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Pusat Sumber Daya</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-genre-orange flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base sm:text-lg font-black text-slate-900 mt-2">Media & Modul</p>
            <p className="text-[11px] text-genre-orange font-semibold mt-1 flex items-center">
              Unduh Logo & Modul Triad KRR <ArrowRight className="w-3 h-3 ml-1" />
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions Shortcuts */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="font-extrabold text-sm sm:text-base text-slate-900 mb-3 flex items-center justify-between">
          <span>Aksi Mandiri Pengurus</span>
          <span className="text-xs font-normal text-slate-500">Pengajuan Tanpa Chat WA</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <button
            onClick={onOpenCreateSurat}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/60 text-genre-blue transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform text-genre-blue">
              <FileText className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-slate-800">+ Request Surat</span>
            <span className="text-[10px] text-slate-500 text-center">Ajukan draf surat tugas/kegiatan</span>
          </button>

          <button
            onClick={onOpenCreateReimburse}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/60 text-emerald-700 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform text-emerald-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-slate-800">+ Request Reimburse</span>
            <span className="text-[10px] text-slate-500 text-center">Klaim biaya nota struk kegiatan</span>
          </button>

          {isBendahara ? (
            <button
              onClick={onOpenMutasiKas}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/60 text-emerald-700 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform text-emerald-600">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-800">± Catat Kas Masuk/Keluar</span>
              <span className="text-[10px] text-slate-500 text-center">Khusus Bendahara 1 & 2</span>
            </button>
          ) : (
            <button
              onClick={onOpenCreateTiket}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200/60 text-purple-700 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform text-purple-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-800">+ Request Info</span>
              <span className="text-[10px] text-slate-500 text-center">Permintaan data antarbidang</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab('media')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/60 text-genre-orange transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform text-genre-orange">
              <FolderDown className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-slate-800">Media Library</span>
            <span className="text-[10px] text-slate-500 text-center">Unduh logo & modul Triad KRR</span>
          </button>

        </div>
      </div>

      {/* ================= KHUSUS PENGURUS INTI: DAFTAR SURAT MENUNGGU TINDAKAN & REALISASI ANGGARAN ================= */}
      {isFinanceAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Surat Waiting for ACC */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-genre-blue" />
                  Daftar Surat Menunggu Tindakan (Ketua/Sekre/Benda)
                </h2>
                <button 
                  onClick={() => onNavigateTab('administrasi')}
                  className="text-xs font-bold text-genre-blue hover:underline flex items-center"
                >
                  Lihat Semua <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              </div>

              <div className="space-y-3">
                {suratList.slice(0, 3).map((surat) => (
                  <div 
                    key={surat.id}
                    onClick={() => onSelectSurat(surat)}
                    className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="space-y-1 pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold text-genre-blue bg-blue-50 px-2 py-0.5 rounded">
                          {surat.nomor}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {surat.tanggal}
                        </span>
                      </div>
                      <p className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-1">
                        {surat.perihal}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Pemohon: {surat.pemohon}
                      </p>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                      surat.status.includes('Selesai')
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {surat.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Hanya Ketua, Wakil, Sekretaris, dan Bendahara yang berwenang meninjau antrean ini.</span>
            </div>
          </div>

          {/* Financial Budget Progress Widget */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-emerald-600" />
                Realisasi Anggaran per Bidang (2026)
              </h2>
              <button 
                onClick={() => onNavigateTab('administrasi')}
                className="text-xs font-bold text-genre-blue hover:underline flex items-center"
              >
                Rincian Kas <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>

            <div className="space-y-4">
              {keuangan.paguAnggaran.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <span>{item.bidang}</span>
                    <span className="font-mono">{item.persentase}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-genre-blue to-genre-orange rounded-full transition-all duration-500"
                      style={{ width: `${item.persentase}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Terpakai: Rp {item.terpakai.toLocaleString('id-ID')}</span>
                    <span>Pagu: Rp {item.pagu.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-800">Laporan Kas Terkini</p>
                <p className="text-[11px] text-slate-500">Diverifikasi oleh Bendahara Controller (Nazwa Zahira)</p>
              </div>
              <button
                onClick={() => alert('Mengunduh Ikhtisar Keuangan GenRe Depok format Excel (.xlsx)...')}
                className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 text-xs shadow-sm"
              >
                Export Excel
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
