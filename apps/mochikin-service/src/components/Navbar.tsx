"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SignOut,
  Storefront,
  X,
  SquaresFour,
  House,
  DotsThree,
  CaretRight,
  Clock,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { ServicesUserSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";

interface NavbarProps {
  user: ServicesUserSession;
  isAdmin?: boolean;
  onOpenBranchSelector?: () => void;
  canSwitchBranch?: boolean;
}

export function Navbar({
  user,
  isAdmin,
  onOpenBranchSelector,
  canSwitchBranch = false,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  }

  const roleNameDisplay = (user?.role || "staf").replace("_", " ");
  const displayName = user?.name || user?.username || "Staf";
  const branchName = user?.activeBranchName || user?.branchName || "Outlet Utama";
  const branchCode = user?.activeBranchCode || user?.branchCode || "DEFAULT";
  const shiftType = user?.activeShiftType || "opening";
  const shiftName = user?.activeShiftName || (shiftType === "closing" ? "Shift Siang/Sore (Closing)" : "Shift Pagi (Opening)");

  let expirationTime = "--:--";
  if (user?.expiresAt) {
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

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hairline bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <a href="/" className="flex items-center gap-2 focus-visible:rounded-md">
              <Logo size="sm" />
            </a>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Branch & Shift pill: Prominently visible and tap-friendly on mobile */}
            {canSwitchBranch && onOpenBranchSelector ? (
              <button
                type="button"
                onClick={onOpenBranchSelector}
                title="Pilih cabang dan shift kerja aktif"
                className="flex items-center gap-1.5 rounded-full border border-hairline bg-sunken/80 hover:bg-sunken hover:border-accent/30 active:scale-95 px-2.5 sm:px-3 py-1.5 text-xs transition-all cursor-pointer group"
              >
                <Storefront size={14} weight="duotone" className="text-accent group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-semibold text-ink max-w-[95px] sm:max-w-[150px] truncate">{branchName}</span>
                <span className="hidden sm:inline font-mono text-[10px] text-mist">{branchCode}</span>
                <span className="inline-flex items-center rounded bg-accent-wash px-1.5 py-0.5 text-[9px] font-bold text-accent capitalize">
                  {shiftType}
                </span>
                <span className="text-[10px] font-semibold text-accent underline underline-offset-2 ml-0.5">
                  Ganti
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-sunken/80 px-2.5 sm:px-3 py-1.5 text-xs">
                <Storefront size={14} weight="duotone" className="text-accent shrink-0" />
                <span className="font-medium text-ink max-w-[95px] sm:max-w-[150px] truncate">{branchName}</span>
                <span className="hidden sm:inline font-mono text-[10px] text-mist">{branchCode}</span>
                <span className="inline-flex items-center rounded bg-accent-wash px-1.5 py-0.5 text-[9px] font-bold text-accent capitalize">
                  {shiftType}
                </span>
              </div>
            )}

            {isAdmin && (
              <a
                href="/admin"
                className="hidden h-9 items-center gap-1.5 rounded-md border border-hairline bg-white px-3 text-xs font-medium text-ash transition-colors hover:bg-sunken hover:text-ink sm:inline-flex"
              >
                <SquaresFour size={14} weight="bold" className="text-accent" />
                <span className="whitespace-nowrap">Kesehatan sistem</span>
              </a>
            )}

            {/* Hamburger / Menu button: min 44px tap target */}
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-hairline bg-white text-ink transition-all hover:bg-sunken active:scale-95 cursor-pointer"
            >
              {menuOpen ? (
                <X size={18} weight="bold" />
              ) : (
                <DotsThree size={22} weight="bold" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Responsive Drawer: Bottom-sheet on mobile, popover on sm:up */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
            />

            {/* Mobile Bottom Sheet (< sm) */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 z-50 sm:hidden max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-hairline bg-surface p-4 pb-8 shadow-2xl space-y-4"
            >
              {/* Drag Handle Bar */}
              <div className="mx-auto h-1 w-12 rounded-full bg-ash/30" />

              {/* User Profile & Active Session Card */}
              <div className="p-3.5 rounded-xl border border-hairline bg-sunken/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-base font-bold text-ink truncate font-display">{displayName}</div>
                    <div className="text-xs text-ash capitalize flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block size-2 rounded-full bg-emerald" />
                      <span className="font-semibold text-ink">{roleNameDisplay}</span>
                      <span className="text-mist">&bull;</span>
                      <span className="font-mono text-[11px] text-mist">{branchCode}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ash hover:bg-sunken hover:text-ink cursor-pointer"
                    aria-label="Tutup menu"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>

                {/* Session time status badge */}
                <div className="flex items-center justify-between pt-2 border-t border-hairline/60 text-[11px] text-ash">
                  <span className="inline-flex items-center gap-1.5 text-emerald font-medium">
                    <ShieldCheck size={14} weight="fill" className="text-emerald" />
                    <span>SSO Terhubung</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-mist">
                    <Clock size={12} weight="regular" />
                    <span>Sesi: {expirationTime} WIB</span>
                  </span>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="space-y-1.5">
                {canSwitchBranch && onOpenBranchSelector && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenBranchSelector();
                    }}
                    className="flex w-full min-h-[46px] items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-accent bg-accent-wash/40 hover:bg-accent-wash/60 active:scale-[0.99] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Storefront size={20} weight="duotone" />
                      <div>
                        <div className="text-left font-semibold">Ganti Outlet & Shift Aktif</div>
                        <div className="text-left text-[11px] text-ash font-normal truncate max-w-[210px]">{branchName} &bull; {shiftName}</div>
                      </div>
                    </div>
                    <CaretRight size={16} weight="bold" className="text-accent-soft shrink-0" />
                  </button>
                )}

                <a
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-[46px] items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink hover:bg-sunken active:scale-[0.99] transition-colors"
                >
                  <div className="flex items-center gap-3 text-ash">
                    <House size={20} weight="regular" />
                    <span className="text-ink">Beranda Portal</span>
                  </div>
                  <CaretRight size={16} weight="bold" className="text-mist" />
                </a>

                {isAdmin && (
                  <a
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-[46px] items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink hover:bg-sunken active:scale-[0.99] transition-colors"
                  >
                    <div className="flex items-center gap-3 text-ash">
                      <SquaresFour size={20} weight="regular" />
                      <span className="text-ink">Kesehatan Sistem & Admin</span>
                    </div>
                    <CaretRight size={16} weight="bold" className="text-mist" />
                  </a>
                )}
              </div>

              {/* Logout button */}
              <div className="border-t border-hairline pt-2">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  disabled={loggingOut}
                  className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl bg-rose/10 px-3.5 py-2.5 text-sm font-semibold text-rose hover:bg-rose/20 active:scale-[0.99] transition-colors cursor-pointer"
                >
                  <SignOut size={18} weight="bold" />
                  <span>{loggingOut ? "Mengeluarkan..." : "Keluar (Logout)"}</span>
                </button>
              </div>
            </motion.div>

            {/* Desktop Popover (sm:up) */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="hidden sm:block fixed top-16 right-6 z-50 w-72 overflow-hidden rounded-xl border border-hairline bg-surface p-3 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-hairline pb-2.5 px-1">
                <div>
                  <div className="text-sm font-semibold text-ink">{displayName}</div>
                  <div className="text-xs text-ash capitalize flex items-center gap-1 mt-0.5">
                    <span>{roleNameDisplay}</span>
                    <span>&bull;</span>
                    <span className="font-mono text-[10px] text-mist">{expirationTime} WIB</span>
                  </div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ash hover:bg-sunken hover:text-ink cursor-pointer"
                >
                  <X size={15} weight="bold" />
                </button>
              </div>

              <div className="space-y-1 pt-2">
                {canSwitchBranch && onOpenBranchSelector && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenBranchSelector();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                  >
                    <Storefront size={16} weight="duotone" />
                    <span>Ganti Outlet & Shift Aktif</span>
                  </button>
                )}
                <a
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-ash hover:bg-sunken hover:text-ink transition-colors"
                >
                  <House size={16} weight="regular" />
                  <span>Beranda Portal</span>
                </a>
                {isAdmin && (
                  <a
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-ash hover:bg-sunken hover:text-ink transition-colors"
                  >
                    <SquaresFour size={16} weight="regular" />
                    <span>Kesehatan Sistem</span>
                  </a>
                )}
              </div>

              <div className="border-t border-hairline mt-2 pt-2">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose hover:bg-rose/10 transition-colors cursor-pointer"
                >
                  <SignOut size={15} weight="bold" />
                  <span>{loggingOut ? "Mengeluarkan..." : "Keluar (Logout)"}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
