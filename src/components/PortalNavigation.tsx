'use client';
import Link from 'next/link';
import {
  BookOpen,
  FileText,
  FolderGit2,
  LayoutDashboard,
  MessageSquare,
  Users,
} from 'lucide-react';
import { PORTAL_ROUTES } from '@/features/portal/routes';

export default function PortalNavigation({
  mobile = false,
  pathname,
  pendingBadges,
  financeAdmin,
}: {
  mobile?: boolean;
  pathname: string;
  pendingBadges: { administrasi: number; komunikasi: number };
  financeAdmin: boolean;
}) {
  const items = [
    {
      href: PORTAL_ROUTES.dashboard,
      label: mobile ? 'Dasbor' : 'Dasbor',
      icon: LayoutDashboard,
      badge: 0,
    },
    {
      href: PORTAL_ROUTES.profil,
      label: mobile ? 'Profil' : 'Profil Organisasi',
      icon: BookOpen,
      badge: 0,
    },
    {
      href: PORTAL_ROUTES.struktur,
      label: mobile ? 'Struktur' : 'Struktur & 32 Jobdesc',
      icon: Users,
      badge: 0,
    },
    ...(financeAdmin
      ? [
          {
            href: PORTAL_ROUTES.administrasi,
            label: mobile ? 'Kas & Surat' : 'Administrasi & Keuangan',
            icon: FileText,
            badge: pendingBadges.administrasi,
          },
        ]
      : []),
    {
      href: PORTAL_ROUTES.komunikasi,
      label: mobile ? 'Komunikasi' : 'Komunikasi & Tiket Info',
      icon: MessageSquare,
      badge: pendingBadges.komunikasi,
    },
    {
      href: PORTAL_ROUTES.media,
      label: mobile ? 'Media' : 'Pusat Sumber Daya',
      icon: FolderGit2,
      badge: 0,
    },
  ];
  return (
    <nav
      aria-label={mobile ? 'Navigasi mobile' : 'Navigasi utama'}
      className={
        mobile
          ? 'md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-1 py-2 shadow-lg'
          : 'hidden md:block bg-white border-b border-slate-200'
      }
    >
      <div
        className={
          mobile
            ? 'flex items-center justify-around'
            : 'max-w-7xl mx-auto px-4 flex gap-4 overflow-x-auto'
        }
      >
        {items.map(({ href, label, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? 'page' : undefined}
            className={`${mobile ? 'flex-col text-[10px] px-1' : 'py-4 border-b-2 text-xs whitespace-nowrap'} flex items-center gap-1 font-bold ${pathname === href ? 'text-genre-blue border-genre-blue' : 'text-slate-500 border-transparent hover:text-slate-900'}`}
          >
            <span className="relative">
              <Icon aria-hidden="true" className="w-4 h-4" />
              {badge > 0 && (
                <span className="absolute -top-2 -right-2 rounded-full bg-genre-orange px-1 text-[9px] text-white">
                  {badge}
                </span>
              )}
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
