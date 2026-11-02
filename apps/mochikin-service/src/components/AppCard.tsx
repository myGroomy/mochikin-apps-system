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
    const returnPath = app.id === "MYCUSTOMER" ? "/app" : "/";
    window.location.href = `/api/auth/handoff?appId=${app.id}&returnPath=${returnPath}`;
  }

  return (
    <>
      <div
        className={`doppel-outer group ${
          isAllowed ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
        }`}
        onClick={isAllowed ? handleLaunch : undefined}
      >
        <div
          className={`doppel-inner p-5 flex flex-col justify-between transition-all duration-150 ${
            isAllowed ? "active:scale-[0.99]" : ""
          }`}
        >
          <div>
            {/* Header with App Icon & Category Badge */}
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-md flex items-center justify-center ${
                  isAllowed ? "bg-accent-wash text-accent" : "bg-sunken text-mist"
                }`}
              >
                <Icon size={20} weight="duotone" />
              </div>
              <span className="inline-flex items-center rounded-full bg-sunken px-2 py-0.5 text-[11px] font-normal text-ash">
                {app.category}
              </span>
            </div>

            {/* App Title & Tagline */}
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-semibold text-ink flex items-center gap-1.5">
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
                  className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-sunken text-ash"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Button & Status Footer */}
          <div className="mt-5 pt-3 border-t border-hairline flex items-center justify-between gap-2">
            {isAllowed ? (
              <>
                <span className="text-[11px] font-medium text-emerald">
                  Siap akses
                </span>

                <button
                  type="button"
                  disabled={launching}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunch();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-accent-deep hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:shadow-sm disabled:opacity-75 whitespace-nowrap"
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
                <div className="flex items-center gap-1 text-[11px] font-normal text-mist">
                  <Lock size={12} weight="bold" />
                  <span>Perlu izin khusus</span>
                </div>

                <span className="text-[11px] text-mist opacity-40">
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
