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

const NAV_ITEMS = [
  { href: "/admin/apps", label: "Koneksi App", icon: HardDrives },
  { href: "/admin/users", label: "Manajemen User", icon: UsersThree },
  { href: "/admin/branches", label: "Manajemen Cabang", icon: Storefront },
  { href: "/admin/shifts", label: "Manajemen Shift", icon: Clock },
  { href: "/admin/brand", label: "Profil Brand & SaaS", icon: Palette },
];

export function AdminNavTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-hairline pb-2.5 overflow-x-auto no-scrollbar">
      <nav className="bg-sunken border border-hairline p-1 rounded-xl gap-1.5 h-auto inline-flex flex-nowrap min-w-full sm:min-w-0">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg inline-flex items-center transition-all whitespace-nowrap min-h-[38px] ${
                isActive
                  ? "bg-surface text-ink shadow-xs border border-hairline/60"
                  : "text-ash hover:text-ink hover:bg-surface/50"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${isActive ? "text-accent" : "text-ash"}`}
                weight={isActive ? "fill" : "duotone"}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
