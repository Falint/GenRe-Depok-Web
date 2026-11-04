import React, { useState } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import SuratPreviewModal from './components/SuratPreviewModal';
import CreateSuratModal from './components/CreateSuratModal';
import CreateReimburseModal from './components/CreateReimburseModal';
import CreateTiketModal from './components/CreateTiketModal';
import NotificationModal from './components/NotificationModal';
import AttendanceListModal from './components/AttendanceListModal';
import MutasiKasModal from './components/MutasiKasModal';

import DashboardTab from './components/Tabs/DashboardTab';
import AdministrasiTab from './components/Tabs/AdministrasiTab';
import KomunikasiTab from './components/Tabs/KomunikasiTab';
import MediaLibraryTab from './components/Tabs/MediaLibraryTab';
import StrukturJobdescTab from './components/Tabs/StrukturJobdescTab';
import ProfilForumTab from './components/Tabs/ProfilForumTab';

import { 
  ROLES, 
  INITIAL_SURAT, 
  INITIAL_REIMBURSE, 
  INITIAL_KEUANGAN, 
  INITIAL_PENGUMUMAN, 
  INITIAL_TIKET_INFO,
  canViewAdminFinance,
  canApproveOrConfirm
} from './data/mockData';

import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  FolderGit2, 
  Plus, 
  CheckCircle2, 
  Users,
  ShieldCheck,
  Wallet,
  BookOpen
} from 'lucide-react';

export default function App() {
  // Current Active Role (Default: Muhammad Ighasta Mughis - Ketua Umum)
  const [currentRole, setCurrentRole] = useState(ROLES[0]);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Shared Data States
  const [suratList, setSuratList] = useState(INITIAL_SURAT);
  const [reimburseList, setReimburseList] = useState(INITIAL_REIMBURSE);
  const [keuangan, setKeuangan] = useState(INITIAL_KEUANGAN);
  const [pengumumanList, setPengumumanList] = useState(INITIAL_PENGUMUMAN);
  const [tiketList, setTiketList] = useState(INITIAL_TIKET_INFO);

  // Modal Controllers
  const [isCreateSuratOpen, setIsCreateSuratOpen] = useState(false);
  const [isCreateReimburseOpen, setIsCreateReimburseOpen] = useState(false);
  const [isCreateTiketOpen, setIsCreateTiketOpen] = useState(false);
  const [isMutasiKasOpen, setIsMutasiKasOpen] = useState(false);
  const [selectedSuratForPreview, setSelectedSuratForPreview] = useState(null);
  
  // Notification and Attendance Modals
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedPengumumanForAttendance, setSelectedPengumumanForAttendance] = useState(null);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isFinanceAdmin = canViewAdminFinance(currentRole.id);

  // Handlers for Surat
  const handleAddSurat = (newSurat) => {
    setSuratList([newSurat, ...suratList]);
    showToast(`Draf Surat "${newSurat.nomor}" berhasil diajukan!`);
  };

  const handleApproveSurat = (suratId) => {
    setSuratList(suratList.map(s => {
      if (s.id === suratId) {
        return {
          ...s,
          status: 'Selesai / Terbit (QR ACC)',
          approvalHistory: [
            ...s.approvalHistory,
            { step: `ACC & Tanda Tangan: ${currentRole.role}`, actor: currentRole.name, status: 'Disetujui', time: 'Baru saja' }
          ]
        };
      }
      return s;
    }));

    if (selectedSuratForPreview && selectedSuratForPreview.id === suratId) {
      setSelectedSuratForPreview({
        ...selectedSuratForPreview,
        status: 'Selesai / Terbit (QR ACC)'
      });
    }
    showToast(`Surat berhasil di-ACC & ditandatangani digital oleh ${currentRole.name}!`);
  };

  // Handlers for Reimburse
  const handleAddReimburse = (newReimburse) => {
    setReimburseList([newReimburse, ...reimburseList]);
    showToast(`Klaim reimburse Rp ${newReimburse.nominal.toLocaleString('id-ID')} berhasil diajukan.`);
  };

  const handleApproveReimburse = (reimburseId) => {
    setReimburseList(reimburseList.map(r => {
      if (r.id === reimburseId) {
        return {
          ...r,
          status: 'Selesai / Dicairkan',
          approvalChain: r.approvalChain.map(c => ({ ...c, status: 'Disetujui / Ditransfer' }))
        };
      }
      return r;
    }));

    const item = reimburseList.find(r => r.id === reimburseId);
    if (item) {
      setKeuangan(prev => ({
        ...prev,
        saldoUtama: prev.saldoUtama - item.nominal,
        pengeluaranBulanIni: prev.pengeluaranBulanIni + item.nominal,
        transaksiTerbaru: [
          {
            tgl: '03 Nov 2026',
            deskripsi: `Pencairan Reimburse: ${item.proker}`,
            jenis: 'Keluar',
            nominal: item.nominal,
            kategori: item.divisi,
            sumberDana: 'Bank BJB (Kas Daerah)'
          },
          ...prev.transaksiTerbaru
        ]
      }));
    }

    showToast(`Klaim telah diverifikasi dan dana dicairkan oleh Bendahara.`);
  };

  // Handlers for Mutasi Kas (Tambah & Kurang Kas oleh Bendahara)
  const handleMutasiKas = (mutasi) => {
    if (mutasi.jenis === 'Masuk') {
      setKeuangan(prev => ({
        ...prev,
        saldoUtama: prev.saldoUtama + mutasi.nominal,
        pemasukanBulanIni: prev.pemasukanBulanIni + mutasi.nominal,
        transaksiTerbaru: [
          {
            tgl: mutasi.tgl,
            deskripsi: mutasi.deskripsi,
            jenis: 'Masuk',
            nominal: mutasi.nominal,
            kategori: mutasi.kategori,
            sumberDana: mutasi.sumberDana
          },
          ...prev.transaksiTerbaru
        ]
      }));
      showToast(`Pemasukan kas Rp ${mutasi.nominal.toLocaleString('id-ID')} berhasil ditambahkan!`);
    } else {
      setKeuangan(prev => ({
        ...prev,
        saldoUtama: prev.saldoUtama - mutasi.nominal,
        pengeluaranBulanIni: prev.pengeluaranBulanIni + mutasi.nominal,
        transaksiTerbaru: [
          {
            tgl: mutasi.tgl,
            deskripsi: mutasi.deskripsi,
            jenis: 'Keluar',
            nominal: mutasi.nominal,
            kategori: mutasi.kategori,
            sumberDana: mutasi.sumberDana
          },
          ...prev.transaksiTerbaru
        ]
      }));
      showToast(`Pengeluaran kas Rp ${mutasi.nominal.toLocaleString('id-ID')} berhasil dicatat & saldo dipotong.`);
    }
  };

  // Handlers for Tiket
  const handleAddTiket = (newTiket) => {
    setTiketList([newTiket, ...tiketList]);
    showToast(`Tiket info "${newTiket.judul}" berhasil dikirim.`);
  };

  const handleUpdateTiketResponse = (tiketId, responseText) => {
    setTiketList(tiketList.map(t => {
      if (t.id === tiketId) {
        return {
          ...t,
          status: 'Selesai',
          respons: responseText
        };
      }
      return t;
    }));
    showToast(`Tanggapan tersimpan & status tiket ditutup.`);
  };

  // Handlers for Pengumuman
  const handleAddPengumuman = (newAnn) => {
    setPengumumanList([newAnn, ...pengumumanList]);
    showToast(`Siaran pengumuman baru berhasil dipublikasikan.`);
  };

  // Calculate pending badges for UI
  const pendingAdministrasiCount = 
    suratList.filter(s => s.status.includes('Menunggu')).length + 
    reimburseList.filter(r => r.status.includes('Menunggu')).length;

  const pendingKomunikasiCount = tiketList.filter(t => t.status === 'Open').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased selection:bg-genre-orange selection:text-white">
      
      {/* Top Application Header with 4 Logos, Role Switcher & Bell */}
      <Header
        currentRole={currentRole}
        onSelectRole={(role) => {
          setCurrentRole(role);
          showToast(`Beralih simulasi ke: ${role.name} (${role.role})`);
        }}
        unreadCount={isFinanceAdmin ? pendingAdministrasiCount : pendingKomunikasiCount}
        onOpenNotification={() => setIsNotificationOpen(true)}
      />

      {/* Desktop Main Navigation Tabs */}
      <nav className="hidden md:block bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-6">
            {[
              { id: 'dashboard', label: 'Dasbor', icon: LayoutDashboard },
              { id: 'profil', label: 'Profil Organisasi', icon: BookOpen },
              { id: 'struktur', label: 'Struktur & 32 Jobdesc', icon: Users },
              ...(isFinanceAdmin ? [{ id: 'administrasi', label: 'Administrasi & Keuangan', icon: FileText, badge: pendingAdministrasiCount }] : []),
              { id: 'komunikasi', label: 'Komunikasi & Tiket Info', icon: MessageSquare, badge: pendingKomunikasiCount },
              { id: 'media', label: 'Pusat Sumber Daya (Media Library)', icon: FolderGit2 }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-black text-xs sm:text-sm transition-all ${
                    isActive
                      ? 'border-genre-blue text-genre-blue'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-genre-orange text-white">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {activeTab === 'dashboard' && (
          <DashboardTab
            currentRole={currentRole}
            suratList={suratList}
            reimburseList={reimburseList}
            keuangan={keuangan}
            pengumumanList={pengumumanList}
            tiketList={tiketList}
            onOpenCreateSurat={() => setIsCreateSuratOpen(true)}
            onOpenCreateReimburse={() => setIsCreateReimburseOpen(true)}
            onOpenCreateTiket={() => setIsCreateTiketOpen(true)}
            onOpenMutasiKas={() => setIsMutasiKasOpen(true)}
            onSelectSurat={(surat) => setSelectedSuratForPreview(surat)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'profil' && (
          <ProfilForumTab />
        )}

        {activeTab === 'struktur' && (
          <StrukturJobdescTab />
        )}

        {activeTab === 'administrasi' && (
          <AdministrasiTab
            currentRole={currentRole}
            suratList={suratList}
            reimburseList={reimburseList}
            keuangan={keuangan}
            onOpenCreateSurat={() => setIsCreateSuratOpen(true)}
            onOpenCreateReimburse={() => setIsCreateReimburseOpen(true)}
            onOpenMutasiKas={() => setIsMutasiKasOpen(true)}
            onSelectSurat={(surat) => setSelectedSuratForPreview(surat)}
            onApproveReimburse={handleApproveReimburse}
          />
        )}

        {activeTab === 'komunikasi' && (
          <KomunikasiTab
            currentRole={currentRole}
            pengumumanList={pengumumanList}
            tiketList={tiketList}
            onOpenCreateTiket={() => setIsCreateTiketOpen(true)}
            onAddPengumuman={handleAddPengumuman}
            onUpdateTiketResponse={handleUpdateTiketResponse}
            onViewAttendance={(ann) => setSelectedPengumumanForAttendance(ann)}
          />
        )}

        {activeTab === 'media' && (
          <MediaLibraryTab />
        )}

      </main>

      {/* Bottom Nav for Mobile Viewports */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isFinanceAdmin={isFinanceAdmin}
        pendingBadges={{
          administrasi: pendingAdministrasiCount,
          komunikasi: pendingKomunikasiCount
        }}
      />

      {/* Modals & Dialogs */}
      <CreateSuratModal
        isOpen={isCreateSuratOpen}
        onClose={() => setIsCreateSuratOpen(false)}
        onSubmit={handleAddSurat}
        currentRole={currentRole}
      />

      <CreateReimburseModal
        isOpen={isCreateReimburseOpen}
        onClose={() => setIsCreateReimburseOpen(false)}
        onSubmit={handleAddReimburse}
        currentRole={currentRole}
      />

      <CreateTiketModal
        isOpen={isCreateTiketOpen}
        onClose={() => setIsCreateTiketOpen(false)}
        onSubmit={handleAddTiket}
        currentRole={currentRole}
      />

      <MutasiKasModal
        isOpen={isMutasiKasOpen}
        onClose={() => setIsMutasiKasOpen(false)}
        onSubmit={handleMutasiKas}
        currentRole={currentRole}
        currentSaldo={keuangan.saldoUtama}
      />

      <SuratPreviewModal
        surat={selectedSuratForPreview}
        onClose={() => setSelectedSuratForPreview(null)}
        onApprove={handleApproveSurat}
        canApprove={canApproveOrConfirm(currentRole.id)}
        roleName={currentRole.role}
      />

      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        currentRole={currentRole}
        suratList={suratList}
        reimburseList={reimburseList}
        tiketList={tiketList}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsNotificationOpen(false);
        }}
      />

      <AttendanceListModal
        isOpen={Boolean(selectedPengumumanForAttendance)}
        onClose={() => setSelectedPengumumanForAttendance(null)}
        pengumuman={selectedPengumumanForAttendance}
        currentRole={currentRole}
      />

      {/* Floating Action Button on Mobile */}
      <div className="md:hidden fixed right-4 bottom-20 z-40">
        <button
          onClick={() => setIsCreateSuratOpen(true)}
          className="w-13 h-13 p-3.5 rounded-full bg-genre-blue hover:bg-genre-blue-dark text-white shadow-xl shadow-blue-600/30 flex items-center justify-center transition-all active:scale-95"
          title="Ajukan Surat Baru"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Toast Alert Popup */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-slate-900 text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom-5 duration-200 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="hidden md:block bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/logo-genre-depok.png" alt="GenRe" className="h-6 w-auto" />
            <p>© 2026 Forum GenRe Kota Depok • Pembinaan DP3AP2KB Kota Depok</p>
          </div>
          <p className="font-mono text-[11px] text-slate-400">Arsitektur RBAC & Sistem Terintegrasi</p>
        </div>
      </footer>

    </div>
  );
}
