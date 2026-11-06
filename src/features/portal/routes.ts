export const PORTAL_ROUTES = {
  dashboard: '/dashboard',
  profil: '/profil',
  struktur: '/struktur',
  administrasi: '/administrasi',
  komunikasi: '/komunikasi',
  media: '/media',
} as const;
export type PortalTab = keyof typeof PORTAL_ROUTES;

export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//'))
    return PORTAL_ROUTES.dashboard;
  const parsed = new URL(value, 'https://portal.invalid');
  if (
    parsed.origin !== 'https://portal.invalid' ||
    !Object.values(PORTAL_ROUTES).some((path) => path === parsed.pathname)
  )
    return PORTAL_ROUTES.dashboard;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
