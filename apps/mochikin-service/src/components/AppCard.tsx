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
  Loader2,
} from "lucide-react";
import type { EcosystemAppMeta } from "@/lib/constants";

interface AppCardProps {
  app: EcosystemAppMeta;
  isAllowed: boolean;
  userRole: string;
}

const APP_THEMES: Record<
  EcosystemAppMeta["id"],
  {
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    btnClass: string;
  }
> = {
  STOKIS: {
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    borderColor: "hover:border-blue-300",
    btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
  },
  MYCHECK: {
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    borderColor: "hover:border-emerald-300",
    btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
  },
  MYCUSTOMER: {
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    borderColor: "hover:border-amber-300",
    btnClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
  },
  MYPERFORMANCE: {
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-600",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-700",
    borderColor: "hover:border-indigo-300",
    btnClass: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20",
  },
};

export function AppCard({ app, isAllowed }: AppCardProps) {
  const [launching, setLaunching] = useState(false);
  const theme = APP_THEMES[app.id];

  function renderIcon() {
    switch (app.id) {
      case "STOKIS":
        return <Package className={`h-6 w-6 ${theme.iconColor}`} />;
      case "MYCHECK":
        return <ClipboardCheck className={`h-6 w-6 ${theme.iconColor}`} />;
      case "MYCUSTOMER":
        return <Users className={`h-6 w-6 ${theme.iconColor}`} />;
      case "MYPERFORMANCE":
        return <TrendingUp className={`h-6 w-6 ${theme.iconColor}`} />;
    }
  }

  function handleLaunch() {
    if (!isAllowed || launching) return;
    setLaunching(true);
    window.location.href = `/api/auth/handoff?appId=${app.id}&returnPath=/`;
  }

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 ${
        isAllowed
          ? `${theme.borderColor} hover:shadow-md cursor-pointer`
          : "opacity-60 bg-slate-50/70 border-slate-200"
      }`}
      onClick={isAllowed ? handleLaunch : undefined}
    >
      <div>
        {/* Card Header: Icon & Category Tag */}
        <div className="flex items-center justify-between mb-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              isAllowed ? theme.iconBg : "bg-slate-200"
            }`}
          >
            {renderIcon()}
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isAllowed
                ? `${theme.badgeBg} ${theme.badgeText}`
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {app.category}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-slate-800 transition-colors">
          {app.name}
        </h3>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
          {app.tagline}
        </p>
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        {isAllowed ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Siap Digunakan
            </span>
            <button
              type="button"
              disabled={launching}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all ${theme.btnClass}`}
            >
              {launching ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Membuka...
                </>
              ) : (
                <>
                  Buka Aplikasi
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              Perlu Izin Khusus
            </span>
            <button
              type="button"
              disabled
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 bg-slate-100 cursor-not-allowed"
            >
              Terkunci
            </button>
          </>
        )}
      </div>
    </div>
  );
}
