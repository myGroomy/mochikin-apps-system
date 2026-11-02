"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function ConfirmAction({
  label,
  confirmLabel = "Ya, lanjutkan",
  cancelLabel = "Batal",
  onConfirm,
  disabled = false,
  icon: Icon,
  className = "",
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
      if (event.key === "Escape") setConfirming(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setConfirming(true)}
        disabled={disabled}
        className={cn("gap-1.5", className)}
      >
        {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
        <span>{label}</span>
      </Button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-1">
      <span className="px-2 text-xs font-semibold text-destructive">Yakin?</span>
      <Button
        ref={confirmRef}
        type="button"
        variant="destructive"
        size="xs"
        onClick={() => void run()}
        disabled={busy}
      >
        {busy ? "Memproses…" : confirmLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => setConfirming(false)}
        disabled={busy}
      >
        {cancelLabel}
      </Button>
    </div>
  );
}
