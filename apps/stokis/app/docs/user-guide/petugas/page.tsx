"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { useLanguage } from "@/lib/LanguageContext";
import {
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  Key,
  Store,
  Lock,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

const toc = [
  { id: "overview", label: "Manajemen Petugas", level: 1 },
  { id: "add-user", label: "Menambah Pengguna", level: 2 },
  { id: "edit-user", label: "Mengedit Pengguna", level: 2 },
  { id: "pin", label: "PIN & Keamanan", level: 2 },
  { id: "roles", label: "Role & Permissions", level: 2 },
  { id: "branch-access", label: "Akses Cabang", level: 2 },
  { id: "toggle-active", label: "Aktif/Nonaktif & Hapus", level: 2 },
  { id: "admin-only", label: "Akses Admin", level: 2 },
];

export default function PetugasGuidePage() {
  const { t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{ href: "/docs/user-guide/cabang", label: "Cabang", labelEn: "Branches" }}
      next={{ href: "/docs/product", label: "Product & System", labelEn: "Product & System" }}
    >
      {/* Title */}
      <div id="overview" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("Manajemen Petugas", "Staff Management")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Kelola akun pengguna (admin & petugas), role, PIN, dan akses cabang.",
            "Manage user accounts (admin & staff), roles, PINs, and branch access."
          )}
        </p>
      </div>

      <Callout type="important">
        {t(
          "Menu Petugas hanya dapat diakses oleh pengguna dengan role Admin. Petugas tidak memiliki akses ke menu ini.",
          "Staff menu can only be accessed by users with the Admin role. Staff do not have access to this menu."
        )}
      </Callout>

      {/* Add User */}
      <section id="add-user" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          {t("Menambah Pengguna Baru", "Adding New Users")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            'Klik tombol "Tambah Pengguna" untuk membuka form. Isi semua field yang diperlukan:',
            'Click "Add User" button to open the form. Fill in all required fields:'
          )}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-base-200 border-b border-base-300">
              <tr className="font-semibold text-base-content/60">
                <th className="px-4 py-3">{t("Field", "Field")}</th>
                <th className="px-4 py-3">{t("Wajib", "Required")}</th>
                <th className="px-4 py-3">{t("Deskripsi", "Description")}</th>
              </tr>
            </thead>
            <tbody className="text-base-content">
              {[
                {
                  field: "Username",
                  required: true,
                  desc: t("Username untuk login (unique per sistem)", "Login username (unique across system)"),
                },
                {
                  field: t("PIN (6 digit)", "PIN (6 digit)"),
                  required: true,
                  desc: t("PIN numerik untuk autentikasi. Disimpan sesuai nilai yang dimasukkan.", "Numeric PIN for authentication. Stored as entered."),
                },
                {
                  field: t("Nama Lengkap", "Full Name"),
                  required: true,
                  desc: t("Nama tampilan di form SO dan laporan", "Display name in SO forms and reports"),
                },
                {
                  field: t("Role", "Role"),
                  required: true,
                  desc: t("Admin atau Petugas (default: Petugas)", "Admin or Staff (default: Staff)"),
                },
                {
                  field: t("Cabang (boleh multi)", "Branch (multi-select)"),
                  required: true,
                  desc: t("Pilih satu atau lebih cabang yang dapat diakses", "Select one or more accessible branches"),
                },
              ].map((row) => (
                <tr key={row.field} className="border-b border-base-300">
                  <td className="px-4 py-3 font-semibold text-xs">{row.field}</td>
                  <td className="px-4 py-3">
                    {row.required ? (
                      <span className="badge badge-primary text-xs">{t("Ya", "Yes")}</span>
                    ) : (
                      <span className="badge badge-ghost text-xs">{t("Tidak", "No")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-base-content/60">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit User */}
      <section id="edit-user" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-primary" />
          {t("Mengedit Pengguna", "Editing Users")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Klik ikon Edit (Edit2) pada baris pengguna untuk mengubah data. Field yang dapat diubah:",
            "Click the Edit icon (Edit2) on the user row to change data. Editable fields:"
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <h3 className="text-xs font-bold text-base-content">{t("Field yang Dapat Diubah", "Editable Fields")}</h3>
            <ul className="text-xs text-base-content/60 space-y-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                <span>{t("Nama Lengkap", "Full Name")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                <span>{t("Role (Admin/Petugas)", "Role (Admin/Staff)")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                <span>{t("Akses Cabang (multi-select)", "Branch Access (multi-select)")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                <span>{t("PIN baru (opsional, kosongkan jika tidak diubah)", "New PIN (optional, leave blank if unchanged)")}</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <h3 className="text-xs font-bold text-base-content">{t("Field yang Tidak Dapat Diubah", "Non-Editable Fields")}</h3>
            <ul className="text-xs text-base-content/60 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-error mt-0.5">•</span>
                <span>{t("Username (tetap setelah dibuat)", "Username (fixed after creation)")}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* PIN */}
      <section id="pin" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          {t("PIN & Keamanan", "PIN & Security")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "PIN adalah metode autentikasi utama di Stokis. Berikut detail keamanannya:",
            "PIN is the primary authentication method in Stokis. Here are the security details:"
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("Penyimpanan PIN", "PIN Storage")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "PIN dikirim ke server dan dibandingkan dengan yang tersimpan di spreadsheet.",
                "PIN is sent to the server and matched against the stored value."
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("PIN 6 Digit", "6-Digit PIN")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "PIN harus berupa 6 digit numerik. Hanya angka yang diterima (0-9).",
                "PIN must be 6 numeric digits. Only numbers are accepted (0-9)."
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-base-content">{t("Reset PIN", "Reset PIN")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Admin dapat mengatur PIN baru untuk pengguna. Kosongkan kolom PIN saat edit jika tidak ingin mengubah.",
                "Admin can set a new PIN for users. Leave PIN field blank when editing if you don't want to change it."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {t("Role & Permissions", "Roles & Permissions")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary">Admin</span>
            </div>
            <ul className="text-xs text-base-content/60 space-y-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                <span>{t("Input SO", "SO Input")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                <span>{t("Lihat & bagikan laporan", "View & share reports")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                <span>{t("Dashboard Harian & Mingguan", "Daily & Weekly Dashboard")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                <span>{t("Master Item (CRUD)", "Master Items (CRUD)")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                <span>{t("Cabang (CRUD)", "Branches (CRUD)")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                <span>{t("Petugas (CRUD)", "Staff (CRUD)")}</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-info/20 bg-info/5 space-y-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-info" />
              <span className="text-xs font-bold text-info">Petugas</span>
            </div>
            <ul className="text-xs text-base-content/60 space-y-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                <span>{t("Input SO", "SO Input")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                <span>{t("Lihat & bagikan laporan", "View & share reports")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-base-content/30 mt-0.5">✗</span>
                <span className="text-base-content/40">{t("Dashboard", "Dashboard")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-base-content/30 mt-0.5">✗</span>
                <span className="text-base-content/40">{t("Master Item", "Master Items")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-base-content/30 mt-0.5">✗</span>
                <span className="text-base-content/40">{t("Cabang", "Branches")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-base-content/30 mt-0.5">✗</span>
                <span className="text-base-content/40">{t("Manajemen Petugas", "Staff Management")}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Branch Access */}
      <section id="branch-access" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" />
          {t("Akses Cabang", "Branch Access")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Setiap pengguna memiliki akses ke satu atau lebih cabang. Akses ini menentukan:",
            "Each user has access to one or more branches. This access determines:"
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <h3 className="text-xs font-bold text-base-content">{t("Cabang yang Terlihat", "Visible Branches")}</h3>
            <p className="text-xs text-base-content/60">
              {t(
                "Switcher di navbar hanya menampilkan cabang yang diakses pengguna.",
                "The navbar switcher only shows branches the user can access."
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <h3 className="text-xs font-bold text-base-content">{t("Data yang Dapat Diakses", "Accessible Data")}</h3>
            <p className="text-xs text-base-content/60">
              {t(
                "SO, laporan, master item, dan data lain hanya menampilkan data cabang yang dipilih.",
                "SO, reports, master items, and other data only show data for the selected branch."
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <h3 className="text-xs font-bold text-base-content">{t("Multi-Cabang", "Multi-Branch")}</h3>
            <p className="text-xs text-base-content/60">
              {t(
                "Pengguna dapat ditetapkan ke beberapa cabang sekaligus. Cukup centang lebih dari satu cabang saat menambah/mengedit.",
                "Users can be assigned to multiple branches at once. Just check more than one branch when adding/editing."
              )}
            </p>
          </div>
        </div>

        <Callout type="note">
          {t(
            "ID cabang disimpan sebagai string dipisah koma (misal: 'CAB001, CAB002'). Saat ditampilkan, ID dikonversi ke nama cabang.",
            "Branch IDs are stored as comma-separated strings (e.g., 'CAB001, CAB002'). When displayed, IDs are converted to branch names."
          )}
        </Callout>
      </section>

      {/* Toggle Active & Delete */}
      <section id="toggle-active" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary" />
          {t("Aktif/Nonaktif & Hapus", "Active/Inactive & Delete")}
        </h2>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-warning" />
              <span className="text-xs font-bold text-warning">{t("Nonaktifkan/Aktifkan", "Deactivate/Activate")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Pengguna nonaktif tidak dapat login. Data tetap tersimpan. Klik 'Aktifkan' untuk mengembalikan akses.",
                "Inactive users cannot log in. Data remains saved. Click 'Activate' to restore access."
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-error/20 bg-error/5 space-y-2">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-error" />
              <span className="text-xs font-bold text-error">{t("Hapus Pengguna", "Delete User")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Menghapus pengguna secara permanen menghapus baris dari spreadsheet. Tindakan ini tidak dapat dibatalkan.",
                "Deleting a user permanently removes the row from the spreadsheet. This action cannot be undone."
              )}
            </p>
            <Callout type="warning">
              {t(
                "Anda tidak dapat menghapus akun sendiri. Tombol hapus akan dinonaktifkan untuk akun yang sedang login.",
                "You cannot delete your own account. The delete button will be disabled for the currently logged-in account."
              )}
            </Callout>
          </div>
        </div>
      </section>

      {/* Admin Only */}
      <section id="admin-only" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {t("Akses Admin", "Admin Access")}
        </h2>

        <div className="p-4 rounded-xl border border-base-300 space-y-2">
          <p className="text-xs text-base-content/70">
            {t(
              "Hanya admin yang dapat mengelola pengguna. Fitur yang tersedia untuk admin:",
              "Only admins can manage users. Features available to admins:"
            )}
          </p>
          <ul className="text-xs text-base-content/60 space-y-1">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Menambah pengguna baru", "Add new users")}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Mengedit data & role pengguna", "Edit user data & roles")}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Mengatur akses cabang pengguna", "Set user branch access")}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Reset PIN pengguna", "Reset user PIN")}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Nonaktifkan/hapus pengguna", "Deactivate/delete users")}</span>
            </li>
          </ul>
        </div>
      </section>
    </DocsPage>
  );
}
