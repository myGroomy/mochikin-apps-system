"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Lightning,
  Trophy,
  Star,
  ShieldCheck,
  List,
  Storefront,
  ArrowClockwise,
  House,
  DotOutline,
  X,
  DotsThree,
  SignOut,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { useSession } from "@/components/session/SessionProvider";

const SERVICE_URL =
  process.env.NEXT_PUBLIC_SERVICE_URL ||
  process.env.NEXT_PUBLIC_LAUNCHER_URL ||
  "http://localhost:3000";

async function handleLogout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore
  }
  window.location.href = "/";
}
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/me", icon: Lightning, label: "Poin Saya", badge: "Live" },
  { href: "/dashboard/team", icon: Trophy, label: "Leaderboard Tim" },
  { href: "/scorecards", icon: Star, label: "CARE Scorecard" },
  {
    href: "/scorecards/manage",
    icon: ShieldCheck,
    label: "Kelola Sesi",
    adminOnly: true,
  },
];

function NavLink({
  href,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/dashboard/me" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm transition-all duration-300 active:scale-[0.98]",
        isActive
          ? "bg-white font-semibold text-accent shadow-[0_2px_8px_-4px_rgba(67,56,202,0.35)] ring-1 ring-hairline"
          : "text-ash hover:bg-sunken hover:text-ink font-medium"
      )}
    >
      <div className="flex items-center gap-3">
        {isActive && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
        )}
        <Icon
          size={20}
          weight={isActive ? "fill" : "regular"}
          className={cn(
            "transition-colors",
            isActive ? "text-accent" : "text-mist group-hover:text-ink"
          )}
        />
        <span>{label}</span>
      </div>

      {badge ? (
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
            isActive
              ? "bg-accent/10 text-accent"
              : "bg-emerald/10 text-emerald border border-emerald/20"
          )}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function Sidebar({
  name,
  role,
  canManage,
  onRefresh,
}: {
  name?: string | null;
  role: string;
  canManage: boolean;
  onRefresh: () => void;
}) {
  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || canManage);

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col p-4 md:flex">
      <div className="doppel-outer flex-1 rounded-[2rem]">
        <div className="doppel-inner flex h-full flex-col justify-between rounded-[calc(2rem-0.375rem)]">
          {/* Header Brand */}
          <div className="flex flex-col gap-6 p-5">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/me" className="hover:opacity-90 transition-opacity">
                <Logo size="md" />
              </Link>
            </div>

            {/* Navigation links */}
            <nav className="flex flex-col gap-1">
              {visibleNav.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>
          </div>

          {/* Footer Card */}
          <div className="border-t border-hairline p-5 space-y-3">
            {name && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-ink">
                      {name}
                    </div>
                    <div className="mt-0.5">
                      <RoleBadge role={role} size="sm" />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onRefresh}
                  title="Perbarui data sesi"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-ash hover:bg-sunken hover:text-ink transition-colors active:scale-95"
                >
                  <ArrowClockwise size={15} weight="bold" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <a
                href="/api/auth/sso/back-to-portal"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-sunken/40 px-2 py-2 text-xs font-semibold text-ash transition-colors hover:bg-sunken hover:text-ink"
                title="Kembali ke Portal Mochikin"
              >
                <House size={14} weight="bold" />
                <span className="truncate">Portal</span>
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-sunken/40 px-2 py-2 text-xs font-semibold text-ash transition-colors hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 dark:hover:bg-rose-950/20"
                title="Keluar dari akun"
              >
                <SignOut size={14} weight="bold" />
                <span className="truncate">{name || "Keluar"}</span>
              </button>
            </div>

            <div className="text-[11px] text-mist">MYPERFORMANCE v2.0</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({ canManage }: { canManage: boolean }) {
  const pathname = usePathname();
  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || canManage);

  return (
    <nav className="fixed inset-x-4 bottom-4 z-50 md:hidden">
      <div className="doppel-outer rounded-[1.75rem]">
        <div className="doppel-inner flex h-16 items-center justify-around rounded-[calc(1.75rem-0.375rem)] px-2">
          {visibleNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard/me" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1.5 transition-all duration-300 active:scale-[0.95]",
                  isActive ? "text-white" : "text-mist"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                    isActive ? "bg-accent" : ""
                  )}
                >
                  <item.icon
                    size={20}
                    weight={isActive ? "fill" : "regular"}
                    className={isActive ? "text-white" : "text-mist"}
                  />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium truncate max-w-[70px]",
                    isActive ? "text-accent font-semibold" : "text-ash"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { name, branchName, role, capabilities, refresh } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  // If on Landing Page root `/`, do not wrap in app sidebar/header
  if (pathname === "/") {
    return <>{children}</>;
  }

  const canManage =
    capabilities?.canManageScorecards ??
    (role === "role_admin" || role === "super_admin");

  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || canManage);

  return (
    <div className="sky-hero grain relative min-h-[100dvh] md:pl-64 flex flex-col">
      {/* Sticky Top Header on ALL screens (desktop & mobile) */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Left: Brand Icon on mobile, App Title on desktop */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 md:hidden">
              <Link href="/dashboard/me" className="flex items-center gap-2">
                <Logo size="sm" iconOnly />
                <span className="text-sm font-bold tracking-tight text-ink">
                  MYPERFORMANCE
                </span>
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/dashboard/me"
                className="flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                <span className="text-sm font-bold tracking-tight text-ink">
                  MYPERFORMANCE
                </span>
                <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent uppercase">
                  Pro
                </span>
              </Link>
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-hairline">
                <DotOutline
                  size={16}
                  weight="fill"
                  className="text-emerald shrink-0"
                />
                <span className="text-xs font-semibold text-emerald">Online</span>
              </div>
            </div>
          </div>

          {/* Right: Branch Pill, Profile Badge, Mobile Menu Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 items-center gap-1.5 rounded-full border border-hairline bg-sunken/80 px-3">
              <Storefront
                size={14}
                weight="duotone"
                className="text-accent shrink-0"
              />
              <span className="max-w-[110px] sm:max-w-[170px] truncate text-xs font-semibold text-ink">
                {branchName || "Cabang Utama"}
              </span>
            </div>

            {name && (
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-hairline bg-white px-2.5 py-1 shadow-2xs">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-ink max-w-[110px] truncate">
                  {name}
                </span>
                <RoleBadge role={role} size="sm" />
              </div>
            )}

            {/* Mobile Hamburg Menu Button */}
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              className="flex h-9 w-9 md:hidden items-center justify-center rounded-lg border border-hairline bg-white text-ink transition-all hover:bg-sunken active:scale-95"
            >
              {mobileOpen ? (
                <X size={18} weight="bold" />
              ) : (
                <List size={20} weight="bold" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Fixed Floating Sidebar */}
      <Sidebar
        name={name}
        role={role}
        canManage={canManage}
        onRefresh={() => void refresh()}
      />

      {/* Main Page Content Body */}
      <main className="relative flex-1 pb-28 md:pb-10 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Floating Bottom Dock */}
      <BottomNav canManage={canManage} />

      {/* Mobile Hamburg Sheet Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-5 bg-canvas">
          <SheetHeader className="p-0 pb-4 text-left">
            <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-full justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <Logo size="sm" />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ash hover:bg-sunken hover:text-ink"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {visibleNav.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </nav>
            </div>

            <div className="border-t border-hairline pt-4 space-y-3">
              {name && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-ink truncate">
                      {name}
                    </div>
                    <RoleBadge role={role} size="sm" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/api/auth/sso/back-to-portal"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-white px-2 py-2 text-xs font-semibold text-ash hover:bg-sunken hover:text-ink"
                  title="Kembali ke Portal Mochikin"
                >
                  <House size={14} weight="bold" />
                  <span className="truncate">Portal</span>
                </a>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-white px-2 py-2 text-xs font-semibold text-ash hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 dark:hover:bg-rose-950/20"
                  title="Keluar dari akun"
                >
                  <SignOut size={14} weight="bold" />
                  <span className="truncate">{name || "Keluar"}</span>
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
