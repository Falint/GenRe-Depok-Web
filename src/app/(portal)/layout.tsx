import type { ReactNode } from 'react';
import { requireProfile } from '@/features/auth/server';
import { loadPortalData } from '@/features/portal/data';
import PortalProvider from '@/features/portal/PortalProvider';
import { safeError, type Result } from '@/lib/errors';
import type { PortalData } from '@/features/portal/mapping';
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  let initial: Result<PortalData>;
  try {
    initial = { ok: true, data: await loadPortalData(profile) };
  } catch (error) {
    initial = { ok: false, error: safeError(error, 'portal:load') };
  }
  return (
    <PortalProvider key={`${profile.id}:${profile.level}`} profile={profile} initial={initial}>
      {children}
    </PortalProvider>
  );
}
