"use client";

import { useState, useEffect } from "react";
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
  ArrowsClockwise,
  Clock,
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

  // Auto-Sync Retry & Cooldown State
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const [lastErrorStage, setLastErrorStage] = useState<string | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (retryCountdown <= 0) return;
    const timer = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryCountdown]);

  // Form State
  const [showAddBranchForm, setShowAddBranchForm] = useState(false);
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

  // Assigned Staff Modal State
  const [staffModalBranch, setStaffModalBranch] = useState<ManagedBranch | null>(null);
  const [branchStaffList, setBranchStaffList] = useState<
    Array<{
      id: string;
      name: string;
      username: string | null;
      role: string;
      isPrimary: boolean;
    }>
  >([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const openStaffModal = async (branch: ManagedBranch) => {
    setStaffModalBranch(branch);
    setLoadingStaff(true);
    setBranchStaffList([]);

    try {
      const res = await fetch(`/api/admin/branches/${branch.id}/staff`);
      const data = await res.json();
      if (data.success && Array.isArray(data.staff)) {
        setBranchStaffList(data.staff);
      }
    } catch (err) {
      console.error("Gagal memuat staf cabang:", err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const closeStaffModal = () => {
    setStaffModalBranch(null);
    setBranchStaffList([]);
  };

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
        // Form tetap utuh, tidak di-reset!
        setLastErrorStage(data.stage || "drive");
        const retrySec = data.retryAfter || 60;
        setRetryCountdown(retrySec);
        flash("error", data.message || "Gagal membuat cabang");
        setBusy(false);
        return;
      }

      flash("success", data.message || `Cabang ${name} berhasil ditambahkan`);
      setShowAddBranchForm(false);
      setRetryCountdown(0);
      setLastErrorStage(null);
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
                  Kelola cabang outlet, kode POS, kontak lokasi, dan operasional
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddBranchForm((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-soft active:scale-95 cursor-pointer self-start sm:self-auto min-h-[38px]"
            >
              <Plus className="w-4 h-4" weight="bold" />
              <span>{showAddBranchForm ? "Tutup Form Tambah" : "Tambah Cabang Baru"}</span>
            </button>
          </div>

          {/* Form Tambah Cabang: Collapsible */}
          {showAddBranchForm && (
            <form
              onSubmit={handleAddBranch}
              className="rounded-xl border border-hairline bg-sunken/40 p-4 space-y-3 animate-in fade-in duration-200"
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

            {/* Retry Countdown Notice Banner */}
            {retryCountdown > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in duration-200">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-spin" />
                <div className="flex-1">
                  <div className="font-semibold text-amber-800">
                    Proses Google Drive tertunda / cooldown limit tercapai
                  </div>
                  <p className="mt-0.5 text-amber-700">
                    Data isian form Anda tetap tersimpan. Demi keamanan kuota Google API, Anda dapat mengulangi pembuatan cabang dalam{" "}
                    <span className="font-bold underline">{retryCountdown} detik</span>.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={busy || retryCountdown > 0}
                className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 ${
                  retryCountdown > 0
                    ? "bg-amber-600 hover:bg-amber-700 cursor-not-allowed"
                    : "bg-accent hover:bg-accent-deep"
                }`}
              >
                {busy ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Menyiapkan Google Drive & Cabang...</span>
                  </>
                ) : retryCountdown > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5" weight="bold" />
                    <span>Ulangi dalam {retryCountdown}s</span>
                  </>
                ) : lastErrorStage ? (
                  <>
                    <ArrowsClockwise className="w-3.5 h-3.5" weight="bold" />
                    <span>Coba Buat Ulang Sekarang</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" weight="bold" />
                    <span>Tambah Cabang & Auto-Sync Drive</span>
                  </>
                )}
              </button>
            </div>
          </form>
          )}

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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-1.5">
                                  <Users
                                    className="w-3.5 h-3.5 shrink-0 text-accent"
                                    weight="duotone"
                                  />
                                  <span className="font-medium text-ink">
                                    {b.userCount} staf terdaftar
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openStaffModal(b)}
                                  className="text-[11px] text-accent hover:underline font-semibold"
                                >
                                  Lihat Tim &rarr;
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-hairline">
                            <button
                              type="button"
                              onClick={() => startEdit(b)}
                              disabled={busy}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ash transition-colors hover:bg-sunken hover:text-ink active:scale-95 cursor-pointer"
                              title="Ubah cabang"
                            >
                              <PencilSimple
                                className="w-3.5 h-3.5"
                                weight="bold"
                              />
                              <span>Ubah</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBranch(b)}
                              disabled={busy || b.userCount > 0}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-rose/20 bg-surface px-3 py-1.5 text-xs font-semibold text-rose transition-colors hover:bg-rose/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                              title={
                                b.userCount > 0
                                  ? `Tidak dapat menghapus cabang dengan ${b.userCount} user aktif`
                                  : "Hapus cabang"
                              }
                            >
                              <Trash className="w-3.5 h-3.5" weight="bold" />
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

      {/* Modal / Drawer Daftar Staf Cabang */}
      {staffModalBranch && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-xl border-t sm:border border-hairline bg-surface shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div>
                <h3 className="font-bold text-base text-ink">
                  Daftar Staf Cabang {staffModalBranch.name}
                </h3>
                <p className="text-xs text-ash">
                  Kode Cabang: <span className="font-mono font-semibold text-accent">{staffModalBranch.code}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeStaffModal}
                className="rounded-full p-1 text-ash hover:bg-sunken hover:text-ink"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {loadingStaff ? (
                <div className="text-center py-6 text-xs text-ash">
                  Memuat data staf cabang...
                </div>
              ) : branchStaffList.length === 0 ? (
                <div className="text-center py-6 text-xs text-ash border border-dashed border-hairline rounded-lg">
                  Belum ada staf yang ditugaskan ke cabang ini.
                </div>
              ) : (
                branchStaffList.map((staf) => (
                  <div
                    key={staf.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-hairline/70 bg-sunken/30 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-ink">{staf.name}</div>
                      <div className="text-[11px] text-ash font-mono">
                        @{staf.username || "tanpa-username"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-semibold uppercase">
                        {staf.role.toLowerCase().includes("admin") || staf.role.toLowerCase().includes("super") ? "Admin" : "Petugas"}
                      </span>
                      {staf.isPrimary && (
                        <span className="rounded bg-emerald/10 text-emerald px-1.5 py-0.5 text-[10px] font-medium">
                          Utama
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-hairline">
              <button
                type="button"
                onClick={closeStaffModal}
                className="w-full sm:w-auto min-h-[42px] rounded-xl bg-sunken border border-hairline px-5 py-2 text-xs font-semibold text-ink hover:bg-sunken/80 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
