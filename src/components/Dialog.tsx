'use client';
import { useEffect, useRef, type ReactNode } from 'react';

export default function Dialog({
  title,
  onClose,
  busy = false,
  children,
}: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      // Restore after React removes the dialog, which otherwise clears focus again.
      requestAnimationFrame(() => {
        if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
          previousFocus.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-transparent p-3 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm open:flex open:items-start open:justify-center sm:p-4"
    >
      <fieldset disabled={busy} className="contents [&>div]:my-auto">
        {children}
      </fieldset>
    </dialog>
  );
}
