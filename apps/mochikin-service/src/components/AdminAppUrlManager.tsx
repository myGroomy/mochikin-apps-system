"use client";

import { useState } from "react";
import type { AppTargetUrlInfo } from "@/lib/apps";
import {
  ExternalLink,
  Pencil,
  Check,
  X,
  Server,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface AdminAppUrlManagerProps {
  initialApps: AppTargetUrlInfo[];
}

export function AdminAppUrlManager({ initialApps }: AdminAppUrlManagerProps) {
  const [apps, setApps] = useState<AppTargetUrlInfo[]>(initialApps);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    appId?: string;
  } | null>(null);

  function startEditing(app: AppTargetUrlInfo) {
    setEditingAppId(app.id);
    setInputUrl(app.url);
    setFeedback(null);
  }

  function cancelEditing() {
    setEditingAppId(null);
    setInputUrl("");
    setFeedback(null);
  }

  async function handleSave(appId: string) {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setFeedback({ type: "error", message: "URL tidak boleh kosong", appId });
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setFeedback({
        type: "error",
        message: "Format URL tidak valid. Gunakan format lengkap seperti http://localhost:3002 atau https://app.domain.com",
        appId,
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/apps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, url: trimmed }),
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        url?: string;
      } | null;

      if (!res.ok || !data?.success) {
        setFeedback({
          type: "error",
          message: data?.message || "Gagal memperbarui URL aplikasi.",
          appId,
        });
        setSaving(false);
        return;
      }

      setApps((prev) =>
        prev.map((item) =>
          item.id === appId
            ? {
                ...item,
                url: trimmed,
                isConfigured: true,
                source: "database",
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );

      setEditingAppId(null);
      setFeedback({
        type: "success",
        message: `Tautan URL ${appId} berhasil disimpan ke database.`,
        appId,
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat menghubungi server.",
        appId,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-base-content flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <span>Koneksi aplikasi ekosistem (SSO targets)</span>
          </h2>
          <p className="text-xs text-base-content/60">
            Kelola dan ubah endpoint URL target untuk setiap micro-frontend ekosistem Mochikin
          </p>
        </div>

        {feedback && !feedback.appId && (
          <div
            className={`alert ${
              feedback.type === "success" ? "alert-success" : "alert-error"
            } text-xs py-1.5 px-3 rounded-md`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {apps.map((app) => {
          const isEditing = editingAppId === app.id;
          const isConfigured = Boolean(app.url && app.url.trim());
          const hasError = feedback?.type === "error" && feedback.appId === app.id;
          const hasSuccess = feedback?.type === "success" && feedback.appId === app.id;

          return (
            <div
              key={app.id}
              className="bg-base-100 border border-base-300 rounded-lg p-4 flex flex-col justify-between"
            >
              <div>
                {/* Header card */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-base-content text-xs sm:text-sm">
                      {app.name}
                    </span>
                    <span className="badge badge-xs text-[10px] font-normal text-base-content/60">
                      {app.category}
                    </span>
                  </div>

                  <span
                    className={`badge badge-xs text-[10px] font-normal ${
                      isConfigured
                        ? app.source === "database"
                          ? "badge-success"
                          : "badge-info"
                        : "badge-warning"
                    }`}
                  >
                    {isConfigured
                      ? app.source === "database"
                        ? "db"
                        : "env"
                      : "unset"}
                  </span>
                </div>

                {/* URL display or edit mode */}
                {isEditing ? (
                  <div className="space-y-2 mt-2">
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      disabled={saving}
                      placeholder="http://localhost:300X"
                      className="input input-bordered input-xs w-full font-mono text-[11px] focus:outline-none focus:border-primary disabled:opacity-60"
                      autoFocus
                    />

                    {hasError && (
                      <p className="text-[10px] text-error leading-tight">
                        {feedback.message}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSave(app.id)}
                        disabled={saving}
                        className="btn btn-primary btn-xs rounded font-medium gap-1 text-[11px] whitespace-nowrap active:scale-95 disabled:opacity-50"
                      >
                        {saving ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        <span>Simpan</span>
                      </button>

                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={saving}
                        className="btn btn-ghost btn-xs rounded text-[11px] whitespace-nowrap active:bg-base-200"
                      >
                        <X className="w-3 h-3" />
                        <span>Batal</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[11px] text-base-content/70 font-mono break-all line-clamp-2 bg-base-200 p-2 rounded border border-base-300">
                      {app.url || "Belum dikonfigurasi"}
                    </div>

                    {hasSuccess && (
                      <p className="text-[10px] text-success mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Tersimpan di database</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              {!isEditing && (
                <div className="mt-3 pt-2.5 border-t border-base-200 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => startEditing(app)}
                    className="btn btn-ghost btn-xs text-base-content/70 font-medium gap-1 active:bg-base-200 whitespace-nowrap"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Ubah URL</span>
                  </button>

                  {isConfigured && (
                    <a
                      href={`/api/auth/handoff?appId=${app.id}&returnPath=/`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-xs text-primary font-medium gap-1 active:bg-base-200 whitespace-nowrap"
                    >
                      <span>Tes SSO</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
