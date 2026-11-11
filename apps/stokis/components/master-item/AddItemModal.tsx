'use client';

import React from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Check, Loader2 } from 'lucide-react';
import { TipeInputDropdown } from './TipeInputDropdown';
import { sanitizeDecimalInput } from '@/lib/domain/so';

interface NewItemFormState {
  Nama_Barang: string;
  Area: string;
  Satuan: string;
  Threshold: string;
  Tipe_Input: string;
  Keterangan: string;
}

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  areas: string[];
  newItem: NewItemFormState;
  onItemChange: (item: NewItemFormState) => void;
  inputBaseClass: string;
}

export function AddItemModal({
  open,
  onClose,
  onSubmit,
  saving,
  areas,
  newItem,
  onItemChange,
  inputBaseClass,
}: AddItemModalProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Tambah Item Baru"
      subtitle="Isi data master item untuk cabang ini"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all"
          >
            Batal
          </button>
          <button
            type="submit"
            form="add-item-form"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-primary-content bg-primary shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Simpan
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="add-item-form" onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
            Nama Barang <span className="text-error">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Beras Pandan Wangi 5kg"
            value={newItem.Nama_Barang}
            onChange={(e) => onItemChange({ ...newItem, Nama_Barang: e.target.value })}
            className={`${inputBaseClass} w-full`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
              Area <span className="text-error">*</span>
            </label>
            <select
              value={newItem.Area}
              onChange={(e) => onItemChange({ ...newItem, Area: e.target.value })}
              className={`${inputBaseClass} w-full`}
            >
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
              Satuan <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="kg, pcs, gr..."
              value={newItem.Satuan}
              onChange={(e) => onItemChange({ ...newItem, Satuan: e.target.value })}
              className={`${inputBaseClass} w-full`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
              Tipe Input
            </label>
            <TipeInputDropdown
              value={newItem.Tipe_Input}
              onChange={(val) => onItemChange({ ...newItem, Tipe_Input: val })}
              itemName={newItem.Nama_Barang || 'Item Baru'}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
              Threshold (Batas Minimum)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={newItem.Threshold}
              onChange={(e) =>
                onItemChange({ ...newItem, Threshold: sanitizeDecimalInput(e.target.value) })
              }
              className={`${inputBaseClass} w-full font-semibold tabular-nums`}
            />
            <p className="text-xs text-base-content/40">Threshold = 0 berarti tidak dipantau</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
              Keterangan
            </label>
            <input
              type="text"
              placeholder="Catatan (opsional)"
              value={newItem.Keterangan}
              onChange={(e) => onItemChange({ ...newItem, Keterangan: e.target.value })}
              className={`${inputBaseClass} w-full`}
            />
          </div>
        </div>
      </form>
    </BottomSheet>
  );
}
