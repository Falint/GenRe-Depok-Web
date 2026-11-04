import React, { useCallback, useEffect, useState } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import SuratPreviewModal from './components/SuratPreviewModal';
import CreateSuratModal from './components/CreateSuratModal';
import CreateReimburseModal from './components/CreateReimburseModal';
import CreateTiketModal from './components/CreateTiketModal';
import NotificationModal from './components/NotificationModal';
import AttendanceListModal from './components/AttendanceListModal';
import MutasiKasModal from './components/MutasiKasModal';
import LoginPage from './components/LoginPage';
import { restoreSession, signOut } from './lib/supabaseAuth';
import { clearPortalSession, createPortalRow, loadPortalData, setPortalSession, subscribePortalData, updatePortalRow } from './lib/portalData';

import DashboardTab from './components/Tabs/DashboardTab';
import AdministrasiTab from './components/Tabs/AdministrasiTab';
import KomunikasiTab from './components/Tabs/KomunikasiTab';
import MediaLibraryTab from './components/Tabs/MediaLibraryTab';
import StrukturJobdescTab from './components/Tabs/StrukturJobdescTab';
import ProfilForumTab from './components/Tabs/ProfilForumTab';

import { canViewAdminFinance, canApproveOrConfirm } from './data/mockData';

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

function profileToRole(profile) {
  return {
    id: profile.level,
    userId: profile.id,
    name: profile.nama_lengkap,
    role: profile.jabatan,
    group: profile.kelompok,
    level: profile.level,
    avatar: profile.avatar || '👤',
    isBendahara: profile.jabatan.toLowerCase().includes('bendahara'),
  };
}

function PortalApp({ auth, onSignOut }) {
  // The authenticated profile, rather than the former role-switch simulation, defines UI permissions.
  const [currentRole] = useState(() => profileToRole(auth.profile));
  const [activeTab, setActiveTab] = useState('dashboard');

  // Shared Data States
  const [suratList, setSuratList] = useState([]);
  const [reimburseList, setReimburseList] = useState([]);
  const [keuangan, setKeuangan] = useState({ saldoUtama: 0, pemasukanBulanIni: 0, pengeluaranBulanIni: 0, paguAnggaran: [], transaksiTerbaru: [] });
  const [pengumumanList, setPengumumanList] = useState([]);
  const [tiketList, setTiketList] = useState([]);
  const [dataError, setDataError] = useState('');

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

  const refreshData = useCallback(async () => {
    try {
      const data = await loadPortalData(auth.profile);
      setSuratList(data.suratList); setReimburseList(data.reimburseList); setKeuangan(data.keuangan);
      setPengumumanList(data.pengumumanList); setTiketList(data.tiketList); setDataError('');
    } catch (error) { setDataError(error.message || 'Data portal tidak dapat dimuat.'); }
  }, [auth.profile]);

  useEffect(() => {
    let unsubscribe;
    let disposed = false;
    (async () => {
      try {
        await setPortalSession(auth.session);
        await refreshData();
        if (!disposed) unsubscribe = await subscribePortalData(refreshData);
      } catch (error) { if (!disposed) setDataError(error.message || 'Koneksi Supabase gagal.'); }
    })();
    return () => { disposed = true; unsubscribe?.(); };
  }, [auth.session, refreshData]);

  const runMutation = async (action, message) => {
    try { await action(); await refreshData(); showToast(message); return true; }
    catch (error) { showToast(error.message || 'Perubahan tidak diizinkan oleh Supabase.'); return false; }
  };

  // Handlers for Surat
  const handleAddSurat = (newSurat) => runMutation(() => createPortalRow('surat', {
    nomor_surat: newSurat.nomor, jenis: newSurat.jenis, perihal: newSurat.perihal, pemohon_id: auth.profile.id,
    pemohon_nama: currentRole.name, divisi: currentRole.group, tujuan: newSurat.tujuan, keterangan: newSurat.keterangan, urgensi: newSurat.urgensi,
  }), `Draf surat "${newSurat.nomor}" berhasil diajukan.`);

  const handleApproveSurat = (suratId) => runMutation(async () => {
    await updatePortalRow('surat', suratId, { status: 'Selesai / Terbit (QR ACC)' });
    await createPortalRow('surat_approval', { surat_id: suratId, step_order: 99, step_label: `ACC & Tanda Tangan: ${currentRole.role}`, actor_name: currentRole.name, status: 'Disetujui', acted_at: new Date().toISOString() });
    setSelectedSuratForPreview(null);
  }, `Surat berhasil di-ACC oleh ${currentRole.name}.`);

  // Handlers for Reimburse
  const handleAddReimburse = (newReimburse) => runMutation(() => createPortalRow('reimburse', {
    proker: newReimburse.proker, pemohon_id: auth.profile.id, pemohon_nama: currentRole.name, divisi: currentRole.group,
    nominal: newReimburse.nominal, keterangan: newReimburse.keterangan, bank: newReimburse.bank, rekening: newReimburse.rekening,
  }), `Klaim reimburse Rp ${newReimburse.nominal.toLocaleString('id-ID')} berhasil diajukan.`);

  const handleApproveReimburse = (reimburseId) => runMutation(async () => {
    const item = reimburseList.find((row) => row.id === reimburseId);
    await updatePortalRow('reimburse', reimburseId, { status: 'Selesai / Dicairkan' });
    await createPortalRow('reimburse_approval', { reimburse_id: reimburseId, step_order: 99, role_label: currentRole.role, actor_name: currentRole.name, status: 'Disetujui / Ditransfer', acted_at: new Date().toISOString() });
    if (item) await createPortalRow('kas_mutasi', { tgl: new Date().toISOString().slice(0, 10), deskripsi: `Pencairan Reimburse: ${item.proker}`, jenis: 'Keluar', nominal: item.nominal, kategori: item.divisi, sumber_dana: 'Kas Utama', dicatat_oleh: auth.profile.id, dicatat_oleh_nama: currentRole.name });
  }, 'Klaim telah diverifikasi dan dana dicairkan.');

  // Handlers for Mutasi Kas (Tambah & Kurang Kas oleh Bendahara)
  const handleMutasiKas = (mutasi) => runMutation(() => createPortalRow('kas_mutasi', { tgl: new Date().toISOString().slice(0, 10), deskripsi: mutasi.deskripsi, jenis: mutasi.jenis, nominal: mutasi.nominal, kategori: mutasi.kategori, sumber_dana: mutasi.sumberDana, dicatat_oleh: auth.profile.id, dicatat_oleh_nama: currentRole.name }), 'Mutasi kas berhasil dicatat.');

  // Handlers for Tiket
  const handleAddTiket = (newTiket) => runMutation(() => createPortalRow('tiket_info', { judul: newTiket.judul, pemohon_id: auth.profile.id, pemohon_nama: currentRole.name, divisi_asal: currentRole.group, target_bidang: newTiket.tujuan, prioritas: newTiket.prioritas, deadline: newTiket.deadline || null, deskripsi: newTiket.deskripsi }), `Tiket info "${newTiket.judul}" berhasil dikirim.`);

  const handleUpdateTiketResponse = (tiketId, responseText) => runMutation(() => updatePortalRow('tiket_info', tiketId, { status: 'Selesai', respons: responseText }), 'Tanggapan tersimpan dan tiket ditutup.');

  // Handlers for Pengumuman
  const handleAddPengumuman = (newAnn) => runMutation(() => createPortalRow('pengumuman', { judul: newAnn.judul, kategori: newAnn.kategori, target: newAnn.target, isi: newAnn.isi, penulis_id: auth.profile.id, penulis_nama: currentRole.name, total_target: 0 }), 'Siaran pengumuman baru berhasil dipublikasikan.');
  const handleConfirmRead = (pengumumanId) => runMutation(() => createPortalRow('pengumuman_kehadiran', { pengumuman_id: pengumumanId, user_id: auth.profile.id }), 'Kehadiran Anda telah dikonfirmasi.');

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
        onSignOut={onSignOut}
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

        {dataError && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{dataError}</div>}

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
            onConfirmRead={handleConfirmRead}
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

export default function App() {
  const [auth, setAuth] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    restoreSession().then((storedAuth) => {
      if (active) {
        setAuth(storedAuth);
        setCheckingSession(false);
      }
    });
    return () => { active = false; };
  }, []);

  const handleSignOut = async () => {
    const session = auth?.session;
    setAuth(null);
    try {
      await clearPortalSession();
      await signOut(session);
    } catch {
      // The local session is cleared by signOut even if the remote logout request is unavailable.
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen bg-slate-950" aria-label="Memeriksa sesi" />;
  }

  return auth
    ? <PortalApp auth={auth} onSignOut={handleSignOut} />
    : <LoginPage onAuthenticated={setAuth} />;
}
