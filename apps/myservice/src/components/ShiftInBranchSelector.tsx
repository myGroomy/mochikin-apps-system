"use client";

import { useState, useEffect } from "react";
import {
  Storefront,
  CheckCircle,
  Buildings,
  MapPin,
  ArrowRight,
  X,
  WarningCircle,
  Clock,
  Sparkle,
} from "@phosphor-icons/react";
import type { UserBranchInfo } from "@/lib/auth";
import type { ManagedShift } from "@/lib/shiftService";
import { OPERATIONAL_SHIFTS, getRecommendedShift } from "@/lib/constants";

export interface SelectedSessionContext {
  branch: UserBranchInfo;
  shift: {
    id: string;
    name: string;
    type: string;
  };
}

interface ShiftInBranchSelectorProps {
  isOpen: boolean;
  assignedBranches: UserBranchInfo[];
  currentBranchId?: string;
  currentShiftId?: string;
  initialShifts?: ManagedShift[];
  isMandatory?: boolean; // True during shift-in login (cannot be closed without selection)
  onSuccess: (sessionCtx: SelectedSessionContext) => void;
  onClose?: () => void;
}

export function ShiftInBranchSelector({
  isOpen,
  assignedBranches,
  currentBranchId,
  currentShiftId,
  initialShifts,
  isMandatory = false,
  onSuccess,
  onClose,
}: ShiftInBranchSelectorProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentBranchId || (assignedBranches[0]?.id ?? "")
  );

  const [shifts, setShifts] = useState<ManagedShift[]>(() => {
    if (initialShifts && initialShifts.length > 0) return initialShifts;
    return OPERATIONAL_SHIFTS as unknown as ManagedShift[];
  });

  // Calculate current hour recommendation
  const currentHour = new Date().getHours();
  const currentShifts = shifts.length > 0 ? shifts : (OPERATIONAL_SHIFTS as unknown as ManagedShift[]);
  const recommended = currentShifts.find((s) => {
    if (s.startHour <= s.endHour) {
      return currentHour >= s.startHour && currentHour < s.endHour;
    }
    return currentHour >= s.startHour || currentHour < s.endHour;
  }) || currentShifts[0];

  const [selectedShiftId, setSelectedShiftId] = useState<string>(
    currentShiftId || recommended?.id || "opening"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync shifts dynamically from server API if branch changes or on mount
  useEffect(() => {
    let isCancelled = false;
    async function loadShifts() {
      try {
        const query = selectedBranchId ? `?branchId=${encodeURIComponent(selectedBranchId)}` : "";
        const res = await fetch(`/api/auth/shifts${query}`);
        const data = await res.json();
        if (!isCancelled && data.success && Array.isArray(data.shifts) && data.shifts.length > 0) {
          setShifts(data.shifts);
          if (!data.shifts.some((s: ManagedShift) => s.id === selectedShiftId)) {
            setSelectedShiftId(data.shifts[0].id);
          }
        }
      } catch {
        // Fall back gracefully to existing shifts
      }
    }
    loadShifts();
    return () => {
      isCancelled = true;
    };
  }, [selectedBranchId]);

  if (!isOpen) return null;

  async function handleConfirm() {
    if (!selectedBranchId) {
      setError("Silakan pilih cabang tugas terlebih dahulu.");
      return;
    }
    if (!selectedShiftId) {
      setError("Silakan pilih shift operasional hari ini.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/select-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranchId,
          shiftId: selectedShiftId,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        activeBranch?: UserBranchInfo;
        activeShift?: { id: string; name: string; type: string };
      } | null;

      if (!res.ok || !data?.success || !data.activeBranch || !data.activeShift) {
        setError(data?.message || "Gagal menetapkan sesi kerja aktif. Coba lagi.");
        setLoading(false);
        return;
      }

      onSuccess({
        branch: data.activeBranch,
        shift: data.activeShift,
      });
    } catch {
      setError("Terjadi kesalahan koneksi saat menetapkan sesi kerja.");
      setLoading(false);
    }
  }

  const showBranchList = assignedBranches.length > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl border-t sm:border border-hairline overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top decoration bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-accent via-accent-soft to-accent-wash" />

        {/* Mobile drag handle bar */}
        <div className="pt-2 sm:hidden flex justify-center">
          <div className="h-1 w-12 rounded-full bg-ash/30" />
        </div>

        <div className="p-4 sm:p-7 overflow-y-auto flex-1 space-y-5">
          {/* Top header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-accent-wash/60 text-accent">
                <Storefront size={24} weight="duotone" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-accent">
                  <Buildings size={13} weight="bold" />
                  <span>Shift-In Central Gateway</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-ink font-display">
                  Tentukan Sesi Kerja Hari Ini
                </h2>
              </div>
            </div>

            {!isMandatory && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ash hover:bg-sunken hover:text-ink transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X size={18} weight="bold" />
              </button>
            )}
          </div>

          <p className="text-xs text-ash leading-relaxed">
            Pilihan cabang dan shift ini menjadi identitas SSO tunggal untuk seluruh ekosistem: Stokis, MyCheck, MyCustomer, dan MyPerformance.
          </p>

          {/* Error notice */}
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose/20 bg-rose/10 p-3 text-xs text-rose font-medium">
              <WarningCircle size={16} weight="bold" className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SECTION 1: Cabang Penugasan */}
          {showBranchList && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink">
                1. Pilih Cabang Outlet Bertugas
              </label>
              <div className="space-y-1.5 max-h-[28vh] overflow-y-auto pr-0.5">
                {assignedBranches.map((branch) => {
                  const isChecked = selectedBranchId === branch.id;
                  return (
                    <label
                      key={branch.id}
                      htmlFor={`branch-${branch.id}`}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all min-h-[50px] ${
                        isChecked
                          ? "border-accent bg-accent/5 ring-1 ring-accent/30 shadow-xs"
                          : "border-hairline bg-surface hover:bg-sunken/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="radio"
                          id={`branch-${branch.id}`}
                          name="active_branch_choice"
                          value={branch.id}
                          checked={isChecked}
                          onChange={() => setSelectedBranchId(branch.id)}
                          className="h-4 w-4 text-accent border-hairline focus:ring-accent accent-accent shrink-0 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs sm:text-sm text-ink truncate">
                              {branch.name}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-sunken text-ash border border-hairline">
                              {branch.code}
                            </span>
                          </div>
                          {branch.city && (
                            <div className="flex items-center gap-1 text-[11px] text-mist mt-0.5">
                              <MapPin size={11} weight="fill" className="text-mist shrink-0" />
                              <span className="truncate">{branch.city}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {isChecked && (
                        <div className="shrink-0 text-accent pl-2">
                          <CheckCircle size={18} weight="fill" />
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: Shift Operasional */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink">
                {showBranchList ? "2. Pilih Shift Operasional" : "Pilih Shift Operasional Hari Ini"}
              </label>
              <span className="text-[11px] text-mist flex items-center gap-1">
                <Clock size={12} weight="regular" />
                <span>WIB</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentShifts.map((shift) => {
                const isSelected = selectedShiftId === shift.id;
                const isRec = recommended?.id === shift.id;
                return (
                  <div
                    key={shift.id}
                    onClick={() => setSelectedShiftId(shift.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between min-h-[96px] ${
                      isSelected
                        ? "border-accent bg-accent/5 ring-1 ring-accent/30 shadow-xs"
                        : "border-hairline bg-surface hover:bg-sunken/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs sm:text-sm text-ink font-display">
                          {shift.name}
                        </span>
                        {isRec && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald/10 text-emerald text-[9px] font-bold px-1.5 py-0.5">
                            <Sparkle size={10} weight="fill" />
                            <span>Saat Ini</span>
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] font-semibold text-accent">
                        {shift.timeDisplay}
                      </div>
                      <p className="text-[11px] text-ash mt-1 line-clamp-2 leading-relaxed">
                        {shift.tagline}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-hairline/60 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-mist uppercase tracking-wider">
                        Tipe: {shift.shortName}
                      </span>
                      {isSelected ? (
                        <CheckCircle size={18} weight="fill" className="text-accent" />
                      ) : (
                        <span className="size-4 rounded-full border border-hairline" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons (sticky / fixed at bottom of drawer on mobile) */}
          <div className="pt-3 border-t border-hairline flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            {!isMandatory && onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl border border-hairline bg-surface text-xs font-semibold text-ash hover:bg-sunken hover:text-ink transition-colors cursor-pointer"
              >
                Batal
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !selectedBranchId || !selectedShiftId}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-soft active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Menyimpan Sesi…</span>
                </>
              ) : (
                <>
                  <span>Mulai Bekerja di Shift Ini</span>
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
