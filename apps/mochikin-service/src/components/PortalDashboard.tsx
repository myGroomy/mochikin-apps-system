"use client";

import { Navbar } from "./Navbar";
import { AppCard } from "./AppCard";
import { ECOSYSTEM_APPS, isRoleAllowedForApp } from "@/lib/constants";
import type { ServicesUserSession } from "@/lib/auth";
import {
  Store,
  Clock,
  Layers,
  ArrowRight,
  Zap,
} from "lucide-react";

interface PortalDashboardProps {
  user: ServicesUserSession;
}

export function PortalDashboard({ user }: PortalDashboardProps) {
  const isAdmin = user.role === "super_admin" || user.role === "role_admin";

  const accessibleAppsCount = ECOSYSTEM_APPS.filter((app) =>
    isRoleAllowedForApp(user.role, app.id)
  ).length;

  const expirationTime = new Date(user.expiresAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <Navbar user={user} isAdmin={isAdmin} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-base-300">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-base-content">
                Selamat datang, {user.name}
              </h1>
              <span className="badge badge-neutral badge-sm font-normal text-xs capitalize">
                {user.role.replace("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-base-content/70">
              Pusat peluncuran aplikasi operasional Mochikin dengan autentikasi terpadu
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-base-100 border border-base-300 text-xs font-medium text-success self-start sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="motion-safe:animate-ping motion-reduce:hidden absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span>Sesi aktif terhubung</span>
          </div>
        </div>

        {/* Operational Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-base-100 border border-base-300 rounded-lg p-4 flex items-start justify-between">
            <div>
              <div className="text-xs text-base-content/60 font-medium">
                Outlet aktif
              </div>
              <div className="text-base sm:text-lg font-bold text-base-content mt-1">
                {user.branchName}
              </div>
              <div className="font-mono text-[11px] text-base-content/50 mt-0.5">
                Kode: {user.branchCode}
              </div>
            </div>
            <div className="p-2 rounded-md bg-base-200 text-primary">
              <Store className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-base-100 border border-base-300 rounded-lg p-4 flex items-start justify-between">
            <div>
              <div className="text-xs text-base-content/60 font-medium">
                Akses aplikasi
              </div>
              <div className="text-base sm:text-lg font-bold text-base-content mt-1">
                {accessibleAppsCount} dari {ECOSYSTEM_APPS.length} sistem
              </div>
              <div className="text-[11px] text-base-content/50 mt-0.5">
                Sesuai matriks peran akun
              </div>
            </div>
            <div className="p-2 rounded-md bg-base-200 text-primary">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-base-100 border border-base-300 rounded-lg p-4 flex items-start justify-between">
            <div>
              <div className="text-xs text-base-content/60 font-medium">
                Masa berlaku sesi
              </div>
              <div className="text-base sm:text-lg font-bold text-base-content mt-1">
                {expirationTime} WIB
              </div>
              <div className="text-[11px] text-base-content/50 mt-0.5">
                Pembaruan otomatis saat aktif
              </div>
            </div>
            <div className="p-2 rounded-md bg-base-200 text-primary">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Apps Header */}
        <div className="pt-2">
          <h2 className="text-sm font-semibold text-base-content">
            Aplikasi ekosistem operasional
          </h2>
          <p className="text-xs text-base-content/60">
            Pilih modul untuk langsung beralih sistem tanpa perlu memasukkan PIN kembali
          </p>
        </div>

        {/* App Switcher Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ECOSYSTEM_APPS.map((app) => {
            const isAllowed = isRoleAllowedForApp(user.role, app.id);
            return (
              <AppCard
                key={app.id}
                app={app}
                isAllowed={isAllowed}
                userRole={user.role}
              />
            );
          })}
        </div>

        {/* Operational Notice Banner */}
        <div className="bg-base-100 border border-base-300 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-base-200 text-primary flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-base-content">
                Sistem koordinasi SSO Mochikin aktif
              </h3>
              <p className="text-xs text-base-content/70">
                Data transaksi antarsistem tersinkronisasi sesuai identitas outlet Anda.
              </p>
            </div>
          </div>

          {isAdmin && (
            <a
              href="/admin"
              className="btn btn-neutral btn-sm rounded-md font-medium gap-1.5 shrink-0 whitespace-nowrap active:scale-[0.99]"
            >
              <span className="whitespace-nowrap">Kesehatan sistem</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 bg-base-100 text-base-content/60 border-t border-base-300 text-xs text-center">
        <div>
          <p className="font-medium text-base-content">
            Mochikin Services. Gateway identitas terpadu
          </p>
          <p className="text-[11px] text-base-content/50 mt-0.5">
            &copy; {new Date().getFullYear()} PT Mochikin Sukses Selaras. Seluruh sistem beroperasi normal.
          </p>
        </div>
      </footer>
    </div>
  );
}
