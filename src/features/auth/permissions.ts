import type { Profile, RoleLevel } from '@/features/portal/schema';
import { PortalError } from '@/lib/errors';

export const isAdmin = (level: RoleLevel) => level === 'admin';
export const isPortalMember = (level: RoleLevel) => level !== 'guest';
export const isPengurusInti = (level: RoleLevel) => level === 'inti' || isAdmin(level);
export const canViewAdminFinance = isPengurusInti;
export const canApproveOrConfirm = (level: RoleLevel) => isPengurusInti(level) || level === 'kabid';
export const canViewAttendanceList = canApproveOrConfirm;
export const canRespondToTicket = (
  profile: Pick<Profile, 'level' | 'id'>,
  requesterId: string | null,
) =>
  isPortalMember(profile.level) &&
  (canApproveOrConfirm(profile.level) || requesterId === profile.id);

export const canManageContent = (profile: Pick<Profile, 'level' | 'bidang_id'>) =>
  isPortalMember(profile.level) &&
  (isPengurusInti(profile.level) || profile.bidang_id === 'branding');

export function requirePermission(allowed: boolean) {
  if (!allowed) throw new PortalError('Anda tidak memiliki izin untuk tindakan ini.');
}

export function profileToRole(profile: Profile) {
  return {
    userId: profile.id,
    name: profile.nama_lengkap,
    role: profile.jabatan,
    group: profile.kelompok,
    level: profile.level,
    bidangId: profile.bidang_id || null,
    divisiId: profile.divisi_id || null,
    manageContent: canManageContent(profile),
    avatar: profile.avatar || '👤',
    isBendahara:
      isAdmin(profile.level) ||
      (profile.level === 'inti' && profile.jabatan.toLowerCase().includes('bendahara')),
  };
}
export type CurrentRole = ReturnType<typeof profileToRole>;
