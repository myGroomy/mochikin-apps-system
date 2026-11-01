"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  ClipboardCheck,
  Users,
  TrendingUp,
  ExternalLink,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import type { EcosystemAppMeta } from "@/lib/constants";

interface AppCardProps {
  app: EcosystemAppMeta;
  isAllowed: boolean;
  userRole: string;
}

const APP_META_EXTRAS: Record<
  EcosystemAppMeta["id"],
  {
    iconBg: string;
    iconColor: string;
    badgeStyle: string;
    quickTags: string[];
    gradientBorder: string;
  }
> = {
  STOKIS: {
    iconBg: "bg-blue-500/10 text-blue-600",
    iconColor: "text-blue-600",
    badgeStyle: "badge-primary",
    quickTags: ["Input SO", "Laporan Stok", "Audit Shift"],
    gradientBorder: "group-hover:border-blue-400",
  },
  MYCHECK: {
    iconBg: "bg-emerald-500/10 text-emerald-600",
    iconColor: "text-emerald-600",
    badgeStyle: "badge-success",
    quickTags: ["Checklist Shift", "Insiden Outlet", "Daily Audit"],
    gradientBorder: "group-hover:border-emerald-400",
  },
  MYCUSTOMER: {
    iconBg: "bg-amber-500/10 text-amber-600",
    iconColor: "text-amber-600",
    badgeStyle: "badge-warning",
    quickTags: ["Member CRM", "Broadcast Promo", "Poin Loyalitas"],
    gradientBorder: "group-hover:border-amber-400",
  },
  MYPERFORMANCE: {
    iconBg: "bg-indigo-500/10 text-indigo-600",
    iconColor: "text-indigo-600",
    badgeStyle: "badge-info",
    quickTags: ["Scorecard Tim", "Leaderboard", "Target Omset"],
    gradientBorder: "group-hover:border-indigo-400",
  },
};

export function AppCard({ app, isAllowed }: AppCardProps) {
  const [launching, setLaunching] = useState(false);
  const meta = APP_META_EXTRAS[app.id];

  function renderIcon() {
    switch (app.id) {
      case "STOKIS":
        return <Package className="w-6 h-6 text-blue-600" />;
      case "MYCHECK":
        return <ClipboardCheck className="w-6 h-6 text-emerald-600" />;
      case "MYCUSTOMER":
        return <Users className="w-6 h-6 text-amber-600" />;
      case "MYPERFORMANCE":
        return <TrendingUp className="w-6 h-6 text-indigo-600" />;
    }
  }

  function handleLaunch() {
    if (!isAllowed || launching) return;
    setLaunching(true);
    window.location.href = `/api/auth/handoff?appId=${app.id}&returnPath=/`;
  }

  return (
    <motion.div
      whileHover={isAllowed ? { y: -4, scale: 1.01 } : {}}
      whileTap={isAllowed ? { scale: 0.99 } : {}}
      transition={{ duration: 0.2 }}
      className={`card bg-base-100 border border-base-200 transition-all duration-300 relative overflow-hidden group ${
        isAllowed
          ? `${meta.gradientBorder} shadow-sm hover:shadow-lg cursor-pointer`
          : "opacity-60 bg-base-200/50 cursor-not-allowed"
      }`}
      onClick={isAllowed ? handleLaunch : undefined}
    >
      {/* Decorative top accent line */}
      <div
        className={`h-1 w-full transition-opacity duration-300 ${
          isAllowed
            ? "bg-gradient-to-r from-primary to-accent opacity-80 group-hover:opacity-100"
            : "bg-base-300"
        }`}
      />

      <div className="card-body p-6 flex flex-col justify-between h-full">
        <div>
          {/* Header with App Icon & Category Badge */}
          <div className="flex items-center justify-between mb-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 duration-200 ${
                isAllowed ? meta.iconBg : "bg-base-200 text-base-content/40"
              }`}
            >
              {renderIcon()}
            </div>
            <span
              className={`badge badge-sm font-semibold tracking-wide ${
                isAllowed ? "badge-soft " + meta.badgeStyle : "badge-ghost"
              }`}
            >
              {app.category}
            </span>
          </div>

          {/* App Title & Tagline */}
          <div className="space-y-1.5">
            <h3 className="card-title text-base sm:text-lg font-bold text-base-content group-hover:text-primary transition-colors flex items-center gap-1.5">
              {app.name}
              {isAllowed && (
                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              )}
            </h3>
            <p className="text-xs sm:text-sm text-base-content/70 line-clamp-2 leading-relaxed">
              {app.tagline}
            </p>
          </div>

          {/* Quick Module Tags */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {meta.quickTags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-base-200 text-base-content/70 group-hover:bg-base-300/60 transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button & Status Footer */}
        <div className="mt-6 pt-4 border-t border-base-200 flex items-center justify-between gap-2">
          {isAllowed ? (
            <>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-success">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <span>Siap Akses</span>
              </div>

              <button
                type="button"
                disabled={launching}
                className="btn btn-primary btn-sm rounded-xl font-bold gap-1.5 shadow-sm group-hover:shadow-md transition-all"
              >
                {launching ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    <span>Membuka...</span>
                  </>
                ) : (
                  <>
                    <span>Buka</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-xs font-medium text-base-content/50">
                <Lock className="w-3.5 h-3.5" />
                <span>Perlu Izin Khusus</span>
              </div>

              <button
                type="button"
                disabled
                className="btn btn-ghost btn-sm btn-disabled rounded-xl text-xs"
              >
                Terkunci
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}