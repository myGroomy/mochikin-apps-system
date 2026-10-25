"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSessionSync } from "@/hooks/useSessionSync";
import { FeatureSettingsProvider } from "@/components/layout/FeatureSettingsProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  useSessionSync();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMobile();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const firstFocusable = sidebarRef.current?.querySelector<HTMLElement>(
      "a[href], button:not([disabled])"
    );
    firstFocusable?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, closeMobile]);

  return (
    <FeatureSettingsProvider>
      <div className="flex h-screen overflow-hidden bg-canvas">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-lg focus:border focus:border-hairline focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ink"
        >
          Skip to main content
        </a>

        <Sidebar
          ref={sidebarRef}
          isMobileOpen={mobileOpen}
          onMobileClose={closeMobile}
        />

        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
            onClick={closeMobile}
            aria-label="Close navigation menu"
            tabIndex={-1}
          />
        )}

        <div className="flex flex-col flex-1 min-w-0">
          <Header
            menuButtonRef={menuButtonRef}
            mobileOpen={mobileOpen}
            onMenuClick={() => setMobileOpen(true)}
          />

          <ScrollArea className="flex-1">
            <main
              id="main-content"
              tabIndex={-1}
              className="mx-auto w-full max-w-7xl px-4 py-6 outline-none sm:px-6 lg:px-8"
            >
              {children}
            </main>
          </ScrollArea>
        </div>
      </div>
    </FeatureSettingsProvider>
  );
}
