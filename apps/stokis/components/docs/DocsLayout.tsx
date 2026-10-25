"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, BookOpen, ArrowLeft, ChevronRight } from "lucide-react";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { DocsTOC } from "@/components/docs/DocsTOC";
import { DocsSearch } from "@/components/docs/DocsSearch";
import { useDocsTOC } from "@/lib/DocsTOCContext";
import { useLanguage } from "@/lib/LanguageContext";
import Link from "next/link";

interface DocsLayoutProps {
  children: React.ReactNode;
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.replace("/docs", "").split("/").filter(Boolean);
  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-base-content/40 min-w-0" aria-label="Breadcrumb">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const label = seg
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        return (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {!isLast && <ChevronRight className="w-3 h-3 text-base-content/20 flex-shrink-0" />}
            <span
              className={`whitespace-normal break-words ${
                isLast
                  ? "text-base-content/70 font-semibold"
                  : "text-base-content/40"
              }`}
            >
              {label}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

export function DocsLayout({ children }: DocsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  const { tocItems } = useDocsTOC();

  return (
    <div className="min-h-[100dvh] bg-base-100">
      {/* Docs top bar */}
      <div className="sticky top-[60px] z-30 bg-base-100/95 backdrop-blur-lg border-b border-base-200/80">
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 h-12 flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-base-200 text-base-content/50 transition-colors flex-shrink-0"
            aria-label="Open sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Link
              href="/docs"
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors flex-shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("Docs", "Docs")}</span>
            </Link>
            <Breadcrumb pathname={pathname} />
          </div>

          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <DocsSearch onClose={() => setSidebarOpen(false)} />
            <Link
              href="/"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-base-content/40 hover:text-base-content/70 hover:bg-base-200 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>{t("Kembali", "Back")}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex max-w-screen-2xl mx-auto">
        <DocsSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 min-w-0 flex">
          <main className="flex-1 min-w-0 px-4 pt-8 pb-24 md:pb-6 sm:px-6 lg:px-10 xl:px-12 max-w-4xl">
            {children}
          </main>
          <DocsTOC items={tocItems} />
        </div>
      </div>
    </div>
  );
}
