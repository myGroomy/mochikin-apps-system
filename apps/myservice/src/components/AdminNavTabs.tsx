"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HardDrives,
  UsersThree,
  Storefront,
  Clock,
  Palette,
} from "@phosphor-icons/react";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/apps", label: "Koneksi", fullLabel: "Koneksi App", icon: HardDrives },
  { href: "/admin/users", label: "User", fullLabel: "Manajemen User", icon: UsersThree },
  { href: "/admin/branches", label: "Cabang", fullLabel: "Manajemen Cabang", icon: Storefront },
  { href: "/admin/shifts", label: "Shift", fullLabel: "Manajemen Shift", icon: Clock },
  { href: "/admin/brand", label: "Brand", fullLabel: "Profil Brand & SaaS", icon: Palette },
];

export function AdminNavTabs() {
  const pathname = usePathname();

  const isItemActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Desktop / Tablet: Button Navigation Bar (Segmented Button Pills) */}
      <div className="hidden md:block border-b border-hairline pb-2">
        <nav
          aria-label="Navigasi admin desktop"
          className="bg-sunken border border-hairline p-1 rounded-xl gap-1.5 inline-flex flex-wrap items-center"
        >
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg inline-flex items-center transition-all cursor-pointer min-h-[38px] ${
                  active
                    ? "bg-surface text-ink shadow-xs border border-hairline/80 font-bold"
                    : "text-ash hover:text-ink hover:bg-surface/60"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${active ? "text-accent" : "text-ash"}`}
                  weight={active ? "fill" : "duotone"}
                />
                <span>{item.fullLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile: Fixed Bottom Navigation Bar (< md) like MyCheck & Stokis */}
      <nav
        data-onboard="admin-bottom-nav"
        aria-label="Navigasi bawah admin"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden"
      >
        <div className="grid h-16 w-full grid-cols-5 items-stretch px-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 text-center transition-colors py-1 cursor-pointer ${
                  active ? "font-bold text-accent" : "text-ash hover:text-ink"
                }`}
              >
                <div
                  className={`flex h-7 w-11 items-center justify-center rounded-full transition-all ${
                    active ? "bg-accent/15 text-accent scale-105" : "text-current"
                  }`}
                >
                  <Icon className="h-4 w-4" weight={active ? "fill" : "duotone"} />
                </div>
                <span className="truncate text-[10px] tracking-tight leading-tight max-w-[62px]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
