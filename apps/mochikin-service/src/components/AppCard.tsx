"use client";

import { useState } from "react";
import {
  Package,
  ClipboardCheck,
  Users,
  TrendingUp,
  ExternalLink,
  Lock,
  ArrowRight,
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
    borderAccent: string;
  }
> = {
  STOKIS: {
    iconBg: "bg-base-200 text-primary",
    iconColor: "text-primary",
    badgeStyle: "badge-neutral",
    quickTags: ["Input SO", "Laporan Stok", "Audit Shift"],
    borderAccent: "hover:border-primary",
  },
  MYCHECK: {
    iconBg: "bg-base-200 text-success",
    iconColor: "text-success",
    badgeStyle: "badge-neutral",
    quickTags: ["Checklist Shift", "Insiden Outlet", "Daily Audit"],
    borderAccent: "hover:border-success",
  },
  MYCUSTOMER: {
    iconBg: "bg-base-200 text-warning",
    iconColor: "text-warning",
    badgeStyle: "badge-neutral",
    quickTags: ["Member CRM", "Broadcast Promo", "Poin Loyalitas"],
    borderAccent: "hover:border-warning",
  },
  MYPERFORMANCE: {
    iconBg: "bg-base-200 text-primary",
    iconColor: "text-primary",
    badgeStyle: "badge-neutral",
    quickTags: ["Scorecard Tim", "Leaderboard", "Target Omset"],
    borderAccent: "hover:border-primary",
  },
};

export function AppCard({ app, isAllowed }: AppCardProps) {
  const [launching, setLaunching] = useState(false);
  const meta = APP_META_EXTRAS[app.id];

  function renderIcon() {
    switch (app.id) {
      case "STOKIS":
        return <Package className="w-5 h-5 text-primary" />;
      case "MYCHECK":
        return <ClipboardCheck className="w-5 h-5 text-success" />;
      case "MYCUSTOMER":
        return <Users className="w-5 h-5 text-warning" />;
      case "MYPERFORMANCE":
        return <TrendingUp className="w-5 h-5 text-primary" />;
    }
  }

  function handleLaunch() {
    if (!isAllowed || launching) return;
    setLaunching(true);
    window.location.href = `/api/auth/handoff?appId=${app.id}&returnPath=/`;
  }

  return (
    <div
      className={`card bg-base-100 border border-base-300 rounded-lg p-5 flex flex-col justify-between transition-colors transition-transform duration-150 ${
        isAllowed
          ? `${meta.borderAccent} cursor-pointer active:scale-[0.99]`
          : "opacity-60 bg-base-200/50 cursor-not-allowed"
      }`}
      onClick={isAllowed ? handleLaunch : undefined}
    >
      <div>
        {/* Header with App Icon & Category Badge */}
        <div className="flex items-center justify-between mb-3">
          <div
            className={`w-10 h-10 rounded-md flex items-center justify-center ${
              isAllowed ? meta.iconBg : "bg-base-200 text-base-content/40"
            }`}
          >
            {renderIcon()}
          </div>
          <span className="badge badge-sm badge-ghost text-[11px] font-normal">
            {app.category}
          </span>
        </div>

        {/* App Title & Tagline */}
        <div className="space-y-1">
          <h3 className="card-title text-sm sm:text-base font-semibold text-base-content flex items-center gap-1.5">
            {app.name}
            {isAllowed && (
              <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
            )}
          </h3>
          <p className="text-xs text-base-content/70 line-clamp-2 leading-relaxed">
            {app.tagline}
          </p>
        </div>

        {/* Quick Module Tags */}
        <div className="mt-3 flex flex-wrap gap-1">
          {meta.quickTags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-base-200 text-base-content/70"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Action Button & Status Footer */}
      <div className="mt-5 pt-3 border-t border-base-200 flex items-center justify-between gap-2">
        {isAllowed ? (
          <>
            <span className="text-[11px] font-medium text-success">
              Siap akses
            </span>

            <button
              type="button"
              disabled={launching}
              className="btn btn-primary btn-xs rounded font-medium gap-1 whitespace-nowrap active:scale-95 disabled:opacity-50"
            >
              {launching ? (
                <>
                  <span className="loading loading-spinner loading-xs" />
                  <span>Membuka…</span>
                </>
              ) : (
                <>
                  <span>Buka</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 text-[11px] font-normal text-base-content/50">
              <Lock className="w-3 h-3" />
              <span>Perlu izin khusus</span>
            </div>

            <button
              type="button"
              disabled
              className="btn btn-ghost btn-xs btn-disabled text-[11px] opacity-40 cursor-not-allowed"
            >
              Terkunci
            </button>
          </>
        )}
      </div>
    </div>
  );
}
