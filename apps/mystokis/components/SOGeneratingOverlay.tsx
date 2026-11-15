'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Database, FileText, Share2, CheckCircle2, Table, Shield } from 'lucide-react';
import { QuantumLoader } from '@/components/ui/QuantumLoader';

export type SOGerStep = 'simpan' | 'laporan' | 'xlsx' | 'verifikasi' | 'selesai';

interface SOGeneratingOverlayProps {
  step: SOGerStep;
  texto?: string;
}

const STEP_ORDER: SOGerStep[] = ['simpan', 'laporan', 'xlsx', 'verifikasi', 'selesai'];

const STEP_CONFIG: Record<SOGerStep, { label: string; icon: React.ReactNode }> = {
  simpan: {
    label: 'Menyimpan data stock opname...',
    icon: <Database className="w-5 h-5" />,
  },
  laporan: {
    label: 'Membuat catatan laporan...',
    icon: <FileText className="w-5 h-5" />,
  },
  xlsx: {
    label: 'Menyiapkan berkas XLSX...',
    icon: <Table className="w-5 h-5" />,
  },
  verifikasi: {
    label: 'Memverifikasi file di Google Drive...',
    icon: <Shield className="w-5 h-5" />,
  },
  selesai: {
    label: 'Selesai! Membuka laman berbagi...',
    icon: <Share2 className="w-5 h-5" />,
  },
};

export function SOGeneratingOverlay({ step, texto }: SOGeneratingOverlayProps) {
  const currentIdx = STEP_ORDER.indexOf(step);
  const [elapsed, setElapsed] = React.useState<number>(0);

  React.useEffect(() => {
    if (step === 'selesai') return; // berhenti saat selesai
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  const stepPercent = Math.round(((currentIdx + 1) / STEP_ORDER.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-6 bg-black/50 backdrop-blur-md"
      role="alertdialog"
      aria-busy="true"
      aria-live="polite"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md card bg-base-100 border border-base-300 shadow-2xl p-6 space-y-5"
      >
        <div className="flex flex-col items-center gap-3">
          <QuantumLoader text={texto || 'Membuat laporan...'} size="lg" />
          <p className="text-sm font-medium text-base-content/70 text-center">
            Langkah {currentIdx + 1} dari {STEP_ORDER.length} ({stepPercent}%)
          </p>
          <p className="text-base font-semibold text-base-content text-center">
            {STEP_CONFIG[step].label}
          </p>
          {step !== 'selesai' && (
            <p className="text-xs text-base-content/50 tabular-nums">
              Berjalan selama {elapsed} detik
            </p>
          )}
        </div>

        <ol className="space-y-2.5">
          {STEP_ORDER.map((s, i) => {
            const isDone = i < currentIdx;
            const isActive = i === currentIdx;
            return (
              <li
                key={s}
                className={`flex items-center gap-3 text-sm transition-opacity ${
                  isActive ? 'text-base-content font-semibold' : isDone ? 'text-base-content/70' : 'text-base-content/35'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-colors ${
                    isDone
                      ? 'bg-success/15 text-success'
                      : isActive
                      ? 'bg-primary/15 text-primary'
                      : 'bg-base-200 text-base-content/30'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : STEP_CONFIG[s].icon}
                </span>
                <span>{STEP_CONFIG[s].label}</span>
              </li>
            );
          })}
        </ol>

        <p className="text-xs text-base-content/50 text-center">
          Mohon jangan menutup atau me-refresh halaman ini.
        </p>
      </motion.div>
    </motion.div>
  );
}
