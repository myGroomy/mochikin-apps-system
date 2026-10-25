"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { useLanguage } from "@/lib/LanguageContext";
import {
  AlertTriangle,
  FileX,
  RefreshCw,
  LogIn,
  Building2,
  Gauge,
  Wifi,
  Shield,
  HelpCircle,
} from "lucide-react";

const toc = [
  { id: "overview", label: "Overview", level: 1 },
  { id: "file-not-available", label: "File XLSX Belum Tersedia", level: 1 },
  { id: "browser-refresh", label: "Browser Refresh During SO", level: 1 },
  { id: "login-failed", label: "Login Gagal", level: 1 },
  { id: "branch-not-showing", label: "Cabang Tidak Muncul", level: 1 },
  { id: "blank-threshold", label: "Threshold Kosong", level: 1 },
  { id: "session-expired", label: "Session Expired", level: 1 },
  { id: "slow-loading", label: "Loading Lambat", level: 1 },
];

export default function TroubleshootingPage() {
  const { lang, t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{
        href: "/docs/developer",
        label: "Developer Docs",
        labelEn: "Developer Docs",
      }}
      next={{
        href: "/docs/faq",
        label: "FAQ",
        labelEn: "FAQ",
      }}
    >
      {/* Title */}
      <div id="overview" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("Troubleshooting", "Troubleshooting")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Solusi untuk masalah umum yang sering dihadapi pengguna.",
            "Solutions for common issues users frequently encounter."
          )}
        </p>
      </div>

      <Callout type="tip">
        {t(
          "Jika masalah Anda tidak tercantum di sini, hubungi administrator sistem.",
          "If your issue is not listed here, contact your system administrator."
        )}
      </Callout>

      {/* File XLSX Not Available */}
      <section id="file-not-available" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <FileX className="w-5 h-5 text-error" />
          {t("File XLSX Belum Tersedia", "XLSX File Not Available")}
        </h2>

        <div className="text-sm text-base-content/70 space-y-3">
          <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 space-y-2">
            <p className="text-xs font-bold text-warning flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t("Gejala", "Symptoms")}
            </p>
            <ul className="text-xs text-base-content/70 space-y-1 list-disc list-inside">
              <li>{t("File XLSX tidak bisa didownload", "XLSX file cannot be downloaded")}</li>
              <li>{t("Halaman menampilkan pesan error saat klik download", "Page shows error when clicking download")}</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-success/20 bg-success/5 space-y-2">
            <p className="text-xs font-bold text-success flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              {t("Solusi", "Solution")}
            </p>
            <ol className="text-xs text-base-content/70 space-y-1 list-decimal list-inside">
              <li>{t("Buka halaman laporan", "Open the reports page")}</li>
              <li>{t("Cari laporan yang ingin didownload", "Find the report you want to download")}</li>
              <li>{t("Klik tombol \"Regenerate\" atau \"Regenerate Laporan\"", "Click the \"Regenerate\" or \"Regenerate Laporan\" button")}</li>
              <li>{t("Tunggu beberapa detik hingga file selesai di-generate", "Wait a few seconds for the file to finish generating")}</li>
              <li>{t("Coba download lagi", "Try downloading again")}</li>
            </ol>
          </div>

          <Callout type="note">
            {t(
              "Regenerate hanya tersedia untuk laporan yang sudah disubmit. Jika SO belum di-submit, submit terlebih dahulu.",
              "Regenerate is only available for reports that have been submitted. If SO hasn't been submitted, submit it first."
            )}
          </Callout>
        </div>
      </section>

      {/* Browser Refresh During SO */}
      <section id="browser-refresh" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-warning" />
          {t("Browser Refresh During SO", "Browser Refresh During SO")}
        </h2>

        <div className="text-sm text-base-content/70 space-y-3">
          <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 space-y-2">
            <p className="text-xs font-bold text-warning flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t("Gejala", "Symptoms")}
            </p>
            <ul className="text-xs text-base-content/70 space-y-1 list-disc list-inside">
              <li>{t("Browser tertutup atau di-refresh saat mengisi form SO", "Browser closed or refreshed while filling SO form")}</li>
              <li>{t("HP mati mendadak saat menghitung stok", "Phone died suddenly while counting stock")}</li>
              <li>{t("Koneksi internet terputus", "Internet connection lost")}</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-success/20 bg-success/5 space-y-2">
            <p className="text-xs font-bold text-success flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              {t("Solusi", "Solution")}
            </p>
            <ol className="text-xs text-base-content/70 space-y-1 list-decimal list-inside">
              <li>{t("Buka kembali halaman Input SO", "Re-open the Input SO page")}</li>
              <li>{t("Sistem akan mendeteksi draft yang tersimpan", "The system will detect the saved draft")}</li>
              <li>{t("Klik \"Lanjutkan Draft\" atau \"Restore Draft\"", "Click \"Continue Draft\" or \"Restore Draft\"")}</li>
              <li>{t("Data yang sudah diinput akan dipulihkan", "Your previously entered data will be restored")}</li>
              <li>{t("Lanjutkan pengisian dari bagian terakhir", "Continue filling from where you left off")}</li>
            </ol>
          </div>

          <Callout type="tip">
            {t(
              "Draft tersimpan secara otomatis di browser (localStorage) setiap kali Anda mengisi field. Tidak perlu menekan tombol \"Save\" secara manual.",
              "Draft is saved automatically in the browser (localStorage) every time you fill a field. No need to manually press a \"Save\" button."
            )}
          </Callout>
        </div>
      </section>

      {/* Login Failed */}
      <section id="login-failed" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <LogIn className="w-5 h-5 text-error" />
          {t("Login Gagal", "Login Failed")}
        </h2>

        <div className="text-sm text-base-content/70 space-y-3">
          <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 space-y-2">
            <p className="text-xs font-bold text-warning flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t("Gejala", "Symptoms")}
            </p>
            <ul className="text-xs text-base-content/70 space-y-1 list-disc list-inside">
              <li>{t("Pesan \"PIN salah\" atau \"Username tidak ditemukan\"", "Message \"Wrong PIN\" or \"Username not found\"")}</li>
              <li>{t("Tidak bisa masuk meskipun sudah memasukkan PIN yang benar", "Cannot login even though correct PIN was entered")}</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-success/20 bg-success/5 space-y-2">
            <p className="text-xs font-bold text-success flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              {t("Solusi", "Solution")}
            </p>
            <ol className="text-xs text-base-content/70 space-y-1 list-decimal list-inside">
              <li>{t("Pastikan username diketik dengan benar (case-sensitive)", "Make sure username is typed correctly (case-sensitive)")}</li>
              <li>{t("Pastikan PIN tidak ada spasi di awal atau akhir", "Make sure PIN has no spaces at the beginning or end")}</li>
              <li>{t("Coba ketik PIN di notepad dulu, lalu copy-paste", "Try typing PIN in notepad first, then copy-paste")}</li>
              <li>{t("Hubungi admin untuk reset PIN jika lupa", "Contact admin to reset PIN if forgotten")}</li>
            </ol>
          </div>

          <Callout type="note">
            {t(
              "PIN dibandingkan dengan nilai yang tersimpan. Pastikan tidak ada karakter tersembunyi (emoji, zero-width space) atau spasi ekstra saat memasukkan PIN.",
              "PIN is compared with the stored value. Make sure there are no hidden characters (emoji, zero-width space) or extra spaces when entering the PIN."
            )}
          </Callout>
        </div>
      </section>

      {/* Branch Not Showing */}
      <section id="branch-not-showing" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Building2 className="w-5 h-5 text-warning" />
          {t("Cabang Tidak Muncul", "Branch Not Showing")}
        </h2>

        <div className="text-sm text-base-content/70 space-y-3">
          <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 space-y-2">
            <p className="text-xs font-bold text-warning flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t("Gejala", "Symptoms")}
            </p>
            <ul className="text-xs text-base-content/70 space-y-1 list-disc list-inside">
              <li>{t("Dropdown cabang kosong atau tidak menampilkan cabang yang diharapkan", "Branch dropdown is empty or doesn't show expected branch")}</li>
              <li>{t("Tidak bisa akses halaman tertentu karena cabang tidak dipilih", "Cannot access certain pages because no branch is selected")}</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-success/20 bg-success/5 space-y-2">
            <p className="text-xs font-bold text-success flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {t("Solusi", "Solution")}
            </p>
            <ol className="text-xs text-base-content/70 space-y-1 list-decimal list-inside">
              <li>{t("Cek role akun Anda — petugas hanya melihat cabang yang ditugaskan", "Check your account role — staff only see assigned branches")}</li>
              <li>{t("Hubungi admin untuk memastikan akun Anda sudah ditautkan ke cabang", "Contact admin to ensure your account is linked to a branch")}</li>
              <li>{t("Jika Anda admin, pastikan cabang sudah dibuat dan statusnya aktif", "If you're admin, ensure branch is created and active")}</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Blank Threshold */}
      <section id="blank-threshold" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Gauge className="w-5 h-5 text-info" />
          {t("Threshold Kosong", "Blank Threshold")}
        </h2>

        <div className="text-sm text-base-content/70 space-y-3">
          <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 space-y-2">
            <p className="text-xs font-bold text-warning flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t("Gejala", "Symptoms")}
            </p>
            <ul className="text-xs text-base-content/70 space-y-1 list-disc list-inside">
              <li>{t("Status stok menampilkan \"Tidak Dipantau\" untuk item tertentu", "Stock status shows \"Not Monitored\" for certain items")}</li>
              <li>{t("Tidak ada angka threshold di kolom status", "No threshold number in the status column")}</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-success/20 bg-success/5 space-y-2">
            <p className="text-xs font-bold text-success flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              {t("Penjelasan & Solusi", "Explanation & Solution")}
            </p>
            <div className="text-xs text-base-content/70 space-y-2">
              <p>
                {t(
                  "Ini bukan error. Threshold \"Tidak Dipantau\" berarti item tersebut belum memiliki threshold minimum yang ditetapkan oleh admin.",
                  "This is not an error. \"Not Monitored\" threshold means the item doesn't have a minimum threshold set by admin yet."
                )}
              </p>
              <p>
                {t(
                  "Untuk mengatasinya:",
                  "To resolve:"
                )}
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>{t("Admin membuka menu Master Item", "Admin opens Master Items menu")}</li>
                <li>{t("Cari item yang threshold-nya kosong", "Find the item with blank threshold")}</li>
                <li>{t("Klik edit dan masukkan angka threshold minimum", "Click edit and enter a minimum threshold number")}</li>
                <li>{t("Simpan perubahan", "Save changes")}</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Session Expired */}
      <section id="session-expired" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Wifi className="w-5 h-5 text-error" />
          {t("Session Expired", "Session Expired")}
        </h2>

        <div className="text-sm text-base-content/70 space-y-3">
          <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 space-y-2">
            <p className="text-xs font-bold text-warning flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t("Gejala", "Symptoms")}
            </p>
            <ul className="text-xs text-base-content/70 space-y-1 list-disc list-inside">
              <li>{t("Tiba-tiba logout atau diarahkan ke halaman login", "Suddenly logged out or redirected to login page")}</li>
              <li>{t("Pesan \"Session expired\" atau \"Unauthorized\"", "Message \"Session expired\" or \"Unauthorized\"")}</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-success/20 bg-success/5 space-y-2">
            <p className="text-xs font-bold text-success flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              {t("Solusi", "Solution")}
            </p>
            <ol className="text-xs text-base-content/70 space-y-1 list-decimal list-inside">
              <li>{t("Login kembali dengan username dan PIN", "Login again with username and PIN")}</li>
              <li>{t("Session berlaku selama 7 hari. Setelah itu, login ulang diperlukan", "Session is valid for 7 days. After that, re-login is required")}</li>
              <li>{t("Jika sering expired, pastikan cookie tidak diblokir browser", "If frequently expired, ensure cookies aren't blocked by browser")}</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Slow Loading */}
      <section id="slow-loading" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-info" />
          {t("Loading Lambat", "Slow Loading")}
        </h2>

        <div className="text-sm text-base-content/70 space-y-3">
          <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 space-y-2">
            <p className="text-xs font-bold text-warning flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t("Gejala", "Symptoms")}
            </p>
            <ul className="text-xs text-base-content/70 space-y-1 list-disc list-inside">
              <li>{t("Halaman lambat dimuat", "Page loads slowly")}</li>
              <li>{t("Data dashboard tidak muncul dalam beberapa detik", "Dashboard data doesn't appear for several seconds")}</li>
              <li>{t("Form SO lambat merespons input", "SO form responds slowly to input")}</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-success/20 bg-success/5 space-y-2">
            <p className="text-xs font-bold text-success flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" />
              {t("Penyebab & Solusi", "Cause & Solution")}
            </p>
            <div className="text-xs text-base-content/70 space-y-2">
              <p>
                {t(
                  "Stokis menggunakan Google Sheets sebagai database. Setiap request data melibatkan panggilan API ke Google:",
                  "Stokis uses Google Sheets as database. Every data request involves API calls to Google:"
                )}
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t("Koneksi internet lambat → pastikan jaringan stabil", "Slow internet connection → ensure stable network")}</li>
                <li>{t("Google Sheets API limit → tunggu beberapa menit lalu coba lagi", "Google Sheets API limit → wait a few minutes then try again")}</li>
                <li>{t("Banyak data →首次 load mungkin lambat, subsequent load lebih cepat", "Large data → first load may be slow, subsequent loads are faster")}</li>
              </ul>
            </div>
          </div>

          <Callout type="note">
            {t(
              "Vercel serverless functions memiliki timeout 10 detik di free tier. Jika operasi melampaui batas ini, pertimbangkan upgrade atau optimasi query.",
              "Vercel serverless functions have a 10-second timeout on free tier. If operations exceed this, consider upgrading or optimizing queries."
            )}
          </Callout>
        </div>
      </section>
    </DocsPage>
  );
}
