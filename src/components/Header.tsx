'use client';
import Image from 'next/image';
import logoDepok from '../../public/logo-depok.png';
import logoDp3ap2kb from '../../public/logo-dp3ap2kb.png';
import logoSalamGenre from '../../public/logo-salam-genre.png';
import logoGenreDepok from '../../public/logo-genre-depok.png';
import type { CurrentRole } from '@/features/auth/permissions';
import React from 'react';
import { Bell, LogOut } from 'lucide-react';

export default function Header({
  currentRole,
  onSignOut,
  unreadCount,
  onOpenNotification,
}: {
  currentRole: CurrentRole;
  onSignOut: () => void;
  unreadCount: number;
  onOpenNotification: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo Quad: Depok, DP3AP2KB, Salam GenRe, GenRe Depok */}
          <div className="flex items-center space-x-2 sm:space-x-3.5">
            <div className="flex items-center space-x-1 sm:space-x-2.5">
              <Image
                sizes="128px"
                src={logoDepok}
                alt="Logo Kota Depok"
                className="h-6 sm:h-11 w-auto object-contain hover:scale-105 transition-transform"
                title="Pemerintah Kota Depok"
              />
              <Image
                sizes="128px"
                src={logoDp3ap2kb}
                alt="Logo DP3AP2KB"
                className="h-6 sm:h-9 w-auto object-contain hover:scale-105 transition-transform"
                title="Dinas DP3AP2KB Kota Depok"
              />
              <Image
                sizes="128px"
                src={logoSalamGenre}
                alt="Logo Salam GenRe"
                className="h-6 sm:h-11 w-auto object-contain hover:scale-105 transition-transform"
                title="Salam GenRe: Katakan Tidak pada Nikah Dini, Seks Pranikah, dan Napza"
              />
              <div className="h-7 w-[1px] bg-slate-300 hidden sm:block" />
              <Image
                sizes="128px"
                src={logoGenreDepok}
                alt="Logo Forum GenRe Kota Depok"
                className="h-7 sm:h-12 w-auto object-contain hover:scale-105 transition-transform"
                title="Forum GenRe Kota Depok"
              />
            </div>

            <div className="hidden sm:block">
              <div className="flex items-center space-x-2">
                <span className="font-black text-slate-900 tracking-tight text-sm sm:text-lg">
                  Forum GenRe Depok
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-genre-orange/15 text-genre-orange px-2 py-0.5 rounded-full border border-genre-orange/20 hidden md:inline">
                  Resmi 2026/2028
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">
                Pusat Administrasi, Komunikasi, & Data Terpadu
              </p>
            </div>
          </div>

          {/* Right Controls: authenticated identity, notifications, and sign out */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex items-center space-x-2 px-2 sm:px-3 py-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-left text-xs font-medium text-slate-800">
              <span className="text-base">{currentRole.avatar}</span>
              <div className="hidden lg:block">
                <p className="font-bold text-slate-800 leading-tight text-xs truncate max-w-[140px]">
                  {currentRole.name}
                </p>
                <p className="text-[10px] text-genre-blue font-semibold truncate max-w-[140px]">
                  {currentRole.role}
                </p>
              </div>
              <div className="lg:hidden text-left">
                <p className="font-bold text-xs truncate max-w-[65px] sm:max-w-[90px]">
                  {currentRole.name.split(' ')[0]}
                </p>
                <p className="text-[9px] text-genre-blue font-semibold truncate max-w-[65px] sm:max-w-[90px]">
                  {currentRole.level.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                aria-label={`Buka pemberitahuan (${unreadCount} belum ditindaklanjuti)`}
                onClick={onOpenNotification}
                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-blue-50 hover:text-genre-blue flex items-center justify-center text-slate-700 transition-colors border border-slate-200"
                title="Buka Pusat Pemberitahuan & Antrean Tindakan"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-md shadow-rose-500/30 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
            <button
              onClick={onSignOut}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 flex items-center justify-center text-slate-700 transition-colors border border-slate-200"
              title="Keluar dari portal"
              aria-label="Keluar dari portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
