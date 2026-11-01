"use client";

import { useState } from "react";
import { LogOut, Shield, Store, User, LayoutGrid, ChevronDown, Sparkles } from "lucide-react";
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

  const roleNameDisplay = user.role.replace("_", " ");

  return (
    <div className="navbar bg-base-100 border-b border-base-200 sticky top-0 z-50 px-4 sm:px-8 shadow-xs">
      {/* Brand Section */}
      <div className="navbar-start gap-3">
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-content font-black text-xl flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-base-content">
                MOCHIKIN
              </span>
              <span className="badge badge-accent badge-sm font-bold uppercase tracking-wider text-[10px]">
                Services
              </span>
            </div>
            <p className="text-[11px] text-base-content/60 hidden sm:block font-medium">
              Enterprise Identity & Gateway
            </p>
          </div>
        </a>
      </div>

      {/* Middle Pill: Active Branch Indicator */}
      <div className="navbar-center hidden md:flex">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-base-200 border border-base-300 text-xs font-medium">
          <Store className="w-3.5 h-3.5 text-primary" />
          <span className="text-base-content font-semibold">{user.branchName}</span>
          <span className="badge badge-xs badge-neutral font-mono">{user.branchCode}</span>
        </div>
      </div>

      {/* Right User & Actions Section */}
      <div className="navbar-end gap-2">
        {isAdmin && (
          <a
            href="/admin"
            className="btn btn-ghost btn-sm gap-1.5 hidden sm:inline-flex text-xs font-semibold"
          >
            <LayoutGrid className="w-4 h-4 text-primary" />
            <span>System Health</span>
          </a>
        )}

        {/* User Dropdown */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-sm sm:btn-md gap-2 rounded-xl pl-2 pr-2.5 sm:pr-3"
          >
            <div className="avatar placeholder">
              <div className="bg-primary/10 text-primary font-bold rounded-lg w-7 sm:w-8">
                <span>{user.name.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <div className="text-left hidden lg:block leading-tight">
              <div className="text-xs font-bold text-base-content">{user.name}</div>
              <div className="text-[10px] text-base-content/60 capitalize font-medium">
                {roleNameDisplay}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-base-content/40 hidden sm:block" />
          </div>

          <ul
            tabIndex={0}
            className="dropdown-content menu menu-sm bg-base-100 rounded-2xl z-50 mt-3 w-64 p-3 shadow-xl border border-base-200"
          >
            {/* Header in dropdown */}
            <li className="menu-title px-2 py-1.5">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-base-content">{user.name}</span>
                <span className="text-[11px] text-base-content/60 font-mono">@{user.username}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="badge badge-primary badge-xs capitalize font-medium">
                    {roleNameDisplay}
                  </span>
                  <span className="badge badge-outline badge-xs font-mono">
                    {user.branchCode}
                  </span>
                </div>
              </div>
            </li>
            <div className="divider my-1"></div>

            {isAdmin && (
              <li>
                <a href="/admin" className="py-2 text-xs font-medium">
                  <LayoutGrid className="w-4 h-4 text-primary" />
                  System Health & Directory
                </a>
              </li>
            )}

            <li>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="py-2 text-xs font-medium text-error hover:bg-error/10"
              >
                <LogOut className="w-4 h-4" />
                {loggingOut ? "Mengeluarkan..." : "Keluar (Logout)"}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
