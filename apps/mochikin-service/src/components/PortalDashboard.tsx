"use client";

import { useState, useEffect } from "react";
import { Navbar } from "./Navbar";
import { AppCard } from "./AppCard";
import { ShiftInBranchSelector, type SelectedSessionContext } from "./ShiftInBranchSelector";
import { ECOSYSTEM_APPS, isRoleAllowedForApp, type OperationalShiftDefinition } from "@/lib/constants";
import type { ServicesUserSession, UserBranchInfo } from "@/lib/auth";
import {
  Storefront,
  Clock,
  Stack,
  Lightning,
  ArrowRight,
  SunHorizon,
  MoonStars,
} from "@phosphor-icons/react";

interface PortalDashboardProps {
  user: ServicesUserSession;
}

export function PortalDashboard({ user: initialUser }: PortalDashboardProps) {
  const [user, setUser] = useState<ServicesUserSession>(initialUser);
  const [mounted, setMounted] = useState(false);

  // Check if user needs shift-in branch/shift selection
  const assignedBranches = user?.assignedBranches || [];
  const hasMultipleBranches = assignedBranches.length > 1;
  const needsInitialShiftIn = (hasMultipleBranches && !user?.hasSelectedBranch) || !user?.hasSelectedShift;
  const [showBranchSelector, setShowBranchSelector] = useState(needsInitialShiftIn);

  useEffect(() => {
    setMounted(true);
  }, []);

  const role = user?.role || "petugas";
  const isAdmin =
    role === "super_admin" ||
    role === "role_admin" ||
    role === "admin";

  const accessibleAppsCount = ECOSYSTEM_APPS.filter((app) =>
    isRoleAllowedForApp(role, app.id)
  ).length;

  let expirationTime = "--:--";
  if (mounted && user?.expiresAt) {
    try {
      const expDate = new Date(user.expiresAt);
      if (!isNaN(expDate.getTime())) {
        expirationTime = expDate.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch {
      expirationTime = "--:--";
    }
  }

  const displayName = user?.name || user?.username || "Staf";
  const branchName = user?.activeBranchName || user?.branchName || "Outlet Mochikin";
  const branchCode = user?.activeBranchCode || user?.branchCode || "DEFAULT";
  const shiftName = user?.activeShiftName || "Shift Pagi (Opening)";
  const shiftType = user?.activeShiftType || "opening";
  const roleDisplay = role.replace("_", " ");

  const handleBranchSelected = ({ branch, shift }: SelectedSessionContext) => {
    setUser((prev) => ({
      ...prev,
      branchId: branch.id,
      branchCode: branch.code,
      branchName: branch.name,
      activeBranchId: branch.id,
      activeBranchCode: branch.code,
      activeBranchName: branch.name,
      hasSelectedBranch: true,
      activeShiftId: shift.id,
      activeShiftName: shift.name,
      activeShiftType: shift.type,
      hasSelectedShift: true,
    }));
    setShowBranchSelector(false);
  };

  return (
    <div className="sky-hero grain relative min-h-[100dvh]">
      <Navbar
        user={user}
        isAdmin={isAdmin}
        canSwitchBranch={hasMultipleBranches}
        onOpenBranchSelector={() => setShowBranchSelector(true)}
      />

      <ShiftInBranchSelector
        isOpen={showBranchSelector}
        assignedBranches={assignedBranches}
        currentBranchId={user.activeBranchId || user.branchId}
        isMandatory={needsInitialShiftIn}
        onSuccess={handleBranchSelected}
        onClose={() => {
          if (!needsInitialShiftIn) setShowBranchSelector(false);
        }}
      />

      <main className="relative mx-auto w-full max-w-6xl px-3.5 sm:px-6 pb-28 pt-4 sm:pb-12 sm:pt-8 space-y-4 sm:space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 sm:pb-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-ink font-display">
                Selamat datang, {displayName}
              </h1>
              <span className="inline-flex items-center rounded-full bg-accent-wash/70 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-accent capitalize">
                {roleDisplay}
              </span>
            </div>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-ash">
              Pusat peluncuran aplikasi operasional Mochikin dengan Single Sign-On
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-hairline bg-surface text-xs font-semibold text-emerald self-start sm:self-auto shadow-xs">
            <span className="size-2 rounded-full bg-emerald animate-pulse" />
            <span>Sesi aktif terhubung</span>
          </div>
        </div>

        {/* Operational Indicators: 2-column grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          {/* Active Branch Card */}
          <div className="doppel-outer">
            <div className="doppel-inner p-3 sm:p-4 flex items-start justify-between min-h-[96px] sm:min-h-[104px]">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs text-ash font-medium truncate">Outlet operasional</div>
                <div className="text-xs sm:text-base font-bold text-ink mt-0.5 truncate font-display">
                  {branchName}
                </div>
                <div className="font-mono text-[9px] sm:text-[11px] text-mist mt-0.5 truncate">
                  Kode: {branchCode}
                </div>
                {hasMultipleBranches && (
                  <button
                    type="button"
                    onClick={() => setShowBranchSelector(true)}
                    className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-accent hover:underline mt-1.5 cursor-pointer"
                  >
                    <span>Ganti</span>
                    <ArrowRight size={10} weight="bold" />
                  </button>
                )}
              </div>
              <div className="p-1.5 sm:p-2 rounded-lg bg-accent-wash/60 text-accent shrink-0 ml-1">
                <Storefront size={18} weight="duotone" className="sm:hidden" />
                <Storefront size={20} weight="duotone" className="hidden sm:block" />
              </div>
            </div>
          </div>

          {/* Active Shift Card */}
          <div className="doppel-outer">
            <div className="doppel-inner p-3 sm:p-4 flex items-start justify-between min-h-[96px] sm:min-h-[104px]">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs text-ash font-medium truncate">Shift kerja aktif</div>
                <div className="text-xs sm:text-base font-bold text-ink mt-0.5 truncate font-display">
                  {shiftName}
                </div>
                <div className="text-[9px] sm:text-[11px] text-mist mt-0.5 truncate">
                  {shiftType === "closing" ? "15:00 - 23:00 WIB" : "07:00 - 15:00 WIB"}
                </div>
                <button
                  type="button"
                  onClick={() => setShowBranchSelector(true)}
                  className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-accent hover:underline mt-1.5 cursor-pointer"
                >
                  <span>Ubah</span>
                  <ArrowRight size={10} weight="bold" />
                </button>
              </div>
              <div className="p-1.5 sm:p-2 rounded-lg bg-accent-wash/60 text-accent shrink-0 ml-1">
                {shiftType === "closing" ? (
                  <>
                    <MoonStars size={18} weight="duotone" className="sm:hidden" />
                    <MoonStars size={20} weight="duotone" className="hidden sm:block" />
                  </>
                ) : (
                  <>
                    <SunHorizon size={18} weight="duotone" className="sm:hidden" />
                    <SunHorizon size={20} weight="duotone" className="hidden sm:block" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Accessible Apps Card */}
          <div className="doppel-outer">
            <div className="doppel-inner p-3 sm:p-4 flex items-start justify-between min-h-[96px] sm:min-h-[104px]">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs text-ash font-medium truncate">Hak akses sistem</div>
                <div className="text-xs sm:text-base font-bold text-ink mt-0.5 truncate font-display">
                  {accessibleAppsCount} / {ECOSYSTEM_APPS.length} modul
                </div>
                <div className="text-[9px] sm:text-[11px] text-mist mt-0.5 truncate">
                  Matriks peran staf
                </div>
              </div>
              <div className="p-1.5 sm:p-2 rounded-lg bg-sunken text-accent shrink-0 ml-1">
                <Stack size={18} weight="duotone" className="sm:hidden" />
                <Stack size={20} weight="duotone" className="hidden sm:block" />
              </div>
            </div>
          </div>

          {/* Session Expiration Card */}
          <div className="doppel-outer">
            <div className="doppel-inner p-3 sm:p-4 flex items-start justify-between min-h-[96px] sm:min-h-[104px]">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs text-ash font-medium truncate">Masa aktif sesi</div>
                <div className="text-xs sm:text-base font-bold text-ink mt-0.5 truncate font-display">
                  {expirationTime} WIB
                </div>
                <div className="text-[9px] sm:text-[11px] text-mist mt-0.5 truncate">
                  Perpanjang otomatis
                </div>
              </div>
              <div className="p-1.5 sm:p-2 rounded-lg bg-sunken text-accent shrink-0 ml-1">
                <Clock size={18} weight="duotone" className="sm:hidden" />
                <Clock size={20} weight="duotone" className="hidden sm:block" />
              </div>
            </div>
          </div>
        </div>

        {/* Apps Header */}
        <div className="pt-2">
          <h2 className="text-sm sm:text-base font-bold text-ink font-display">
            Aplikasi ekosistem operasional
          </h2>
          <p className="text-xs text-ash">
            Pilih modul untuk langsung beralih sistem tanpa perlu login ulang
          </p>
        </div>

        {/* App Switcher Grid: 2-column grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {ECOSYSTEM_APPS.map((app) => {
            const isAllowed = isRoleAllowedForApp(role, app.id);
            return (
              <AppCard
                key={app.id}
                app={app}
                isAllowed={isAllowed}
                userRole={role}
                branchName={branchName}
              />
            );
          })}
        </div>

        {/* Operational Notice Banner */}
        <div className="doppel-outer">
          <div className="doppel-inner p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-wash/60 text-accent flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <Lightning size={20} weight="duotone" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-ink font-display">
                  Sistem koordinasi SSO Mochikin aktif
                </h3>
                <p className="text-xs text-ash">
                  Data transaksi dan otorisasi antarsistem tersinkronisasi sesuai identitas outlet Anda.
                </p>
              </div>
            </div>

            {isAdmin && (
              <a
                href="/admin"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-sunken active:scale-[0.99] shrink-0 whitespace-nowrap"
              >
                <span>Kesehatan sistem</span>
                <ArrowRight size={13} weight="bold" className="text-accent" />
              </a>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-hairline bg-surface px-4 py-6 text-center text-xs text-mist">
        <p className="font-semibold text-ink">
          Mochikin Services &bull; Central Gateway & Identity
        </p>
        <p className="text-[11px] text-mist mt-0.5">
          &copy; {new Date().getFullYear()} PT Mochikin Sukses Selaras. Seluruh sistem beroperasi normal.
        </p>
      </footer>
    </div>
  );
}
