"use client";

import { useState } from "react";
import {
  Storefront,
  CheckCircle,
  Buildings,
  MapPin,
  ArrowRight,
  X,
  WarningCircle,
} from "@phosphor-icons/react";
import type { UserBranchInfo } from "@/lib/auth";

interface ShiftInBranchSelectorProps {
  isOpen: boolean;
  assignedBranches: UserBranchInfo[];
  currentBranchId?: string;
  isMandatory?: boolean; // True during shift-in login (cannot be closed without selection)
  onSuccess: (branch: UserBranchInfo) => void;
  onClose?: () => void;
}

export function ShiftInBranchSelector({
  isOpen,
  assignedBranches,
  currentBranchId,
  isMandatory = false,
  onSuccess,
  onClose,
}: ShiftInBranchSelectorProps) {
  const [selectedId, setSelectedId] = useState<string>(
    currentBranchId || (assignedBranches[0]?.id ?? "")
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleConfirm() {
    if (!selectedId) {
      setError("Silakan pilih cabang terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/select-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: selectedId }),
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        activeBranch?: UserBranchInfo;
      } | null;

      if (!res.ok || !data?.success || !data.activeBranch) {
        setError(data?.message || "Gagal menetapkan cabang aktif. Coba lagi.");
        setLoading(false);
        return;
      }

      onSuccess(data.activeBranch);
    } catch {
      setError("Terjadi kesalahan koneksi saat menetapkan cabang aktif.");
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-hairline overflow-hidden my-8">
        {/* Header decoration bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-accent via-accent-deep to-amber" />

        <div className="p-6 sm:p-7">
          {/* Top icon and close button (if not mandatory) */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Storefront size={26} weight="duotone" />
            </div>

            {!isMandatory && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-ash hover:bg-sunken hover:text-ink transition-colors"
                aria-label="Tutup"
              >
                <X size={20} weight="bold" />
              </button>
            )}
          </div>

          {/* Title & Question */}
          <div className="space-y-1 mb-6">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
              <Buildings size={14} weight="bold" />
              <span>Shift-In Central Selector</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-ink">
              Work di cabang mana hari ini?
            </h2>
            <p className="text-xs sm:text-sm text-ash leading-relaxed">
              Pilih cabang aktif tempat Anda bertugas hari ini. Seluruh data transaksi, checklist, laporan pelanggan, dan stok di seluruh aplikasi ekosistem akan otomatis tersinkronisasi ke cabang ini.
            </p>
          </div>

          {/* Error notice */}
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose/20 bg-rose/10 p-3.5 mb-5 text-xs text-rose font-medium">
              <WarningCircle size={18} weight="bold" className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Branch list radio cards */}
          <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
            {assignedBranches.map((branch) => {
              const isChecked = selectedId === branch.id;
              return (
                <label
                  key={branch.id}
                  htmlFor={`branch-${branch.id}`}
                  className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? "border-accent bg-accent/5 ring-2 ring-accent/20 shadow-sm"
                      : "border-hairline bg-white hover:border-hairline/80 hover:bg-sunken/40"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <input
                      type="radio"
                      id={`branch-${branch.id}`}
                      name="active_branch_choice"
                      value={branch.id}
                      checked={isChecked}
                      onChange={() => setSelectedId(branch.id)}
                      className="h-4 w-4 text-accent border-hairline focus:ring-accent accent-accent shrink-0 cursor-pointer"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink truncate">
                          {branch.name}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-sunken text-ash border border-hairline">
                          {branch.code}
                        </span>
                      </div>

                      {branch.city && (
                        <div className="flex items-center gap-1 text-[11px] text-mist mt-0.5">
                          <MapPin size={12} weight="fill" className="text-mist shrink-0" />
                          <span className="truncate">{branch.city}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isChecked && (
                    <div className="shrink-0 text-accent pl-2">
                      <CheckCircle size={22} weight="fill" />
                    </div>
                  )}
                </label>
              );
            })}
          </div>

          {/* Persistence notice */}
          <div className="mt-4 p-3 rounded-xl bg-sunken/60 border border-hairline/60 text-[11px] text-mist flex items-start gap-2">
            <span className="text-accent font-bold mt-0.5">•</span>
            <span>
              Pilihan cabang aktif ini akan berlaku untuk MyCustomer, MyCheck, MyPerformance, dan Stokis. Pergantian cabang hanya dapat dilakukan melalui Mochikin Service.
            </span>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            {!isMandatory && onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-hairline bg-white text-xs font-semibold text-ash hover:bg-sunken hover:text-ink transition-colors"
              >
                Batal
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !selectedId}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-deep active:scale-[0.98] transition-all shadow-md shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Menyimpan Cabang…</span>
                </>
              ) : (
                <>
                  <span>Mulai Shift di Cabang Ini</span>
                  <ArrowRight size={14} weight="bold" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
