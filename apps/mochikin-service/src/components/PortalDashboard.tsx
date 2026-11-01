"use client";

import { motion } from "framer-motion";
import { Navbar } from "./Navbar";
import { AppCard } from "./AppCard";
import { ECOSYSTEM_APPS, isRoleAllowedForApp } from "@/lib/constants";
import type { ServicesUserSession } from "@/lib/auth";
import {
  Store,
  ShieldCheck,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-base-content">
                Selamat Datang, {user.name} 👋
              </h1>
              <span className="badge badge-primary badge-sm font-bold uppercase">
                {user.role.replace("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-base-content/70">
              Pusat peluncuran aplikasi operasional Mochikin dengan Single Sign-On (SSO).
            </p>
          </div>

          <div className="badge badge-success badge-lg gap-2 font-semibold shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span>SSO Sesi Terhubung</span>
          </div>
        </motion.div>

        {/* Quick Stats Grid using DaisyUI Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="stats stats-vertical sm:stats-horizontal shadow-sm bg-base-100 border border-base-200 w-full rounded-2xl"
        >
          <div className="stat py-4">
            <div className="stat-figure text-primary">
              <Store className="w-8 h-8 opacity-80" />
            </div>
            <div className="stat-title text-xs font-bold text-base-content/60 uppercase">
              Outlet Aktif
            </div>
            <div className="stat-value text-lg sm:text-xl text-primary font-bold">
              {user.branchName}
            </div>
            <div className="stat-desc font-mono font-medium text-base-content/50">
              Kode Cabang: {user.branchCode}
            </div>
          </div>

          <div className="stat py-4">
            <div className="stat-figure text-success">
              <Layers className="w-8 h-8 opacity-80" />
            </div>
            <div className="stat-title text-xs font-bold text-base-content/60 uppercase">
              Akses Aplikasi
            </div>
            <div className="stat-value text-lg sm:text-xl text-success font-bold">
              {accessibleAppsCount} / {ECOSYSTEM_APPS.length}
            </div>
            <div className="stat-desc font-medium text-base-content/50">
              Otoritas hak akses terdaftar
            </div>
          </div>

          <div className="stat py-4">
            <div className="stat-figure text-warning">
              <Clock className="w-8 h-8 opacity-80" />
            </div>
            <div className="stat-title text-xs font-bold text-base-content/60 uppercase">
              Masa Berlaku Sesi
            </div>
            <div className="stat-value text-lg sm:text-xl font-bold text-base-content">
              {expirationTime} WIB
            </div>
            <div className="stat-desc font-medium text-base-content/50">
              Auto refresh saat aktif
            </div>
          </div>
        </motion.div>

        {/* Apps Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-base-content flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Aplikasi Ekosistem Mochikin</span>
            </h2>
            <p className="text-xs text-base-content/60">
              Klik kartu aplikasi untuk langsung berpindah tanpa login ulang
            </p>
          </div>
        </div>

        {/* App Switcher Grid with Framer Motion Stagger */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
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
        </motion.div>

        {/* Tip / Quick Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="card bg-base-100 border border-base-200 shadow-sm"
        >
          <div className="card-body p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent-content font-black text-xl flex items-center justify-center shrink-0">
                ⚡
              </div>
              <div>
                <h4 className="text-sm font-bold text-base-content">
                  Mochikin Unified Single Sign-On Active
                </h4>
                <p className="text-xs text-base-content/70">
                  Semua transaksi antarsistem (Stokis, MyCheck, MyCustomer, MyPerformance) otomatis diselaraskan dengan identitas Anda.
                </p>
              </div>
            </div>

            {isAdmin && (
              <a
                href="/admin"
                className="btn btn-neutral btn-sm rounded-xl font-bold gap-1.5 shrink-0"
              >
                <span>System Health & Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="footer footer-center p-6 bg-base-100 text-base-content/60 border-t border-base-200 text-xs">
        <div>
          <p className="font-semibold text-base-content">
            Mochikin Services &bull; Enterprise SSO Gateway
          </p>
          <p className="text-[11px] text-base-content/40">
            &copy; {new Date().getFullYear()} PT Mochikin Sukses Selaras. All systems operational.
          </p>
        </div>
      </footer>
    </div>
  );
}