import type { Profile, RoleLevel } from '@/features/portal/schema';
import { PortalError } from '@/lib/errors';

export const isPengurusInti = (level: RoleLevel) => level === 'inti';
export const canViewAdminFinance = isPengurusInti;
export const canApproveOrConfirm = (level: RoleLevel) => level === 'inti' || level === 'kabid';
export const canViewAttendanceList = canApproveOrConfirm;
export const canRespondToTicket = (
  profile: Pick<Profile, 'level' | 'id'>,
  requesterId: string | null,
) => canApproveOrConfirm(profile.level) || requesterId === profile.id;

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
    avatar: profile.avatar || '👤',
    isBendahara: profile.level === 'inti' && profile.jabatan.toLowerCase().includes('bendahara'),
  };
}
export type CurrentRole = ReturnType<typeof profileToRole>;
