"use client";

import { useState } from "react";
import type { AppTargetUrlInfo } from "@/lib/apps";
import {
  ArrowSquareOut,
  PencilSimple,
  Plus,
  Check,
  X,
  HardDrives,
  WarningCircle,
  CheckCircle,
  Key,
  ShieldCheck,
} from "@phosphor-icons/react";

interface AdminAppUrlManagerProps {
  initialApps: AppTargetUrlInfo[];
}

export function AdminAppUrlManager({ initialApps }: AdminAppUrlManagerProps) {
  const [apps, setApps] = useState<AppTargetUrlInfo[]>(initialApps);
  const [editingApp, setEditingApp] = useState<AppTargetUrlInfo | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    appId?: string;
  } | null>(null);

  // Edit Form State
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editCallbackUrl, setEditCallbackUrl] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");

  // Add Form State
  const [newAppId, setNewAppId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCallbackUrl, setNewCallbackUrl] = useState("");

  function startEditing(app: AppTargetUrlInfo) {
    setEditingApp(app);
    setEditTitle(app.title || app.name);
    setEditDescription(app.description || "");
    setEditUrl(app.url);
    setEditCallbackUrl(app.callbackUrl || (app.url ? `${app.url.replace(/\/+$/, "")}/api/auth/sso/callback` : ""));
    setEditStatus(app.status || "active");
    setFeedback(null);
  }

  function cancelEditing() {
    setEditingApp(null);
    setFeedback(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingApp) return;

    const trimmedUrl = editUrl.trim();
    if (!trimmedUrl) {
      setFeedback({ type: "error", message: "URL aplikasi tidak boleh kosong", appId: editingApp.id });
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setFeedback({
        type: "error",
        message: "Format URL tidak valid. Gunakan format lengkap seperti http://localhost:3002 atau https://app.domain.com",
        appId: editingApp.id,
      });
      return;
    }

    if (editCallbackUrl.trim()) {
      try {
        new URL(editCallbackUrl.trim());
      } catch {
        setFeedback({
          type: "error",
          message: "Format Callback URL tidak valid",
          appId: editingApp.id,
        });
        return;
      }
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/apps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: editingApp.appId,
          title: editTitle.trim(),
          description: editDescription.trim(),
          url: trimmedUrl,
          callbackUrl: editCallbackUrl.trim() || undefined,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({
          type: "error",
          message: data.message || "Gagal memperbarui aplikasi",
          appId: editingApp.id,
        });
        setSaving(false);
        return;
      }

      setApps((prev) =>
        prev.map((item) =>
          item.id === editingApp.id
            ? {
                ...item,
                title: editTitle.trim(),
                name: editTitle.trim(),
                description: editDescription.trim(),
                url: trimmedUrl,
                callbackUrl: editCallbackUrl.trim(),
                status: editStatus,
                isConfigured: true,
                source: "database",
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );

      setEditingApp(null);
      setFeedback({
        type: "success",
        message: `Konfigurasi aplikasi ${editTitle} berhasil disimpan.`,
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat menghubungi server.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddApp(e: React.FormEvent) {
    e.preventDefault();
    const cleanId = newAppId.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
    const cleanTitle = newTitle.trim();
    const cleanUrl = newUrl.trim();

    if (!cleanId || !cleanTitle || !cleanUrl) {
      setFeedback({ type: "error", message: "Client ID, Nama Aplikasi, dan URL wajib diisi" });
      return;
    }

    try {
      new URL(cleanUrl);
    } catch {
      setFeedback({ type: "error", message: "Format URL tidak valid" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: cleanId,
          title: cleanTitle,
          description: newDescription.trim() || undefined,
          url: cleanUrl,
          callbackUrl: newCallbackUrl.trim() || undefined,
          status: "active",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: "error", message: data.message || "Gagal mendaftarkan aplikasi" });
        setSaving(false);
        return;
      }

      setApps((prev) => [
        ...prev,
        {
          id: cleanId,
          appId: cleanId,
          name: cleanTitle,
          title: cleanTitle,
          category: "Operasional",
          description: newDescription.trim(),
          url: cleanUrl,
          callbackUrl: newCallbackUrl.trim() || `${cleanUrl.replace(/\/+$/, "")}/api/auth/sso/callback`,
          status: "active",
          isConfigured: true,
          source: "database",
        },
      ]);

      setShowAddModal(false);
      setNewAppId("");
      setNewTitle("");
      setNewDescription("");
      setNewUrl("");
      setNewCallbackUrl("");
      setFeedback({ type: "success", message: `Aplikasi ${cleanTitle} berhasil ditambahkan ke registry!` });
    } catch {
      setFeedback({ type: "error", message: "Terjadi kesalahan jaringan" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
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

      {/* Main Container */}
      <div className="doppel-outer">
        <div className="doppel-inner p-4 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-hairline pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <HardDrives className="w-5 h-5" weight="duotone" />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink">
                  Application Registry & SSO Configuration
                </h2>
                <p className="text-xs text-ash">
                  Kelola identitas aplikasi, endpoint SSO handoff, callback redirect allowlist, dan status integrasi
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-accent-deep active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" weight="bold" />
              <span>Daftarkan Aplikasi Baru</span>
            </button>
          </div>

          {/* Apps Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {apps.map((app) => (
              <div
                key={app.id}
                className="rounded-lg border border-hairline bg-white p-4 space-y-3 shadow-xs hover:border-accent/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">
                        {app.appId}
                      </span>
                      <h3 className="font-bold text-sm text-ink">{app.title || app.name}</h3>
                    </div>
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        app.status === "inactive"
                          ? "bg-rose/10 text-rose border border-rose/20"
                          : "bg-emerald/10 text-emerald border border-emerald/20"
                      }`}
                    >
                      {app.status || "active"}
                    </span>
                  </div>

                  <p className="text-xs text-ash line-clamp-2 mb-3">
                    {app.description || "Aplikasi operasional terintegrasi ekosistem Mochikin."}
                  </p>

                  <div className="space-y-1.5 text-[11px] bg-sunken/40 p-2.5 rounded border border-hairline/60">
                    <div className="flex items-center justify-between">
                      <span className="text-ash">Target URL:</span>
                      <a
                        href={app.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-accent hover:underline truncate max-w-[220px]"
                      >
                        {app.url || "Belum dikonfigurasi"}
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ash">SSO Callback:</span>
                      <span className="font-mono text-ink-soft truncate max-w-[220px]">
                        {app.callbackUrl || `${app.url}/api/auth/sso/callback`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ash">Sumber Konfigurasi:</span>
                      <span className="capitalize text-ink font-medium">{app.source}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
                  <button
                    type="button"
                    onClick={() => startEditing(app)}
                    className="inline-flex items-center gap-1 rounded border border-hairline bg-white px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:bg-sunken hover:border-accent/40 active:scale-95"
                  >
                    <PencilSimple className="w-3.5 h-3.5 text-accent" weight="bold" />
                    <span>Konfigurasi SSO</span>
                  </button>
                  {app.url && (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-sunken px-2.5 py-1 text-xs font-semibold text-ash transition-colors hover:text-ink active:scale-95"
                    >
                      <ArrowSquareOut className="w-3.5 h-3.5" weight="bold" />
                      <span>Buka</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Application Modal */}
      {editingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6">
          <form
            onSubmit={handleSaveEdit}
            className="w-full sm:max-w-lg rounded-xl border border-hairline bg-white shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div>
                <h3 className="font-bold text-base text-ink">
                  Konfigurasi Aplikasi & SSO
                </h3>
                <p className="text-xs text-ash">
                  Client ID: <span className="font-mono font-semibold text-accent">{editingApp.appId}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-full p-1 text-ash hover:bg-sunken hover:text-ink"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-ash mb-1">
                  Nama Tampilan Aplikasi *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full rounded border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ash mb-1">
                  Deskripsi / Tagline
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ash mb-1">
                  URL Target Aplikasi (Host) *
                </label>
                <input
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  required
                  placeholder="https://app.mochikin.com atau http://localhost:3002"
                  className="w-full rounded border border-hairline bg-white px-2.5 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ash mb-1">
                  Redirect Callback URI (SSO Handoff Endpoint)
                </label>
                <input
                  type="url"
                  value={editCallbackUrl}
                  onChange={(e) => setEditCallbackUrl(e.target.value)}
                  placeholder="https://app.mochikin.com/api/auth/sso/callback"
                  className="w-full rounded border border-hairline bg-white px-2.5 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent"
                />
                <span className="text-[10px] text-ash">
                  Hanya domain/URL yang diizinkan yang dapat menerima cryptographic SSO token.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ash mb-1">
                  Status Aplikasi
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as "active" | "inactive")}
                  className="w-full rounded border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                >
                  <option value="active">Aktif (Dapat diakses seluruh pengguna berhak)</option>
                  <option value="inactive">Nonaktif (Akses ditangguhkan)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="rounded border border-hairline px-3 py-1.5 text-xs font-semibold text-ash hover:bg-sunken"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-deep active:scale-95 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Application Modal / Drawer on Mobile */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-6">
          <form
            onSubmit={handleAddApp}
            className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl border-t sm:border border-hairline bg-surface shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div>
                <h3 className="font-bold text-base text-ink">
                  Daftarkan Aplikasi Ekosistem Baru
                </h3>
                <p className="text-xs text-ash">
                  Menambahkan integrasi SSO dan aplikasi baru ke Mochikin Central Portal
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-1 text-ash hover:bg-sunken hover:text-ink"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-ash mb-1">
                  Client ID / Application Identifier *
                </label>
                <input
                  type="text"
                  value={newAppId}
                  onChange={(e) => setNewAppId(e.target.value.toUpperCase())}
                  required
                  placeholder="CONTOH: MYKIOSK"
                  className="w-full rounded border border-hairline bg-white px-2.5 py-1.5 font-mono uppercase text-xs text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ash mb-1">
                  Nama Aplikasi *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  placeholder="MyKiosk"
                  className="w-full rounded border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ash mb-1">
                  Deskripsi Singkat
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Self-service ordering terminal di outlet"
                  className="w-full rounded border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ash mb-1">
                  URL Target Aplikasi *
                </label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  required
                  placeholder="https://kiosk.mochikin.com"
                  className="w-full rounded border border-hairline bg-white px-2.5 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ash mb-1">
                  Redirect Callback URI
                </label>
                <input
                  type="url"
                  value={newCallbackUrl}
                  onChange={(e) => setNewCallbackUrl(e.target.value)}
                  placeholder="https://kiosk.mochikin.com/api/auth/sso/callback"
                  className="w-full rounded border border-hairline bg-white px-2.5 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-hairline">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={saving}
                className="w-full sm:w-auto min-h-[42px] rounded-xl border border-hairline px-4 py-2 text-xs font-semibold text-ash hover:bg-sunken cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto min-h-[42px] rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-white hover:bg-accent-soft active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Mendaftarkan..." : "Daftarkan Aplikasi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
