"use client";

import { useState, useEffect } from "react";
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
import { getClientBrandName, formatAppTitle, DEFAULT_BRAND_NAME } from "@mochikin/shared/sso";

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
    colorStyles: {
      iconBg: string;
      iconHover: string;
    };
  }
> = {
  STOKIS: {
    icon: Package,
    quickTags: ["Input SO", "Laporan Stok", "Audit Shift"],
    colorStyles: {
      iconBg: "bg-blue-50 text-blue-600 border border-blue-200/60",
      iconHover: "group-hover:bg-blue-600 group-hover:text-white",
    },
  },
  MYCHECK: {
    icon: CheckSquare,
    quickTags: ["Checklist Shift", "Insiden Outlet", "Daily Audit"],
    colorStyles: {
      iconBg: "bg-zinc-100 text-zinc-900 border border-zinc-300/80",
      iconHover: "group-hover:bg-zinc-950 group-hover:text-white",
    },
  },
  MYCUSTOMER: {
    icon: Users,
    quickTags: ["Member CRM", "Broadcast Promo", "Poin Loyalitas"],
    colorStyles: {
      iconBg: "bg-slate-100 text-[#0f223d] border border-slate-300/80",
      iconHover: "group-hover:bg-[#0f223d] group-hover:text-white",
    },
  },
  MYPERFORMANCE: {
    icon: TrendUp,
    quickTags: ["Scorecard Tim", "Leaderboard", "Target Omset"],
    colorStyles: {
      iconBg: "bg-[#ecf3df] text-[#4d662c] border border-[#d8e5be]",
      iconHover: "group-hover:bg-[#4d662c] group-hover:text-white",
    },
  },
};

export function AppCard({ app, isAllowed, branchName }: AppCardProps) {
  const [launching, setLaunching] = useState(false);
  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME);

  useEffect(() => {
    setBrandName(getClientBrandName());
  }, []);

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
        <div className="doppel-inner p-3.5 sm:p-5 flex flex-col justify-between min-h-[190px] sm:min-h-[220px]">
          <div>
            {/* Header with App Icon & Category Badge */}
            <div className="flex items-center justify-between mb-2.5 sm:mb-3">
              <div
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
                  isAllowed
                    ? `${meta.colorStyles.iconBg} ${meta.colorStyles.iconHover}`
                    : "bg-sunken text-mist border border-hairline/60"
                }`}
              >
                <Icon size={20} weight="duotone" className="sm:hidden" />
                <Icon size={22} weight="duotone" className="hidden sm:block" />
              </div>
              <span className="inline-flex items-center rounded-full bg-sunken px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[11px] font-medium text-ash border border-hairline/60">
                {app.category}
              </span>
            </div>

            {/* App Title & Tagline */}
            <div className="space-y-0.5 sm:space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-1.5 font-display">
                {formatAppTitle(app.name, brandName)}
              </h3>
              <p className="text-[11px] sm:text-xs text-ash line-clamp-2 leading-relaxed">
                {app.tagline}
              </p>
            </div>

            {/* Quick Module Tags */}
            <div className="mt-2.5 sm:mt-3 flex flex-wrap gap-1">
              {meta.quickTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] sm:text-[10px] font-medium px-1.5 sm:px-2 py-0.5 rounded-md bg-sunken text-ash border border-hairline/40 truncate max-w-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Button & Status Footer */}
          <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-hairline flex items-center justify-between gap-1.5 sm:gap-2">
            {isAllowed ? (
              <>
                <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-semibold text-emerald truncate">
                  <span className="size-1.5 rounded-full bg-emerald inline-block shrink-0" />
                  <span className="truncate">Siap akses</span>
                </span>

                <button
                  type="button"
                  disabled={launching}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunch();
                  }}
                  className="inline-flex min-h-[36px] sm:min-h-[40px] items-center gap-1 sm:gap-1.5 rounded-lg bg-accent px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-white shadow-xs transition-all hover:bg-accent-soft active:scale-95 disabled:opacity-75 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0"
                >
                  {launching ? (
                    <>
                      <QuantumLoaderMini className="text-white" />
                      <span>Membuka…</span>
                    </>
                  ) : (
                    <>
                      <span>Buka</span>
                      <ArrowRight size={12} weight="bold" />
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-mist">
                  <Lock size={12} weight="bold" />
                  <span>Perlu izin</span>
                </div>

                <span className="text-[10px] sm:text-[11px] font-semibold text-mist/60">
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
