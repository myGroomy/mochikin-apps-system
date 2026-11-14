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
  Building,
  CaretDown,
  MagnifyingGlass,
  Funnel,
  XCircle,
  Storefront,
  ArrowsDownUp,
  Clock,
  ListDashes,
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
  { value: "admin", label: "Admin" },
  { value: "petugas", label: "Petugas" },
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newRole, setNewRole] = useState("petugas");
  const [newBranchIds, setNewBranchIds] = useState<string[]>(
    branches.length > 0 ? [branches[0].id] : []
  );
  const [showAddBranchDropdown, setShowAddBranchDropdown] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loginFilter, setLoginFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("name_asc");
  const [viewMode, setViewMode] = useState<"list" | "grouped">("list");
  // Inline Edit State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showEditBranchDropdown, setShowEditBranchDropdown] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    username: string;
    name: string;
    email: string;
    phone: string;
    pin: string;
    role: string;
    branchId: string;
    branchIds: string[];
    status: string;
  }>({
    username: "",
    name: "",
    email: "",
    phone: "",
    pin: "",
    role: "staff",
    branchId: "",
    branchIds: [],
    status: "active",
  });

  const flash = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const adminCount = users.filter((u) => u.role.toLowerCase().includes("admin") || u.role.toLowerCase().includes("super")).length;
  const staffCount = users.filter((u) => !u.role.toLowerCase().includes("admin") && !u.role.toLowerCase().includes("super")).length;
  const multiBranchCount = users.filter((u) => (u.assignedBranchIds?.length || (u.branchId ? 1 : 0)) > 1).length;
  const neverLoginCount = users.filter((u) => !u.lastLoginAt).length;
  const inactiveCount = users.filter((u) => u.status !== "active").length;

  const filteredUsers = users
    .filter((u) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (u.name || "").toLowerCase().includes(q);
        const matchUsername = (u.username || "").toLowerCase().includes(q);
        const matchEmail = (u.email || "").toLowerCase().includes(q);
        const matchPhone = (u.phone || "").toLowerCase().includes(q);
        const matchBranch =
          (u.branchName || "").toLowerCase().includes(q) ||
          (u.branchCode || "").toLowerCase().includes(q);
        if (!matchName && !matchUsername && !matchEmail && !matchPhone && !matchBranch) {
          return false;
        }
      }

      if (branchFilter !== "ALL") {
        const assignedTotal = u.assignedBranchIds?.length || (u.branchId ? 1 : 0);
        if (branchFilter === "MULTI") {
          if (assignedTotal <= 1) return false;
        } else if (branchFilter === "SINGLE") {
          if (assignedTotal !== 1) return false;
        } else if (branchFilter === "NONE") {
          if (assignedTotal > 0) return false;
        } else {
          const isPrimary = u.branchId === branchFilter;
          const isAssigned = u.assignedBranchIds?.includes(branchFilter);
          if (!isPrimary && !isAssigned) return false;
        }
      }

      if (roleFilter !== "ALL") {
        const isUserAdmin = u.role.toLowerCase().includes("admin") || u.role.toLowerCase().includes("super");
        if (roleFilter === "admin" && !isUserAdmin) return false;
        if (roleFilter === "petugas" && isUserAdmin) return false;
        if (roleFilter === "branch_manager" && u.role !== "branch_manager") return false;
        if (roleFilter === "guest" && u.role !== "guest") return false;
      }

      if (statusFilter !== "ALL") {
        if (u.status !== statusFilter) return false;
      }

      if (loginFilter !== "ALL") {
        if (loginFilter === "logged_in" && !u.lastLoginAt) return false;
        if (loginFilter === "never_logged_in" && u.lastLoginAt) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name_desc") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "created_desc") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === "created_asc") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === "last_login") return (b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0) - (a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0);
      if (sortBy === "branches_count") {
        const countA = a.assignedBranchIds?.length || (a.branchId ? 1 : 0);
        const countB = b.assignedBranchIds?.length || (b.branchId ? 1 : 0);
        return countB - countA;
      }
      return 0;
    });

  const resetFilters = () => {
    setSearchQuery("");
    setBranchFilter("ALL");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setLoginFilter("ALL");
    setSortBy("name_asc");
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    branchFilter !== "ALL" ||
    roleFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    loginFilter !== "ALL" ||
    sortBy !== "name_asc";

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = newUsername.trim().toLowerCase();
    const name = newName.trim();
    const email = newEmail.trim().toLowerCase();
    const phone = newPhone.trim();
    const pin = newPin.trim();

    if (!username || !name || !email || !pin || newBranchIds.length === 0) {
      flash("error", "Username, nama, email, PIN 6 digit, dan minimal satu cabang penugasan wajib diisi.");
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
          branchId: newBranchIds[0],
          branchIds: newBranchIds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        flash("error", data.message || "Gagal membuat user");
        setBusy(false);
        return;
      }

      flash("success", data.message || `User ${username} berhasil ditambahkan`);
      setShowAddForm(false);
      setNewUsername("");
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewPin("");
      setNewRole("staff");
      setNewBranchIds(branches.length > 0 ? [branches[0].id] : []);
      setShowAddBranchDropdown(false);

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

  const startEdit = (u: ManagedUser) => {
    setEditingUserId(u.id);
    const assigned = u.assignedBranchIds && u.assignedBranchIds.length > 0
      ? u.assignedBranchIds
      : (u.branchId ? [u.branchId] : (branches.length > 0 ? [branches[0].id] : []));

    const isRoleAdmin = u.role.toLowerCase().includes("admin") || u.role.toLowerCase().includes("super");
    setEditDraft({
      username: u.username || "",
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      pin: "",
      role: isRoleAdmin ? "admin" : "petugas",
      branchId: assigned[0] || "",
      branchIds: assigned,
      status: u.status,
    });
    setShowEditBranchDropdown(false);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setShowEditBranchDropdown(false);
  };

  const handleSaveEdit = async (u: ManagedUser) => {
    const username = editDraft.username.trim().toLowerCase();
    const name = editDraft.name.trim();
    const email = editDraft.email.trim().toLowerCase();
    const phone = editDraft.phone.trim();
    const pin = editDraft.pin.trim();

    if (!username || !name || !email || editDraft.branchIds.length === 0) {
      flash("error", "Username, nama, email, dan minimal satu cabang penugasan tidak boleh kosong.");
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
        branchId: editDraft.branchIds[0],
        branchIds: editDraft.branchIds,
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

  const toggleAddBranch = (branchId: string) => {
    setNewBranchIds((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  const toggleEditBranch = (branchId: string) => {
    setEditDraft((prev) => {
      const current = prev.branchIds || [];
      const updated = current.includes(branchId)
        ? current.filter((id) => id !== branchId)
        : [...current, branchId];
      return {
        ...prev,
        branchIds: updated,
        branchId: updated[0] || "",
      };
    });
  };

  const selectAllAddBranches = () => {
    setNewBranchIds(branches.map((b) => b.id));
  };

  const clearAddBranches = () => {
    setNewBranchIds([]);
  };

  const selectAllEditBranches = () => {
    setEditDraft((prev) => ({
      ...prev,
      branchIds: branches.map((b) => b.id),
      branchId: branches[0]?.id || "",
    }));
  };

  const clearEditBranches = () => {
    setEditDraft((prev) => ({
      ...prev,
      branchIds: [],
      branchId: "",
    }));
  };

  const getRoleBadgeClass = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes("admin") || r.includes("super")) {
      return "bg-accent/15 text-accent border border-accent/30";
    }
    return "bg-emerald/10 text-emerald border border-emerald/20";
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
                  Kelola akun staf, hak akses role, PIN login SSO, dan multi-penugasan cabang
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-soft active:scale-95 cursor-pointer self-start sm:self-auto min-h-[38px]"
            >
              <Plus className="w-4 h-4" weight="bold" />
              <span>{showAddForm ? "Tutup Form Tambah" : "Tambah User Baru"}</span>
            </button>
          </div>

          {/* Form Tambah User: Collapsible di Mobile & Desktop */}
          {showAddForm && (
            <form
              onSubmit={handleAddUser}
              className="rounded-xl border border-hairline bg-sunken/40 p-4 space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between border-b border-hairline/60 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
                  <Plus className="w-3.5 h-3.5 text-accent" weight="bold" />
                  <span>Tambah User Staf Baru</span>
                </div>
                <span className="text-[11px] text-ash">Formulir Pendaftaran Staf</span>
              </div>

            {/* Layout 2 Kolom Desktop, 1 Kolom Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kolom 1: Data Akun & Kredensial */}
              <div className="space-y-3 bg-white/70 p-3 rounded-lg border border-hairline/70">
                <div className="text-[11px] font-semibold text-accent uppercase tracking-wider border-b border-hairline/60 pb-1">
                  1. Informasi Akun & Kredensial
                </div>

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
                    PIN Akses (6 Digit Angka) *
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
              </div>

              {/* Kolom 2: Kontak & Hak Akses Penugasan */}
              <div className="space-y-3 bg-white/70 p-3 rounded-lg border border-hairline/70">
                <div className="text-[11px] font-semibold text-accent uppercase tracking-wider border-b border-hairline/60 pb-1">
                  2. Kontak & Hak Akses Cabang
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-ash mb-1">
                    Nomor WhatsApp / HP
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
                    Role Hak Akses *
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

                {/* Multi-Branch Assignment Dropdown */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-ash">
                      Cabang Penugasan Multi-Select *
                    </label>
                    <span className="text-[10px] font-semibold text-accent">
                      {newBranchIds.length} cabang dipilih
                    </span>
                  </div>

                  {/* Dropdown Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowAddBranchDropdown((v) => !v)}
                    disabled={busy || branches.length === 0}
                    className="w-full flex items-center justify-between rounded-md border border-hairline bg-white px-2.5 py-2 text-xs text-ink outline-none focus:border-accent text-left hover:bg-sunken/40"
                  >
                    <span className="truncate">
                      {newBranchIds.length === 0
                        ? "Pilih cabang..."
                        : newBranchIds.length === 1
                        ? branches.find((b) => b.id === newBranchIds[0])?.name || "1 cabang dipilih"
                        : `${newBranchIds.length} cabang terpilih (${branches
                            .filter((b) => newBranchIds.includes(b.id))
                            .map((b) => b.code)
                            .join(", ")})`}
                    </span>
                    <CaretDown className="w-3.5 h-3.5 text-ash shrink-0 ml-1" />
                  </button>

                  {/* Multi-Branch Popover Menu */}
                  {showAddBranchDropdown && (
                    <div className="absolute z-30 mt-1 w-full rounded-lg border border-hairline bg-white p-2 shadow-lg space-y-2">
                      <div className="flex items-center justify-between border-b border-hairline pb-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={selectAllAddBranches}
                          className="text-accent hover:underline font-medium"
                        >
                          Pilih Semua
                        </button>
                        <button
                          type="button"
                          onClick={clearAddBranches}
                          className="text-ash hover:text-rose font-medium"
                        >
                          Hapus Pilihan
                        </button>
                      </div>

                      <div className="max-h-48 overflow-y-auto divide-y divide-hairline/40">
                        {branches.map((b) => {
                          const isChecked = newBranchIds.includes(b.id);
                          return (
                            <label
                              key={b.id}
                              className="flex items-center gap-2 py-1.5 px-1 hover:bg-sunken/50 rounded cursor-pointer text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleAddBranch(b.id)}
                                className="rounded text-accent focus:ring-accent"
                              />
                              <span className="font-mono text-[10px] font-bold text-accent bg-accent/10 px-1 rounded">
                                {b.code}
                              </span>
                              <span className="text-ink truncate">{b.name}</span>
                              <span className="text-ash text-[10px] ml-auto">
                                {b.city}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="pt-1 border-t border-hairline flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowAddBranchDropdown(false)}
                          className="rounded bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20"
                        >
                          Tutup
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Preview Selected Branches Badges */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {newBranchIds.map((bId) => {
                      const b = branches.find((item) => item.id === bId);
                      if (!b) return null;
                      return (
                        <span
                          key={bId}
                          className="inline-flex items-center gap-1 rounded bg-accent/10 text-accent px-1.5 py-0.5 text-[10px] font-medium"
                        >
                          <span>{b.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleAddBranch(bId)}
                            className="hover:text-rose"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-hairline/60">
              <button
                type="submit"
                disabled={busy || branches.length === 0 || newBranchIds.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-accent-soft active:scale-95 disabled:opacity-50 cursor-pointer min-h-[42px]"
              >
                {busy ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Plus className="w-3.5 h-3.5" weight="bold" />
                )}
                <span>Tambah User Baru</span>
              </button>
            </div>
          </form>
          )}

          {/* Search & Filter Toolbar */}
          <div className="space-y-3 rounded-xl border border-hairline bg-surface p-3 sm:p-4 shadow-xs">
            {/* Quick Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={resetFilters}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  !hasActiveFilters
                    ? "bg-accent text-white shadow-xs"
                    : "bg-white border border-hairline text-ash hover:text-ink hover:bg-sunken/40"
                }`}
              >
                <span>Semua</span>
                <span className={`text-[10px] px-1 rounded-full ${!hasActiveFilters ? "bg-white/20 text-white" : "bg-sunken text-ash"}`}>
                  {users.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { resetFilters(); setRoleFilter("admin"); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  roleFilter === "admin"
                    ? "bg-accent text-white shadow-xs"
                    : "bg-white border border-hairline text-ash hover:text-ink hover:bg-sunken/40"
                }`}
              >
                <span>Admin</span>
                <span className={`text-[10px] px-1 rounded-full ${roleFilter === "admin" ? "bg-white/20 text-white" : "bg-sunken text-ash"}`}>
                  {adminCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { resetFilters(); setRoleFilter("petugas"); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  roleFilter === "petugas"
                    ? "bg-accent text-white shadow-xs"
                    : "bg-white border border-hairline text-ash hover:text-ink hover:bg-sunken/40"
                }`}
              >
                <span>Petugas</span>
                <span className={`text-[10px] px-1 rounded-full ${roleFilter === "petugas" ? "bg-white/20 text-white" : "bg-sunken text-ash"}`}>
                  {staffCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { resetFilters(); setBranchFilter("MULTI"); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  branchFilter === "MULTI"
                    ? "bg-accent text-white shadow-xs"
                    : "bg-white border border-hairline text-ash hover:text-ink hover:bg-sunken/40"
                }`}
              >
                <span>Multi-Cabang</span>
                <span className={`text-[10px] px-1 rounded-full ${branchFilter === "MULTI" ? "bg-white/20 text-white" : "bg-sunken text-ash"}`}>
                  {multiBranchCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { resetFilters(); setLoginFilter("never_logged_in"); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  loginFilter === "never_logged_in"
                    ? "bg-accent text-white shadow-xs"
                    : "bg-white border border-hairline text-ash hover:text-ink hover:bg-sunken/40"
                }`}
              >
                <span>Belum Login</span>
                <span className={`text-[10px] px-1 rounded-full ${loginFilter === "never_logged_in" ? "bg-white/20 text-white" : "bg-sunken text-ash"}`}>
                  {neverLoginCount}
                </span>
              </button>

              {inactiveCount > 0 && (
                <button
                  type="button"
                  onClick={() => { resetFilters(); setStatusFilter("inactive"); }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === "inactive"
                      ? "bg-accent text-white shadow-xs"
                      : "bg-white border border-hairline text-ash hover:text-ink hover:bg-sunken/40"
                  }`}
                >
                  <span>Nonaktif</span>
                  <span className={`text-[10px] px-1 rounded-full ${statusFilter === "inactive" ? "bg-white/20 text-white" : "bg-sunken text-ash"}`}>
                    {inactiveCount}
                  </span>
                </button>
              )}
            </div>

            {/* Search Input & View Mode Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, @username, email, no HP, atau cabang..."
                  className="w-full rounded-lg border border-hairline bg-white pl-9 pr-8 py-2 text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all min-h-[38px]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ash hover:text-ink p-0.5"
                  >
                    <XCircle className="w-4 h-4" weight="fill" />
                  </button>
                )}
              </div>

              {/* View Mode Toggle: List vs Group by Branch */}
              <div className="inline-flex items-center rounded-lg border border-hairline bg-sunken p-0.5 text-xs self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    viewMode === "list" ? "bg-surface text-ink shadow-xs" : "text-ash hover:text-ink"
                  }`}
                  title="Tampilan daftar rata"
                >
                  <ListDashes className="w-3.5 h-3.5" />
                  <span>Daftar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grouped")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    viewMode === "grouped" ? "bg-surface text-ink shadow-xs" : "text-ash hover:text-ink"
                  }`}
                  title="Tampilan dikelompokkan per cabang"
                >
                  <Storefront className="w-3.5 h-3.5" />
                  <span>Per Cabang</span>
                </button>
              </div>
            </div>

            {/* Detailed Filter Selects & Sorting */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-hairline/60">
              {/* Branch Filter */}
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent min-h-[36px] cursor-pointer"
              >
                <option value="ALL">Semua Cabang</option>
                <option value="MULTI">Hanya Multi-Cabang (&gt;1 Cabang)</option>
                <option value="SINGLE">Hanya Cabang Tunggal (1 Cabang)</option>
                <option value="NONE">Tanpa Cabang Terdaftar</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent min-h-[36px] cursor-pointer"
              >
                <option value="ALL">Semua Role</option>
                <option value="admin">Admin</option>
                <option value="branch_manager">Branch Manager</option>
                <option value="petugas">Petugas / Staff</option>
                <option value="guest">Guest</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent min-h-[36px] cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
                <option value="suspended">Ditangguhkan</option>
              </select>

              {/* Login Activity Filter */}
              <select
                value={loginFilter}
                onChange={(e) => setLoginFilter(e.target.value)}
                className="rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent min-h-[36px] cursor-pointer"
              >
                <option value="ALL">Semua Aktivitas</option>
                <option value="logged_in">Pernah Login</option>
                <option value="never_logged_in">Belum Pernah Login</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent min-h-[36px] cursor-pointer"
              >
                <option value="name_asc">Nama (A - Z)</option>
                <option value="name_desc">Nama (Z - A)</option>
                <option value="created_desc">Terbaru Dibuat</option>
                <option value="created_asc">Terlama Dibuat</option>
                <option value="last_login">Login Terakhir</option>
                <option value="branches_count">Cabang Terbanyak</option>
              </select>

              {/* Reset Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline px-2 py-1.5 whitespace-nowrap cursor-pointer"
                >
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            {/* Result Counter & Active Filter Status */}
            <div className="flex items-center justify-between text-[11px] text-ash pt-1 border-t border-hairline/60">
              <span>
                Menampilkan <strong>{filteredUsers.length}</strong> dari {users.length} staf terdaftar
                {viewMode === "grouped" && " • Pengelompokan Cabang"}
              </span>
              {hasActiveFilters && (
                <span className="text-[10px] bg-accent/10 text-accent font-semibold px-2 py-0.5 rounded-full">
                  Filter aktif
                </span>
              )}
            </div>
          </div>

          {/* Daftar User */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-hairline rounded-xl text-ash text-xs space-y-2 bg-surface/40">
                <UsersThree className="w-8 h-8 text-mist mx-auto" weight="duotone" />
                <p className="font-semibold text-ink">Tidak ada staf yang cocok dengan kriteria filter</p>
                <p className="text-[11px] text-ash">
                  Coba ubah kata kunci pencarian atau reset filter untuk menampilkan staf lainnya.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-accent shadow-xs hover:bg-sunken"
                  >
                    Reset Semua Filter
                  </button>
                )}
              </div>
            ) : viewMode === "list" ? (
              <div className="divide-y divide-hairline rounded-lg border border-hairline bg-white overflow-hidden">
                {filteredUsers.map((u) => {
                  const isEditing = editingUserId === u.id;
                  const isSelf = u.id === currentUserId;
                  const assignedCount = u.assignedBranchIds?.length || (u.branchId ? 1 : 0);
                  return (
                    <div key={u.id} className="p-3 sm:p-4 hover:bg-sunken/20 transition-colors">
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
                                No. WhatsApp
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

                            <div>
                              <label className="block text-[10px] font-medium text-ash mb-0.5">
                                Role
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

                            {/* Multi-Branch Edit Dropdown */}
                            <div className="relative sm:col-span-2">
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="block text-[10px] font-medium text-ash">
                                  Cabang Penugasan
                                </label>
                                <span className="text-[10px] font-semibold text-accent">
                                  {editDraft.branchIds.length} cabang
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setShowEditBranchDropdown((v) => !v)}
                                disabled={busy}
                                className="w-full flex items-center justify-between rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent text-left"
                              >
                                <span className="truncate">
                                  {editDraft.branchIds.length === 0
                                    ? "Pilih cabang..."
                                    : editDraft.branchIds.length === 1
                                    ? branches.find((b) => b.id === editDraft.branchIds[0])?.name || "1 cabang dipilih"
                                    : `${editDraft.branchIds.length} cabang (${branches
                                        .filter((b) => editDraft.branchIds.includes(b.id))
                                        .map((b) => b.code)
                                        .join(", ")})`}
                                </span>
                                <CaretDown className="w-3.5 h-3.5 text-ash shrink-0 ml-1" />
                              </button>

                              {showEditBranchDropdown && (
                                <div className="absolute z-30 mt-1 w-full rounded-lg border border-hairline bg-white p-2 shadow-lg space-y-2">
                                  <div className="flex items-center justify-between border-b border-hairline pb-1.5 text-[11px]">
                                    <button
                                      type="button"
                                      onClick={selectAllEditBranches}
                                      className="text-accent hover:underline font-medium"
                                    >
                                      Pilih Semua
                                    </button>
                                    <button
                                      type="button"
                                      onClick={clearEditBranches}
                                      className="text-ash hover:underline"
                                    >
                                      Hapus Semua
                                    </button>
                                  </div>

                                  <div className="max-h-48 overflow-y-auto space-y-1">
                                    {branches.map((b) => {
                                      const isChecked = editDraft.branchIds.includes(b.id);
                                      return (
                                        <label
                                          key={b.id}
                                          className="flex items-center gap-2 p-1 rounded hover:bg-sunken/60 cursor-pointer text-xs"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleEditBranch(b.id)}
                                            className="rounded border-hairline text-accent focus:ring-accent/20"
                                          />
                                          <span className="font-semibold text-ink">{b.name}</span>
                                          <span className="font-mono text-[10px] text-ash">
                                            ({b.code})
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>

                                  <div className="flex justify-end pt-1 border-t border-hairline">
                                    <button
                                      type="button"
                                      onClick={() => setShowEditBranchDropdown(false)}
                                      className="text-xs font-semibold text-accent hover:underline"
                                    >
                                      Selesai
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Edit Badges Preview */}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {editDraft.branchIds.map((bId) => {
                                  const b = branches.find((item) => item.id === bId);
                                  if (!b) return null;
                                  return (
                                    <span
                                      key={bId}
                                      className="inline-flex items-center gap-1 rounded bg-accent/10 text-accent px-1.5 py-0.5 text-[9px] font-medium"
                                    >
                                      <span>{b.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => toggleEditBranch(bId)}
                                        className="hover:text-rose"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-ash mb-0.5">
                                PIN Baru (kosongkan jika tidak diubah)
                              </label>
                              <input
                                type="password"
                                maxLength={6}
                                placeholder="6 digit angka"
                                value={editDraft.pin}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    pin: e.target.value.replace(/\D/g, ""),
                                  })
                                }
                                disabled={busy}
                                className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(u)}
                              disabled={busy || editDraft.branchIds.length === 0}
                              className="inline-flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-accent-soft active:scale-95 disabled:opacity-50"
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
                        /* Normal View Mode: Aligned Badges and Columns */
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 font-bold text-xs text-accent uppercase">
                              {(u.name || u.username || "U").slice(0, 2).toUpperCase()}
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
                                    {u.branchName || "Belum ada cabang"} ({u.branchCode || "-"})
                                    {assignedCount > 1 ? ` +${assignedCount - 1} cabang` : ""}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Badges container */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-hairline/60">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`text-center justify-center inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0 min-w-0 ${getRoleBadgeClass(
                                  u.role
                                )}`}
                              >
                                {u.role.toLowerCase().includes("admin") || u.role.toLowerCase().includes("super") ? "Admin" : "Petugas"}
                              </span>
                              <span
                                className={`text-center justify-center inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold capitalize shrink-0 min-w-0 ${getStatusBadgeClass(
                                  u.status
                                )}`}
                              >
                                {u.status}
                              </span>
                            </div>

                            {/* Actions: Ubah & Hapus */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEdit(u)}
                                disabled={busy}
                                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ash transition-colors hover:bg-sunken hover:text-ink active:scale-95 cursor-pointer"
                                title="Ubah data user"
                              >
                                <PencilSimple className="w-3.5 h-3.5" weight="bold" />
                                <span className="hidden sm:inline">Ubah</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                disabled={busy || isSelf}
                                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-rose/20 bg-surface px-3 py-1.5 text-xs font-semibold text-rose transition-colors hover:bg-rose/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
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
            ) : (
              /* Grouped by Branch View */
              <div className="space-y-4">
                {branches.map((b) => {
                  const branchUsers = filteredUsers.filter(
                    (u) => u.branchId === b.id || u.assignedBranchIds?.includes(b.id)
                  );
                  if (branchUsers.length === 0) return null;

                  return (
                    <div
                      key={b.id}
                      className="rounded-xl border border-hairline bg-surface overflow-hidden shadow-xs"
                    >
                      <div className="flex items-center justify-between px-4 py-3 bg-sunken/50 border-b border-hairline">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                            <Storefront className="w-4 h-4" weight="duotone" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-ink">{b.name}</span>
                              <span className="font-mono text-[10px] text-ash bg-white px-1.5 py-0.2 rounded border border-hairline">
                                {b.code}
                              </span>
                            </div>
                            {b.city && <span className="text-[10px] text-ash">{b.city}</span>}
                          </div>
                        </div>
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                          {branchUsers.length} staf bertugas
                        </span>
                      </div>

                      <div className="divide-y divide-hairline bg-white">
                        {branchUsers.map((u) => {
                          const isPrimary = u.branchId === b.id;
                          const isEditing = editingUserId === u.id;
                          const isSelf = u.id === currentUserId;

                          return (
                            <div key={`${b.id}-${u.id}`} className="p-3 sm:p-4 hover:bg-sunken/20 transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 font-bold text-xs text-accent uppercase">
                                    {(u.name || u.username || "U").slice(0, 2).toUpperCase()}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-sm text-ink truncate">
                                        {u.name}
                                      </span>
                                      <span
                                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                                          isPrimary
                                            ? "bg-emerald/10 text-emerald border border-emerald/20"
                                            : "bg-sunken text-ash border border-hairline"
                                        }`}
                                      >
                                        {isPrimary ? "Cabang Utama" : "Multi-Penugasan"}
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
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-hairline/60">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`text-center justify-center inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0 min-w-0 ${getRoleBadgeClass(
                                        u.role
                                      )}`}
                                    >
                                      {u.role.toLowerCase().includes("admin") || u.role.toLowerCase().includes("super") ? "Admin" : "Petugas"}
                                    </span>
                                    <span
                                      className={`text-center justify-center inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold capitalize shrink-0 min-w-0 ${getStatusBadgeClass(
                                        u.status
                                      )}`}
                                    >
                                      {u.status}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => startEdit(u)}
                                      disabled={busy}
                                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ash transition-colors hover:bg-sunken hover:text-ink active:scale-95 cursor-pointer"
                                      title="Ubah data user"
                                    >
                                      <PencilSimple className="w-3.5 h-3.5" weight="bold" />
                                      <span className="hidden sm:inline">Ubah</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Staf Tanpa Cabang */}
                {(() => {
                  const unassigned = filteredUsers.filter(
                    (u) =>
                      !u.branchId &&
                      (!u.assignedBranchIds || u.assignedBranchIds.length === 0)
                  );
                  if (unassigned.length === 0) return null;

                  return (
                    <div className="rounded-xl border border-dashed border-amber/40 bg-amber/5 overflow-hidden shadow-xs">
                      <div className="flex items-center justify-between px-4 py-3 bg-amber/10 border-b border-amber/20">
                        <div className="flex items-center gap-2">
                          <WarningCircle className="w-4 h-4 text-amber" weight="bold" />
                          <span className="font-bold text-xs text-ink">
                            Staf Belum Ditempatkan di Cabang
                          </span>
                        </div>
                        <span className="rounded-full bg-amber/20 px-2 py-0.5 text-[10px] font-bold text-amber">
                          {unassigned.length} staf
                        </span>
                      </div>
                      <div className="divide-y divide-hairline bg-white">
                        {unassigned.map((u) => {
                          const isSelf = u.id === currentUserId;
                          return (
                            <div key={`unassigned-${u.id}`} className="p-3 sm:p-4 hover:bg-sunken/20 transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber/15 font-bold text-xs text-amber uppercase">
                                    {(u.name || u.username || "U").slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-sm text-ink truncate">{u.name}</span>
                                      <span className="text-[10px] bg-amber/15 text-amber px-2 py-0.5 rounded font-semibold">
                                        Tanpa Cabang
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-ash mt-0.5">
                                      <span className="font-mono text-ink">@{u.username || "tanpa-username"}</span>
                                      <span>•</span>
                                      <span className="truncate">{u.email}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(u)}
                                    disabled={busy}
                                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ash hover:bg-sunken cursor-pointer"
                                  >
                                    <PencilSimple className="w-3.5 h-3.5" weight="bold" />
                                    <span>Atur Cabang</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
