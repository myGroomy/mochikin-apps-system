'use client';

import React from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Plus, Check, X, Edit3, Power, Loader2, AlertTriangle } from 'lucide-react';
import type { KategoriItem } from '@/lib/domain/kategori-service';

interface KategoriModalProps {
  open: boolean;
  onClose: () => void;
  cabangName: string;
  kategoriList: KategoriItem[];
  kategoriLoading: boolean;
  kategoriSaving: boolean;
  kategoriError: string;
  onClearError: () => void;
  newKategoriName: string;
  onNewKategoriNameChange: (val: string) => void;
  onAddKategori: (e: React.FormEvent) => void;
  editingKategoriId: string | null;
  onStartEdit: (k: KategoriItem) => void;
  onCancelEdit: () => void;
  tempKategoriName: string;
  onTempNameChange: (val: string) => void;
  tempKategoriUrutan: string;
  onTempUrutanChange: (val: string) => void;
  onSaveKategori: (k: KategoriItem) => void;
  onToggleActive: (k: KategoriItem) => void;
  inputBaseClass: string;
}

export function KategoriModal({
  open,
  onClose,
  cabangName,
  kategoriList,
  kategoriLoading,
  kategoriSaving,
  kategoriError,
  onClearError,
  newKategoriName,
  onNewKategoriNameChange,
  onAddKategori,
  editingKategoriId,
  onStartEdit,
  onCancelEdit,
  tempKategoriName,
  onTempNameChange,
  tempKategoriUrutan,
  onTempUrutanChange,
  onSaveKategori,
  onToggleActive,
  inputBaseClass,
}: KategoriModalProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Kelola Kategori"
      subtitle={`${cabangName} · Kategori untuk grouping item`}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all"
          >
            Tutup
          </button>
        </div>
      }
    >
      <form onSubmit={onAddKategori} className="flex gap-2 mb-4">
        <input
          type="text"
          required
          placeholder="Nama kategori baru..."
          value={newKategoriName}
          onChange={(e) => onNewKategoriNameChange(e.target.value)}
          className={`${inputBaseClass} flex-1`}
        />
        <button
          type="submit"
          disabled={kategoriSaving}
          className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-secondary-content bg-secondary hover:bg-secondary/90 transition-all disabled:opacity-50"
        >
          {kategoriSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
        </button>
      </form>

      {kategoriError && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg bg-error/10 border border-error/20 mb-3"
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 text-error shrink-0" />
          <span className="flex-1 text-xs text-error">{kategoriError}</span>
          <button
            type="button"
            onClick={onClearError}
            className="text-xs text-error/60 hover:text-error"
          >
            Tutup
          </button>
        </div>
      )}

      {kategoriLoading ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-secondary" />
          <p className="text-xs text-base-content/50">Memuat kategori...</p>
        </div>
      ) : kategoriList.length === 0 ? (
        <p className="text-sm text-base-content/50 text-center py-8">
          Belum ada kategori. Tambahkan kategori pertama di atas.
        </p>
      ) : (
        <ul className="space-y-2">
          {kategoriList.map((k) => (
            <li
              key={k.Kategori_ID}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${
                k.Aktif ? 'border-base-300 bg-base-100' : 'border-base-300 bg-base-200/40 opacity-70'
              }`}
            >
              {editingKategoriId === k.Kategori_ID ? (
                <>
                  <input
                    type="text"
                    value={tempKategoriName}
                    onChange={(e) => onTempNameChange(e.target.value)}
                    className={`${inputBaseClass} flex-1 min-w-0`}
                    autoFocus
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tempKategoriUrutan}
                    onChange={(e) => onTempUrutanChange(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="Urutan"
                    className={`${inputBaseClass} w-16 text-center text-xs tabular-nums`}
                  />
                  <button
                    type="button"
                    onClick={() => onSaveKategori(k)}
                    disabled={kategoriSaving}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-success hover:bg-success/10 transition-colors"
                    title="Simpan"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-base-content/40 hover:bg-base-200 transition-colors"
                    title="Batal"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-base-content whitespace-normal break-words">
                      {k.Nama_Kategori}
                    </p>
                    <p className="text-xs text-base-content/40">{k.Kategori_ID}</p>
                  </div>
                  {!k.Aktif && (
                    <span className="text-[10px] font-bold text-base-content/50 bg-base-200 px-2 py-0.5 rounded">
                      Nonaktif
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onStartEdit(k)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-base-content/40 hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Ubah nama / urutan"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleActive(k)}
                    disabled={kategoriSaving}
                    className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors ${
                      k.Aktif
                        ? 'text-error/70 hover:text-error hover:bg-error/10'
                        : 'text-success/70 hover:text-success hover:bg-success/10'
                    }`}
                    title={k.Aktif ? 'Nonaktifkan kategori' : 'Aktifkan kategori'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
