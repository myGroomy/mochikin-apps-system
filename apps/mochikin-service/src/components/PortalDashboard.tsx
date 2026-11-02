"use client";

import { useState, useEffect } from "react";
import { Navbar } from "./Navbar";
import { AppCard } from "./AppCard";
import { ECOSYSTEM_APPS, isRoleAllowedForApp } from "@/lib/constants";
import type { ServicesUserSession } from "@/lib/auth";
import {
  Storefront,
  Clock,
  Stack,
  Lightning,
  ArrowRight,
  DotOutline,
} from "@phosphor-icons/react";

interface PortalDashboardProps {
  user: ServicesUserSession;
}

export function PortalDashboard({ user }: PortalDashboardProps) {
  const [mounted, setMounted] = useState(false);

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
  const branchName = user?.branchName || "Outlet Mochikin";
  const branchCode = user?.branchCode || "DEFAULT";
  const roleDisplay = role.replace("_", " ");

  return (
    <div className="sky-hero grain relative min-h-[100dvh]">
      <Navbar user={user} isAdmin={isAdmin} />

      <main className="relative mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-10 sm:pt-8 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-ink">
                Selamat datang, {displayName}
              </h1>
              <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent capitalize">
                {roleDisplay}
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-ash">
              Pusat peluncuran aplikasi operasional Mochikin dengan autentikasi terpadu
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-hairline bg-white text-xs font-medium text-emerald self-start sm:self-auto">
            <DotOutline size={14} weight="fill" className="text-emerald" />
            <span>Sesi aktif terhubung</span>
          </div>
        </div>

        {/* Operational Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="doppel-outer">
            <div className="doppel-inner p-4 flex items-start justify-between">
              <div>
                <div className="text-xs text-ash font-medium">Outlet aktif</div>
                <div className="text-base sm:text-lg font-bold text-ink mt-1">
                  {branchName}
                </div>
                <div className="font-mono text-[11px] text-mist mt-0.5">
                  Kode: {branchCode}
                </div>
              </div>
              <div className="p-2 rounded-md bg-sunken text-accent">
                <Storefront size={20} weight="duotone" />
              </div>
            </div>
          </div>

          <div className="doppel-outer">
            <div className="doppel-inner p-4 flex items-start justify-between">
              <div>
                <div className="text-xs text-ash font-medium">Akses aplikasi</div>
                <div className="text-base sm:text-lg font-bold text-ink mt-1">
                  {accessibleAppsCount} dari {ECOSYSTEM_APPS.length} sistem
                </div>
                <div className="text-[11px] text-mist mt-0.5">
                  Sesuai matriks peran akun
                </div>
              </div>
              <div className="p-2 rounded-md bg-sunken text-accent">
                <Stack size={20} weight="duotone" />
              </div>
            </div>
          </div>

          <div className="doppel-outer">
            <div className="doppel-inner p-4 flex items-start justify-between">
              <div>
                <div className="text-xs text-ash font-medium">Masa berlaku sesi</div>
                <div className="text-base sm:text-lg font-bold text-ink mt-1">
                  {expirationTime} WIB
                </div>
                <div className="text-[11px] text-mist mt-0.5">
                  Pembaruan otomatis saat aktif
                </div>
              </div>
              <div className="p-2 rounded-md bg-sunken text-accent">
                <Clock size={20} weight="duotone" />
              </div>
            </div>
          </div>
        </div>

        {/* Apps Header */}
        <div className="pt-2">
          <h2 className="text-sm font-semibold text-ink">
            Aplikasi ekosistem operasional
          </h2>
          <p className="text-xs text-ash">
            Pilih modul untuk langsung beralih sistem tanpa perlu memasukkan PIN kembali
          </p>
        </div>

        {/* App Switcher Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="doppel-inner p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-sunken text-accent flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <Lightning size={18} weight="duotone" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-ink">
                  Sistem koordinasi SSO Mochikin aktif
                </h3>
                <p className="text-xs text-ash">
                  Data transaksi antarsistem tersinkronisasi sesuai identitas outlet Anda.
                </p>
              </div>
            </div>

            {isAdmin && (
              <a
                href="/admin"
                className="inline-flex h-auto items-center gap-1.5 rounded-md border border-hairline bg-white px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-sunken active:scale-[0.99] shrink-0 whitespace-nowrap"
              >
                <span className="whitespace-nowrap">Kesehatan sistem</span>
                <ArrowRight size={14} weight="bold" className="text-accent" />
              </a>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-hairline bg-white px-4 py-6 text-center text-xs text-mist">
        <p className="font-medium text-ink">
          Mochikin Services. Gateway identitas terpadu
        </p>
        <p className="text-[11px] text-mist mt-0.5">
          &copy; {new Date().getFullYear()} PT Mochikin Sukses Selaras. Seluruh sistem beroperasi normal.
        </p>
      </footer>
    </div>
  );
}
