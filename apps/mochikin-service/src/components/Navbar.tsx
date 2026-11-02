"use client";

import { useState } from "react";
import {
  LogOut,
  Store,
  ChevronDown,
  LayoutGrid,
  ArrowLeft,
} from "lucide-react";
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
    <header className="navbar bg-white border-b border-gray-200 sticky top-0 z-50 px-4 sm:px-6">
      {/* Brand Section */}
      <div className="navbar-start gap-3">
        <a href="/" className="flex items-center gap-2.5">
          <Logo size="sm" />
        </a>
      </div>

      {/* Middle Pill: Active Branch Indicator */}
      <div className="navbar-center hidden md:flex">
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-gray-100 border border-gray-200 text-xs">
          <Store className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-base-content font-medium">{user.branchName}</span>
          <span className="text-gray-400 font-mono text-[11px]">{user.branchCode}</span>
        </div>
      </div>

      {/* Right User & Actions Section */}
      <div className="navbar-end gap-2">
        {isAdmin && (
          <a
            href="/admin"
            className="btn btn-ghost btn-sm gap-1.5 hidden sm:inline-flex text-xs font-medium rounded-md whitespace-nowrap active:bg-gray-50"
          >
            <LayoutGrid className="w-4 h-4 text-amber-500" />
            <span>Kesehatan sistem</span>
          </a>
        )}

        {/* User Dropdown */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-sm gap-2 rounded-md pl-2 pr-2.5 active:bg-gray-50"
          >
            <div className="avatar placeholder">
              <div className="bg-gray-200 text-gray-600 font-semibold rounded w-6 h-6 text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="text-left hidden lg:block leading-tight">
              <div className="text-xs font-medium text-gray-600">{user.name}</div>
              <div className="text-[11px] text-gray-400 capitalize">
                {roleNameDisplay}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400/50 hidden sm:block" />
          </div>

          <ul
            tabIndex={0}
            className="dropdown-content menu menu-sm bg-white rounded-lg z-50 mt-2 w-60 p-2 shadow-sm border border-gray-200"
          >
            {/* Header in dropdown */}
            <li className="menu-title px-2 py-1.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-gray-600">{user.name}</span>
                <span className="text-[11px] text-gray-400 font-mono">@{user.username}</span>
              </div>
            </li>
            <div className="divider my-1"></div>

            {isAdmin && (
              <li>
                <a
                  href="/admin"
                  className="py-2 text-xs font-medium active:bg-gray-50"
                >
                  <LayoutGrid className="w-4 h-4 text-amber-500" />
                  Kesehatan sistem & direktori
                </a>
              </li>
            )}

            <li>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 active:bg-amber-100 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {loggingOut ? "Mengeluarkan…" : "Keluar (logout)"}
              </button>
            </li>
            {/* Back to Mochikin Service Button */}
            <li>
              <a
                href="/"
                className="py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 active:bg-amber-100 w-full text-left"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Mochikin Service
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
