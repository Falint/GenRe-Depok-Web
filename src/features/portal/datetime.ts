import { PortalError } from '@/lib/errors';

export function wibInput(value?: string | null) {
  if (!value) return '';
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time + 7 * 3600000).toISOString().slice(0, 16) : '';
}
export function fromWib(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new PortalError('Tanggal WIB tidak valid.');
  const time = Date.parse(`${value}:00+07:00`);
  if (!Number.isFinite(time) || wibInput(new Date(time).toISOString()) !== value)
    throw new PortalError('Tanggal WIB tidak valid.');
  return new Date(time).toISOString();
}
export function attendanceOpen(
  item: { cancelled_at?: string | null; mulai_at?: string | null },
  now = Date.now(),
) {
  return !item.cancelled_at && (!item.mulai_at || Date.parse(item.mulai_at) > now);
}

export function entriesOnDate<T extends { date: string; end?: string }>(entries: T[], day: string) {
  return entries.filter(
    (entry) =>
      wibInput(entry.date).slice(0, 10) <= day &&
      wibInput(entry.end || entry.date).slice(0, 10) >= day,
  );
}
