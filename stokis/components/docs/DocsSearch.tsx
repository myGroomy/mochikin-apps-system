"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, FileText } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

interface SearchEntry {
  title: string;
  titleEn?: string;
  href: string;
  keywords: string[];
  description?: string;
  descriptionEn?: string;
}

const searchEntries: SearchEntry[] = [
  {
    title: "Introduction",
    href: "/docs/introduction",
    keywords: ["apa itu", "stokis", "overview", "produk", "masalah", "solusi"],
    description: "Tentang Stokis dan apa yang diselesaikannya",
  },
  {
    title: "Getting Started",
    href: "/docs/getting-started",
    keywords: ["install", "setup", "persiapan", "requirements", "quick start", "mulai"],
    description: "Cara memulai menggunakan Stokis",
  },
  {
    title: "Stock Opname (SO)",
    href: "/docs/user-guide/stock-opname",
    keywords: ["so", "stock opname", "input", "hitung", "s1", "s2", "form", "step", "cabang", "shift", "popup", "gate"],
    description: "Cara mengisi form Stock Opname",
  },
  {
    title: "Laporan",
    href: "/docs/user-guide/laporan",
    keywords: ["laporan", "report", "viewer", "lihat", "read-only", "xlsx", "pdf", "excel", "whatsapp", "share", "bagikan"],
    description: "Melihat dan membagikan laporan",
  },
  {
    title: "Dashboard",
    href: "/docs/user-guide/dashboard",
    keywords: ["dashboard", "analitik", "harian", "mingguan", "grafik", "chart"],
    description: "Dashboard analitik harian dan mingguan",
  },
  {
    title: "Master Item",
    href: "/docs/user-guide/master-item",
    keywords: ["master item", "barang", "threshold", "item", "stok minimum", "kategori", "area", "desimal", "0,5"],
    description: "Mengelola daftar barang dan threshold",
  },
  {
    title: "Cabang",
    href: "/docs/user-guide/cabang",
    keywords: ["cabang", "branch", "ganti cabang", "switch"],
    description: "Manajemen cabang",
  },
  {
    title: "Petugas",
    href: "/docs/user-guide/petugas",
    keywords: ["petugas", "staff", "karyawan", "user", "pin"],
    description: "Manajemen petugas dan user",
  },
  {
    title: "Product & System",
    href: "/docs/product",
    keywords: ["architecture", "arsitektur", "data flow", "integrasi", "google sheets", "role"],
    description: "Arsitektur dan cara kerja sistem",
  },
  {
    title: "Developer Documentation",
    href: "/docs/developer",
    keywords: ["tech stack", "api", "backend", "database", "deployment", "env", "auth"],
    description: "Dokumentasi teknis untuk developer",
  },
  {
    title: "Troubleshooting",
    href: "/docs/troubleshooting",
    keywords: ["error", "masalah", "bug", "fix", "solution", "solusi", "gagal"],
    description: "Masalah umum dan solusinya",
  },
  {
    title: "FAQ",
    href: "/docs/faq",
    keywords: ["faq", "pertanyaan", "tanya jawab", "question"],
    description: "Pertanyaan yang sering diajukan",
  },
  {
    title: "Changelog",
    href: "/docs/changelog",
    keywords: ["changelog", "version", "versi", "update", "perubahan", "release"],
    description: "Riwayat perubahan versi",
  },
  {
    title: "Threshold & Status Stok",
    href: "/docs/user-guide/stock-opname#threshold-logic",
    keywords: ["threshold", "kritis", "aman", "hampir habis", "status", "badge", "warna"],
    description: "Logika penentuan status stok",
  },
  {
    title: "Auto-Save Draft",
    href: "/docs/user-guide/stock-opname#auto-save",
    keywords: ["draft", "auto-save", "otomatis", "simpan", "browser", "mati"],
    description: "Fitur penyimpanan draft otomatis",
  },
  {
    title: "WhatsApp Share",
    href: "/docs/user-guide/laporan#whatsapp",
    keywords: ["whatsapp", "wa", "share", "bagikan", "link", "grup"],
    description: "Membagikan laporan via WhatsApp",
  },
  {
    title: "Authentication",
    href: "/docs/developer#authentication",
    keywords: ["login", "pin", "auth", "session", "cookie", "hmac"],
    description: "Sistem autentikasi PIN-based",
  },
  {
    title: "Roles & Permissions",
    href: "/docs/product#roles",
    keywords: ["role", "permission", "admin", "petugas", "hak akses"],
    description: "Peran pengguna dan hak akses",
  },
  {
    title: "Environment Variables",
    href: "/docs/developer#environment-variables",
    keywords: ["env", "environment", "config", "konfigurasi", "secret", "api key"],
    description: "Variabel environment yang dibutuhkan",
  },
  {
    title: "Deployment",
    href: "/docs/developer#deployment",
    keywords: ["deploy", "vercel", "production", "hosting"],
    description: "Cara deploy aplikasi",
  },
];

interface DocsSearchProps {
  onClose?: () => void;
}

export function DocsSearch({ onClose }: DocsSearchProps) {
  const [query, setQuery] = useState("");
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return searchEntries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(q) ||
        (entry.titleEn && entry.titleEn.toLowerCase().includes(q)) ||
        entry.keywords.some((kw) => kw.toLowerCase().includes(q)) ||
        (entry.description && entry.description.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-base-300 bg-base-200/50 text-xs text-base-content/50 hover:border-primary/30 hover:text-base-content/70 transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t("Cari dokumentasi...", "Search docs...")}</span>
        <kbd className="hidden md:inline ml-auto text-xs font-mono px-1.5 py-0.5 rounded-lg bg-base-300 text-base-content/40">
          /
        </kbd>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => {
              setIsOpen(false);
              setQuery("");
            }}
          />
          <div className="fixed top-[10%] sm:top-[15%] left-1/2 -translate-x-1/2 w-[92%] sm:w-[90%] max-w-lg z-50 bg-base-100 rounded-2xl border border-base-300 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-base-300">
              <Search className="w-4 h-4 text-base-content/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Cari dokumentasi...", "Search documentation...")}
                className="flex-1 bg-transparent text-sm text-base-content placeholder:text-base-content/40 focus:outline-none"
                autoFocus
              />
              <button
                onClick={() => {
                  setIsOpen(false);
                  setQuery("");
                }}
                className="p-1 rounded-lg hover:bg-base-200 text-base-content/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 sm:max-h-80 overflow-y-auto p-2">
              {query.trim() === "" ? (
                <p className="text-center text-xs text-base-content/40 py-8">
                  {t(
                    "Ketik untuk mencari halaman dokumentasi...",
                    "Type to search documentation pages..."
                  )}
                </p>
              ) : results.length === 0 ? (
                <p className="text-center text-xs text-base-content/40 py-8">
                  {t(
                    "Tidak ditemukan hasil yang cocok.",
                    "No matching results found."
                  )}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {results.map((entry) => (
                    <li key={entry.href}>
                      <Link
                        href={entry.href}
                        onClick={() => {
                          setIsOpen(false);
                          setQuery("");
                          onClose?.();
                        }}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-base-200 transition-colors group"
                      >
                        <FileText className="w-4 h-4 text-base-content/30 mt-0.5 flex-shrink-0 group-hover:text-primary" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-base-content group-hover:text-primary transition-colors">
                            {lang === "en" && entry.titleEn
                              ? entry.titleEn
                              : entry.title}
                          </p>
                          {entry.description && (
                            <p className="text-xs text-base-content/50 mt-0.5">
                              {entry.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
