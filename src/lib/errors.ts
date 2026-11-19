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

export function checkWrite(error: { code?: string } | null) {
  if (error) {
    console.error('[portal:database]', { code: error.code });
    throw new PortalError(
      error.code === '40001'
        ? 'Data berubah. Muat ulang sebelum mencoba lagi.'
        : error.code === '22023'
          ? 'Pengajuan tidak cocok atau pos tahun berjalan tidak tersedia. Periksa isian; gunakan form yang sama saat mengulang request gagal.'
          : error.code === 'PGRST202' || error.code === '42883'
            ? 'Fitur memerlukan pembaruan database. Hubungi administrator.'
            : error.code === '42501'
              ? 'Anda tidak memiliki izin untuk perubahan ini.'
              : 'Perubahan gagal disimpan. Coba lagi; untuk pengajuan, pertahankan form dan isian yang sama.',
    );
  }
}
