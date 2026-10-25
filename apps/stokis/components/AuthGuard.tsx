"use client";

import React, { useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import LoginPage from "@/app/login/page";

const PUBLIC_PATHS = ["/login", "/"];
const PUBLIC_PREFIXES = ["/docs", "/laporan/view"];
const ADMIN_ONLY_PATHS = ["/master-item", "/petugas", "/cabang"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
  }, []);

  useEffect(() => {
    if (!mounted.current || loading) return;

    if (pathname === "/login" && user) {
      router.replace("/");
      return;
    }

    if (user && !isAdmin && ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
      router.replace("/");
    }
  }, [loading, user, isAdmin, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Stokis"
            className="w-12 h-12 rounded-lg shadow-sm object-cover animate-pulse"
          />
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (pathname === "/login" && user) {
      return null;
    }
    return <>{children}</>;
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!isAdmin && ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return <>{children}</>;
}
