"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { useLanguage } from "@/lib/LanguageContext";
import {
  HelpCircle,
  Smartphone,
  Calculator,
  Clock,
  Share2,
  Key,
  Monitor,
  Hash,
} from "lucide-react";

const toc = [
  { id: "overview", label: "Overview", level: 1 },
  { id: "what-is-stokis", label: "Apa itu Stokis?", level: 1 },
  { id: "how-to-count", label: "Cara Menghitung Stok", level: 1 },
  { id: "s1-s2", label: "Apa itu S1 dan S2?", level: 1 },
  { id: "phone-dies", label: "HP Mati Mendadak", level: 1 },
  { id: "share-reports", label: "Cara Share Laporan", level: 1 },
  { id: "change-pin", label: "Ganti PIN", level: 1 },
  { id: "mobile-access", label: "Akses dari HP", level: 1 },
  { id: "max-items", label: "Banyak Item per SO", level: 1 },
];

export default function FAQPage() {
  const { lang, t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{
        href: "/docs/troubleshooting",
        label: "Troubleshooting",
        labelEn: "Troubleshooting",
      }}
      next={{
        href: "/docs/changelog",
        label: "Changelog",
        labelEn: "Changelog",
      }}
    >
      {/* Title */}
      <div id="overview" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("FAQ", "FAQ")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Pertanyaan yang sering diajukan tentang Stokis.",
            "Frequently asked questions about Stokis."
          )}
        </p>
      </div>

      {/* What is Stokis */}
      <section id="what-is-stokis" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          {t("Apa itu Stokis?", "What is Stokis?")}
        </h2>
        <div className="p-4 rounded-xl border border-base-300 space-y-3">
          <p className="text-sm text-base-content/70">
            {t(
              "Stokis adalah aplikasi Stock Opname (SO) berbasis web yang dirancang untuk bisnis multi-cabang seperti F&B, minimarket, dan retail. Sistem ini membantu petugas menghitung stok fisik dan menghasilkan laporan otomatis.",
              "Stokis is a web-based Stock Opname (SO) application designed for multi-branch businesses like F&B, minimarts, and retail. The system helps staff count physical stock and generate automatic reports."
            )}
          </p>
          <p className="text-sm text-base-content/70">
            {t(
              "Berbeda dari spreadsheet manual, Stokis memvalidasi data secara real-time, menentukan status stok (Kritis / Hampir Habis / Aman), dan menghasilkan file XLSX yang siap dibagikan ke grup WhatsApp.",
              "Unlike manual spreadsheets, Stokis validates data in real-time, determines stock status (Critical / Low / Safe), and generates XLSX files ready to share to WhatsApp groups."
            )}
          </p>
        </div>
      </section>

      {/* How to Count Stock */}
      <section id="how-to-count" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          {t("Bagaimana Cara Menghitung Stok?", "How to Count Stock?")}
        </h2>
        <div className="p-4 rounded-xl border border-base-300 space-y-3">
          <p className="text-sm text-base-content/70">
            {t(
              "Setiap barang dihitung berdasarkan dua jenis stok:",
              "Each item is counted based on two stock types:"
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
              <p className="text-xs font-bold text-primary">
                {t("S1 — Stock Utuh", "S1 — Whole Stock")}
              </p>
              <p className="text-xs text-base-content/60 mt-1">
                {t(
                  "Jumlah stok dalam kemasan utuh / belum dibuka.",
                  "Stock count in intact / unopened packaging."
                )}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-info/20 bg-info/5">
              <p className="text-xs font-bold text-info">
                {t("S2 — Stock Terbuka", "S2 — Opened Stock")}
              </p>
              <p className="text-xs text-base-content/60 mt-1">
                {t(
                  "Jumlah stok yang sudah dibuka / dipakai sebagian.",
                  "Stock count that has been opened / partially used."
                )}
              </p>
            </div>
          </div>
          <p className="text-sm text-base-content/70">
            {t(
              "Total stok = S1 + S2. Proses penghitungan dilakukan saat shift Opening dan juga saat shift Closing.",
              "Total stock = S1 + S2. Counting process is done during Opening shift and also during Closing shift."
            )}
          </p>
        </div>
      </section>

      {/* What is S1 and S2 */}
      <section id="s1-s2" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          {t("Apa itu S1 dan S2?", "What are S1 and S2?")}
        </h2>
        <div className="p-4 rounded-xl border border-base-300 space-y-3">
          <p className="text-sm text-base-content/70">
            {t(
              "S1 dan S2 adalah jenis stok, bukan shift:",
              "S1 and S2 are stock types, not shifts:"
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
              <p className="text-xs font-bold text-primary">
                S1 — Stock Utuh
              </p>
              <p className="text-xs text-base-content/60 mt-1">
                {t(
                  "Stok dalam kemasan utuh yang belum dibuka. Misal: dus masih segel, bungkus belum terjual.",
                  "Stock in intact packaging that hasn't been opened. Examples: sealed boxes, unsold packages."
                )}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-info/20 bg-info/5">
              <p className="text-xs font-bold text-info">
                S2 — Stock Terbuka
              </p>
              <p className="text-xs text-base-content/60 mt-1">
                {t(
                  "Stok yang sudah dibuka atau dipakai sebagian. Misal: produk display yang sudah tidak utuh.",
                  "Stock that has been opened or partially used. Examples: display products no longer intact."
                )}
              </p>
            </div>
          </div>
          <p className="text-sm text-base-content/70">
            {t(
              "Penghitungan S1 dan S2 dilakukan dua kali sehari: saat shift Opening (pagi) dan shift Closing (malam).",
              "S1 and S2 counting is done twice daily: during Opening shift (morning) and Closing shift (evening)."
            )}
          </p>
        </div>
      </section>

      {/* Phone Dies */}
      <section id="phone-dies" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-warning" />
          {t("HP Mati Mendadak Saat Mengisi SO?", "Phone Dies During SO?")}
        </h2>
        <div className="p-4 rounded-xl border border-base-300 space-y-3">
          <p className="text-sm text-base-content/70">
            {t(
              "Tenang! Data Anda aman. Stokis menggunakan auto-save draft di browser.",
              "Relax! Your data is safe. Stokis uses auto-save draft in the browser."
            )}
          </p>
          <div className="p-3 rounded-xl border border-success/20 bg-success/5 space-y-2">
            <p className="text-xs font-bold text-success">
              {t("Yang Perlu Dilakukan:", "What to Do:")}
            </p>
            <ol className="text-xs text-base-content/70 space-y-1 list-decimal list-inside">
              <li>{t("Nyalakan kembali HP", "Turn your phone back on")}</li>
              <li>{t("Buka browser dan kembali ke halaman Input SO", "Open browser and return to Input SO page")}</li>
              <li>{t("Sistem akan menampilkan notifikasi draft ditemukan", "System will show notification that draft was found")}</li>
              <li>{t("Klik \"Lanjutkan Draft\" untuk memulihkan data", "Click \"Continue Draft\" to restore data")}</li>
              <li>{t("Lanjutkan pengisian dari bagian terakhir", "Continue filling from where you left off")}</li>
            </ol>
          </div>

          <Callout type="tip">
            {t(
              "Draft disimpan otomatis di localStorage browser. Data tetap tersimpan bahkan jika HP mati atau browser tertutup.",
              "Draft is saved automatically in browser's localStorage. Data remains saved even if phone dies or browser is closed."
            )}
          </Callout>
        </div>
      </section>

      {/* Share Reports */}
      <section id="share-reports" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          {t("Bagaimana Cara Share Laporan?", "How to Share Reports?")}
        </h2>
        <div className="p-4 rounded-xl border border-base-300 space-y-3">
          <p className="text-sm text-base-content/70">
            {t(
              "Setelah SO disubmit, laporan XLSX di-generate otomatis. Berikut cara membagikannya:",
              "After SO is submitted, XLSX report is generated automatically. Here's how to share it:"
            )}
          </p>
          <div className="space-y-2">
            {[
              {
                num: "1",
                title: t("Buka halaman Laporan", "Open Reports page"),
                desc: t(
                  "Klik menu \"Laporan\" di navigasi.",
                  "Click \"Reports\" in navigation."
                ),
              },
              {
                num: "2",
                title: t("Cari laporan yang ingin dishare", "Find the report to share"),
                desc: t(
                  "Gunakan filter tanggal atau cari berdasarkan ID laporan.",
                  "Use date filter or search by report ID."
                ),
              },
              {
                num: "3",
                title: t("Klik tombol WhatsApp", "Click WhatsApp button"),
                desc: t(
                  "Klik ikon WhatsApp untuk generate link sharing.",
                  "Click WhatsApp icon to generate sharing link."
                ),
              },
              {
                num: "4",
                title: t("Share ke grup", "Share to group"),
                desc: t(
                  "WhatsApp akan terbuka dengan pesan siap kirim. Pilih grup tujuan.",
                  "WhatsApp will open with ready-to-send message. Select target group."
                ),
              },
            ].map((step) => (
              <div
                key={step.num}
                className="p-3 rounded-xl border border-base-300 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {step.num}
                </div>
                <div>
                  <p className="text-xs font-bold text-base-content">
                    {step.title}
                  </p>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Change PIN */}
      <section id="change-pin" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          {t("Bagaimana Cara Ganti PIN?", "How to Change PIN?")}
        </h2>
        <div className="p-4 rounded-xl border border-base-300 space-y-3">
          <p className="text-sm text-base-content/70">
            {t(
              "PIN hanya bisa diubah oleh admin. Hubungi administrator sistem Anda untuk:",
              "PIN can only be changed by admin. Contact your system administrator to:"
            )}
          </p>
          <ul className="text-xs text-base-content/70 space-y-1.5 list-disc list-inside">
            <li>{t("Reset PIN jika lupa", "Reset PIN if forgotten")}</li>
            <li>{t("Ganti PIN untuk keamanan", "Change PIN for security")}</li>
            <li>{t("Buat akun petugas baru dengan PIN awal", "Create new staff account with initial PIN")}</li>
          </ul>

          <Callout type="warning">
            {t(
              "PIN harus minimal 4 digit. Jangan gunakan PIN yang mudah ditebak seperti 1234 atau tanggal lahir.",
              "PIN must be at least 4 digits. Don't use easily guessed PINs like 1234 or birth dates."
            )}
          </Callout>
        </div>
      </section>

      {/* Mobile Access */}
      <section id="mobile-access" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary" />
          {t("Bisa Akses dari HP?", "Can I Access from Phone?")}
        </h2>
        <div className="p-4 rounded-xl border border-base-300 space-y-3">
          <p className="text-sm text-base-content/70">
            {t(
              "Ya! Stokis dirancang responsif dan bisa diakses dari browser di HP (Android/iOS). Tidak perlu install aplikasi.",
              "Yes! Stokis is designed responsively and can be accessed from browser on phone (Android/iOS). No app installation needed."
            )}
          </p>
          <p className="text-sm text-base-content/70">
            {t(
              "Fitur yang tersedia di HP sama lengkapnya dengan desktop — termasuk form SO, laporan, dan dashboard.",
              "Features available on phone are as complete as desktop — including SO form, reports, and dashboard."
            )}
          </p>

          <Callout type="tip">
            {t(
              "Untuk pengalaman terbaik, gunakan Chrome (Android) atau Safari (iOS) versi terbaru.",
              "For best experience, use Chrome (Android) or Safari (iOS) latest version."
            )}
          </Callout>
        </div>
      </section>

      {/* Max Items */}
      <section id="max-items" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Hash className="w-5 h-5 text-primary" />
          {t("Berapa Banyak Item per SO?", "How Many Items per SO?")}
        </h2>
        <div className="p-4 rounded-xl border border-base-300 space-y-3">
          <p className="text-sm text-base-content/70">
            {t(
              "Tidak ada batasan jumlah item per SO. Anda bisa menghitung sebanyak mungkin item yang terdaftar di Master Item.",
              "There is no limit on the number of items per SO. You can count as many items as registered in Master Items."
            )}
          </p>
          <p className="text-sm text-base-content/70">
            {t(
              "Jumlah item ditentukan oleh berapa banyak barang yang didaftarkan admin di menu Master Item untuk cabang Anda.",
              "The number of items is determined by how many items the admin registered in the Master Items menu for your branch."
            )}
          </p>

          <Callout type="note">
            {t(
              "Jika ada barang yang belum terdaftar di Master Item, hubungi admin untuk menambahkannya sebelum melakukan SO.",
              "If there are items not yet registered in Master Items, contact admin to add them before doing SO."
            )}
          </Callout>
        </div>
      </section>
    </DocsPage>
  );
}
