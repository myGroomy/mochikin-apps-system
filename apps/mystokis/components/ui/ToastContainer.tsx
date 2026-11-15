'use client';

import React from 'react';
import { CircleCheck, Info, TriangleAlert, CircleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToastItem, ToastVariant } from '@/lib/ToastContext';

const config: Record<ToastVariant, { icon: typeof CircleCheck; accent: string }> = {
  success: { icon: CircleCheck, accent: 'text-success' },
  info: { icon: Info, accent: 'text-info' },
  warning: { icon: TriangleAlert, accent: 'text-warning' },
  error: { icon: CircleAlert, accent: 'text-error' },
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none"
    >
      {toasts.map((toast) => {
        const { icon: Icon, accent } = config[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100 p-4 shadow-xl pointer-events-auto transition-all animate-slide-up"
          >
            <Icon className={cn('mt-0.5 size-5 shrink-0', accent)} aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold text-base-content">{toast.title}</span>
              {toast.body ? (
                <span className="text-xs text-base-content/70 whitespace-pre-line leading-relaxed">
                  {toast.body}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Tutup"
              className="shrink-0 text-base-content/40 transition-colors hover:text-base-content p-0.5 rounded"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
