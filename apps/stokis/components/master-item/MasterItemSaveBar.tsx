'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Save, Loader2, Sparkles, X } from 'lucide-react';

interface MasterItemSaveBarProps {
  draftCount: number;
  pointDraftCount: number;
  savingBatch: boolean;
  savingPoints: boolean;
  onCancelDrafts: () => void;
  onSaveDrafts: () => void;
  onCancelPoints: () => void;
  onSavePoints: () => void;
}

export function MasterItemSaveBar({
  draftCount,
  pointDraftCount,
  savingBatch,
  savingPoints,
  onCancelDrafts,
  onSaveDrafts,
  onCancelPoints,
  onSavePoints,
}: MasterItemSaveBarProps) {
  const hasItemDrafts = draftCount > 0;
  const hasPointDrafts = pointDraftCount > 0;

  if (!hasItemDrafts && !hasPointDrafts) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col sm:flex-row items-center gap-3 bg-base-100/95 dark:bg-slate-900/95 text-base-content dark:text-white px-5 py-3 rounded-2xl shadow-2xl border border-base-300 dark:border-slate-700 backdrop-blur-md max-w-[92vw] sm:max-w-2xl"
      >
        {/* Threshold / Item Changes */}
        {hasItemDrafts && (
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold">
                {draftCount} perubahan item
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onCancelDrafts}
                disabled={savingBatch}
                className="btn btn-ghost btn-xs text-base-content/60 dark:text-slate-300 hover:text-base-content"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={onSaveDrafts}
                disabled={savingBatch}
                className="btn btn-xs btn-primary gap-1 font-bold"
              >
                {savingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Simpan Item
              </button>
            </div>
          </div>
        )}

        {/* Separator if both exist */}
        {hasItemDrafts && hasPointDrafts && (
          <div className="hidden sm:block w-px h-6 bg-base-300 dark:bg-slate-700" />
        )}

        {/* Point Draft Changes */}
        {hasPointDrafts && (
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-semibold">
                {pointDraftCount} bobot poin
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onCancelPoints}
                disabled={savingPoints}
                className="btn btn-ghost btn-xs text-base-content/60 dark:text-slate-300 hover:text-base-content"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={onSavePoints}
                disabled={savingPoints}
                className="btn btn-xs bg-amber-500 hover:bg-amber-600 text-white font-bold border-none gap-1"
              >
                {savingPoints ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Simpan Poin
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
