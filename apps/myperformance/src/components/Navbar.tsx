"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import {
  IconHome,
  IconUsers,
  IconMenu,
  IconX,
  IconChevronDown,
  IconBarChart3,
  IconHelpCircle,
  IconBuilding2,
  IconLogOut,
} from '@/components/icons';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const bottomNavItems: NavItem[] = [
  { name: "Beranda", href: "/dashboard/me", icon: IconHome },
  { name: "Tim", href: "/dashboard/team", icon: IconUsers },
];

const moreMenuItems: NavItem[] = [
  { name: "Analytics", href: "/dashboard/analytics", icon: IconBarChart3 },
  { name: "Panduan", href: "/docs", icon: IconHelpCircle },
  { name: "Cabang", href: "/cabang", icon: IconBuilding2 },
  { name: "Keluar", href: "/logout", icon: IconLogOut },
];

const desktopItems: NavItem[] = [
  { name: "Beranda", href: "/dashboard/me", icon: IconHome },
  { name: "Tim", href: "/dashboard/team", icon: IconUsers },
  { name: "Analytics", href: "/dashboard/analytics", icon: IconBarChart3 },
  { name: "Panduan", href: "/docs", icon: IconHelpCircle },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    setMoreMenuOpen(false);
    router.replace("/logout");
  };

  return (
    <>
      <nav className="hidden md:flex items-center justify-between px-6 py-4 border-b border-base-300 bg-base-200/50 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center text-primary-content text-sm font-bold tracking-tighter">
            MP
          </div>
          <span className="font-semibold text-base-content tracking-tight">MyPerformance</span>
        </div>
        <div className="flex items-center gap-2">
          {desktopItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.name} href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] touch-target ${active
                  ? "bg-primary text-primary-content"
                  : "text-base-content hover:bg-base-200 hover:text-base-content"}`}
                prefetch={false}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMoreMenuOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium text-base-content hover:bg-base-200 hover:text-base-content transition-colors min-h-[44px] touch-target">
            <IconMenu className="w-4 h-4" />
            <span>Lainnya</span>
            <IconChevronDown className="w-3 h-3" />
          </button>
        </div>
      </nav>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-base-300 bg-base-100/90 backdrop-blur-md safe-bottom">
        <div className="flex items-center justify-center gap-1 px-2 py-2">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.name} href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors min-h-[44px] touch-target ${active
                  ? "text-primary bg-base-200/50 rounded-md"
                  : "text-base-content hover:text-base-content hover:bg-base-200/50"}`}
                prefetch={false}
              >
                <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-base-content"}`} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {moreMenuOpen && (
        <>
          <div onClick={() => setMoreMenuOpen(false)} className="fixed inset-0 z-30 bg-base-content/20 backdrop-blur-sm" />
          <div className="fixed top-16 right-4 z-40 w-72 rounded-md border border-base-300 bg-base-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
              <span className="font-semibold text-base-content">Menu</span>
              <button onClick={() => setMoreMenuOpen(false)} className="p-2 rounded-md text-base-content hover:text-base-content hover:bg-base-200 min-h-[44px] min-w-[44px] touch-target">
                <IconX className="w-5 h-5" />
              </button>
            </div>
            <div className="px-3 py-3 max-h-[60vh] overflow-y-auto">
              {moreMenuItems.map((item) => {
                const Icon = item.icon;
                const isLogout = item.href === "/logout";
                const active = isActive(item.href);
                return (
                  <div key={item.name} className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-left transition-colors hover:bg-base-200 min-h-[44px] touch-target">
                    {isLogout ? (
                      <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-left transition-colors hover:bg-base-200/50 min-h-[44px]">
                        <Icon className="w-5 h-5 text-base-content" />
                        <span className="text-sm font-semibold text-base-content">{item.name}</span>
                      </button>
                    ) : (
                      <Link href={item.href} onClick={() => setMoreMenuOpen(false)}
                        className={`flex items-center gap-3 w-full px-3 py-3 rounded-md text-left transition-colors hover:bg-base-200 min-h-[44px] ${active ? "text-primary" : "text-base-content"}`}
                        prefetch={false}
                      >
                        <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-base-content"}`} />
                        <span className={`text-sm font-semibold ${active ? "text-primary" : "text-base-content"}`}>{item.name}</span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
