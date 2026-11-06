'use client';
import type { ModalProps } from './modal-types';
import type { Pengumuman } from '@/features/portal/mapping';
import Dialog from './Dialog';
import React, { useState } from 'react';
import { X, CheckCircle2, Clock, Users, Search } from 'lucide-react';

export default function AttendanceListModal({
  isOpen,
  onClose,
  pengumuman,
  busy,
}: ModalProps & { pengumuman: Pengumuman | null }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('semua'); // 'semua' | 'sudah' | 'belum'

  if (!isOpen || !pengumuman) return null;

  // Group all roster
  const allMembers = (pengumuman.roster || []).map((member) => {
    const readInfo = (pengumuman.readList || []).find((row) => row.userId === member.id);
    return {
      ...member,
      hasRead: Boolean(readInfo),
      confirmedAt: readInfo ? readInfo.confirmedAt : '-',
    };
  });

  const filtered = allMembers.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase()) ||
      m.group.toLowerCase().includes(search.toLowerCase());
    if (filterType === 'sudah') return matchSearch && m.hasRead;
    if (filterType === 'belum') return matchSearch && !m.hasRead;
    return matchSearch;
  });

  const readCount = allMembers.filter((m) => m.hasRead).length;

  return (
    <Dialog title="Daftar kehadiran" onClose={onClose} busy={busy}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-slate-900 text-base">
                  Rekapitulasi Kehadiran & Pembaca
                </h3>
                <span className="text-[10px] font-bold bg-blue-100 text-genre-blue px-2 py-0.5 rounded-full">
                  Akses Pimpinan
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">{pengumuman.judul}</p>
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

        {/* Summary Stats */}
        <div className="px-6 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <span className="font-bold text-emerald-700 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
              Sudah Konfirmasi: {readCount} Orang
            </span>
            <span className="font-bold text-amber-700 flex items-center">
              <Clock className="w-4 h-4 mr-1 text-amber-600" />
              Belum Merespons: {allMembers.length - readCount} Orang
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Tingkat Kepatuhan:{' '}
            {allMembers.length ? Math.round((readCount / allMembers.length) * 100) : 0}%
          </span>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama pengurus atau divisi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-genre-blue/30"
              aria-label="Cari nama pengurus atau divisi..."
            />
          </div>

          <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterType('semua')}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${filterType === 'semua' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              Semua ({allMembers.length})
            </button>
            <button
              onClick={() => setFilterType('sudah')}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${filterType === 'sudah' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}
            >
              Sudah ({readCount})
            </button>
            <button
              onClick={() => setFilterType('belum')}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${filterType === 'belum' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500'}`}
            >
              Belum ({allMembers.length - readCount})
            </button>
          </div>
        </div>

        {/* Table of Members */}
        <div className="p-4 max-h-[55vh] overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 && (
            <p className="p-6 text-sm text-slate-500">Tidak ada pengurus yang cocok.</p>
          )}
          {filtered.map((member) => (
            <div key={member.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className="text-base">{member.avatar}</span>
                <div>
                  <p className="font-bold text-slate-800">{member.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {member.role} • {member.group}
                  </p>
                </div>
              </div>

              <div>
                {member.hasRead ? (
                  <div className="text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Hadir / Membaca
                    </span>
                    <p className="text-[9px] text-slate-400 mt-0.5">{member.confirmedAt}</p>
                  </div>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                    <Clock className="w-3 h-3 mr-1" /> Belum Konfirmasi
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            aria-label="Tutup dialog"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
          >
            Tutup Rekap
          </button>
        </div>
      </div>
    </Dialog>
  );
}
