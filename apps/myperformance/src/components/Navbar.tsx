'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Star,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  RefreshCw,
  LogIn,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { useSession } from '@/components/session/SessionProvider';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { roleMeta } from '@/lib/roles';
import { Logo } from '@/components/Logo';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

const BASE_NAV: NavItem[] = [
  {
    name: 'Beranda',
    href: '/dashboard/me',
    icon: LayoutDashboard,
    description: 'Poin dan riwayat pribadi',
  },
  {
    name: 'Tim',
    href: '/dashboard/team',
    icon: Users,
    description: 'Peringkat dan kontribusi cabang',
  },
  {
    name: 'Evaluasi CARE',
    href: '/scorecards',
    icon: Star,
    description: 'Evaluasi budaya kerja bulanan',
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const { status, authenticated, name, branchName, role, capabilities, refresh } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<Element | null>(null);

  // Team insight is a captain+ capability, so the entry point is not rendered
  // at all for staff instead of leading to a locked page.
  const navItems = BASE_NAV.filter(
    (item) => item.href !== '/dashboard/team' || capabilities.canViewTeamInsights
  );
  const meta = roleMeta(role);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;

    previousFocus.current = document.activeElement;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus();
    };
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  const roleSlot =
    status === 'loading' ? (
      <span className="h-6 w-20 animate-pulse rounded-full bg-base-200" aria-hidden="true" />
    ) : status === 'error' ? (
      <span
        title="Sesi tidak dapat dimuat. Coba segarkan."
        className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-base-content/70"
      >
        <AlertTriangle className="h-3 w-3 text-warning" aria-hidden="true" />
        Sesi gagal
      </span>
    ) : authenticated ? (
      <RoleBadge role={role} />
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-200/70 px-2.5 py-1 text-[11px] font-semibold text-base-content/60">
        <LogIn className="h-3 w-3" aria-hidden="true" />
        Belum masuk
      </span>
    );

  return (
    <>
      {/* Desktop top bar */}
      <nav className="sticky top-0 z-30 hidden border-b border-base-300 bg-base-100 md:block">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="MyPerformance — Beranda">
            <Logo size="sm" />
          </Link>

          <div className="ml-2 flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  aria-current={active ? 'page' : undefined}
                  title={item.description}
                  className={`inline-flex min-h-[40px] items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-base-200 text-base-content'
                      : 'text-base-content/60 hover:bg-base-200/70 hover:text-base-content'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-primary' : ''}`} aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {roleSlot}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Buka menu akun dan navigasi"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-base-300 px-3 text-sm font-medium text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              Menu
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-base-300 bg-base-100 px-3 sm:px-4 md:hidden gap-2">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="MyPerformance — Beranda">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0 justify-end">
          <div className="max-w-[125px] xs:max-w-[150px] truncate">{roleSlot}</div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Buka menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg border border-base-300 text-base-content/70 active:scale-95 transition-transform"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100 safe-bottom md:hidden"
        aria-label="Navigasi utama"
      >
        <div className="grid px-2 py-1.5" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[10px] font-medium transition-colors ${
                  active ? 'bg-base-200/70 text-primary' : 'text-base-content/60 hover:text-base-content'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Account + navigation sheet */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={closeMenu}
            className="absolute inset-0 h-full w-full cursor-default bg-base-content/35"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-menu-title"
            className="absolute right-0 top-0 flex h-full w-[min(21rem,calc(100vw-2.5rem))] flex-col border-l border-base-300 bg-base-100 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
              <h2 id="app-menu-title" className="text-sm font-semibold">
                Akun &amp; navigasi
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={closeMenu}
                aria-label="Tutup menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="border-b border-base-300 px-4 py-4">
              {status === 'loading' ? (
                <div className="space-y-2" aria-hidden="true">
                  <div className="h-4 w-32 animate-pulse rounded bg-base-200" />
                  <div className="h-3 w-44 animate-pulse rounded bg-base-200" />
                </div>
              ) : authenticated ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-base-content">{name ?? 'Pengguna'}</p>
                    <RoleBadge role={role} />
                  </div>
                  <p className="flex items-center gap-1.5 text-[11px] text-base-content/55">
                    <Building2 className="h-3 w-3" aria-hidden="true" />
                    {branchName ?? 'Cabang tidak diketahui'}
                  </p>
                  <p className="text-[11px] leading-relaxed text-base-content/45">{meta.scope}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-base-content">Belum masuk</p>
                  <p className="text-[11px] leading-relaxed text-base-content/55">
                    Buka aplikasi lewat Launcher untuk memuat identitas, poin pribadi, dan akses sesuai peran.
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-base-content/40">
                Navigasi
              </p>
              <div className="space-y-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      prefetch={false}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-[48px] items-center gap-3 rounded-md px-2.5 transition-colors ${
                        active ? 'bg-base-200 text-base-content' : 'text-base-content/70 hover:bg-base-200/60'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? 'text-primary' : ''}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{item.name}</span>
                        <span className="block truncate text-[11px] text-base-content/45">{item.description}</span>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-base-content/25" aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-base-300 p-4">
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-md border border-base-300 text-xs font-semibold text-base-content/65 transition-colors hover:bg-base-200 hover:text-base-content disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                {refreshing ? 'Menyegarkan...' : 'Segarkan sesi'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
