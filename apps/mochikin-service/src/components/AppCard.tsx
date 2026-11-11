"use client";

import { useState } from "react";
import {
  Package,
  CheckSquare,
  Users,
  TrendUp,
  Lock,
  ArrowRight,
} from "@phosphor-icons/react";
import type { EcosystemAppMeta } from "@/lib/constants";
import { QuantumLoaderMini, SsoLaunchingOverlay } from "@/components/ui/QuantumLoader";

interface AppCardProps {
  app: EcosystemAppMeta;
  isAllowed: boolean;
  userRole: string;
  branchName?: string;
}

const APP_META_EXTRAS: Record<
  EcosystemAppMeta["id"],
  {
    icon: React.ElementType;
    quickTags: string[];
  }
> = {
  STOKIS: {
    icon: Package,
    quickTags: ["Input SO", "Laporan Stok", "Audit Shift"],
  },
  MYCHECK: {
    icon: CheckSquare,
    quickTags: ["Checklist Shift", "Insiden Outlet", "Daily Audit"],
  },
  MYCUSTOMER: {
    icon: Users,
    quickTags: ["Member CRM", "Broadcast Promo", "Poin Loyalitas"],
  },
  MYPERFORMANCE: {
    icon: TrendUp,
    quickTags: ["Scorecard Tim", "Leaderboard", "Target Omset"],
  },
};

export function AppCard({ app, isAllowed, branchName }: AppCardProps) {
  const [launching, setLaunching] = useState(false);
  const meta = APP_META_EXTRAS[app.id];
  const Icon = meta.icon;

  function handleLaunch() {
    if (!isAllowed || launching) return;
    setLaunching(true);
    const returnPathMap: Record<string, string> = {
      STOKIS: "/",
      MYCHECK: "/",
      MYCUSTOMER: "/app",
      MYPERFORMANCE: "/dashboard/me",
    };
    const returnPath = returnPathMap[app.id] || "/";
    window.location.href = `/api/auth/handoff?appId=${app.id}&returnPath=${returnPath}`;
  }

  return (
    <>
      <div
        className={`doppel-outer group transition-transform ${
          isAllowed ? "cursor-pointer active:scale-[0.98]" : "opacity-60 cursor-not-allowed"
        }`}
        onClick={isAllowed ? handleLaunch : undefined}
      >
        <div className="doppel-inner p-4 sm:p-5 flex flex-col justify-between min-h-[190px] sm:min-h-[220px]">
          <div>
            {/* Header with App Icon & Category Badge */}
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  isAllowed ? "bg-accent-wash text-accent group-hover:bg-accent group-hover:text-white" : "bg-sunken text-mist"
                }`}
              >
                <Icon size={22} weight="duotone" />
              </div>
              <span className="inline-flex items-center rounded-full bg-sunken px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-ash border border-hairline/60">
                {app.category}
              </span>
            </div>

            {/* App Title & Tagline */}
            <div className="space-y-1">
              <h3 className="text-base font-bold text-ink flex items-center gap-1.5 font-display">
                {app.name}
              </h3>
              <p className="text-xs text-ash line-clamp-2 leading-relaxed">
                {app.tagline}
              </p>
            </div>

            {/* Quick Module Tags */}
            <div className="mt-3 flex flex-wrap gap-1">
              {meta.quickTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-sunken text-ash border border-hairline/40"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Button & Status Footer */}
          <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between gap-2">
            {isAllowed ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald">
                  <span className="size-1.5 rounded-full bg-emerald inline-block" />
                  <span>Siap akses</span>
                </span>

                <button
                  type="button"
                  disabled={launching}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunch();
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-accent-soft active:scale-95 disabled:opacity-75 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {launching ? (
                    <>
                      <QuantumLoaderMini className="text-white" />
                      <span>Membuka…</span>
                    </>
                  ) : (
                    <>
                      <span>Buka</span>
                      <ArrowRight size={13} weight="bold" />
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 text-[11px] font-medium text-mist">
                  <Lock size={13} weight="bold" />
                  <span>Perlu izin</span>
                </div>

                <span className="text-[11px] font-semibold text-mist/60">
                  Terkunci
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SSO Quantum Transition Overlay */}
      <SsoLaunchingOverlay
        isOpen={launching}
        appName={app.name}
        category={app.category}
        branchName={branchName}
      />
    </>
  );
}
