"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Code2,
  FolderTree,
  Key,
  Server,
  Shield,
  Database,
  Rocket,
  GitBranch,
  Terminal,
  FileCode,
  Globe,
  Lock,
} from "lucide-react";

const toc = [
  { id: "tech-stack", label: "Tech Stack", level: 1 },
  { id: "project-structure", label: "Project Structure", level: 1 },
  { id: "environment", label: "Environment Variables", level: 1 },
  { id: "api-overview", label: "API Overview", level: 1 },
  { id: "auth-api", label: "Authentication", level: 2 },
  { id: "so-api", label: "Stock Opname", level: 2 },
  { id: "laporan-api", label: "Laporan", level: 2 },
  { id: "master-api", label: "Master Data", level: 2 },
  { id: "dashboard-api", label: "Dashboard", level: 2 },
  { id: "auth-system", label: "Authentication System", level: 1 },
  { id: "sheets-schema", label: "Google Sheets Schema", level: 1 },
  { id: "deployment", label: "Deployment", level: 1 },
  { id: "dev-workflow", label: "Development Workflow", level: 1 },
];

export default function DeveloperPage() {
  const { t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{
        href: "/docs/product",
        label: "Product & System",
        labelEn: "Product & System",
      }}
      next={{
        href: "/docs/troubleshooting",
        label: "Troubleshooting",
        labelEn: "Troubleshooting",
      }}
    >
      {/* Title */}
      <div id="tech-stack" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("Developer Documentation", "Developer Documentation")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Panduan teknis untuk pengembang — struktur project, API, autentikasi, dan deployment.",
            "Technical guide for developers — project structure, API, authentication, and deployment."
          )}
        </p>
      </div>

      {/* Tech Stack */}
      <section className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Code2 className="w-5 h-5 text-primary" />
          {t("Tech Stack", "Tech Stack")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: "Framework", desc: "Next.js 16.3.3 (App Router)" },
            { title: "Language", desc: "TypeScript" },
            { title: "UI", desc: "DaisyUI v5 + Tailwind CSS v4" },
            { title: "Animation", desc: "Framer Motion" },
            { title: "Icons", desc: "Lucide React" },
            { title: "Charts", desc: "Recharts" },
            { title: "Database", desc: "Google Sheets API" },
            { title: "Storage", desc: "Google Drive API" },
            { title: "Auth", desc: "PIN + HMAC-SHA256" },
            { title: "Runtime", desc: "Vercel (Serverless)" },
          ].map((item) => (
            <div
              key={item.title}
              className="p-3 rounded-xl border border-base-300"
            >
              <p className="text-xs text-base-content/50">{item.title}</p>
              <p className="text-xs font-bold text-base-content mt-0.5">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Project Structure */}
      <section id="project-structure" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <FolderTree className="w-5 h-5 text-primary" />
          {t("Project Structure", "Project Structure")}
        </h2>
        <CodeBlock
          language="text"
          filename="stokis-project/"
          code={`app/
├── docs/           # Documentation pages
├── login/          # Login page
├── api/            # API routes (Next.js route handlers)
│   ├── auth/       # Authentication endpoints
│   ├── so/         # Stock Opname CRUD
│   ├── laporan/    # Report management
│   ├── master-item/# Item catalog management
│   ├── cabang/     # Branch management
│   ├── petugas/    # Staff management
│   ├── users/      # User management
│   └── dashboard/  # Analytics data
├── components/     # Reusable UI components
│   └── docs/       # Documentation components
├── lib/            # Utilities & contexts
│   ├── LanguageContext.tsx
│   └── ...
├── services/       # Business logic services
└── middleware.ts   # Auth middleware`}
        />
      </section>

      {/* Environment Variables */}
      <section id="environment" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          {t("Environment Variables", "Environment Variables")}
        </h2>

        <Callout type="warning">
          {t(
            "Semua variabel ini harus diatur di Vercel dashboard sebelum deploy. Tidak ada .env file yang di-commit ke repository.",
            "All these variables must be set in the Vercel dashboard before deploy. No .env file is committed to the repository."
          )}
        </Callout>

        <div className="space-y-2">
          {[
            {
              name: "STOKIS_API_KEY",
              desc: t(
                "Kunci API (minimal 32 karakter). Digunakan untuk signing session token dan autentikasi ke Apps Script.",
                "API key (minimum 32 characters). Used for signing session tokens and authenticating to Apps Script."
              ),
              required: true,
            },
            {
              name: "GOOGLE_SERVICE_ACCOUNT_EMAIL",
              desc: t(
                "Email service account Google Cloud untuk mengakses Sheets & Drive API.",
                "Google Cloud service account email for accessing Sheets & Drive APIs."
              ),
              required: true,
            },
            {
              name: "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
              desc: t(
                "Private key service account (PEM format). Harus di-escape dengan \\n.",
                "Service account private key (PEM format). Must be escaped with \\n."
              ),
              required: true,
            },
            {
              name: "REGISTRY_SPREADSHEET_ID",
              desc: t(
                "ID spreadsheet registry utama yang berisi Daftar_Cabang, Users, Settings_Global.",
                "Main registry spreadsheet ID containing Daftar_Cabang, Users, Settings_Global."
              ),
              required: true,
            },
            {
              name: "APPS_SCRIPT_URL",
              desc: t(
                "URL Google Apps Script untuk fallback file upload. Opsional — hanya jika Drive API gagal.",
                "Google Apps Script URL for file upload fallback. Optional — only if Drive API fails."
              ),
              required: false,
            },
          ].map((env) => (
            <div
              key={env.name}
              className="p-3 rounded-xl border border-base-300 flex items-start gap-3"
            >
              <code className="text-xs bg-base-200 px-2 py-1 rounded-lg font-mono text-primary flex-shrink-0">
                {env.name}
              </code>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-base-content/70">
                  {env.desc}
                </p>
                <span
                  className={`text-xs font-bold mt-1 inline-block ${
                    env.required ? "text-error" : "text-base-content/40"
                  }`}
                >
                  {env.required
                    ? t("Wajib", "Required")
                    : t("Opsional", "Optional")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* API Overview */}
      <section id="api-overview" className="scroll-mt-32 space-y-4">
        <h2 className="-lg font-bold text-base-content flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          {t("API Overview", "API Overview")}
        </h2>

        <div id="auth-api" className="scroll-mt-32">
          <h3 className="text-sm font-bold text-base-content mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            {t("Authentication", "Authentication")}
          </h3>
          <div className="space-y-1.5">
            {[
              { method: "POST", path: "/api/auth/login", desc: t("Login dengan username & PIN", "Login with username & PIN") },
              { method: "GET", path: "/api/auth/me", desc: t("Get current user info", "Get current user info") },
              { method: "POST", path: "/api/auth/logout", desc: t("Logout & hapus session", "Logout & clear session") },
            ].map((api) => (
              <div
                key={api.path}
                className="p-2.5 rounded-xl border border-base-300 flex items-center gap-3"
              >
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                    api.method === "POST"
                      ? "bg-primary/10 text-primary"
                      : "bg-success/10 text-success"
                  }`}
                >
                  {api.method}
                </span>
                <code className="text-xs font-mono text-base-content/80">
                  {api.path}
                </code>
                <span className="text-xs text-base-content/50 ml-auto hidden sm:block">
                  {api.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div id="so-api" className="scroll-mt-32">
          <h3 className="text-sm font-bold text-base-content mb-3 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-primary" />
            {t("Stock Opname", "Stock Opname")}
          </h3>
          <div className="space-y-1.5">
            {[
              { method: "POST", path: "/api/so", desc: t("Submit SO baru", "Submit new SO") },
              { method: "GET", path: "/api/so/previous", desc: t("Get SO sebelumnya", "Get previous SO") },
              { method: "GET", path: "/api/so/[laporanId]/xlsx", desc: t("Download XLSX", "Download XLSX") },
              { method: "GET", path: "/api/so/[laporanId]/xlsx-file", desc: t("Serve file XLSX", "Serve XLSX file") },
              { method: "POST", path: "/api/so/[laporanId]/save-laporan", desc: t("Simpan metadata", "Save metadata") },
            ].map((api) => (
              <div
                key={api.path}
                className="p-2.5 rounded-xl border border-base-300 flex items-center gap-3"
              >
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                    api.method === "POST"
                      ? "bg-primary/10 text-primary"
                      : "bg-success/10 text-success"
                  }`}
                >
                  {api.method}
                </span>
                <code className="text-xs font-mono text-base-content/80">
                  {api.path}
                </code>
                <span className="text-xs text-base-content/50 ml-auto hidden sm:block">
                  {api.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div id="laporan-api" className="scroll-mt-32">
          <h3 className="text-sm font-bold text-base-content mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            {t("Laporan", "Reports")}
          </h3>
          <div className="space-y-1.5">
            {[
              { method: "GET", path: "/api/laporan", desc: t("List semua laporan", "List all reports") },
              { method: "GET", path: "/api/laporan/[laporanId]/wa-link", desc: t("Generate link WhatsApp", "Generate WhatsApp link") },
              { method: "POST", path: "/api/laporan/[laporanId]/status-wa", desc: t("Update status WA", "Update WA status") },
              { method: "POST", path: "/api/laporan/[laporanId]/regenerate", desc: t("Regenerate laporan", "Regenerate report") },
            ].map((api) => (
              <div
                key={api.path}
                className="p-2.5 rounded-xl border border-base-300 flex items-center gap-3"
              >
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                    api.method === "POST"
                      ? "bg-primary/10 text-primary"
                      : "bg-success/10 text-success"
                  }`}
                >
                  {api.method}
                </span>
                <code className="text-xs font-mono text-base-content/80">
                  {api.path}
                </code>
                <span className="text-xs text-base-content/50 ml-auto hidden sm:block">
                  {api.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div id="master-api" className="scroll-mt-32">
          <h3 className="text-sm font-bold text-base-content mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            {t("Master Data", "Master Data")}
          </h3>
          <div className="space-y-1.5">
            {[
              { method: "GET/POST", path: "/api/master-item", desc: t("List / Tambah item", "List / Add item") },
              { method: "POST", path: "/api/master-item/[itemId]/status", desc: t("Toggle status item", "Toggle item status") },
              { method: "POST", path: "/api/master-item/[itemId]/threshold", desc: t("Update threshold", "Update threshold") },
              { method: "GET/POST", path: "/api/cabang", desc: t("List / Tambah cabang", "List / Add branch") },
              { method: "PUT", path: "/api/cabang/[cabangId]", desc: t("Update cabang", "Update branch") },
              { method: "POST", path: "/api/cabang/[cabangId]/status", desc: t("Toggle status cabang", "Toggle branch status") },
              { method: "GET/POST", path: "/api/petugas", desc: t("List / Tambah petugas", "List / Add staff") },
              { method: "PUT", path: "/api/petugas/[petugasId]", desc: t("Update petugas", "Update staff") },
              { method: "GET/POST", path: "/api/users", desc: t("List / Tambah user", "List / Add user") },
              { method: "PUT/DELETE", path: "/api/users/[userId]", desc: t("Update / Hapus user", "Update / Delete user") },
            ].map((api) => (
              <div
                key={api.path + api.method}
                className="p-2.5 rounded-xl border border-base-300 flex items-center gap-3"
              >
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-warning/10 text-warning">
                  {api.method}
                </span>
                <code className="text-xs font-mono text-base-content/80">
                  {api.path}
                </code>
                <span className="text-xs text-base-content/50 ml-auto hidden sm:block">
                  {api.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div id="dashboard-api" className="scroll-mt-32">
          <h3 className="text-sm font-bold text-base-content mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            {t("Dashboard", "Dashboard")}
          </h3>
          <div className="space-y-1.5">
            {[
              { method: "GET", path: "/api/dashboard/harian", desc: t("Data dashboard harian", "Daily dashboard data") },
              { method: "GET", path: "/api/dashboard/mingguan", desc: t("Data dashboard mingguan", "Weekly dashboard data") },
            ].map((api) => (
              <div
                key={api.path}
                className="p-2.5 rounded-xl border border-base-300 flex items-center gap-3"
              >
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-success/10 text-success">
                  {api.method}
                </span>
                <code className="text-xs font-mono text-base-content/80">
                  {api.path}
                </code>
                <span className="text-xs text-base-content/50 ml-auto hidden sm:block">
                  {api.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Authentication System */}
      <section id="auth-system" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          {t("Authentication System", "Authentication System")}
        </h2>
        <div className="text-xs text-base-content/70 space-y-3">
          <p>
            {t(
              "Stokis menggunakan PIN-based authentication dengan session token ber-tanda HMAC-SHA256.",
              "Stokis uses PIN-based authentication with HMAC-SHA256 signed session tokens."
            )}
          </p>

          <div className="p-3 rounded-xl border border-base-300 space-y-2">
            <p className="text-xs font-bold text-base-content">
              {t("Alur Autentikasi", "Authentication Flow")}
            </p>
            <ol className="text-xs text-base-content/60 space-y-1 list-decimal list-inside">
              <li>{t("User mengirim username + PIN", "User sends username + PIN")}</li>
              <li>{t("Server mencari user di Google Sheets", "Server finds user in Google Sheets")}</li>
              <li>{t("Memverifikasi PIN dengan nilai yang tersimpan di spreadsheet", "Verifies PIN against the value stored in the spreadsheet")}</li>
              <li>{t("Jika cocok, buat session token", "If match, create session token")}</li>
              <li>{t("Sign token dengan HMAC-SHA256 menggunakan STOKIS_API_KEY", "Sign token with HMAC-SHA256 using STOKIS_API_KEY")}</li>
              <li>{t("Token disimpan di httpOnly cookie (stokis_session)", "Token stored in httpOnly cookie (stokis_session)")}</li>
            </ol>
          </div>

          <div className="p-3 rounded-xl border border-base-300 space-y-2">
            <p className="text-xs font-bold text-base-content">
              {t("Session Token Format", "Session Token Format")}
            </p>
            <CodeBlock
              language="text"
              code={`base64url(JSON payload).{HMAC-SHA256 signature}

Cookie: stokis_session
SameSite: Strict
HttpOnly: true
Secure: true (in production)
Max-Age: 7 days (604800 seconds)`}
            />
          </div>

          <p>
            {t(
              "Middleware (withAuth) memvalidasi session token pada setiap request yang dilindungi. Jika token tidak valid atau expired, user diarahkan ke halaman login.",
              "Middleware (withAuth) validates session token on every protected request. If token is invalid or expired, user is redirected to login page."
            )}
          </p>
        </div>
      </section>

      {/* Google Sheets Schema */}
      <section id="sheets-schema" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          {t("Google Sheets Schema", "Google Sheets Schema")}
        </h2>

        <Callout type="note">
          {t(
            "Stokis tidak menggunakan database tradisional. Seluruh data disimpan di Google Sheets yang diakses melalui API.",
            "Stokis does not use a traditional database. All data is stored in Google Sheets accessed via API."
          )}
        </Callout>

        <div className="space-y-3">
          <div className="p-3 rounded-xl border border-base-300">
            <p className="text-xs font-bold text-base-content mb-2">
              Registry Spreadsheet
            </p>
            <div className="overflow-x-auto">
              <table className="table table-xs text-xs">
                <thead>
                  <tr className="text-base-content/60">
                    <th>Sheet</th>
                    <th>{t("Kolom", "Columns")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold">Daftar_Cabang</td>
                    <td>Cabang_ID, Nama_Cabang, Spreadsheet_ID, Folder_Drive_ID</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Users</td>
                    <td>User_ID, Username, PIN, Nama, Role, Cabang_ID</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Settings_Global</td>
                    <td>Key, Value</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Template_Referensi</td>
                    <td>Template_Spreadsheet_ID</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-base-300">
            <p className="text-xs font-bold text-base-content mb-2">
              Per-Branch Spreadsheet
            </p>
            <div className="overflow-x-auto">
              <table className="table table-xs text-xs">
                <thead>
                  <tr className="text-base-content/60">
                    <th>Sheet</th>
                    <th>{t("Kolom Utama", "Key Columns")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold">Master_Item</td>
                    <td>Item_ID, Nama_Item, Satuan, Threshold_Min, Status</td>
                  </tr>
                  <tr>
                    <td className="font-bold">SO_Transaksi</td>
                    <td>SO_ID, Tanggal, Shift, Item_ID, S1 (Stock Utuh), S2 (Stock Terbuka), Total, Pemakaian (MINES/PLUS), Status</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Laporan_PDF</td>
                    <td>Laporan_ID, SO_ID, File_URL, Status_WA, Created_At</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Petugas</td>
                    <td>Petugas_ID, Nama, Username, Status</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Deployment */}
      <section id="deployment" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          {t("Deployment", "Deployment")}
        </h2>
        <div className="text-xs text-base-content/70 space-y-3">
          <p>
            {t(
              "Stokis di-deploy di Vercel sebagai serverless Next.js application.",
              "Stokis is deployed on Vercel as a serverless Next.js application."
            )}
          </p>

          <div className="p-3 rounded-xl border border-base-300 space-y-2">
            <p className="text-xs font-bold text-base-content">
              {t("Langkah Deploy", "Deploy Steps")}
            </p>
            <ol className="text-xs text-base-content/60 space-y-1 list-decimal list-inside">
              <li>{t("Push kode ke repository Git", "Push code to Git repository")}</li>
              <li>{t("Hubungkan repository ke Vercel", "Connect repository to Vercel")}</li>
              <li>{t("Set environment variables di Vercel dashboard", "Set environment variables in Vercel dashboard")}</li>
              <li>{t("Deploy otomatis saat push ke main branch", "Auto-deploy on push to main branch")}</li>
            </ol>
          </div>

          <CodeBlock
            language="bash"
            filename="terminal"
            code={`# Local development
npm run dev

# Build
npm run build

# Start production server
npm start`}
          />
        </div>
      </section>

      {/* Development Workflow */}
      <section id="dev-workflow" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          {t("Development Workflow", "Development Workflow")}
        </h2>
        <div className="text-xs text-base-content/70 space-y-3">
          <div className="p-3 rounded-xl border border-base-300 space-y-2">
            <p className="text-xs font-bold text-base-content">
              {t("Lingkungan Development", "Development Environment")}
            </p>
            <ul className="text-xs text-base-content/60 space-y-1 list-disc list-inside">
              <li>{t("Copy .env.example ke .env.local", "Copy .env.example to .env.local")}</li>
              <li>{t("Isi semua environment variables", "Fill in all environment variables")}</li>
              <li>{t("Jalankan npm run dev", "Run npm run dev")}</li>
              <li>{t("Buka http://localhost:3000", "Open http://localhost:3000")}</li>
            </ul>
          </div>

          <Callout type="tip">
            {t(
              "Untuk development, Anda perlu Google Service Account yang valid dan spreadsheet registry yang sudah dikonfigurasi.",
              "For development, you need a valid Google Service Account and a configured registry spreadsheet."
            )}
          </Callout>
        </div>
      </section>
    </DocsPage>
  );
}
