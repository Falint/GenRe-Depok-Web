'use client';
import { useNow } from '@/features/portal/useNow';
import PanitiaTab from '@/features/panitia/PanitiaTab';
import AnnouncementControls from './AnnouncementControls';
import TicketDeadline from './TicketDeadline';
import { fromWib, wibInput, attendanceOpen } from '@/features/portal/datetime';
import { formatDate } from '@/features/portal/mapping';
import type { PengumumanInput } from '@/features/portal/validation';
import { pengumumanInput } from '@/features/portal/validation';
import { canRespondToTicket } from '@/features/auth/permissions';
import { usePortal } from '@/features/portal/PortalProvider';
import React, { useState } from 'react';
import { MessageSquare, Radio, Plus, Clock, CheckCircle2, Eye, Users } from 'lucide-react';
import { canViewAttendanceList } from '@/features/auth/permissions';

export default function KomunikasiTab() {
  const now = useNow();
  const {
    currentRole,
    pengumumanList,
    tiketList,
    onOpenCreateTiket,
    onAddPengumuman,
    onUpdateTiketResponse,
    onConfirmRead,
    onViewAttendance,
    busy,
  } = usePortal();
  const [subTab, setSubTab] = useState('pengumuman'); // 'pengumuman' | 'tiket'
  const [selectedKategori, setSelectedKategori] = useState('Semua');

  // Ticket reply state
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // New announcement modal / inline form state
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [broadcastData, setBroadcastData] = useState<PengumumanInput>({
    judul: '',
    kategori: 'Umum',
    target: 'Semua Pengurus',
    isi: '',
  });

  const canBroadcast = currentRole.manageContent;
  const hasAttendanceAccess = canViewAttendanceList(currentRole.level);

  const handleBroadcastSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!broadcastData.judul || !broadcastData.isi) return;

    const newAnn = broadcastData;

    if (await onAddPengumuman(newAnn)) {
      setShowBroadcastForm(false);
      setBroadcastData({ judul: '', kategori: 'Umum', target: 'Semua Pengurus', isi: '' });
    }
  };

  const handleSendReply = async (tiketId: string) => {
    if (!replyText.trim()) return;
    if (await onUpdateTiketResponse(tiketId, replyText)) {
      setReplyText('');
      setActiveReplyId(null);
    }
  };

  const filteredPengumuman = pengumumanList.filter((p) => {
    if (selectedKategori === 'Semua') return true;
    return p.kategori === selectedKategori;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Pusat Komunikasi & Koordinasi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Papan pengumuman resmi dan sistem tiket permintaan data antarbidang
          </p>
        </div>

        <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setSubTab('pengumuman')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'pengumuman'
                ? 'bg-white text-genre-blue shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Papan Pengumuman ({pengumumanList.length})</span>
          </button>
          <button
            onClick={() => setSubTab('tiket')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'tiket'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Request Info ({tiketList.length})</span>
          </button>
          <button
            onClick={() => setSubTab('panitia')}
            className={`rounded-xl px-3 py-2 text-xs font-bold ${subTab === 'panitia' ? 'bg-white text-genre-blue shadow-sm' : 'text-slate-600'}`}
          >
            Kebutuhan Panitia
          </button>
        </div>
      </div>

      {subTab === 'panitia' && <PanitiaTab />}

      {/* ===================== SUBTAB 1: PAPAN PENGUMUMAN ===================== */}
      {subTab === 'pengumuman' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Filter tags */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
              {['Semua', 'Urgent', 'Umum', 'Kecamatan'].map((kat) => (
                <button
                  key={kat}
                  onClick={() => setSelectedKategori(kat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedKategori === kat
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {kat}
                </button>
              ))}
            </div>

            {canBroadcast && (
              <button
                onClick={() => setShowBroadcastForm(!showBroadcastForm)}
                className="px-4 py-2 bg-genre-blue hover:bg-genre-blue-dark text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Siarkan Pengumuman Baru</span>
              </button>
            )}
          </div>

          {/* Form Siaran Baru (Jika dibuka oleh Pimpinan) */}
          {showBroadcastForm && (
            <div className="bg-blue-50/60 border border-blue-200 rounded-3xl p-5 animate-in fade-in duration-200">
              <h3 className="font-extrabold text-slate-900 text-sm mb-3">
                Buat Siaran Pengumuman Resmi
              </h3>
              <form onSubmit={handleBroadcastSubmit} className="space-y-3 text-xs sm:text-sm">
                <div>
                  <input
                    type="text"
                    placeholder="Judul Pengumuman (Contoh: Rapat Koordinasi Forum Duta GenRe)"
                    value={broadcastData.judul}
                    onChange={(e) => setBroadcastData({ ...broadcastData, judul: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-genre-blue/30"
                    required
                    aria-label="Judul Pengumuman (Contoh: Rapat Koordinasi Forum Duta GenRe)"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={broadcastData.kategori}
                    onChange={(e) =>
                      setBroadcastData({
                        ...broadcastData,
                        kategori: pengumumanInput.shape.kategori.parse(e.target.value),
                      })
                    }
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    aria-label="Filter pilihan"
                  >
                    <option value="Umum">Kategori: Umum</option>
                    <option value="Urgent">Kategori: Urgent / Mendesak</option>
                    <option value="Kecamatan">Kategori: Khusus 11 Kecamatan</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Target Audiens (Contoh: Seluruh Pengurus / Koordinator Kec)"
                    value={broadcastData.target}
                    onChange={(e) => setBroadcastData({ ...broadcastData, target: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    aria-label="Target Audiens (Contoh: Seluruh Pengurus / Koordinator Kec)"
                  />
                </div>
                <textarea
                  rows={3}
                  placeholder="Isi instruksi atau pengumuman secara rinci..."
                  value={broadcastData.isi}
                  onChange={(e) => setBroadcastData({ ...broadcastData, isi: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-genre-blue/30"
                  required
                  aria-label="Isi instruksi atau pengumuman secara rinci..."
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  {(['deadline_konfirmasi', 'mulai_at', 'selesai_at'] as const).map((key, i) => (
                    <label key={key}>
                      {['Deadline konfirmasi', 'Mulai kegiatan', 'Selesai kegiatan'][i]} (WIB)
                      <input
                        type="datetime-local"
                        value={wibInput(broadcastData[key])}
                        onChange={(e) =>
                          setBroadcastData({
                            ...broadcastData,
                            [key]: e.target.value ? fromWib(e.target.value) : null,
                          })
                        }
                        className="mt-1 w-full rounded-xl border p-2"
                      />
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Opsional: isi ketiga jadwal untuk kegiatan. Deadline harus sebelum mulai.
                </p>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowBroadcastForm(false)}
                    className="px-3 py-1.5 bg-slate-200 rounded-xl font-semibold text-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-4 py-1.5 bg-genre-blue text-white font-bold rounded-xl shadow-md"
                  >
                    Kirim Broadcast
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pengumuman Feed */}
          <div className="space-y-4">
            {filteredPengumuman.length === 0 && (
              <p className="p-6 text-sm text-slate-500">Belum ada pengumuman untuk kategori ini.</p>
            )}
            {filteredPengumuman.map((item) => {
              const readCount = (item.readList || []).length;
              const hasUserRead = (item.readList || []).some(
                (row) => row.userId === currentRole.userId,
              );

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-sm transition-all ${
                    item.kategori === 'Urgent'
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            item.kategori === 'Urgent'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-genre-blue'
                          }`}
                        >
                          {item.kategori}
                        </span>
                        <span className="text-xs text-slate-400">{item.tanggal}</span>
                        <span className="text-xs text-slate-500">
                          • Sasaran: <strong className="text-slate-700">{item.target}</strong>
                        </span>
                      </div>

                      <h3 className="font-black text-base sm:text-lg text-slate-900 mt-1">
                        {item.judul}
                      </h3>

                      <p className="text-xs text-slate-500">
                        Disiarkan oleh:{' '}
                        <span className="font-semibold text-slate-700">{item.penulis}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 self-start sm:self-auto">
                      {/* Attendance List Viewer Button for Pimpinan (Ketua, Wakil, Sekre, Benda, Kabid) */}
                      {hasAttendanceAccess && (
                        <button
                          onClick={() => onViewAttendance(item)}
                          className="px-3 py-1.5 rounded-xl font-bold text-xs bg-blue-50 text-genre-blue hover:bg-blue-100 border border-blue-200 transition-all flex items-center space-x-1"
                          title="Lihat rincian pengurus yang telah hadir / membaca"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Daftar Hadir ({readCount})</span>
                        </button>
                      )}

                      {/* Confirm attendance / read receipt button */}
                      <button
                        onClick={() => !hasUserRead && onConfirmRead(item.id)}
                        disabled={hasUserRead || busy || !attendanceOpen(item, now)}
                        className={`text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1 transition-all ${
                          hasUserRead
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {hasUserRead
                            ? 'Sudah Konfirmasi'
                            : !attendanceOpen(item, now)
                              ? 'Konfirmasi Ditutup'
                              : 'Konfirmasi Hadir'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 mt-3 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                    {item.isi}
                  </p>

                  {item.cancelled_at && (
                    <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
                      Dibatalkan · {item.cancellation_reason}
                    </p>
                  )}
                  {item.mulai_at && (
                    <p className="mt-3 text-xs text-slate-600">
                      Kegiatan {formatDate(item.mulai_at)} – {formatDate(item.selesai_at || null)}{' '}
                      WIB · Deadline konfirmasi {formatDate(item.deadline_konfirmasi || null)} WIB
                    </p>
                  )}
                  {item.deadline_konfirmasi &&
                    attendanceOpen(item, now) &&
                    Date.parse(item.deadline_konfirmasi) < now && (
                      <p className="text-xs text-amber-800">
                        Konfirmasi setelah deadline dicatat terlambat; masih dibuka sampai kegiatan
                        dimulai.
                      </p>
                    )}
                  {item.updated_at && (
                    <p className="mt-2 text-xs text-slate-500">
                      Diperbarui {formatDate(item.updated_at)} WIB
                    </p>
                  )}
                  <AnnouncementControls item={item} />
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center">
                      <Eye className="w-3.5 h-3.5 mr-1" /> Dikonfirmasi oleh {readCount} pengurus
                    </span>
                    <span className="font-mono">{item.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== SUBTAB 2: TIKET REQUEST INFORMASI ===================== */}
      {subTab === 'tiket' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm text-slate-600">
              Gunakan tiket ini untuk meminta berkas, materi desain, atau kontak kecamatan
              antarbidang secara terorganisir.
            </p>

            <button
              onClick={onOpenCreateTiket}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Buka Tiket Permintaan</span>
            </button>
          </div>

          <div className="space-y-4">
            {tiketList.length === 0 && (
              <p className="p-6 text-sm text-slate-500">Belum ada tiket informasi.</p>
            )}
            {tiketList.map((tiket) => (
              <div
                key={tiket.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                        {tiket.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          tiket.prioritas === 'Mendesak' || tiket.prioritas === 'Tinggi'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        Prioritas: {tiket.prioritas}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1" /> Deadline:{' '}
                        {tiket.deadline_at
                          ? `${formatDate(tiket.deadline_at)} WIB`
                          : tiket.deadline || 'Belum ditetapkan'}
                      </span>
                    </div>

                    <h3 className="font-black text-base sm:text-lg text-slate-900 mt-1">
                      {tiket.judul}
                    </h3>

                    <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                      <span>
                        Dari: <strong className="text-slate-700">{tiket.dari}</strong>
                      </span>
                      <span>→</span>
                      <span>
                        Ditujukan ke:{' '}
                        <strong className="text-purple-700 font-semibold">{tiket.tujuan}</strong>
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                      tiket.status === 'Selesai'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-genre-blue'
                    }`}
                  >
                    {tiket.status}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {tiket.deskripsi}
                </div>

                <p className="text-xs text-slate-500">
                  Dibuat {formatDate(tiket.created_at)} WIB
                  {tiket.updated_at && ` · Diperbarui ${formatDate(tiket.updated_at)} WIB`}
                </p>
                <TicketDeadline ticket={tiket} />
                {/* Response / Thread Section */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center">
                      <MessageSquare className="w-3.5 h-3.5 mr-1" /> Tanggapan / Jawaban Resmi:
                    </p>
                    <p className="text-xs text-slate-700 italic">&quot;{tiket.respons}&quot;</p>
                  </div>

                  {/* Inline reply action */}
                  {canRespondToTicket(
                    { id: currentRole.userId, level: currentRole.level },
                    tiket.pemohon_id,
                  ) &&
                    (activeReplyId === tiket.id ? (
                      <div className="mt-3 flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Ketik tanggapan / tautan file jawaban..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                          aria-label="Ketik tanggapan / tautan file jawaban..."
                        />
                        <button
                          disabled={busy}
                          onClick={() => handleSendReply(tiket.id)}
                          className="px-3.5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-sm"
                        >
                          Kirim
                        </button>
                        <button
                          onClick={() => setActiveReplyId(null)}
                          className="px-2.5 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => setActiveReplyId(tiket.id)}
                          className="text-xs font-bold text-purple-700 hover:underline flex items-center"
                        >
                          + Berikan Tanggapan / Lampirkan Data
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
