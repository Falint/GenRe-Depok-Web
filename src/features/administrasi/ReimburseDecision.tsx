'use client';
import { useState } from 'react';
import { usePortal } from '@/features/portal/PortalProvider';

export default function ReimburseDecision({
  id,
  decision,
}: {
  id: string;
  decision: 'cancel' | 'reject';
}) {
  const { busy, onDecideReimburse } = usePortal();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const label = decision === 'cancel' ? 'Batalkan klaim' : 'Tolak klaim';
  if (!open)
    return (
      <button
        disabled={busy}
        onClick={() => setOpen(true)}
        className="text-sm font-bold text-red-700 underline"
      >
        {label}
      </button>
    );
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await onDecideReimburse(id, decision, reason)) setOpen(false);
      }}
    >
      <label className="block text-sm" htmlFor={`reason-${decision}-${id}`}>
        Alasan {decision === 'cancel' ? 'pembatalan' : 'penolakan'}
      </label>
      <textarea
        id={`reason-${decision}-${id}`}
        required
        maxLength={10000}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="w-full border rounded-xl p-2"
      />
      <button
        disabled={busy || !reason.trim()}
        className="text-sm font-bold text-red-700 underline"
      >
        Simpan keputusan
      </button>{' '}
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen(false)}
        className="text-sm underline"
      >
        Kembali
      </button>
    </form>
  );
}
