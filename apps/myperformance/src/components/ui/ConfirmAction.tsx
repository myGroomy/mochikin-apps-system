'use client';

import { useEffect, useRef, useState } from 'react';
import type { ElementType } from 'react';

/**
 * Destructive action with an inline confirmation. Replaces window.confirm so the
 * confirmation is styled, keyboard accessible, and screen-reader announced.
 */
export function ConfirmAction({
  label,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  onConfirm,
  disabled = false,
  icon: Icon,
  className = 'btn btn-warning btn-sm',
}: {
  label: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  icon?: ElementType;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!confirming) return;
    confirmRef.current?.focus();
    timer.current = setTimeout(() => setConfirming(false), 6000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [confirming]);

  useEffect(() => {
    if (!confirming) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirming(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirming]);

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  if (confirming) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5" role="group" aria-label="Konfirmasi tindakan">
        <button
          ref={confirmRef}
          type="button"
          onClick={run}
          disabled={busy}
          className="btn btn-warning btn-xs gap-1 font-semibold"
        >
          {busy ? 'Memproses…' : confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="btn btn-ghost btn-xs"
        >
          {cancelLabel}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={disabled}
      className={`${className} gap-1`}
    >
      {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}
