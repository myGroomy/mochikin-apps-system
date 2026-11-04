import React, { useState, useEffect } from 'react';

export interface PointInputProps {
  value: number | string | null | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
  showButtons?: boolean;
}

export function PointInput({
  value,
  onChange,
  min = 0,
  max = 1000,
  step = 0.5,
  disabled = false,
  size = 'sm',
  className = '',
  ariaLabel = 'Nilai Poin',
  showButtons = true,
}: PointInputProps) {
  const numericValue = value === null || value === undefined || value === '' ? 0 : Number(value);
  const [internalText, setInternalText] = useState<string>(String(numericValue));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInternalText(String(numericValue));
    setError(null);
  }, [numericValue]);

  const validateAndEmit = (val: number) => {
    if (isNaN(val)) {
      setError('Harus angka');
      return;
    }
    if (val < min) {
      setError(`Min ${min}`);
      return;
    }
    if (val > max) {
      setError(`Maks ${max}`);
      return;
    }
    // Check 2 decimal limit
    const rounded = Math.round(val * 100) / 100;
    if (Math.abs(val - rounded) > 1e-6) {
      setError('Maks 2 desimal');
      return;
    }
    setError(null);
    onChange(rounded);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInternalText(raw);
    if (raw === '') {
      setError('Wajib diisi');
      return;
    }
    const parsed = Number(raw);
    validateAndEmit(parsed);
  };

  const handleStep = (delta: number) => {
    if (disabled) return;
    const current = isNaN(Number(internalText)) ? 0 : Number(internalText);
    const nextVal = Math.min(max, Math.max(min, Math.round((current + delta) * 100) / 100));
    setInternalText(String(nextVal));
    validateAndEmit(nextVal);
  };

  const isSmall = size === 'sm';

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900">
        {showButtons && (
          <button
            type="button"
            onClick={() => handleStep(-step)}
            disabled={disabled || numericValue <= min}
            aria-label={`Kurangi ${ariaLabel}`}
            className={`flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-colors border-r border-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${
              isSmall ? 'w-8 h-8 min-w-[32px] min-h-[32px]' : 'w-11 h-11 min-w-[44px] min-h-[44px]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
            </svg>
          </button>
        )}

        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={internalText}
          onChange={handleInputChange}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={Boolean(error)}
          className={`text-center font-semibold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500/40 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            isSmall ? 'w-14 px-1 py-1 text-xs' : 'w-18 px-2 py-2 text-sm'
          }`}
        />

        {showButtons && (
          <button
            type="button"
            onClick={() => handleStep(step)}
            disabled={disabled || numericValue >= max}
            aria-label={`Tambah ${ariaLabel}`}
            className={`flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-colors border-l border-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${
              isSmall ? 'w-8 h-8 min-w-[32px] min-h-[32px]' : 'w-11 h-11 min-w-[44px] min-h-[44px]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 font-medium">
          {error}
        </span>
      )}
    </div>
  );
}
