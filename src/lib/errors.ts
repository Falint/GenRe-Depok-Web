export class PortalError extends Error {}

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export function safeError(error: unknown, operation: string): string {
  if (error instanceof PortalError) return error.message;
  console.error('[portal]', {
    operation,
    errorType: error instanceof Error ? error.name : 'UnknownError',
  });
  return 'Permintaan tidak dapat diproses. Coba lagi atau hubungi administrator.';
}
