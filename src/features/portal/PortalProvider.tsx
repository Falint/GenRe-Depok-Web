'use client';
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { CheckCircle2, Plus } from 'lucide-react';
import Header from '@/components/Header';
import PortalNavigation from '@/components/PortalNavigation';
import { logout } from '@/features/auth/actions';
import {
  canApproveOrConfirm,
  canViewAdminFinance,
  profileToRole,
  type CurrentRole,
} from '@/features/auth/permissions';
import { createClient } from '@/lib/supabase/client';
import type { Result } from '@/lib/errors';
import { EMPTY_PORTAL_DATA, type Pengumuman, type PortalData, type Surat } from './mapping';
import { PORTAL_CONFIG, TICKET_STATUS, type Profile } from './schema';
import { PORTAL_ROUTES, type PortalTab } from './routes';
import type {
  MutasiInput,
  PengumumanInput,
  ReimburseInput,
  SuratInput,
  TiketInput,
} from './validation';
import { refreshPortal } from './actions';
import { createRefreshQueue, createRealtimeRefresh } from './refreshQueue';
import {
  decideReimburse,
  addMutasi,
  addReimburse,
  addSurat,
  approveReimburse,
  approveSurat,
} from '@/features/administrasi/actions';
import { addPengumuman, addTiket, confirmRead, respondTiket } from '@/features/komunikasi/actions';

const CreateSuratModal = dynamic(() => import('@/components/CreateSuratModal'));
const CreateReimburseModal = dynamic(() => import('@/components/CreateReimburseModal'));
const CreateTiketModal = dynamic(() => import('@/components/CreateTiketModal'));
const MutasiKasModal = dynamic(() => import('@/components/MutasiKasModal'));
const SuratPreviewModal = dynamic(() => import('@/components/SuratPreviewModal'));
const NotificationModal = dynamic(() => import('@/components/NotificationModal'));
const AttendanceListModal = dynamic(() => import('@/components/AttendanceListModal'));

type Modal =
  | { type: 'surat' | 'reimburse' | 'tiket' | 'kas' | 'notification' }
  | { type: 'preview'; surat: Surat }
  | { type: 'attendance'; pengumuman: Pengumuman }
  | null;
type PortalContextValue = PortalData & {
  currentRole: CurrentRole;
  dataError: string;
  refreshData: () => Promise<void>;
  onDecideReimburse: (
    id: string,
    decision: 'cancel' | 'reject',
    reason: string,
  ) => Promise<boolean>;
  busy: boolean;
  runMutation: (work: () => Promise<Result>, message: string) => Promise<boolean>;
  onOpenCreateSurat: (event?: MouseEvent<HTMLElement>) => void;
  onOpenCreateReimburse: (event?: MouseEvent<HTMLElement>) => void;
  onOpenCreateTiket: (event?: MouseEvent<HTMLElement>) => void;
  onOpenMutasiKas: (event?: MouseEvent<HTMLElement>) => void;
  onSelectSurat: (surat: Surat) => void;
  onNavigateTab: (tab: PortalTab) => void;
  onApproveReimburse: (id: string) => Promise<boolean>;
  onAddPengumuman: (input: PengumumanInput) => Promise<boolean>;
  onUpdateTiketResponse: (id: string, response: string) => Promise<boolean>;
  onConfirmRead: (id: string) => Promise<boolean>;
  onViewAttendance: (pengumuman: Pengumuman) => void;
};
const PortalContext = createContext<PortalContextValue | null>(null);
export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) throw new Error('Portal context tidak tersedia.');
  return context;
}

export default function PortalProvider({
  profile,
  initial,
  children,
}: {
  profile: Profile;
  initial: Result<PortalData>;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const currentRole = profileToRole(profile);
  const [data, setData] = useState(initial.ok ? initial.data : EMPTY_PORTAL_DATA);
  const [dataError, setDataError] = useState(initial.ok ? '' : initial.error);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const mutating = useRef(false);
  const mounted = useRef(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (message: string, error = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, error });
    toastTimer.current = setTimeout(() => setToast(null), PORTAL_CONFIG.TOAST_DURATION_MS);
  };
  const refreshQueue = useRef<ReturnType<typeof createRefreshQueue> | null>(null);
  const refreshData = useCallback(() => {
    refreshQueue.current ??= createRefreshQueue(
      async () => {
        try {
          const result = await refreshPortal();
          if (!mounted.current) return;
          if (result.ok) {
            setData(result.data);
            setDataError('');
          } else setDataError(result.error);
        } catch {
          if (mounted.current)
            setDataError('Koneksi terputus. Muat ulang data sebelum mencoba lagi.');
        }
      },
      () => mounted.current,
    );
    return refreshQueue.current();
  }, []);
  useEffect(() => {
    mounted.current = true;
    const client = createClient();
    const realtime = createRealtimeRefresh(
      () => void refreshData(),
      () => router.refresh(),
      PORTAL_CONFIG.REALTIME_DEBOUNCE_MS,
    );
    const channel = client.channel(`portal:${profile.id}`);
    const tables = [
      'surat',
      'surat_approval',
      'reimburse',
      'reimburse_approval',
      'kas_mutasi',
      'pagu_anggaran',
      'pengumuman',
      'pengumuman_kehadiran',
      'tiket_info',
      'profiles',
    ];
    tables.forEach((table) =>
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        realtime.event(table);
      }),
    );
    channel.subscribe((status) => {
      if (mounted.current && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'))
        setDataError(
          (previous) => previous || 'Pembaruan langsung terputus. Gunakan Muat ulang data.',
        );
    });
    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (
        event === 'USER_UPDATED' ||
        (event === 'SIGNED_IN' && session && session.user.id !== profile.id)
      )
        router.refresh();
      if (event === 'SIGNED_OUT') {
        setData(EMPTY_PORTAL_DATA);
        router.replace('/login');
        router.refresh();
      }
    });
    return () => {
      mounted.current = false;
      realtime.dispose();
      if (toastTimer.current) clearTimeout(toastTimer.current);
      authListener.subscription.unsubscribe();
      void client.removeChannel(channel);
    };
  }, [profile.id, refreshData, router]);

  const runMutation = async (work: () => Promise<Result>, message: string) => {
    if (mutating.current) return false;
    mutating.current = true;
    setBusy(true);
    try {
      const result = await work();
      if (!result.ok) {
        showToast(result.error, true);
        return false;
      }
      await refreshData();
      showToast(message);
      return true;
    } catch {
      showToast(
        'Koneksi terputus. Ulangi pengajuan dari form yang sama tanpa mengubah isian.',
        true,
      );
      return false;
    } finally {
      mutating.current = false;
      setBusy(false);
    }
  };
  const openModal = (next: Modal, event?: MouseEvent<HTMLElement>) => {
    event?.currentTarget.focus();
    setModal(next);
  };
  const closeModal = () => setModal(null);
  const onNavigateTab = (tab: PortalTab) => {
    closeModal();
    router.push(PORTAL_ROUTES[tab]);
  };
  const context: PortalContextValue = {
    ...data,
    dataError,
    refreshData,
    onDecideReimburse: (id, decision, reason) =>
      runMutation(() => decideReimburse({ id, decision, reason }), 'Keputusan klaim tersimpan.'),
    currentRole,
    busy,
    runMutation,
    onNavigateTab,
    onOpenCreateSurat: (event) => openModal({ type: 'surat' }, event),
    onOpenCreateReimburse: (event) => openModal({ type: 'reimburse' }, event),
    onOpenCreateTiket: (event) => openModal({ type: 'tiket' }, event),
    onOpenMutasiKas: (event) => openModal({ type: 'kas' }, event),
    onSelectSurat: (surat) => setModal({ type: 'preview', surat }),
    onViewAttendance: (pengumuman) => setModal({ type: 'attendance', pengumuman }),
    onApproveReimburse: (id) =>
      runMutation(() => approveReimburse(id), 'Pencairan dan mutasi kas berhasil dicatat.'),
    onAddPengumuman: (input) =>
      runMutation(() => addPengumuman(input), 'Pengumuman berhasil disiarkan.'),
    onUpdateTiketResponse: (id, response) =>
      runMutation(() => respondTiket(id, response), 'Tanggapan tersimpan dan tiket ditutup.'),
    onConfirmRead: (id) => runMutation(() => confirmRead(id), 'Kehadiran berhasil dikonfirmasi.'),
  };
  const pendingBadges = {
    administrasi:
      data.suratList.filter((row) => row.status.includes('Menunggu')).length +
      data.reimburseList.filter((row) => row.status.includes('Menunggu')).length,
    komunikasi: data.tiketList.filter((row) => row.status === TICKET_STATUS.OPEN).length,
  };
  const financeAdmin = canViewAdminFinance(profile.level);
  const handleLogout = async () => {
    if (mutating.current) return;
    mutating.current = true;
    setBusy(true);
    try {
      const result = await logout();
      if (!result.ok) {
        showToast(result.error, true);
        return;
      }
      setData(EMPTY_PORTAL_DATA);
      router.replace('/login');
      router.refresh();
    } catch {
      showToast('Keluar gagal. Periksa koneksi dan coba lagi.', true);
    } finally {
      mutating.current = false;
      setBusy(false);
    }
  };
  const createProps = { isOpen: true, busy, onClose: closeModal, currentRole };
  return (
    <PortalContext.Provider value={context}>
      <div className="min-h-screen bg-slate-50 flex flex-col antialiased selection:bg-genre-orange selection:text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:z-50 focus:bg-white focus:p-3"
        >
          Lewati ke konten
        </a>
        <Header
          currentRole={currentRole}
          onSignOut={handleLogout}
          unreadCount={financeAdmin ? pendingBadges.administrasi : pendingBadges.komunikasi}
          onOpenNotification={() => setModal({ type: 'notification' })}
        />
        <PortalNavigation
          pathname={pathname}
          pendingBadges={pendingBadges}
          financeAdmin={financeAdmin}
        />
        <main
          id="main-content"
          className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6"
        >
          {dataError && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              {dataError}{' '}
              <button
                className="underline"
                onClick={() => {
                  void refreshData();
                }}
              >
                Muat ulang data
              </button>
            </div>
          )}
          {children}
        </main>
        <PortalNavigation
          mobile
          pathname={pathname}
          pendingBadges={pendingBadges}
          financeAdmin={financeAdmin}
        />
        <Suspense
          fallback={
            <p
              role="status"
              className="fixed inset-x-4 bottom-24 z-50 rounded-xl bg-white p-4 text-center shadow-lg"
            >
              Memuat dialog…
            </p>
          }
        >
          {modal?.type === 'surat' && (
            <CreateSuratModal
              {...createProps}
              onSubmit={(input: SuratInput) =>
                runMutation(() => addSurat(input), 'Draf surat berhasil diajukan.')
              }
            />
          )}
          {modal?.type === 'reimburse' && (
            <CreateReimburseModal
              {...createProps}
              onSubmit={(input: ReimburseInput) =>
                runMutation(() => addReimburse(input), 'Klaim reimburse berhasil diajukan.')
              }
            />
          )}
          {modal?.type === 'tiket' && (
            <CreateTiketModal
              {...createProps}
              onSubmit={(input: TiketInput) =>
                runMutation(() => addTiket(input), 'Tiket informasi berhasil dikirim.')
              }
            />
          )}
          {modal?.type === 'kas' && (
            <MutasiKasModal
              {...createProps}
              currentSaldo={data.keuangan.saldoUtama}
              onSubmit={(input: MutasiInput) =>
                runMutation(() => addMutasi(input), 'Mutasi kas berhasil dicatat.')
              }
            />
          )}
          {modal?.type === 'preview' && (
            <SuratPreviewModal
              surat={data.suratList.find((row) => row.id === modal.surat.id) || modal.surat}
              busy={busy}
              onClose={closeModal}
              canApprove={canApproveOrConfirm(profile.level)}
              roleName={currentRole.role}
              onApprove={async (id) => {
                const saved = await runMutation(
                  () => approveSurat(id),
                  'Surat berhasil disetujui.',
                );
                if (saved) closeModal();
                return saved;
              }}
            />
          )}
          {modal?.type === 'notification' && (
            <NotificationModal {...createProps} {...data} onNavigateTab={onNavigateTab} />
          )}
          {modal?.type === 'attendance' && (
            <AttendanceListModal
              isOpen
              busy={busy}
              onClose={closeModal}
              pengumuman={
                data.pengumumanList.find((row) => row.id === modal.pengumuman.id) ||
                modal.pengumuman
              }
            />
          )}
        </Suspense>
        <div className="md:hidden fixed right-4 bottom-20 z-40">
          <button
            aria-label="Ajukan Surat Baru"
            onClick={(event) => openModal({ type: 'surat' }, event)}
            className="p-3.5 rounded-full bg-genre-blue text-white shadow-xl"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
        {toast &&
          createPortal(
            <div
              role={toast.error ? 'alert' : 'status'}
              className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto z-50 bg-slate-900 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toast.message}</span>
            </div>,
            (modal && document.querySelector('dialog[open]')) || document.body,
          )}
        <footer className="hidden md:block bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
          © 2026 Forum GenRe Kota Depok • Pembinaan DP3AP2KB Kota Depok
        </footer>
      </div>
    </PortalContext.Provider>
  );
}
