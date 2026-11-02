"use client";

import { useState } from "react";
import { LogOut, Store, ChevronDown, LayoutGrid } from "lucide-react";
import type { ServicesUserSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";

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
    <header className="navbar bg-base-100 border-b border-base-300 sticky top-0 z-50 px-4 sm:px-6">
      {/* Brand Section */}
      <div className="navbar-start gap-3">
        <a href="/" className="flex items-center gap-2.5">
          <Logo size="sm" />
        </a>
      </div>

      {/* Middle Pill: Active Branch Indicator */}
      <div className="navbar-center hidden md:flex">
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-base-200 border border-base-300 text-xs">
          <Store className="w-3.5 h-3.5 text-primary" />
          <span className="text-base-content font-medium">{user.branchName}</span>
          <span className="text-base-content/60 font-mono text-[11px]">{user.branchCode}</span>
        </div>
      </div>

      {/* Right User & Actions Section */}
      <div className="navbar-end gap-2">
        {isAdmin && (
          <a
            href="/admin"
            className="btn btn-ghost btn-sm gap-1.5 hidden sm:inline-flex text-xs font-medium rounded-md whitespace-nowrap active:bg-base-200"
          >
            <LayoutGrid className="w-4 h-4 text-primary" />
            <span>Kesehatan sistem</span>
          </a>
        )}

        {/* User Dropdown */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-sm gap-2 rounded-md pl-2 pr-2.5 active:bg-base-200"
          >
            <div className="avatar placeholder">
              <div className="bg-base-300 text-base-content font-semibold rounded w-6 h-6 text-xs">
                <span>{user.name.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <div className="text-left hidden lg:block leading-tight">
              <div className="text-xs font-medium text-base-content">{user.name}</div>
              <div className="text-[11px] text-base-content/60 capitalize">
                {roleNameDisplay}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-base-content/50 hidden sm:block" />
          </div>

          <ul
            tabIndex={0}
            className="dropdown-content menu menu-sm bg-base-100 rounded-lg z-50 mt-2 w-60 p-2 shadow-sm border border-base-300"
          >
            {/* Header in dropdown */}
            <li className="menu-title px-2 py-1.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-base-content">{user.name}</span>
                <span className="text-[11px] text-base-content/60 font-mono">@{user.username}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="badge badge-sm badge-neutral capitalize font-normal text-[11px]">
                    {roleNameDisplay}
                  </span>
                  <span className="badge badge-sm badge-ghost font-mono text-[11px]">
                    {user.branchCode}
                  </span>
                </div>
              </div>
            </li>
            <div className="divider my-1"></div>

            {isAdmin && (
              <li>
                <a href="/admin" className="py-2 text-xs font-medium active:bg-base-200">
                  <LayoutGrid className="w-4 h-4 text-primary" />
                  Kesehatan sistem & direktori
                </a>
              </li>
            )}

            <li>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="py-2 text-xs font-medium text-error hover:bg-error/10 active:bg-error/20 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {loggingOut ? "Mengeluarkan…" : "Keluar (logout)"}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
