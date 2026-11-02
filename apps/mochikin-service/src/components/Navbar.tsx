"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SignOut,
  Storefront,
  X,
  SquaresFour,
  ArrowLeft,
  DotsThree,
} from "@phosphor-icons/react";
import type { ServicesUserSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";

interface NavbarProps {
  user: ServicesUserSession;
  isAdmin?: boolean;
}

export function Navbar({ user, isAdmin }: NavbarProps) {
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
  const branchName = user?.branchName || "Outlet Mochikin";
  const branchCode = user?.branchCode || "DEFAULT";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hairline bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5">
              <Logo size="sm" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            {/* Branch pill */}
            <div className="hidden items-center gap-2 rounded-full border border-hairline bg-sunken/60 px-3 py-1 text-xs sm:flex">
              <Storefront size={14} weight="duotone" className="text-accent" />
              <span className="font-medium text-ink">{branchName}</span>
              <span className="font-mono text-[11px] text-mist">{branchCode}</span>
            </div>

            {isAdmin && (
              <a
                href="/admin"
                className="hidden h-9 items-center gap-1.5 rounded-md border border-hairline bg-white px-3 text-xs font-medium text-ash transition-colors hover:bg-sunken hover:text-ink sm:inline-flex"
              >
                <SquaresFour size={14} weight="bold" className="text-accent" />
                <span className="whitespace-nowrap">Kesehatan sistem</span>
              </a>
            )}

            {/* Hamburg menu button */}
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              className="flex h-11 w-11 items-center justify-center rounded-md border border-hairline bg-white text-ink transition-all hover:bg-sunken active:scale-95"
            >
              {menuOpen ? (
                <X size={20} weight="bold" />
              ) : (
                <DotsThree size={22} weight="bold" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="fixed top-16 right-4 z-50 w-72 overflow-hidden"
            >
              <div className="doppel-outer">
                <div className="doppel-inner p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-hairline pb-3 px-1">
                    <div>
                      <div className="text-sm font-semibold text-ink">{displayName}</div>
                      <div className="text-xs text-ash capitalize">{roleNameDisplay}</div>
                    </div>
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-ash hover:bg-sunken hover:text-ink"
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <a
                      href="/"
                      onClick={() => setMenuOpen(false)}
                      className="group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-all duration-300 active:scale-[0.98] text-ash hover:bg-sunken hover:text-ink"
                    >
                      <ArrowLeft size={20} weight="regular" />
                      <span>Kembali ke Beranda</span>
                    </a>
                    {isAdmin && (
                      <a
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-all duration-300 active:scale-[0.98] text-ash hover:bg-sunken hover:text-ink"
                      >
                        <SquaresFour size={20} weight="regular" />
                        <span>Kesehatan Sistem</span>
                      </a>
                    )}
                  </div>

                  <div className="border-t border-hairline pt-3">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2 text-xs font-semibold text-ink hover:bg-rose/10 transition-colors"
                    >
                      <SignOut size={16} weight="bold" />
                      <span>{loggingOut ? "Mengeluarkan..." : "Keluar (logout)"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
