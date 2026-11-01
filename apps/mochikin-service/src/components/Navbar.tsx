"use client";

import { useState } from "react";
import { LogOut, Shield, Store, User, LayoutGrid } from "lucide-react";
import type { ServicesUserSession } from "@/lib/auth";

interface NavbarProps {
  user: ServicesUserSession;
  isAdmin?: boolean;
}

export function Navbar({ user, isAdmin }: NavbarProps) {
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white font-black text-xl shadow-sm shadow-amber-500/20">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                Mochikin Services
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Gateway
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Central Identity & Single Sign-On Hub
            </p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Branch Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100/80 text-xs text-slate-700 font-medium border border-slate-200/60">
            <Store className="h-3.5 w-3.5 text-slate-500" />
            <span>{user.branchName}</span>
            <span className="text-[10px] text-slate-400 font-mono">({user.branchCode})</span>
          </div>

          {/* Role Pill */}
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-xs text-blue-700 font-medium border border-blue-200/60">
            <Shield className="h-3 w-3 text-blue-500" />
            <span className="capitalize">{user.role.replace("_", " ")}</span>
          </div>

          {/* Admin link if role_admin or super_admin */}
          {isAdmin && (
            <a
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">System Health</span>
            </a>
          )}

          {/* User profile dropdown / pill */}
          <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-semibold text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-none">
                {user.name}
              </div>
              <div className="text-[10px] text-slate-500 leading-none mt-1">
                @{user.username}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Keluar dari sistem"
              className="ml-1 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
