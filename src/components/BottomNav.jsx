import React from 'react';
import { LayoutDashboard, FileText, MessageSquare, FolderGit2, Users, BookOpen } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, pendingBadges, isFinanceAdmin }) {
  const navItems = [
    { id: 'dashboard', label: 'Dasbor', icon: LayoutDashboard },
    { id: 'profil', label: 'Profil', icon: BookOpen },
    { id: 'struktur', label: 'Struktur', icon: Users },
    ...(isFinanceAdmin ? [{ id: 'administrasi', label: 'Kas & Surat', icon: FileText, badge: pendingBadges.administrasi }] : []),
    { id: 'komunikasi', label: 'Komunikasi', icon: MessageSquare, badge: pendingBadges.komunikasi },
    { id: 'media', label: 'Media', icon: FolderGit2 }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center py-1 px-2 rounded-xl transition-all ${
                isActive 
                  ? 'text-genre-blue font-bold' 
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-genre-orange text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-genre-blue mt-0.5 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
