"use client";

import React from "react";
import { DocsPage } from "@/components/docs/DocsPage";
import { Callout } from "@/components/docs/Callout";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Package,
  PlusCircle,
  Edit3,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Shield,
  Search,
  Filter,
  Sliders,
} from "lucide-react";

const toc = [
  { id: "overview", label: "Master Item", level: 1 },
  { id: "add-item", label: "Menambah Item", level: 2 },
  { id: "fields", label: "Field Item", level: 2 },
  { id: "threshold", label: "Threshold Minimum", level: 2 },
  { id: "toggle-active", label: "Aktif/Nonaktif", level: 2 },
  { id: "search-filter", label: "Pencarian & Filter", level: 2 },
  { id: "categories", label: "Kelola Kategori", level: 2 },
  { id: "admin-only", label: "Akses Admin", level: 2 },
];

export default function MasterItemGuidePage() {
  const { t } = useLanguage();

  return (
    <DocsPage
      tocItems={toc}
      prev={{ href: "/docs/user-guide/dashboard", label: "Dashboard", labelEn: "Dashboard" }}
      next={{ href: "/docs/user-guide/cabang", label: "Cabang", labelEn: "Branches" }}
    >
      {/* Title */}
      <div id="overview" className="scroll-mt-32">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
          {t("Master Item", "Master Items")}
        </h1>
        <p className="text-sm text-base-content/60 mt-2">
          {t(
            "Kelola daftar barang, area penempatan, satuan, dan batas minimum stok (threshold) per cabang.",
            "Manage item list, placement areas, units, and minimum stock thresholds per branch."
          )}
        </p>
      </div>

      <Callout type="important">
        {t(
          "Menu Master Item hanya dapat diakses oleh pengguna dengan role Admin. Petugas tidak memiliki akses ke menu ini.",
          "Master Items menu can only be accessed by users with the Admin role. Staff do not have access to this menu."
        )}
      </Callout>

      {/* Add Item */}
      <section id="add-item" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-primary" />
          {t("Menambah Item Baru", "Adding New Items")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            'Klik tombol "Tambah Item Baru" untuk membuka form penambahan item. Isi semua field yang diperlukan lalu klik "Simpan Master Item".',
            'Click "Add New Item" button to open the item creation form. Fill in all required fields then click "Save Master Item".'
          )}
        </p>
      </section>

      {/* Fields */}
      <section id="fields" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          {t("Field Item", "Item Fields")}
        </h2>

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
                  field: t("Nama Barang", "Item Name"),
                  required: true,
                  desc: t("Nama item yang akan muncul di form SO dan laporan", "Item name that will appear in SO forms and reports"),
                },
                {
                  field: t("Area", "Area"),
                  required: true,
                  desc: t("Area penempatan item (Meja Biru Depan, Chiller, Freezer, dll)", "Item placement area (Front Blue Table, Chiller, Freezer, etc)"),
                },
                {
                  field: t("Satuan", "Unit"),
                  required: true,
                  desc: t("Satuan pengukuran item (pcs, kg, liter, dll)", "Item measurement unit (pcs, kg, liter, etc)"),
                },
                {
                  field: t("Konversi Isi", "Content Conversion"),
                  required: false,
                  desc: t("Informasi konversi isi item (opsional)", "Item content conversion info (optional)"),
                },
                {
                  field: t("Konversi Keterangan", "Conversion Notes"),
                  required: false,
                  desc: t("Keterangan tambahan untuk konversi (opsional)", "Additional notes for conversion (optional)"),
                },
                {
                  field: t("Batas Minimum (Threshold)", "Minimum Threshold"),
                  required: true,
                  desc: t("Jumlah minimum stok yang menentukan status Kritis", "Minimum stock count that determines Critical status"),
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

      {/* Threshold */}
      <section id="threshold" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Sliders className="w-5 h-5 text-primary" />
          {t("Threshold Minimum", "Minimum Threshold")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Threshold adalah batas minimum stok yang menentukan status item. Threshold dapat diubah kapan saja dengan mengklik angka threshold pada tabel, lalu mengisi nilai baru dan menekan ikon centang.",
            "Threshold is the minimum stock that determines item status. Threshold can be changed anytime by clicking the threshold number in the table, entering a new value, and pressing the check icon."
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-error/20 bg-error/5 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-error" />
              <span className="text-xs font-bold text-error">{t("Threshold = 0", "Threshold = 0")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Jika threshold diatur ke 0, item tidak dipantau dan status akan menampilkan 'Tidak Dipantau' (abu-abu).",
                "If threshold is set to 0, the item is not monitored and will display 'Not Monitored' (gray) status."
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-warning" />
              <span className="text-xs font-bold text-warning">{t("Threshold > 0", "Threshold > 0")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Status dihitung otomatis: Kritis (Total ≤ Threshold), Hampir Habis (Threshold < Total ≤ Threshold × 2), Aman (Total > Threshold × 2).",
                "Status is calculated automatically: Critical (Total ≤ Threshold), Low Stock (Threshold < Total ≤ Threshold × 2), Safe (Total > Threshold × 2)."
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary">{t("Angka Desimal Koma", "Decimal Comma Values")}</span>
            </div>
            <p className="text-xs text-base-content/60">
              {t(
                "Penulisan desimal ala Indonesia (misal 0,5) dikenali otomatis oleh sistem dan dikonversi menjadi 0.5 tanpa menjadi nol. Ini berlaku untuk nilai threshold desimal.",
                "Indonesian-style decimal comma (e.g., 0,5) is automatically recognized by the system and converted to 0.5 without turning it into zero. This applies to decimal threshold values."
              )}
            </p>
          </div>
        </div>

        <Callout type="warning">
          {t(
            "Perubahan threshold berlaku untuk sesi SO baru. Sesi yang sudah disimpan tidak terpengaruh oleh perubahan threshold.",
            "Threshold changes apply to new SO sessions only. Saved sessions are not affected by threshold changes."
          )}
        </Callout>
      </section>

      {/* Toggle Active */}
      <section id="toggle-active" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          {t("Aktif / Nonaktif", "Active / Inactive")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Setiap item dapat diaktifkan atau dinonaktifkan. Item nonaktif tidak akan muncul di form SO, tetapi data historis tetap tersimpan.",
            "Each item can be activated or deactivated. Inactive items will not appear in SO forms, but historical data remains saved."
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-success/20 bg-success/5 space-y-2">
            <span className="badge badge-success text-xs font-bold uppercase">{t("Aktif", "Active")}</span>
            <p className="text-xs text-base-content/60">
              {t(
                "Item muncul di form SO dan dapat dihitung. Badge hijau pada kolom Status.",
                "Item appears in SO forms and can be counted. Green badge in Status column."
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-base-300 space-y-2">
            <span className="badge badge-ghost text-xs font-bold uppercase">{t("Nonaktif", "Inactive")}</span>
            <p className="text-xs text-base-content/60">
              {t(
                "Item tidak muncul di form SO. Badge abu-abu pada kolom Status. Klik 'Aktifkan' untuk mengembalikan.",
                "Item does not appear in SO forms. Gray badge in Status column. Click 'Activate' to restore."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Search & Filter */}
      <section id="search-filter" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          {t("Pencarian & Filter", "Search & Filter")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Gunakan pencarian untuk mencari item berdasarkan nama, ID, atau area. Filter area untuk mempersempit tampilan.",
            "Use search to find items by name, ID, or area. Filter by area to narrow the view."
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Search className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Pencarian", "Search")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Ketik nama barang, ID item, atau area. Pencarian bersifat case-insensitive.",
                  "Type item name, item ID, or area. Search is case-insensitive."
                )}
              </p>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Filter className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Filter Area", "Area Filter")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Pilih area tertentu dari dropdown untuk melihat hanya item di area tersebut.",
                  "Select a specific area from the dropdown to view only items in that area."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Kelola Kategori */}
      <section id="categories" className="scroll-mt-32 space-y-4">
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          {t("Kelola Kategori (Area)", "Manage Categories (Areas)")}
        </h2>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {t(
            "Kategori (Area) adalah pengelompokan item, misalnya display depan, chiller, atau freezer. Kategori dikelola per cabang oleh admin melalui tombol 'Kelola Kategori' di halaman Master Item.",
            "Categories (Areas) group items, e.g., front display, chiller, or freezer. Categories are managed per branch by admins via the 'Kelola Kategori' button on the Master Items page."
          )}
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <PlusCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Menambah Kategori", "Adding a Category")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Ketik nama kategori baru di bagian atas modal lalu klik Tambah. ID kategori dibuat otomatis (misal KAT-001).",
                  "Type a new category name at the top of the modal and click Add. The category ID is auto-generated (e.g., KAT-001)."
                )}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Edit3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Rename & Urutan", "Rename & Order")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Klik ikon pensil untuk mengubah nama atau urutan kategori. Klik ikon power untuk menonaktifkan/mengaktifkan. Rename otomatis memperbarui semua item yang memakai kategori lama.",
                  "Click the pencil icon to change a category name or order. Click the power icon to deactivate/activate. Renaming automatically updates all items using the old category."
                )}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-base-300 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <X className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-base-content">{t("Menonaktifkan", "Deactivating")}</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {t(
                  "Kategori yang dinonaktifkan tidak muncul saat memilih area untuk item baru, tetapi item lama yang sudah memakainya tetap tampil apa adanya — tidak ada data yang rusak.",
                  "Deactivated categories do not appear when selecting an area for new items, but existing items already using them remain unchanged — no data is broken."
                )}
              </p>
            </div>
          </div>
        </div>

        <Callout type="note">
          {t(
            "Kategori bersifat per cabang. Menambahkan atau mengubah kategori di satu cabang tidak memengaruhi cabang lain.",
            "Categories are per branch. Adding or changing categories in one branch does not affect other branches."
          )}
        </Callout>
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
              "Hanya admin yang dapat mengelola Master Item. Fitur yang tersedia untuk admin:",
              "Only admins can manage Master Items. Features available to admins:"
            )}
          </p>
          <ul className="text-xs text-base-content/60 space-y-1">
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Menambah item baru", "Add new items")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Mengubah threshold item", "Change item thresholds")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Mengaktifkan/menonaktifkan item", "Activate/deactivate items")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Mencari dan memfilter item", "Search and filter items")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{t("Mengelola kategori (area) per cabang", "Manage categories (areas) per branch")}</span>
            </li>
          </ul>
        </div>

        <Callout type="note">
          {t(
            "Menu Master Item hanya muncul di sidebar untuk pengguna dengan role Admin.",
            "Master Items menu only appears in the sidebar for users with the Admin role."
          )}
        </Callout>
      </section>
    </DocsPage>
  );
}
