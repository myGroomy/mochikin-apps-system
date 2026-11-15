'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Clock, ArrowLeft, ChevronRight, ShieldCheck, AlertTriangle, CheckCircle2, RotateCcw, Plus, HardDrive } from 'lucide-react';
import type { Cabang } from '@/lib/CabangContext';

export interface SODraft {
  counts: Record<string, { step1: string; step2: string; keterangan: string; statusIsi?: string; tglRefill?: string; tglPakai?: string }>;
  sesiId: string;
  tanggalOperasional: string;
  shift: string;
  note: string;
  updatedAt: number;
}

interface ShiftCabangGateProps {
  open: boolean;
  cabangList: Cabang[];
  initialCabangId: string | null;
  initialShift: string;
  pendingDraft: SODraft | null;
  countFilledDraft: (counts: Record<string, any>) => number;
  onRestoreDraft: () => void;
  onDiscardDraft: () => void;
  onConfirmNewSession: (cabangId: string, shift: string) => void;
}

const SHIFT_OPTIONS = ['Opening', 'Closing'] as const;

export function ShiftCabangGate({
  open,
  cabangList,
  initialCabangId,
  initialShift,
  pendingDraft,
  countFilledDraft,
  onRestoreDraft,
  onDiscardDraft,
  onConfirmNewSession,
}: ShiftCabangGateProps) {
  const [step, setStep] = useState<'draft' | 'cabang' | 'shift'>('cabang');
  const [cabangId, setCabangId] = useState<string | null>(initialCabangId);
  const [shift, setShift] = useState<string>(initialShift);

  useEffect(() => {
    if (pendingDraft) {
      setStep('draft');
    } else {
      setStep('cabang');
    }
  }, [pendingDraft, open]);

  useEffect(() => {
    if (initialCabangId) setCabangId(initialCabangId);
    if (initialShift) setShift(initialShift);
  }, [initialCabangId, initialShift]);

  const selectedCabang = cabangList.find((c) => c.Cabang_ID === cabangId) || null;
  const nextDisabled = step === 'cabang' ? !selectedCabang : !shift;

  const handleNext = () => {
    if (step === 'cabang' && selectedCabang) {
      setStep('shift');
    }
  };

  const handleConfirm = () => {
    if (!selectedCabang || !shift) return;
    onConfirmNewSession(selectedCabang.Cabang_ID, shift);
  };

  const handleDiscardAndNew = () => {
    onDiscardDraft();
    setStep('cabang');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gate-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-md card bg-base-100 border border-base-300 shadow-2xl p-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${step === 'draft' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
                {step === 'draft' ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <h2 id="gate-title" className="text-base font-bold text-base-content">
                  {step === 'draft' ? 'Sesi Draft Tersimpan' : 'Konfirmasi Input Stock Opname'}
                </h2>
                <p className="text-xs text-base-content/60">
                  {step === 'draft' ? 'Ditemukan data input SO yang belum di-submit' : 'Pastikan cabang dan shift sudah benar sebelum mengisi.'}
                </p>
              </div>
            </div>

            {/* Mode 1: Draft Found */}
            {step === 'draft' && pendingDraft && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs bg-base-200/50 p-3.5 rounded-xl border border-base-300">
                  <div>
                    <span className="text-base-content/60 font-semibold uppercase tracking-wide block text-[10px]">Tanggal</span>
                    <span className="font-bold text-base-content">{pendingDraft.tanggalOperasional || '-'}</span>
                  </div>
                  <div>
                    <span className="text-base-content/60 font-semibold uppercase tracking-wide block text-[10px]">Shift</span>
                    <span className="font-bold text-base-content">{pendingDraft.shift || '-'}</span>
                  </div>
                  <div>
                    <span className="text-base-content/60 font-semibold uppercase tracking-wide block text-[10px]">Progress</span>
                    <span className="font-bold text-primary">{countFilledDraft(pendingDraft.counts)} item terisi</span>
                  </div>
                  {pendingDraft.updatedAt && (
                    <div>
                      <span className="text-base-content/60 font-semibold uppercase tracking-wide block text-[10px]">Terakhir Diedit</span>
                      <span className="font-semibold text-base-content/80">
                        {new Date(pendingDraft.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-base-content/50">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Draft terikat ke akun Anda (Tersimpan di Browser & Cloud Backup)</span>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onRestoreDraft}
                    className="btn btn-primary min-h-[44px] gap-2 text-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Lanjutkan Sesi Sebelumnya
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardAndNew}
                    className="btn btn-ghost min-h-[40px] text-xs text-error hover:bg-error/10 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Buang Draft & Mulai Baru
                  </button>
                </div>
              </div>
            )}

            {/* Step indicator untuk Mode 2 (Cabang) & Mode 3 (Shift) */}
            {step !== 'draft' && (
              <>
                <div className="flex items-center gap-2">
                  {(['cabang', 'shift'] as const).map((s, i) => (
                    <div key={s} className="flex items-center gap-2 flex-1">
                      <div
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          (step === s || (step === 'shift' && s === 'cabang'))
                            ? 'bg-primary'
                            : 'bg-base-200'
                        }`}
                      />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${
                        step === s ? 'text-primary' : 'text-base-content/40'
                      }`}>
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Mode 2 (Langkah 1): Pilih Cabang */}
                {step === 'cabang' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-base-content/60">
                      <Store className="w-3.5 h-3.5 text-primary" />
                      <span>Pilih Cabang</span>
                    </div>
                    {cabangList.length === 0 ? (
                      <p className="text-sm text-base-content/60">
                        Tidak ada cabang yang tersedia untuk akun Anda.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {cabangList.map((c) => {
                          const isSelected = c.Cabang_ID === cabangId;
                          return (
                            <button
                              key={c.Cabang_ID}
                              type="button"
                              onClick={() => setCabangId(c.Cabang_ID)}
                              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                                isSelected
                                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                  : 'border-base-300 bg-base-100 hover:bg-base-200'
                              }`}
                            >
                              <span className="text-sm font-semibold text-base-content">
                                {c.Nama_Cabang}
                              </span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Mode 3 (Langkah 2): Pilih Shift */}
                {step === 'shift' && selectedCabang && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-base-200/70 border border-base-300">
                      <span className="text-xs font-semibold text-base-content/60">Cabang terpilih</span>
                      <span className="text-sm font-bold text-base-content">{selectedCabang.Nama_Cabang}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-base-content/60">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>Pilih Shift Kerja</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {SHIFT_OPTIONS.map((s) => {
                        const isSelected = shift === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setShift(s)}
                            className={`px-4 py-3 rounded-xl border text-center transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                : 'border-base-300 bg-base-100 hover:bg-base-200'
                            }`}
                          >
                            <span className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-base-content'}`}>
                              {s}
                            </span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 mx-auto mt-1 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer untuk Mode Cabang & Shift */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  {step === 'shift' ? (
                    <button type="button" onClick={() => setStep('cabang')} className="btn btn-ghost gap-1.5 min-h-[44px]">
                      <ArrowLeft className="w-4 h-4" />
                      Kembali
                    </button>
                  ) : (
                    <span className="text-xs text-base-content/50 px-1">
                      Langkah 1 dari 2
                    </span>
                  )}

                  {step === 'cabang' ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={nextDisabled}
                      className="btn btn-primary gap-1.5 min-h-[44px]"
                    >
                      Lanjut
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={nextDisabled}
                      className="btn btn-primary gap-1.5 min-h-[44px]"
                    >
                      Mulai Input
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}