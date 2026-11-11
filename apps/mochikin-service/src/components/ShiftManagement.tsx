"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  SunHorizon,
  Moon,
  Plus,
  Trash,
  PencilSimple,
  Check,
  X,
  WarningCircle,
  CheckCircle,
  Storefront,
  LockKey,
} from "@phosphor-icons/react";
import type { ManagedShift } from "@/lib/shiftService";
import type { ManagedBranch } from "@/lib/branchService";

interface ShiftManagementProps {
  initialShifts: ManagedShift[];
  branches?: ManagedBranch[];
  onRefresh?: () => Promise<void> | void;
}

const TYPE_OPTIONS = [
  { value: "opening", label: "Opening (Pagi)" },
  { value: "closing", label: "Closing (Malam)" },
  { value: "regular", label: "Regular (Normal)" },
  { value: "custom", label: "Custom (Khusus)" },
];

export function ShiftManagement({
  initialShifts,
  branches = [],
  onRefresh,
}: ShiftManagementProps) {
  const [shifts, setShifts] = useState<ManagedShift[]>(initialShifts);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form tambah shift baru
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newShortName, setNewShortName] = useState("");
  const [newType, setNewType] = useState<"opening" | "closing" | "regular" | "custom">("regular");
  const [newStartHour, setNewStartHour] = useState<number>(9);
  const [newEndHour, setNewEndHour] = useState<number>(17);
  const [newTagline, setNewTagline] = useState("");
  const [newBranchId, setNewBranchId] = useState<string>("");
  const [newIsActive, setNewIsActive] = useState(true);

  // Form edit shift
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editShortName, setEditShortName] = useState("");
  const [editType, setEditType] = useState<string>("regular");
  const [editStartHour, setEditStartHour] = useState<number>(9);
  const [editEndHour, setEditEndHour] = useState<number>(17);
  const [editTagline, setEditTagline] = useState("");
  const [editBranchId, setEditBranchId] = useState<string>("");
  const [editIsActive, setEditIsActive] = useState(true);

  useEffect(() => {
    setShifts(initialShifts);
  }, [initialShifts]);

  // Auto-dismiss feedback
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const resetAddForm = () => {
    setNewName("");
    setNewShortName("");
    setNewType("regular");
    setNewStartHour(9);
    setNewEndHour(17);
    setNewTagline("");
    setNewBranchId("");
    setNewIsActive(true);
    setShowAddForm(false);
  };

  const startEdit = (shift: ManagedShift) => {
    setEditingShiftId(shift.id);
    setEditName(shift.name);
    setEditShortName(shift.shortName);
    setEditType(shift.type);
    setEditStartHour(shift.startHour);
    setEditEndHour(shift.endHour);
    setEditTagline(shift.tagline || "");
    setEditBranchId(shift.branchId || "");
    setEditIsActive(shift.isActive);
  };

  const cancelEdit = () => {
    setEditingShiftId(null);
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFeedback({ type: "error", message: "Nama shift wajib diisi." });
      return;
    }
    if (newStartHour < 0 || newStartHour > 23 || newEndHour < 0 || newEndHour > 23) {
      setFeedback({ type: "error", message: "Jam shift harus di antara 00:00 dan 23:00." });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          shortName: newShortName.trim() || undefined,
          type: newType,
          startHour: Number(newStartHour),
          endHour: Number(newEndHour),
          tagline: newTagline.trim() || undefined,
          branchId: newBranchId || null,
          isActive: newIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat shift baru.");
      }

      setFeedback({
        type: "success",
        message: `Shift ${data.shift.name} berhasil ditambahkan!`,
      });
      resetAddForm();
      if (onRefresh) await onRefresh();
      else setShifts((prev) => [...prev, data.shift]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateShift = async (id: string) => {
    if (!editName.trim()) {
      setFeedback({ type: "error", message: "Nama shift tidak boleh kosong." });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/shifts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          shortName: editShortName.trim() || undefined,
          type: editType,
          startHour: Number(editStartHour),
          endHour: Number(editEndHour),
          tagline: editTagline.trim() || undefined,
          branchId: editBranchId || null,
          isActive: editIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui shift.");
      }

      setFeedback({
        type: "success",
        message: `Shift ${data.shift.name} berhasil diperbarui.`,
      });
      setEditingShiftId(null);
      if (onRefresh) await onRefresh();
      else {
        setShifts((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...data.shift } : s))
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStatus = async (shift: ManagedShift) => {
    setBusy(true);
    try {
      const nextActive = !shift.isActive;
      const res = await fetch(`/api/admin/shifts/${shift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengubah status shift.");
      }

      setFeedback({
        type: "success",
        message: `Shift ${shift.name} sekarang ${nextActive ? "Aktif" : "Nonaktif"}.`,
      });
      if (onRefresh) await onRefresh();
      else {
        setShifts((prev) =>
          prev.map((s) => (s.id === shift.id ? { ...s, isActive: nextActive } : s))
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteShift = async (shift: ManagedShift) => {
    if (shift.isSystemDefault) {
      setFeedback({
        type: "error",
        message: "Shift default sistem tidak dapat dihapus.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus shift "${shift.name}"?`
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/shifts/${shift.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus shift.");
      }

      setFeedback({
        type: "success",
        message: `Shift ${shift.name} berhasil dihapus.`,
      });
      if (onRefresh) await onRefresh();
      else {
        setShifts((prev) => prev.filter((s) => s.id !== shift.id));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setBusy(false);
    }
  };

  const getShiftIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "opening":
        return <SunHorizon className="w-4 h-4 text-amber" weight="duotone" />;
      case "closing":
        return <Moon className="w-4 h-4 text-accent" weight="duotone" />;
      default:
        return <Clock className="w-4 h-4 text-emerald" weight="duotone" />;
    }
  };

  const getDurationHours = (start: number, end: number) => {
    if (end > start) return end - start;
    return 24 - start + end;
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center gap-2 text-xs py-2 px-3 rounded-md border animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "bg-emerald/10 border-emerald/20 text-emerald"
              : "bg-rose/10 border-rose/20 text-rose"
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

      {/* Main Doppel Card */}
      <div className="doppel-outer">
        <div className="doppel-inner p-4 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-hairline pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Clock className="w-5 h-5" weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-ink">
                    Manajemen Shift Kerja
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                    {shifts.length} Shift
                  </span>
                </div>
                <p className="text-xs text-ash mt-0.5">
                  Atur jam kerja, tipe shift, dan cakupan operasional outlet.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-soft active:scale-95 cursor-pointer self-start sm:self-auto min-h-[38px]"
            >
              <Plus className="w-4 h-4" weight="bold" />
              <span>Tambah Shift</span>
            </button>
          </div>

          {/* Form Tambah Shift Baru */}
          {showAddForm && (
            <form
              onSubmit={handleCreateShift}
              className="rounded-xl border border-hairline bg-sunken/40 p-4 space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between border-b border-hairline/80 pb-2">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-accent" weight="bold" />
                  Tambah Definisi Shift Baru
                </span>
                <button
                  type="button"
                  onClick={resetAddForm}
                  className="text-ash hover:text-ink text-xs p-1 rounded hover:bg-sunken"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Nama Shift */}
                <div>
                  <label className="block text-[11px] font-semibold text-ash mb-1">
                    Nama Shift <span className="text-rose">*</span>
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Shift Siang (Middle)"
                    disabled={busy}
                    className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                    required
                  />
                </div>

                {/* Short Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-ash mb-1">
                    Nama Singkat
                  </label>
                  <input
                    type="text"
                    value={newShortName}
                    onChange={(e) => setNewShortName(e.target.value)}
                    placeholder="Contoh: Middle"
                    disabled={busy}
                    className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                  />
                </div>

                {/* Tipe Shift */}
                <div>
                  <label className="block text-[11px] font-semibold text-ash mb-1">
                    Tipe Shift
                  </label>
                  <select
                    value={newType}
                    onChange={(e) =>
                      setNewType(e.target.value as "opening" | "closing" | "regular" | "custom")
                    }
                    disabled={busy}
                    className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jam Mulai */}
                <div>
                  <label className="block text-[11px] font-semibold text-ash mb-1">
                    Jam Mulai (0-23 WIB)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={newStartHour}
                    onChange={(e) => setNewStartHour(Number(e.target.value))}
                    disabled={busy}
                    className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>

                {/* Jam Selesai */}
                <div>
                  <label className="block text-[11px] font-semibold text-ash mb-1">
                    Jam Selesai (0-23 WIB)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={newEndHour}
                    onChange={(e) => setNewEndHour(Number(e.target.value))}
                    disabled={busy}
                    className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>

                {/* Cakupan Cabang */}
                <div>
                  <label className="block text-[11px] font-semibold text-ash mb-1">
                    Cakupan Cabang
                  </label>
                  <select
                    value={newBranchId}
                    onChange={(e) => setNewBranchId(e.target.value)}
                    disabled={busy}
                    className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  >
                    <option value="">Semua Cabang (Global)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deskripsi / Tagline */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-[11px] font-semibold text-ash mb-1">
                    Deskripsi / Catatan Shift
                  </label>
                  <input
                    type="text"
                    value={newTagline}
                    onChange={(e) => setNewTagline(e.target.value)}
                    placeholder="Contoh: Fokus pada persiapan stok & peak jam makan siang"
                    disabled={busy}
                    className="w-full rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-mist outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-hairline">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={newIsActive}
                    onChange={(e) => setNewIsActive(e.target.checked)}
                    disabled={busy}
                    className="rounded border-hairline text-accent focus:ring-accent/20"
                  />
                  <span>Shift langsung aktif untuk pemilihan staf</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetAddForm}
                    disabled={busy}
                    className="rounded-md border border-hairline bg-white px-3 py-1.5 text-xs font-medium text-ash hover:bg-sunken hover:text-ink transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-soft active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {busy ? "Menyimpan..." : "Simpan Shift"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Shift Cards Grid (2 Kolom) */}
          <div className="space-y-3">
            {shifts.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-hairline rounded-lg text-ash text-xs">
                Belum ada shift terdaftar di sistem.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shifts.map((shift) => {
                  const isEditing = editingShiftId === shift.id;
                  const duration = getDurationHours(shift.startHour, shift.endHour);

                  if (isEditing) {
                    return (
                      <div
                        key={shift.id}
                        className="rounded-xl border-2 border-accent/40 bg-surface p-4 space-y-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between border-b border-hairline pb-2">
                          <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                            <PencilSimple className="w-4 h-4" />
                            Edit Shift: {shift.name}
                          </span>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="text-ash hover:text-ink text-xs p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="block text-[11px] font-semibold text-ash mb-1">
                              Nama Shift
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-ash mb-1">
                                Nama Singkat
                              </label>
                              <input
                                type="text"
                                value={editShortName}
                                onChange={(e) => setEditShortName(e.target.value)}
                                className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-ash mb-1">
                                Tipe
                              </label>
                              <select
                                value={editType}
                                onChange={(e) => setEditType(e.target.value)}
                                className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                              >
                                {TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-ash mb-1">
                                Jam Mulai (0-23)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={23}
                                value={editStartHour}
                                onChange={(e) => setEditStartHour(Number(e.target.value))}
                                className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-ash mb-1">
                                Jam Selesai (0-23)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={23}
                                value={editEndHour}
                                onChange={(e) => setEditEndHour(Number(e.target.value))}
                                className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-ash mb-1">
                              Cakupan Cabang
                            </label>
                            <select
                              value={editBranchId}
                              onChange={(e) => setEditBranchId(e.target.value)}
                              className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                            >
                              <option value="">Semua Cabang (Global)</option>
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name} ({b.code})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-ash mb-1">
                              Deskripsi
                            </label>
                            <input
                              type="text"
                              value={editTagline}
                              onChange={(e) => setEditTagline(e.target.value)}
                              className="w-full rounded border border-hairline bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                            />
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={editIsActive}
                              onChange={(e) => setEditIsActive(e.target.checked)}
                              className="rounded border-hairline text-accent focus:ring-accent/20"
                            />
                            <span className="text-xs text-ink font-medium">Shift Aktif</span>
                          </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded border border-hairline bg-white px-3 py-1.5 text-xs font-medium text-ash hover:bg-sunken hover:text-ink cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateShift(shift.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-soft active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Simpan
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={shift.id}
                      className="rounded-xl border border-hairline bg-white p-4 hover:shadow-xs transition-shadow flex flex-col justify-between space-y-3"
                    >
                      {/* Top Row: Icon, Title & Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken border border-hairline">
                            {getShiftIcon(shift.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-ink text-xs sm:text-sm">
                                {shift.name}
                              </span>
                              {shift.isSystemDefault && (
                                <span
                                  title="Shift bawaan sistem"
                                  className="inline-flex items-center gap-0.5 rounded bg-sunken px-1.5 py-0.5 text-[10px] font-semibold text-ash border border-hairline"
                                >
                                  <LockKey className="w-3 h-3 text-mist" />
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-ash font-medium">
                              Kode: <span className="font-mono text-accent">{shift.shortName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Active Badge */}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                            shift.isActive
                              ? "bg-emerald/10 text-emerald border border-emerald/20"
                              : "bg-sunken text-ash border border-hairline"
                          }`}
                        >
                          {shift.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>

                      {/* Middle Row: Jam Kerja Display & Duration */}
                      <div className="rounded-lg bg-sunken/50 p-2.5 border border-hairline/60 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-ash font-medium flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-accent" />
                            Jam Operasional
                          </span>
                          <span className="font-mono font-bold text-ink text-xs">
                            {shift.timeDisplay ||
                              `${shift.startHour.toString().padStart(2, "0")}:00 - ${shift.endHour
                                .toString()
                                .padStart(2, "0")}:00 WIB`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-ash pt-1 border-t border-hairline/40">
                          <span>Durasi Kerja</span>
                          <span className="font-semibold text-accent">{duration} Jam</span>
                        </div>
                      </div>

                      {/* Tagline / Deskripsi */}
                      {shift.tagline && (
                        <p className="text-[11px] text-ash line-clamp-2 italic">
                          &ldquo;{shift.tagline}&rdquo;
                        </p>
                      )}

                      {/* Branch Scope Badge */}
                      <div className="flex items-center gap-1 text-[11px] text-ash">
                        <Storefront className="w-3.5 h-3.5 shrink-0 text-mist" />
                        <span>
                          {shift.branchName
                            ? `Khusus ${shift.branchName} (${shift.branchCode})`
                            : "Berlaku di Semua Cabang"}
                        </span>
                      </div>

                      {/* Bottom Row: Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-hairline">
                        {/* Toggle Active Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(shift)}
                          disabled={busy}
                          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                            shift.isActive
                              ? "bg-rose/10 text-rose hover:bg-rose/20"
                              : "bg-emerald/10 text-emerald hover:bg-emerald/20"
                          }`}
                        >
                          {shift.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(shift)}
                            disabled={busy}
                            className="inline-flex min-h-[30px] items-center gap-1 rounded-md border border-hairline bg-surface px-2.5 py-1 text-[11px] font-semibold text-ash transition-colors hover:bg-sunken hover:text-ink cursor-pointer"
                          >
                            <PencilSimple className="w-3 h-3" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteShift(shift)}
                            disabled={busy || shift.isSystemDefault}
                            title={
                              shift.isSystemDefault
                                ? "Shift bawaan sistem tidak dapat dihapus"
                                : "Hapus Shift"
                            }
                            className="inline-flex min-h-[30px] items-center gap-1 rounded-md border border-rose/20 bg-surface px-2.5 py-1 text-[11px] font-semibold text-rose transition-colors hover:bg-rose/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          >
                            <Trash className="w-3 h-3" />
                            Hapus
                          </button>
                        </div>
                      </div>
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
