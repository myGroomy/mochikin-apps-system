"use client";

import { useState } from "react";
import {
  Storefront,
  Plus,
  Trash,
  PencilSimple,
  Check,
  X,
  WarningCircle,
  CheckCircle,
  MapPin,
  Phone,
  Users,
} from "@phosphor-icons/react";
import type { ManagedBranch } from "@/lib/branchService";

interface BranchManagementProps {
  initialBranches: ManagedBranch[];
  onRefresh?: () => Promise<void> | void;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "closed", label: "Tutup" },
  { value: "inactive", label: "Nonaktif" },
];

export function BranchManagement({
  initialBranches,
  onRefresh,
}: BranchManagementProps) {
  const [branches, setBranches] = useState<ManagedBranch[]>(initialBranches);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form State
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // Inline Edit State
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    code: string;
    name: string;
    city: string;
    address: string;
    phone: string;
    status: string;
  }>({
    code: "",
    name: "",
    city: "",
    address: "",
    phone: "",
    status: "active",
  });

  const flash = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCode.trim().toUpperCase();
    const name = newName.trim();
    const city = newCity.trim();
    const address = newAddress.trim();
    const phone = newPhone.trim();

    if (!code || !name || !city) {
      flash("error", "Kode cabang, nama cabang, dan kota wajib diisi.");
      return;
    }

    if (code.length < 2 || code.length > 10) {
      flash("error", "Kode cabang harus antara 2 hingga 10 karakter.");
      return;
    }

    setBusy(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          city,
          address: address || undefined,
          phone: phone || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        flash("error", data.message || "Gagal membuat cabang");
        setBusy(false);
        return;
      }

      flash("success", data.message || `Cabang ${name} berhasil ditambahkan`);
      setNewCode("");
      setNewName("");
      setNewCity("");
      setNewAddress("");
      setNewPhone("");

      if (onRefresh) {
        await onRefresh();
      } else {
        const refreshed = await fetch("/api/admin/branches").then((r) =>
          r.json()
        );
        if (refreshed.success && refreshed.branches) {
          setBranches(refreshed.branches);
        }
      }
    } catch {
      flash("error", "Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (b: ManagedBranch) => {
    setEditingBranchId(b.id);
    setEditDraft({
      code: b.code,
      name: b.name,
      city: b.city,
      address: b.address || "",
      phone: b.phone || "",
      status: b.status,
    });
  };

  const cancelEdit = () => {
    setEditingBranchId(null);
  };

  const handleSaveEdit = async (b: ManagedBranch) => {
    const code = editDraft.code.trim().toUpperCase();
    const name = editDraft.name.trim();
    const city = editDraft.city.trim();
    const address = editDraft.address.trim();
    const phone = editDraft.phone.trim();

    if (!code || !name || !city) {
      flash("error", "Kode, nama, dan kota tidak boleh kosong.");
      return;
    }

    setBusy(true);

    try {
      const res = await fetch(`/api/admin/branches/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          city,
          address: address || null,
          phone: phone || null,
          status: editDraft.status,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        flash("error", data.message || "Gagal memperbarui cabang");
        setBusy(false);
        return;
      }

      flash("success", `Cabang ${name} berhasil diperbarui.`);
      setEditingBranchId(null);

      if (onRefresh) {
        await onRefresh();
      } else {
        const refreshed = await fetch("/api/admin/branches").then((r) =>
          r.json()
        );
        if (refreshed.success && refreshed.branches) {
          setBranches(refreshed.branches);
        }
      }
    } catch {
      flash("error", "Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteBranch = async (b: ManagedBranch) => {
    if (b.userCount > 0) {
      flash(
        "error",
        `Cabang ${b.name} masih memiliki ${b.userCount} user aktif. Pindahkan user terlebih dahulu.`
      );
      return;
    }

    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus cabang ${b.name} (${b.code})?`
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const res = await fetch(`/api/admin/branches/${b.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        flash("error", data.message || "Gagal menghapus cabang");
        setBusy(false);
        return;
      }

      flash("success", `Cabang ${b.name} berhasil dihapus.`);

      if (onRefresh) {
        await onRefresh();
      } else {
        setBranches((prev) => prev.filter((item) => item.id !== b.id));
      }
    } catch {
      flash("error", "Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald/10 text-emerald border border-emerald/20";
      case "closed":
        return "bg-rose/10 text-rose border border-rose/20";
      default:
        return "bg-sunken text-mist border border-hairline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center gap-2 text-xs py-2 px-3 rounded-md border ${
            feedback.type === "success"
              ? "bg-emerald/10 text-emerald border-emerald/20"
              : "bg-rose/10 text-rose border-rose/20"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" weight="bold" />
          ) : (
            <WarningCircle className="w-4 h-4 shrink-0" weight="bold" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Outer Doppel Container */}
      <div className="doppel-outer">
        <div className="doppel-inner p-4 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-hairline pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Storefront className="w-5 h-5" weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-ink">
                    Manajemen Cabang
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                    {branches.length} cabang
                  </span>
                </div>
                <p className="text-xs text-ash">
                  Kelola cabang outlet Mochikin, kode POS, kontak lokasi, dan operasional
                </p>
              </div>
            </div>
          </div>

          {/* Form Tambah Cabang */}
          <form
            onSubmit={handleAddBranch}
            className="rounded-lg border border-hairline bg-sunken/40 p-4 space-y-3"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink uppercase tracking-wider">
              <Plus className="w-3.5 h-3.5 text-accent" weight="bold" />
              <span>Tambah Cabang Baru</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-ash mb-1">
                  Kode Cabang * (2-10 Karakter)
                </label>
                <input
                  type="text"
                  placeholder="CMH"
                  maxLength={10}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  disabled={busy}
                  required
                  className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 font-mono uppercase text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ash mb-1">
                  Nama Cabang *
                </label>
                <input
                  type="text"
                  placeholder="Cimahi Sangkuriang"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={busy}
                  required
                  className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ash mb-1">
                  Kota / Wilayah *
                </label>
                <input
                  type="text"
                  placeholder="Cimahi"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  disabled={busy}
                  required
                  className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ash mb-1">
                  Nomor Telepon Outlet
                </label>
                <input
                  type="tel"
                  placeholder="08123456789"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:opacity-60"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-ash mb-1">
                  Alamat Lengkap Outlet
                </label>
                <input
                  type="text"
                  placeholder="Jl. Sangkuriang No. 12, Cimahi Utara"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-deep active:scale-95 disabled:opacity-50"
              >
                {busy ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Plus className="w-3.5 h-3.5" weight="bold" />
                )}
                <span>Tambah Cabang</span>
              </button>
            </div>
          </form>

          {/* Daftar Cabang */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-ink uppercase tracking-wider">
              Daftar Cabang Aktif ({branches.length})
            </div>

            {branches.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-hairline rounded-lg text-ash text-xs">
                Belum ada data cabang. Silakan tambahkan cabang baru di atas.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {branches.map((b) => {
                  const isEditing = editingBranchId === b.id;

                  return (
                    <div
                      key={b.id}
                      className="rounded-lg border border-hairline bg-white p-3.5 hover:shadow-xs transition-shadow flex flex-col justify-between space-y-3"
                    >
                      {isEditing ? (
                        /* Inline Edit Mode */
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-medium text-ash mb-0.5">
                                Kode
                              </label>
                              <input
                                type="text"
                                maxLength={10}
                                value={editDraft.code}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    code: e.target.value.toUpperCase(),
                                  })
                                }
                                disabled={busy}
                                className="w-full rounded border border-hairline bg-white px-2 py-1 font-mono uppercase text-xs text-ink outline-none focus:border-accent"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-ash mb-0.5">
                                Status
                              </label>
                              <select
                                value={editDraft.status}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    status: e.target.value,
                                  })
                                }
                                disabled={busy}
                                className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s.value} value={s.value}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-ash mb-0.5">
                              Nama Cabang
                            </label>
                            <input
                              type="text"
                              value={editDraft.name}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  name: e.target.value,
                                })
                              }
                              disabled={busy}
                              className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-ash mb-0.5">
                              Kota
                            </label>
                            <input
                              type="text"
                              value={editDraft.city}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  city: e.target.value,
                                })
                              }
                              disabled={busy}
                              className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-ash mb-0.5">
                              Alamat
                            </label>
                            <input
                              type="text"
                              value={editDraft.address}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  address: e.target.value,
                                })
                              }
                              disabled={busy}
                              className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-ash mb-0.5">
                              Telepon
                            </label>
                            <input
                              type="tel"
                              value={editDraft.phone}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  phone: e.target.value,
                                })
                              }
                              disabled={busy}
                              className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(b)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-deep active:scale-95 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" weight="bold" />
                              <span>Simpan</span>
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded border border-hairline bg-white px-3 py-1.5 text-xs font-medium text-ash transition-colors hover:bg-sunken hover:text-ink"
                            >
                              <X className="w-3.5 h-3.5" weight="bold" />
                              <span>Batal</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Normal View Mode */
                        <>
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded bg-accent/10 px-2 py-0.5 font-mono text-xs font-bold text-accent">
                                  {b.code}
                                </span>
                                <h3 className="font-semibold text-sm text-ink truncate">
                                  {b.name}
                                </h3>
                              </div>

                              <span
                                className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium capitalize ${getStatusBadgeClass(
                                  b.status
                                )}`}
                              >
                                {b.status}
                              </span>
                            </div>

                            <div className="space-y-1 text-xs text-ash mt-2">
                              <div className="flex items-center gap-1.5">
                                <MapPin
                                  className="w-3.5 h-3.5 shrink-0 text-mist"
                                  weight="duotone"
                                />
                                <span className="truncate">
                                  {b.city}
                                  {b.address ? ` • ${b.address}` : ""}
                                </span>
                              </div>

                              {b.phone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone
                                    className="w-3.5 h-3.5 shrink-0 text-mist"
                                    weight="duotone"
                                  />
                                  <span>{b.phone}</span>
                                </div>
                              )}

                              <div className="flex items-center gap-1.5 pt-1">
                                <Users
                                  className="w-3.5 h-3.5 shrink-0 text-accent"
                                  weight="duotone"
                                />
                                <span className="font-medium text-ink">
                                  {b.userCount} staf terdaftar
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-hairline">
                            <button
                              type="button"
                              onClick={() => startEdit(b)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded border border-hairline bg-white px-2.5 py-1 text-xs font-medium text-ash transition-colors hover:bg-sunken hover:text-ink active:scale-95"
                              title="Ubah cabang"
                            >
                              <PencilSimple
                                className="w-3 h-3"
                                weight="bold"
                              />
                              <span>Ubah</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBranch(b)}
                              disabled={busy || b.userCount > 0}
                              className="inline-flex items-center gap-1 rounded border border-rose/20 bg-white px-2.5 py-1 text-xs font-medium text-rose transition-colors hover:bg-rose/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                              title={
                                b.userCount > 0
                                  ? `Tidak dapat menghapus cabang dengan ${b.userCount} user aktif`
                                  : "Hapus cabang"
                              }
                            >
                              <Trash className="w-3 h-3" weight="bold" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
