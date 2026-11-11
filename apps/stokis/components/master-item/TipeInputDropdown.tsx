'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const TIPE_TYPES = ['dual', 'single', 'boolean', 'date', 'expiry', 'text'] as const;

export function parseTipeSelection(val?: string): Set<string> {
  if (!val || !val.trim()) return new Set();
  return new Set(val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
}

export function tipeSelectionToComma(selected: Set<string>): string {
  if (selected.size === 0) return '';
  const sel = new Set(selected);
  if (sel.has('dual') && sel.has('single')) sel.delete('single');
  const ordered: string[] = [];
  if (sel.has('dual')) ordered.push('dual');
  else if (sel.has('single')) ordered.push('single');
  if (sel.has('boolean')) ordered.push('boolean');
  if (sel.has('date')) ordered.push('date');
  if (sel.has('expiry')) ordered.push('expiry');
  if (sel.has('text')) ordered.push('text');
  for (const item of sel) {
    if (!ordered.includes(item)) ordered.push(item);
  }
  return ordered.join(',');
}

export function formatTipeLabel(val?: string): string {
  if (!val || !val.trim()) return 'Pilih Tipe';
  const parts = val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const labels = parts.map((p) => {
    if (p === 'dual') return 'Dual';
    if (p === 'single') return 'Single';
    if (p === 'boolean') return 'Boolean';
    if (p === 'date') return 'Date';
    if (p === 'expiry') return 'Expiry';
    if (p === 'text') return 'Text';
    return p;
  });
  return labels.length > 0 ? labels.join(' + ') : 'Pilih Tipe';
}

export function tipeBadgeColor(t?: string) {
  if (!t || !t.trim()) return 'bg-base-200 text-base-content/40 border border-dashed border-base-300';
  const parts = t.split(',').map((s) => s.trim().toLowerCase());
  if (parts.includes('boolean') && parts.includes('date')) {
    return 'bg-info/15 text-info-content border border-info/20';
  }
  const primary = parts[0];
  if (primary === 'boolean') return 'bg-info/15 text-info-content border border-info/20';
  if (primary === 'date') return 'bg-secondary/15 text-secondary-content border border-secondary/20';
  if (primary === 'expiry') return 'bg-error/15 text-error border border-error/20';
  if (primary === 'text') return 'bg-accent/15 text-accent-content border border-accent/20';
  if (primary === 'single') return 'bg-primary/15 text-primary border border-primary/20';
  return 'bg-base-200 text-base-content/70 border border-base-300';
}

export function TipeInputDropdown({
  value,
  onChange,
  itemName,
  itemId,
}: {
  value: string;
  onChange: (val: string) => void;
  itemName?: string;
  itemId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(() => parseTipeSelection(value));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(parseTipeSelection(value));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    setDraft(parseTipeSelection(value));
    setOpen(true);
  };

  const handleSave = () => {
    onChange(tipeSelectionToComma(draft));
    setOpen(false);
  };

  const handleReset = () => {
    setDraft(parseTipeSelection(value));
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const displayLabel = formatTipeLabel(value);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-md text-[11px] font-bold bg-base-100 border border-base-300 hover:border-base-content/30 active:bg-base-200 transition-all cursor-pointer"
      >
        <span className={tipeBadgeColor(value)}>
          {displayLabel}
        </span>
        <ChevronDown className="w-3 h-3 text-base-content/40" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-base-100 border border-base-300 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-base-300">
            <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider">Tipe Input</p>
            {itemName && (
              <p className="text-xs text-base-content/60 mt-0.5 whitespace-normal break-words">{itemName}</p>
            )}
            {itemId && (
              <p className="text-[10px] text-base-content/30 font-mono">{itemId}</p>
            )}
          </div>

          <div className="py-1">
            {TIPE_TYPES.map((t) => {
              const isSelected = draft.has(t);
              const handleToggle = () => {
                setDraft((prev) => {
                  const next = new Set(prev);
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
                  return next;
                });
              };
              return (
                <div
                  key={t}
                  onClick={handleToggle}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-base-200/50 transition-colors"
                >
                  <div className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center border-2 ${
                    isSelected
                      ? 'border-primary bg-primary'
                      : 'border-base-300 bg-base-100'
                  }`}>
                    {isSelected && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-base-content">
                      {t === 'dual' ? 'Dual' : t === 'single' ? 'Single' : t === 'boolean' ? 'Boolean' : t === 'date' ? 'Date' : t === 'expiry' ? 'Expiry' : 'Text'}
                    </span>
                  </div>
                  {t === 'dual' && (
                    <span className="flex-shrink-0 text-[9px] font-bold text-primary/50">Default</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-3 py-2 border-t border-base-300 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-semibold text-base-content/40 hover:text-base-content/60 min-h-[36px] px-2 transition-colors"
            >
              Reset
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 min-h-[36px] rounded-md text-[11px] font-semibold text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 min-h-[36px] rounded-md text-[11px] font-bold text-primary-content bg-primary hover:bg-primary/90 transition-all"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
