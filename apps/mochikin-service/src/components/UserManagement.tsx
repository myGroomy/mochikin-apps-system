"use client";

import { useState } from "react";
import {
  UsersThree,
  Plus,
  Trash,
  PencilSimple,
  Check,
  X,
  WarningCircle,
  CheckCircle,
  Key,
  ShieldCheck,
  Building,
} from "@phosphor-icons/react";
import type { ManagedUser } from "@/lib/userService";
import type { ManagedBranch } from "@/lib/branchService";

interface UserManagementProps {
  initialUsers: ManagedUser[];
  branches: ManagedBranch[];
  currentUserId?: string;
  onRefresh?: () => Promise<void> | void;
}

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "role_admin", label: "Admin" },
  { value: "branch_manager", label: "Branch Manager" },
  { value: "staff", label: "Staff / Kasir" },
  { value: "guest", label: "Guest" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "suspended", label: "Ditangguhkan" },
];

export function UserManagement({
  initialUsers,
  branches,
  currentUserId,
  onRefresh,
}: UserManagementProps) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form State
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [newBranchId, setNewBranchId] = useState(
    branches.length > 0 ? branches[0].id : ""
  );

  // Inline Edit State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    username: string;
    name: string;
    email: string;
    phone: string;
    pin: string;
    role: string;
    branchId: string;
    status: string;
  }>({
    username: "",
    name: "",
    email: "",
    phone: "",
    pin: "",
    role: "staff",
    branchId: "",
    status: "active",
  });

  const flash = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = newUsername.trim().toLowerCase();
    const name = newName.trim();
    const email = newEmail.trim().toLowerCase();
    const phone = newPhone.trim();
    const pin = newPin.trim();

    if (!username || !name || !email || !pin || !newBranchId) {
      flash("error", "Username, nama, email, PIN 6 digit, dan cabang wajib diisi.");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      flash("error", "PIN harus tepat 6 digit angka.");
      return;
    }

    setBusy(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          name,
          email,
          phone: phone || undefined,
          pin,
          role: newRole,
          branchId: newBranchId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        flash("error", data.message || "Gagal membuat user");
        setBusy(false);
        return;
      }

      flash("success", data.message || `User ${username} berhasil ditambahkan`);
      setNewUsername("");
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewPin("");
      setNewRole("staff");

      if (onRefresh) {
        await onRefresh();
      } else {
        // Fallback fetch
        const refreshed = await fetch("/api/admin/users").then((r) => r.json());
        if (refreshed.success && refreshed.users) {
          setUsers(refreshed.users);
        }
      }
    } catch {
      flash("error", "Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (u: ManagedUser) => {
    setEditingUserId(u.id);
    setEditDraft({
      username: u.username || "",
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      pin: "",
      role: u.role,
      branchId: u.branchId || (branches.length > 0 ? branches[0].id : ""),
      status: u.status,
    });
  };

  const cancelEdit = () => {
    setEditingUserId(null);
  };

  const handleSaveEdit = async (u: ManagedUser) => {
    const username = editDraft.username.trim().toLowerCase();
    const name = editDraft.name.trim();
    const email = editDraft.email.trim().toLowerCase();
    const phone = editDraft.phone.trim();
    const pin = editDraft.pin.trim();

    if (!username || !name || !email || !editDraft.branchId) {
      flash("error", "Username, nama, email, dan cabang tidak boleh kosong.");
      return;
    }

    if (pin && !/^\d{6}$/.test(pin)) {
      flash("error", "PIN baru harus 6 digit angka.");
      return;
    }

    setBusy(true);

    try {
      const payload: Record<string, unknown> = {
        username,
        name,
        email,
        phone: phone ? phone : null,
        role: editDraft.role,
        branchId: editDraft.branchId,
        status: editDraft.status,
      };

      if (pin) {
        payload.pin = pin;
      }

      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        flash("error", data.message || "Gagal memperbarui user");
        setBusy(false);
        return;
      }

      flash("success", `User ${name} berhasil diperbarui.`);
      setEditingUserId(null);

      if (onRefresh) {
        await onRefresh();
      } else {
        const refreshed = await fetch("/api/admin/users").then((r) => r.json());
        if (refreshed.success && refreshed.users) {
          setUsers(refreshed.users);
        }
      }
    } catch {
      flash("error", "Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteUser = async (u: ManagedUser) => {
    if (u.id === currentUserId) {
      flash("error", "Anda tidak dapat menghapus akun Anda sendiri.");
      return;
    }

    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus user ${u.name} (@${u.username || u.email})?`
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        flash("error", data.message || "Gagal menghapus user");
        setBusy(false);
        return;
      }

      flash("success", `User ${u.name} berhasil dihapus.`);

      if (onRefresh) {
        await onRefresh();
      } else {
        setUsers((prev) => prev.filter((item) => item.id !== u.id));
      }
    } catch {
      flash("error", "Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-amber/15 text-amber border border-amber/30";
      case "role_admin":
        return "bg-accent/15 text-accent border border-accent/30";
      case "branch_manager":
        return "bg-sky-500/15 text-sky-700 border border-sky-500/30";
      case "staff":
        return "bg-emerald/10 text-emerald border border-emerald/20";
      default:
        return "bg-sunken text-ash border border-hairline";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald/10 text-emerald border border-emerald/20";
      case "suspended":
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
                <UsersThree className="w-5 h-5" weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-ink">
                    Manajemen User
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                    {users.length} staf
                  </span>
                </div>
                <p className="text-xs text-ash">
                  Kelola akun staf, hak akses role, PIN login SSO, dan penugasan cabang
                </p>
              </div>
            </div>
          </div>

          {/* Form Tambah User */}
          <form
            onSubmit={handleAddUser}
            className="rounded-lg border border-hairline bg-sunken/40 p-4 space-y-3"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink uppercase tracking-wider">
              <Plus className="w-3.5 h-3.5 text-accent" weight="bold" />
              <span>Tambah User Staf Baru</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-ash mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  placeholder="kasir_bandung1"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={busy}
                  required
                  className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ash mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  placeholder="Budi Santoso"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={busy}
                  required
                  className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ash mb-1">
                  Email SSO *
                </label>
                <input
                  type="email"
                  placeholder="budi@mochikin.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={busy}
                  required
                  className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ash mb-1">
                  Nomor HP (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ash mb-1">
                  PIN Akses (6 Digit) *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="123456"
                  value={newPin}
                  onChange={(e) =>
                    setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={busy}
                  required
                  className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 font-mono text-xs tracking-widest text-ink placeholder:tracking-normal placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ash mb-1">
                  Role Akses *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:opacity-60"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-medium text-ash mb-1">
                  Cabang Penugasan *
                </label>
                <select
                  value={newBranchId}
                  onChange={(e) => setNewBranchId(e.target.value)}
                  disabled={busy || branches.length === 0}
                  className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:opacity-60"
                >
                  {branches.length === 0 ? (
                    <option value="">Belum ada cabang terdaftar</option>
                  ) : (
                    branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.code}] {b.name} - {b.city}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={busy || branches.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-deep active:scale-95 disabled:opacity-50"
              >
                {busy ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Plus className="w-3.5 h-3.5" weight="bold" />
                )}
                <span>Tambah User</span>
              </button>
            </div>
          </form>

          {/* Daftar User */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-ink uppercase tracking-wider">
              Daftar Staf Terdaftar ({users.length})
            </div>

            {users.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-hairline rounded-lg text-ash text-xs">
                Belum ada data user. Silakan tambahkan user di atas.
              </div>
            ) : (
              <div className="divide-y divide-hairline rounded-lg border border-hairline bg-white overflow-hidden">
                {users.map((u) => {
                  const isEditing = editingUserId === u.id;
                  const isSelf = u.id === currentUserId;

                  return (
                    <div
                      key={u.id}
                      className="p-3 sm:p-4 hover:bg-sunken/20 transition-colors"
                    >
                      {isEditing ? (
                        /* Inline Edit Mode */
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-medium text-ash mb-0.5">
                                Username
                              </label>
                              <input
                                type="text"
                                value={editDraft.username}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    username: e.target.value,
                                  })
                                }
                                disabled={busy}
                                className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-ash mb-0.5">
                                Nama Lengkap
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
                                Email SSO
                              </label>
                              <input
                                type="email"
                                value={editDraft.email}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    email: e.target.value,
                                  })
                                }
                                disabled={busy}
                                className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-ash mb-0.5">
                                Nomor HP
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
                                placeholder="Kosongkan jika tidak ada"
                                className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-ash mb-0.5">
                                Reset PIN 6-digit (Opsional)
                              </label>
                              <input
                                type="password"
                                maxLength={6}
                                inputMode="numeric"
                                placeholder="Kosongkan jika tak diubah"
                                value={editDraft.pin}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    pin: e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 6),
                                  })
                                }
                                disabled={busy}
                                className="w-full rounded border border-hairline bg-white px-2 py-1 font-mono text-xs text-ink outline-none focus:border-accent"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-ash mb-0.5">
                                Role Akses
                              </label>
                              <select
                                value={editDraft.role}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    role: e.target.value,
                                  })
                                }
                                disabled={busy}
                                className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                              >
                                {ROLE_OPTIONS.map((r) => (
                                  <option key={r.value} value={r.value}>
                                    {r.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-ash mb-0.5">
                                Cabang
                              </label>
                              <select
                                value={editDraft.branchId}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    branchId: e.target.value,
                                  })
                                }
                                disabled={busy}
                                className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                              >
                                {branches.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    [{b.code}] {b.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-ash mb-0.5">
                                Status Akun
                              </label>
                              <select
                                value={editDraft.status}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    status: e.target.value,
                                  })
                                }
                                disabled={busy || isSelf}
                                className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent disabled:opacity-50"
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s.value} value={s.value}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-hairline">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(u)}
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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 font-bold text-xs text-accent uppercase">
                              {(u.name || u.username || "U")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-ink truncate">
                                  {u.name}
                                </span>
                                {isSelf && (
                                  <span className="shrink-0 inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                                    Anda
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-ash mt-0.5">
                                <span className="font-mono text-ink">
                                  @{u.username || "tanpa-username"}
                                </span>
                                <span>•</span>
                                <span className="truncate">{u.email}</span>
                                {u.phone && (
                                  <>
                                    <span>•</span>
                                    <span>{u.phone}</span>
                                  </>
                                )}
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-ink-soft">
                                  <Building
                                    className="w-3.5 h-3.5 text-mist shrink-0"
                                    weight="duotone"
                                  />
                                  <span className="truncate">
                                    {u.branchName} ({u.branchCode})
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Fixed position badges & actions on the right */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-hairline/60">
                            {/* Badges container with fixed alignment */}
                            <div className="flex items-center gap-1.5 sm:min-w-[170px] sm:justify-end">
                              <span
                                className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-medium capitalize whitespace-nowrap ${getRoleBadgeClass(
                                  u.role
                                )}`}
                              >
                                {u.role.replace("_", " ")}
                              </span>
                              <span
                                className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-medium capitalize whitespace-nowrap ${getStatusBadgeClass(
                                  u.status
                                )}`}
                              >
                                {u.status}
                              </span>
                            </div>

                            {/* Actions: Ubah & Hapus */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEdit(u)}
                                disabled={busy}
                                className="inline-flex items-center gap-1 rounded border border-hairline bg-white px-2.5 py-1.5 text-xs font-medium text-ash transition-colors hover:bg-sunken hover:text-ink active:scale-95"
                                title="Ubah data user"
                              >
                                <PencilSimple
                                  className="w-3.5 h-3.5"
                                  weight="bold"
                                />
                                <span className="hidden sm:inline">Ubah</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                disabled={busy || isSelf}
                                className="inline-flex items-center gap-1 rounded border border-rose/20 bg-white px-2.5 py-1.5 text-xs font-medium text-rose transition-colors hover:bg-rose/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                                title={
                                  isSelf
                                    ? "Tidak dapat menghapus akun sendiri"
                                    : "Hapus user"
                                }
                              >
                                <Trash className="w-3.5 h-3.5" weight="bold" />
                                <span className="hidden sm:inline">Hapus</span>
                              </button>
                            </div>
                          </div>
                        </div>
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
