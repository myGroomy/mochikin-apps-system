"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HardDrives,
  UsersThree,
  Storefront,
  Clock,
  Palette,
} from "@phosphor-icons/react";
import { QuantumLoader, QuantumLoaderMini } from "@/components/ui/QuantumLoader";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/apps", label: "Koneksi", fullLabel: "Koneksi App", icon: HardDrives },
  { href: "/admin/users", label: "User", fullLabel: "Manajemen User", icon: UsersThree },
  { href: "/admin/branches", label: "Cabang", fullLabel: "Manajemen Cabang", icon: Storefront },
  { href: "/admin/shifts", label: "Shift", fullLabel: "Manajemen Shift", icon: Clock },
  { href: "/admin/brand", label: "Brand", fullLabel: "Profil Brand & SaaS", icon: Palette },
];

export function AdminNavTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const isItemActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (isItemActive(href)) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const pendingItem = ADMIN_NAV_ITEMS.find((i) => i.href === pendingHref);

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
            const isLoadingThis = isPending && pendingHref === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(item.href, e)}
                aria-current={active ? "page" : undefined}
                className={`gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg inline-flex items-center transition-all cursor-pointer min-h-[38px] ${
                  active
                    ? "bg-surface text-ink shadow-xs border border-hairline/80 font-bold"
                    : "text-ash hover:text-ink hover:bg-surface/60"
                }`}
              >
                {isLoadingThis ? (
                  <QuantumLoaderMini className="text-accent" />
                ) : (
                  <Icon
                    className={`w-4 h-4 ${active ? "text-accent" : "text-ash"}`}
                    weight={active ? "fill" : "duotone"}
                  />
                )}
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
            const isLoadingThis = isPending && pendingHref === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(item.href, e)}
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
                  {isLoadingThis ? (
                    <QuantumLoaderMini className="text-accent" />
                  ) : (
                    <Icon className="h-4 w-4" weight={active ? "fill" : "duotone"} />
                  )}
                </div>
                <span className="truncate text-[10px] tracking-tight leading-tight max-w-[62px]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Quantum Loader Tab Transition Modal/Overlay */}
      {isPending && pendingHref && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="status"
          aria-live="polite"
        >
          <div className="doppel-outer max-w-xs w-full shadow-2xl rounded-2xl">
            <div className="doppel-inner p-6 flex flex-col items-center justify-center text-center space-y-3.5 rounded-[calc(1rem-2px)]">
              <QuantumLoader size="sm" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-ink">
                  Membuka {pendingItem?.fullLabel || "Modul"}...
                </p>
                <p className="text-[11px] text-ash">
                  Sinkronisasi modul dan data ekosistem
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
