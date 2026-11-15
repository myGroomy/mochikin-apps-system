'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer } from '@/components/ui/ToastContainer';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  body: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (variant: ToastVariant, title: string, body?: string) => void;
  dismissToast: (id: number) => void;
  toast: {
    success: (title: string, body?: string) => void;
    info: (title: string, body?: string) => void;
    warning: (title: string, body?: string) => void;
    error: (title: string, body?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((variant: ToastVariant, title: string, body: string = '') => {
    const id = ++toastIdCounter;
    const newItem: ToastItem = { id, variant, title, body };

    setToasts((prev) => [...prev, newItem]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const toastHelpers = {
    success: useCallback((title: string, body: string = '') => showToast('success', title, body), [showToast]),
    info: useCallback((title: string, body: string = '') => showToast('info', title, body), [showToast]),
    warning: useCallback((title: string, body: string = '') => showToast('warning', title, body), [showToast]),
    error: useCallback((title: string, body: string = '') => showToast('error', title, body), [showToast]),
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, toast: toastHelpers }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
