'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { TIPE_TYPES } from './TipeInputDropdown';

interface TipeInputBottomSheetProps {
  open: boolean;
  itemId: string | null;
  itemName?: string;
  draft: Set<string>;
  onDraftChange: (draft: Set<string>) => void;
  onClose: () => void;
  onApply: () => void;
}

export function TipeInputBottomSheet({
  open,
  itemId,
  itemName,
  draft,
  onDraftChange,
  onClose,
  onApply,
}: TipeInputBottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 md:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-base-100 rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] max-h-[85vh] flex flex-col md:hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-base-300" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 border-b border-base-300">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-base-content">Tipe Input</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-base-200 transition-colors"
                >
                  <X className="w-5 h-5 text-base-content/40" />
                </button>
              </div>
              {itemId && (
                <>
                  <p className="text-xs text-base-content/60">{itemName}</p>
                  <p className="text-[10px] text-base-content/40 font-mono">{itemId}</p>
                </>
              )}
            </div>

            {/* Options list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {TIPE_TYPES.map((t) => {
                const isSelected = draft.has(t);
                const isDualOrSingle = t === 'dual' || t === 'single';
                const handleToggle = () => {
                  const next = new Set(draft);
                  if (t === 'dual' || t === 'single') {
                    if (next.has(t)) {
                      next.delete(t);
                    } else {
                      next.delete('dual');
                      next.delete('single');
                      next.add(t);
                    }
                  } else {
                    if (next.has(t)) next.delete(t);
                    else next.add(t);
                  }
                  onDraftChange(next);
                };

                return (
                  <div
                    key={t}
                    onClick={handleToggle}
                    className={`flex items-center gap-3 p-3 min-h-[48px] rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'border-2 border-primary/30 bg-primary/5'
                        : 'border border-base-300 bg-base-100 active:bg-base-200/50'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded-${
                        isDualOrSingle ? 'full' : 'md'
                      } border-2 flex items-center justify-center ${
                        isSelected ? 'border-primary bg-primary' : 'border-base-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-base-content">
                        {t === 'dual'
                          ? 'Dual Input'
                          : t === 'single'
                          ? 'Single Input'
                          : t === 'boolean'
                          ? 'Boolean'
                          : t === 'date'
                          ? 'Date'
                          : t === 'expiry'
                          ? 'Expiry'
                          : 'Text'}
                      </p>
                      <p className="text-[10px] text-base-content/50 mt-0.5">
                        {t === 'dual'
                          ? 'S1 (awal) + S2 (akhir), status dihitung dari selisih'
                          : t === 'single'
                          ? 'Hanya S2 (akhir), input langsung sebagai stok akhir'
                          : t === 'boolean'
                          ? 'Input Ya/Tidak, untuk item yang perlu dikonfirmasi'
                          : t === 'date'
                          ? 'Input tanggal, untuk item yang perlu pencatatan tanggal'
                          : t === 'expiry'
                          ? 'Input tanggal kedaluwarsa, untuk item masa simpan'
                          : 'Input teks bebas, untuk catatan tambahan'}
                      </p>
                    </div>
                    {t === 'dual' && (
                      <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                        Default
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-base-300 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onDraftChange(new Set(['dual']))}
                className="text-xs font-medium text-base-content/50 hover:text-base-content/70 min-h-[44px] px-2 transition-colors"
              >
                Reset ke Default
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={onApply}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-primary-content bg-primary shadow-lg shadow-primary/20 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  Terapkan
                  <span className="ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/20">
                    {draft.size}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
