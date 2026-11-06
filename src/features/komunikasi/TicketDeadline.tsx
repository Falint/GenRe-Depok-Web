'use client';
import { useState } from 'react';
import type { Tiket } from '@/features/portal/mapping';
import { usePortal } from '@/features/portal/PortalProvider';
import { canRespondToTicket } from '@/features/auth/permissions';
import { fromWib, wibInput } from '@/features/portal/datetime';
import { setTicketDeadline } from './actions';
export default function TicketDeadline({ ticket }: { ticket: Tiket }) {
  const { currentRole, busy, runMutation } = usePortal();
  const [error, setError] = useState('');
  if (!canRespondToTicket({ id: currentRole.userId, level: currentRole.level }, ticket.pemohon_id))
    return null;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer font-semibold">Atur deadline kalender</summary>
      <form
        className="mt-2 flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          const value = String(new FormData(e.currentTarget).get('deadline'));
          try {
            await runMutation(
              () => setTicketDeadline(ticket.id, value ? fromWib(value) : null),
              'Deadline tiket tersimpan.',
            );
          } catch {
            setError('Tanggal tidak valid.');
          }
        }}
      >
        <label>
          Deadline tiket (WIB)
          <input
            name="deadline"
            type="datetime-local"
            defaultValue={wibInput(ticket.deadline_at)}
            className="block rounded-lg border p-2"
          />
        </label>
        <button disabled={busy} className="rounded-lg bg-genre-blue p-2 text-white">
          Simpan deadline
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </details>
  );
}
