"use client";

import { useState } from "react";
import type { AppTargetUrlInfo } from "@/lib/apps";
import {
  ArrowSquareOut,
  PencilSimple,
  Check,
  X,
  HardDrives,
  WarningCircle,
  CheckCircle,
} from "@phosphor-icons/react";

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
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <HardDrives className="w-4 h-4 text-accent" weight="duotone" />
            <span>Koneksi aplikasi ekosistem (SSO targets)</span>
          </h2>
          <p className="text-xs text-ash">
            Kelola dan ubah endpoint URL target untuk setiap micro-frontend ekosistem Mochikin
          </p>
        </div>

        {feedback && !feedback.appId && (
          <div
            className={`flex items-center gap-2 text-xs py-1.5 px-3 rounded-md ${
              feedback.type === "success"
                ? "bg-emerald/10 text-emerald border border-emerald/20"
                : "bg-rose/10 text-rose border border-rose/20"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle className="w-3.5 h-3.5" weight="bold" />
            ) : (
              <WarningCircle className="w-3.5 h-3.5" weight="bold" />
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
              className="doppel-outer"
            >
              <div className="doppel-inner p-4 flex flex-col justify-between">
                <div>
                  {/* Header card */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-ink text-xs sm:text-sm">
                        {app.name}
                      </span>
                      <span className="inline-flex items-center rounded bg-sunken px-1.5 py-0.5 text-[10px] font-normal text-ash">
                        {app.category}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-normal ${
                        isConfigured
                          ? app.source === "database"
                            ? "bg-emerald/10 text-emerald"
                            : "bg-accent/10 text-accent"
                          : "bg-amber/10 text-amber"
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
                        className="w-full rounded-md border border-hairline bg-white px-2 py-1.5 font-mono text-[11px] text-ink placeholder:text-mist outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 disabled:opacity-60"
                        autoFocus
                      />

                      {hasError && (
                        <p className="text-[10px] text-rose leading-tight">
                          {feedback.message}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSave(app.id)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-accent-deep active:scale-95 disabled:opacity-50 whitespace-nowrap"
                        >
                          {saving ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          ) : (
                            <Check className="w-3 h-3" weight="bold" />
                          )}
                          <span>Simpan</span>
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={saving}
                          className="inline-flex items-center gap-1 rounded-md border border-hairline bg-white px-2.5 py-1.5 text-[11px] font-medium text-ash transition-colors hover:bg-sunken hover:text-ink whitespace-nowrap"
                        >
                          <X className="w-3 h-3" weight="bold" />
                          <span>Batal</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[11px] text-ash font-mono break-all line-clamp-2 bg-sunken p-2 rounded border border-hairline">
                        {app.url || "Belum dikonfigurasi"}
                      </div>

                      {hasSuccess && (
                        <p className="text-[10px] text-emerald mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" weight="bold" />
                          <span>Tersimpan di database</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                {!isEditing && (
                  <div className="mt-3 pt-2.5 border-t border-hairline flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => startEditing(app)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-ash transition-colors hover:bg-sunken hover:text-ink whitespace-nowrap"
                    >
                      <PencilSimple className="w-3 h-3" weight="bold" />
                      <span>Ubah URL</span>
                    </button>

                    {isConfigured && (
                      <a
                        href={`/api/auth/handoff?appId=${app.id}&returnPath=/`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent-wash whitespace-nowrap"
                      >
                        <span>Tes SSO</span>
                        <ArrowSquareOut className="w-3 h-3" weight="bold" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
