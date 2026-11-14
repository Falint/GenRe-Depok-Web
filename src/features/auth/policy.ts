import type { RoleLevel } from '@/features/portal/schema';
import { safeReturnPath } from '@/features/portal/routes';

export function accountDestination(level: RoleLevel, next?: unknown) {
  if (level === 'guest') return '/publik';
  if (level === 'admin' && !next) return '/kelola-akun';
  const path = safeReturnPath(next);
  if (level !== 'admin' && path.split('?')[0].split('#')[0] === '/kelola-akun') return '/dashboard';
  return path;
}
