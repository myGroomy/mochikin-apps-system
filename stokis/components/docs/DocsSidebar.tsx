"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import {
  BookOpen,
  Rocket,
  Users,
  Layers,
  Code2,
  AlertTriangle,
  HelpCircle,
  FileText,
  ChevronDown,
  X,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SidebarItem {
  label: string;
  labelEn?: string;
  href: string;
  icon?: LucideIcon;
  children?: SidebarItem[];
}

interface SidebarGroup {
  label: string;
  labelEn?: string;
  items: SidebarItem[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    label: "Memulai",
    labelEn: "Getting Started",
    items: [
      { label: "Introduction", href: "/docs/introduction", icon: BookOpen },
      { label: "Getting Started", href: "/docs/getting-started", icon: Rocket },
    ],
  },
  {
    label: "Panduan Pengguna",
    labelEn: "User Guide",
    items: [
      {
        label: "User Guide",
        href: "/docs/user-guide",
        icon: Users,
        children: [
          { label: "Stock Opname (SO)", href: "/docs/user-guide/stock-opname" },
          { label: "Laporan", href: "/docs/user-guide/laporan" },
          { label: "Dashboard", href: "/docs/user-guide/dashboard" },
          { label: "Master Item", href: "/docs/user-guide/master-item" },
          { label: "Cabang", href: "/docs/user-guide/cabang" },
          { label: "Petugas", href: "/docs/user-guide/petugas" },
        ],
      },
    ],
  },
  {
    label: "Referensi",
    labelEn: "Reference",
    items: [
      { label: "Product & System", href: "/docs/product", icon: Layers },
      { label: "Developer Docs", href: "/docs/developer", icon: Code2 },
      { label: "Troubleshooting", href: "/docs/troubleshooting", icon: AlertTriangle },
      { label: "FAQ", href: "/docs/faq", icon: HelpCircle },
      { label: "Changelog", href: "/docs/changelog", icon: FileText },
    ],
  },
];

interface DocsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocsSidebar({ isOpen, onClose }: DocsSidebarProps) {
  const pathname = usePathname();
  const { lang, t } = useLanguage();

  const findActiveGroup = (): string | null => {
    for (const group of sidebarGroups) {
      for (const item of group.items) {
        if (
          item.children?.some(
            (child) => pathname === child.href || pathname.startsWith(child.href + "/")
          ) ||
          pathname === item.href ||
          pathname.startsWith(item.href + "/")
        ) {
          return group.label;
        }
      }
    }
    return null;
  };

  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    const active = findActiveGroup();
    return active ? [active] : [sidebarGroups[0].label];
  });

  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const expanded: string[] = [];
    for (const group of sidebarGroups) {
      for (const item of group.items) {
        if (item.children?.some(
          (child) => pathname === child.href || pathname.startsWith(child.href + "/")
        )) {
          expanded.push(item.href);
        }
      }
    }
    return expanded;
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const toggleItem = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === "/docs") return pathname === "/docs";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 sm:w-64 bg-base-100 border-r border-base-200 transform transition-transform duration-200 ease-out lg:sticky lg:top-[101px] lg:h-[calc(100dvh-101px)] lg:z-10 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-base-200">
          <span className="text-sm font-bold text-base-content flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            {t("Dokumentasi", "Documentation")}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-base-200 text-base-content/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="p-3 space-y-4 overflow-y-auto h-[calc(100%-52px)] lg:h-full lg:pt-4">
          {/* Docs home link */}
          <Link
            href="/docs"
            onClick={onClose}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              pathname === "/docs"
                ? "bg-primary/10 text-primary"
                : "text-base-content/60 hover:bg-base-200 hover:text-base-content"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{t("Overview", "Overview")}</span>
          </Link>

          {/* Groups */}
          {sidebarGroups.map((group) => {
            const isGroupExpanded = expandedGroups.includes(group.label);
            return (
              <div key={group.label}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-base-content/35 hover:text-base-content/50 transition-colors"
                >
                  <span>{lang === "en" && group.labelEn ? group.labelEn : group.label}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      isGroupExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Group items */}
                {isGroupExpanded && (
                  <div className="space-y-0.5 mt-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const hasChildren = item.children && item.children.length > 0;
                      const active = isActive(item.href);
                      const itemExpanded = expandedItems.includes(item.href);

                      if (hasChildren) {
                        return (
                          <div key={item.href}>
                            <button
                              onClick={() => toggleItem(item.href)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                active
                                  ? "bg-primary/10 text-primary"
                                  : "text-base-content/60 hover:bg-base-200 hover:text-base-content"
                              }`}
                            >
                              {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                              <span className="flex-1 text-left">
                                {lang === "en" && item.labelEn ? item.labelEn : item.label}
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                  itemExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                            {itemExpanded && (
                              <div className="ml-4 pl-3 border-l border-base-200 space-y-0.5 mt-0.5 mb-1">
                                {item.children!.map((child) => {
                                  const childActive = isActive(child.href);
                                  return (
                                    <Link
                                      key={child.href}
                                      href={child.href}
                                      onClick={onClose}
                                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                        childActive
                                          ? "bg-primary/10 text-primary font-semibold"
                                          : "text-base-content/50 hover:bg-base-200 hover:text-base-content"
                                      }`}
                                    >
                                      <span
                                        className={`w-1 h-1 rounded-full flex-shrink-0 ${
                                          childActive ? "bg-primary" : "bg-base-content/20"
                                        }`}
                                      />
                                      <span>
                                        {lang === "en" && child.labelEn
                                          ? child.labelEn
                                          : child.label}
                                      </span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-base-content/60 hover:bg-base-200 hover:text-base-content"
                          }`}
                        >
                          {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                          <span>
                            {lang === "en" && item.labelEn ? item.labelEn : item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
