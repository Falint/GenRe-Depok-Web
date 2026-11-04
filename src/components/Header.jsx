import React, { useState } from 'react';
import { ChevronDown, Bell, CheckCircle2 } from 'lucide-react';
import { ROLES } from '../data/mockData';

export default function Header({ currentRole, onSelectRole, unreadCount, onOpenNotification }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Quad: Depok, DP3AP2KB, Salam GenRe, GenRe Depok */}
          <div className="flex items-center space-x-2 sm:space-x-3.5">
            <div className="flex items-center space-x-1.5 sm:space-x-2.5">
              <img 
                src="/logo-depok.png" 
                alt="Logo Kota Depok" 
                className="h-9 sm:h-11 w-auto object-contain hover:scale-105 transition-transform" 
                title="Pemerintah Kota Depok"
              />
              <img 
                src="/logo-dp3ap2kb.png" 
                alt="Logo DP3AP2KB" 
                className="h-7 sm:h-9 w-auto object-contain hover:scale-105 transition-transform" 
                title="Dinas DP3AP2KB Kota Depok"
              />
              <img 
                src="/logo-salam-genre.png" 
                alt="Logo Salam GenRe" 
                className="h-9 sm:h-11 w-auto object-contain hover:scale-105 transition-transform" 
                title="Salam GenRe: Katakan Tidak pada Nikah Dini, Seks Pranikah, dan Napza"
              />
              <div className="h-7 w-[1px] bg-slate-300 hidden sm:block" />
              <img 
                src="/logo-genre-depok.png" 
                alt="Logo Forum GenRe Kota Depok" 
                className="h-10 sm:h-12 w-auto object-contain hover:scale-105 transition-transform" 
                title="Forum GenRe Kota Depok"
              />
            </div>

            <div>
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

          {/* Right Controls: Role Switcher & Bell */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Interactive Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 transition-all border border-slate-200 text-left text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-genre-blue/30"
                title="Ganti peran pengguna untuk menguji batasan hak akses"
              >
                <span className="text-base">{currentRole.avatar}</span>
                <div className="hidden lg:block">
                  <p className="font-bold text-slate-800 leading-tight text-xs truncate max-w-[140px]">{currentRole.name}</p>
                  <p className="text-[10px] text-genre-blue font-semibold truncate max-w-[140px]">{currentRole.role}</p>
                </div>
                <div className="lg:hidden text-left">
                  <p className="font-bold text-xs truncate max-w-[90px]">{currentRole.name.split(' ')[0]}</p>
                  <p className="text-[9px] text-genre-blue font-semibold truncate max-w-[90px]">{currentRole.level.toUpperCase()}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
              </button>

              {/* Role Dropdown Menu */}
              {dropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 sm:w-84 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto"
                >
                  <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                      <span>Simulasi Akun Pengurus</span>
                      <span className="text-[10px] font-mono text-genre-blue font-bold">Primary Sheet</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pilih peran untuk menguji pembatasan visibilitas menu & tombol approval.
                    </p>
                  </div>

                  {/* Grouped Roles */}
                  {['Pengurus Inti', 'Kepala Bidang', 'Bidang Eksternal', 'Bidang Internal', 'Bidang Branding'].map((groupName) => (
                    <div key={groupName} className="py-1">
                      <div className="px-4 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                        {groupName}
                      </div>
                      {ROLES.filter(r => r.group === groupName).map((role) => (
                        <button
                          key={role.id}
                          onClick={() => {
                            onSelectRole(role);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between transition-colors ${
                            currentRole.id === role.id 
                              ? 'bg-blue-50 text-genre-blue font-bold border-l-4 border-genre-blue' 
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className="text-base">{role.avatar}</span>
                            <div>
                              <p className="leading-snug">{role.name}</p>
                              <p className="text-[10px] text-slate-500 font-normal">{role.role}</p>
                            </div>
                          </div>
                          {currentRole.id === role.id && (
                            <CheckCircle2 className="w-4 h-4 text-genre-blue shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button 
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

          </div>

        </div>
      </div>
    </header>
  );
}
