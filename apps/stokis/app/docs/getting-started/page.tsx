"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Monitor,
  Smartphone,
  Key,
  CheckCircle2,
  Rocket,
} from "lucide-react";

const toc = [
  { id: "requirements", label: "Persyaratan", level: 1 },
  { id: "browser", label: "Browser", level: 2 },
  { id: "account", label: "Akun & PIN", level: 2 },
  { id: "quick-start", label: "Quick Start", level: 1 },
  { id: "step-1", label: "Langkah 1: Buka Aplikasi", level: 2 },
  { id: "step-2", label: "Langkah 2: Login", level: 2 },
  { id: "step-3", label: "Langkah 3: Pilih Cabang", level: 2 },
  { id: "step-4", label: "Langkah 4: Input SO Pertama", level: 2 },
  { id: "initial-setup", label: "Setup Awal (Admin)", level: 1 },
  { id: "setup-master-item", label: "Konfigurasi Master Item", level: 2 },
  { id: "setup-cabang", label: "Konfigurasi Cabang", level: 2 },
  { id: "setup-petugas", label: "Konfigurasi Petugas", level: 2 },
];

export default function GettingStartedPage() {
  const { t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{ href: "/docs/introduction", label: "Introduction", labelEn: "Introduction" }}
      next={{ href: "/docs/user-guide/stock-opname", label: "Stock Opname (SO)", labelEn: "Stock Opname (SO)" }}
    >
      <div id="requirements" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("Getting Started", "Getting Started")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Mulai menggunakan Stokis dalam beberapa langkah sederhana.",
            "Start using Stokis in a few simple steps."
          )}
        </p>
      </div>

      {/* Requirements */}
      <section className="scroll-mt-32 space-y-4">
        <h2 id="browser" className="text-lg font-bold text-base-content flex items-center gap-2 scroll-mt-32">
          <Monitor className="w-5 h-5 text-primary" />
          {t("Persyaratan", "Requirements")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("Browser (Desktop)", "Browser (Desktop)")}</span>
            </div>
            <p className="text-xs text-base-content/50">
              {t(
                "Chrome, Firefox, Safari, atau Edge versi terbaru. Resolusi minimal 1024×768.",
                "Chrome, Firefox, Safari, or Edge latest version. Minimum resolution 1024×768."
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("Browser (Mobile)", "Browser (Mobile)")}</span>
            </div>
            <p className="text-xs text-base-content/50">
              {t(
                "Chrome atau Safari di iOS/Android. Tampilan responsif untuk layar kecil.",
                "Chrome or Safari on iOS/Android. Responsive layout for small screens."
              )}
            </p>
          </div>
        </div>

        <div id="account" className="scroll-mt-32">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("Akun & PIN", "Account & PIN")}</span>
            </div>
            <p className="text-xs text-base-content/50">
              {t(
                "Anda memerlukan akun dengan PIN yang diberikan oleh admin. Setiap akun memiliki role (Admin atau Petugas) dan akses cabang yang ditentukan.",
                "You need an account with a PIN provided by an admin. Each account has a role (Admin or Staff) and determined branch access."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quick-start" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          {t("Quick Start", "Quick Start")}
        </h2>

        <div className="space-y-3">
          {[
            {
              num: "1",
              id: "step-1",
              title: t("Buka Aplikasi", "Open Application"),
              desc: t(
                "Buka browser dan navigasi ke alamat Stokis yang telah diberikan oleh administrator Anda.",
                "Open a browser and navigate to the Stokis address provided by your administrator."
              ),
            },
            {
              num: "2",
              id: "step-2",
              title: t("Login dengan PIN", "Login with PIN"),
              desc: t(
                "Masukkan username dan PIN Anda. PIN dikirim ke server dan dicocokkan dengan yang tersimpan di spreadsheet.",
                "Enter your username and PIN. The PIN is sent to the server and matched against the stored value."
              ),
            },
            {
              num: "3",
              id: "step-3",
              title: t("Pilih Cabang Aktif", "Select Active Branch"),
              desc: t(
                "Gunakan dropdown cabang di navbar untuk memilih cabang tempat Anda bertugas. Data stok dan laporan akan difilter berdasarkan cabang ini.",
                "Use the branch dropdown in the navbar to select the branch where you're stationed. Stock data and reports will be filtered by this branch."
              ),
            },
            {
              num: "4",
              id: "step-4",
              title: t("Input SO Pertama", "First SO Input"),
              desc: t(
                'Klik "Input SO" di navigasi. Pilih tanggal operasional dan shift (Opening/Closing), lalu mulai menghitung stok fisik barang di Step 1 (display) dan Step 2 (gudang).',
                'Click "Input SO" in navigation. Select operational date and shift (Opening/Closing), then start counting physical stock at Step 1 (display) and Step 2 (warehouse).'
              ),
            },
          ].map((step) => (
            <div
              key={step.num}
              id={step.id}
              className="scroll-mt-32 p-4 rounded-xl border border-base-300 flex items-start gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold flex-shrink-0">
                {step.num}
              </div>
              <div>
                <h3 className="text-xs font-bold text-base-content">
                  {step.title}
                </h3>
                <p className="text-xs text-base-content/60 mt-1 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Callout type="tip">
          {t(
            "Jika browser tertutup atau HP mati saat mengisi SO, data draft tersimpan otomatis di browser. Buka kembali halaman Input SO dan klik \"Lanjutkan Draft\".",
            "If the browser closes or phone dies while filling SO, draft data is saved automatically in the browser. Re-open the Input SO page and click \"Restore Draft\"."
          )}
        </Callout>
      </section>

      {/* Initial Setup (Admin) */}
      <section id="initial-setup" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          {t("Setup Awal (Admin)", "Initial Setup (Admin)")}
        </h2>

        <Callout type="note">
          {t(
            "Bagian ini hanya untuk pengguna dengan role Admin. Petugas tidak perlu melakukan setup.",
            "This section is only for users with Admin role. Staff users don't need to perform setup."
          )}
        </Callout>

        <div className="space-y-3" id="setup-master-item">
          <div className="p-4 rounded-xl border border-base-300 space-y-2 scroll-mt-32">
            <h3 className="text-xs font-bold text-base-content">{t("1. Konfigurasi Master Item", "1. Configure Master Items")}</h3>
            <p className="text-xs text-base-content/60 leading-relaxed">
              {t(
                'Buka menu "Items" (hanya terlihat oleh admin). Di sini Anda bisa menambah, mengedit, atau menonaktifkan barang. Setiap barang memiliki nama, satuan, dan threshold minimum yang menentukan status stok.',
                'Open the "Items" menu (visible only to admins). Here you can add, edit, or deactivate items. Each item has a name, unit, and minimum threshold that determines stock status.'
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2 scroll-mt-32" id="setup-cabang">
            <h3 className="text-xs font-bold text-base-content">{t("2. Konfigurasi Cabang", "2. Configure Branches")}</h3>
            <p className="text-xs text-base-content/60 leading-relaxed">
              {t(
                'Buka menu "Cabang" untuk mengelola daftar cabang. Setiap cabang memiliki spreadsheet terisolasi untuk data stok dan folder Google Drive untuk penyimpanan file.',
                'Open the "Branches" menu to manage the branch list. Each branch has an isolated spreadsheet for stock data and a Google Drive folder for file storage.'
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2 scroll-mt-32" id="setup-petugas">
            <h3 className="text-xs font-bold text-base-content">{t("3. Konfigurasi Petugas", "3. Configure Staff")}</h3>
            <p className="text-xs text-base-content/60 leading-relaxed">
              {t(
                'Buka menu "Petugas" untuk menambah akun petugas baru. Setiap petugas memiliki username, PIN, nama, role, dan akses cabang yang ditentukan.',
                'Open the "Staff" menu to add new staff accounts. Each staff member has a username, PIN, name, role, and determined branch access.'
              )}
            </p>
          </div>
        </div>
      </section>
    </DocsPage>
  );
}
