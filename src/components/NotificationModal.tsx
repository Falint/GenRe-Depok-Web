'use client';
import { formatDate } from '@/features/portal/mapping';
import type { CurrentRole } from '@/features/auth/permissions';
import type { PortalTab } from '@/features/portal/routes';
import type { ModalProps } from './modal-types';
import type { Surat, Reimburse, Tiket } from '@/features/portal/mapping';
import Dialog from './Dialog';
import React from 'react';
import { X, Bell, AlertCircle } from 'lucide-react';

export default function NotificationModal({
  isOpen,
  onClose,
  currentRole,
  suratList,
  reimburseList,
  tiketList,
  onNavigateTab,
  busy,
}: ModalProps & {
  currentRole: CurrentRole;
  suratList: Surat[];
  reimburseList: Reimburse[];
  tiketList: Tiket[];
  onNavigateTab: (tab: PortalTab) => void;
}) {
  if (!isOpen) return null;

  // Items requiring attention
  const pendingSurat = suratList.filter((s) => s.status.includes('Menunggu'));
  const pendingReimburse = reimburseList.filter((r) => r.status.includes('Menunggu'));
  const openTiket = tiketList.filter((t) => t.status !== 'Selesai');

  return (
    <Dialog title="Pusat pemberitahuan" onClose={onClose} busy={busy}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-genre-blue flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Pusat Pemberitahuan & Tindakan
              </h3>
              <p className="text-xs text-slate-500">Status antrean akun: {currentRole.name}</p>
            </div>
          </div>
          <button
            aria-label="Tutup dialog"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs sm:text-sm">
          {/* Section: Pending Approvals for Leadership */}
          {currentRole.level === 'inti' && (
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Membutuhkan Otorisasi / Tindakan Anda (
                {currentRole.role})
              </p>

              {pendingSurat.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    onClose();
                    onNavigateTab('administrasi');
                  }}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-genre-blue cursor-pointer transition-all shadow-sm flex items-center justify-between group"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault();
                      event.currentTarget.click();
                    }
                  }}
                >
                  <div className="space-y-0.5 pr-2">
                    <span className="font-mono text-[10px] font-bold text-genre-blue break-all max-w-full">
                      {s.nomor}
                    </span>
                    <p className="font-bold text-slate-800 line-clamp-1 group-hover:text-genre-blue">
                      {s.perihal}
                    </p>
                    <p className="text-[10px] text-slate-500">Pemohon: {s.pemohon}</p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full whitespace-nowrap">
                    Review / ACC
                  </span>
                </div>
              ))}

              {pendingReimburse.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    onClose();
                    onNavigateTab('administrasi');
                  }}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 cursor-pointer transition-all shadow-sm flex items-center justify-between group"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault();
                      event.currentTarget.click();
                    }
                  }}
                >
                  <div className="space-y-0.5 pr-2">
                    <span className="font-mono text-[10px] font-bold text-emerald-700">{r.id}</span>
                    <p className="font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-700">
                      {r.proker}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Klaim: Rp {r.nominal.toLocaleString('id-ID')} ({r.pemohon})
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full whitespace-nowrap">
                    Verifikasi Struk
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Section: Open Tickets */}
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Koordinasi Informasi Aktif
            </p>
            {openTiket.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  onClose();
                  onNavigateTab('komunikasi');
                }}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-purple-400 cursor-pointer transition-all flex items-center justify-between group"
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault();
                    event.currentTarget.click();
                  }
                }}
              >
                <div className="space-y-0.5 pr-2">
                  <span className="font-mono text-[10px] font-bold text-purple-700">{t.id}</span>
                  <p className="font-bold text-slate-800 line-clamp-1 group-hover:text-purple-700">
                    {t.judul}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Target: {t.tujuan} • Batas:{' '}
                    {t.deadline_at
                      ? `${formatDate(t.deadline_at)} WIB`
                      : t.deadline || 'Belum ditetapkan'}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-center">
          <button
            aria-label="Tutup dialog"
            onClick={onClose}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors"
          >
            Tutup Pemberitahuan
          </button>
        </div>
      </div>
    </Dialog>
  );
}
