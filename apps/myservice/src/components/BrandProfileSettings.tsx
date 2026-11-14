"use client";

import { useState } from "react";
import {
  Palette,
  CheckCircle,
  WarningCircle,
  Sparkle,
  FloppyDisk,
  Eye,
  Storefront,
} from "@phosphor-icons/react";
import {
  type BrandProfile,
  type BrandThemeConfig,
  THEME_COLOR_PRESETS,
  formatAppTitle,
} from "@/lib/brandProfileService";

interface BrandProfileSettingsProps {
  initialProfile: BrandProfile;
  onRefresh?: () => Promise<void> | void;
}

export function BrandProfileSettings({
  initialProfile,
  onRefresh,
}: BrandProfileSettingsProps) {
  const [profile, setProfile] = useState<BrandProfile>(initialProfile);
  const [brandName, setBrandName] = useState(initialProfile.brandName);
  const [tagline, setTagline] = useState(initialProfile.tagline || "");
  const [themes, setThemes] = useState<BrandThemeConfig>({ ...initialProfile.themes });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      setFeedback({ type: "error", message: "Nama brand tidak boleh kosong." });
      return;
    }

    setBusy(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/brand-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          tagline: tagline.trim(),
          themes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memperbarui profil brand");
      }

      setProfile(data.brandProfile);
      setFeedback({
        type: "success",
        message: `Profil brand "${data.brandProfile.brandName}" & warna tema berhasil disimpan!`,
      });
      if (onRefresh) await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan";
      setFeedback({ type: "error", message: msg });
    } finally {
      setBusy(false);
    }
  };

  const previewApps = [
    { prefix: "MyService", key: "service", color: themes.service },
    { prefix: "MyCheck", key: "mycheck", color: themes.mycheck },
    { prefix: "MyStokis", key: "mystokis", color: themes.mystokis },
    { prefix: "MyCustomer", key: "mycustomer", color: themes.mycustomer },
    { prefix: "MyPerformance", key: "myperformance", color: themes.myperformance },
  ];

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2 text-xs py-2.5 px-3.5 rounded-lg border animate-in fade-in duration-150 ${
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

      {/* Main Form Doppel Card */}
      <div className="doppel-outer">
        <div className="doppel-inner p-4 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-hairline pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Palette className="w-5 h-5" weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-ink">
                    Profil Brand & SaaS White-Label
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                    Multi-Tenant
                  </span>
                </div>
                <p className="text-xs text-ash mt-0.5">
                  Atur nama bisnis dan personalisasi warna tema tone untuk seluruh ekosistem aplikasi.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* 1. Identitas Brand Utama */}
            <div className="rounded-xl border border-hairline bg-surface p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-hairline/80 pb-2">
                <Storefront className="w-4 h-4 text-accent" weight="bold" />
                <span className="text-xs font-bold text-ink uppercase tracking-wider">
                  1. Identitas Brand Bisnis
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ash mb-1.5">
                    Nama Brand <span className="text-rose">*</span>
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Contoh: Mochikin, Matchaku, Kopi Senja"
                    disabled={busy}
                    className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                    required
                  />
                  <p className="text-[11px] text-ash mt-1">
                    Nama ini akan disematkan di akhir seluruh aplikasi: <span className="font-semibold text-accent">My* - {brandName || "Brand"}</span>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ash mb-1.5">
                    Tagline / Deskripsi Bisnis
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Contoh: Authentic Japanese Street Food & Drinks"
                    disabled={busy}
                    className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-xs text-ink placeholder:text-mist outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                  />
                  <p className="text-[11px] text-ash mt-1">
                    Slogan ringkas yang muncul pada portal login dan header.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Tone Warna Aplikasi */}
            <div className="rounded-xl border border-hairline bg-surface p-4 sm:p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-hairline/80 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkle className="w-4 h-4 text-accent" weight="bold" />
                  <span className="text-xs font-bold text-ink uppercase tracking-wider">
                    2. Tone Warna Tiap Aplikasi
                  </span>
                </div>
                <span className="text-[11px] text-ash">
                  Pilih nuansa khas untuk masing-masing modul
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* MyService Tone */}
                <div className="rounded-lg border border-hairline bg-sunken/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">MyService (Gateway & Identity)</span>
                    <span className="font-mono text-[10px] uppercase font-semibold text-accent">
                      {themes.service}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {THEME_COLOR_PRESETS.service.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setThemes((prev) => ({ ...prev, service: preset.label.toLowerCase() }))}
                        className={`flex items-center gap-2 p-2 rounded-md border text-left transition-all cursor-pointer ${
                          themes.service.toLowerCase().includes(preset.label.toLowerCase().split(" ")[0])
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-hairline bg-white hover:bg-sunken"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold text-ink truncate">{preset.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* MyStokis Tone */}
                <div className="rounded-lg border border-hairline bg-sunken/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">MyStokis (Gudang & Bahan Baku)</span>
                    <span className="font-mono text-[10px] uppercase font-semibold text-accent">
                      {themes.mystokis}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {THEME_COLOR_PRESETS.mystokis.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setThemes((prev) => ({ ...prev, mystokis: preset.label.toLowerCase() }))}
                        className={`flex items-center gap-2 p-2 rounded-md border text-left transition-all cursor-pointer ${
                          themes.mystokis.toLowerCase().includes(preset.label.toLowerCase().split(" ")[0])
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-hairline bg-white hover:bg-sunken"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold text-ink truncate">{preset.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* MyCustomer Tone */}
                <div className="rounded-lg border border-hairline bg-sunken/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">MyCustomer (CRM & Pelanggan)</span>
                    <span className="font-mono text-[10px] uppercase font-semibold text-accent">
                      {themes.mycustomer}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {THEME_COLOR_PRESETS.mycustomer.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setThemes((prev) => ({ ...prev, mycustomer: preset.label.toLowerCase() }))}
                        className={`flex items-center gap-2 p-2 rounded-md border text-left transition-all cursor-pointer ${
                          themes.mycustomer.toLowerCase().includes(preset.label.toLowerCase().split(" ")[0])
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-hairline bg-white hover:bg-sunken"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold text-ink truncate">{preset.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* MyCheck Tone */}
                <div className="rounded-lg border border-hairline bg-sunken/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">MyCheck (SOP & Checklist)</span>
                    <span className="font-mono text-[10px] uppercase font-semibold text-accent">
                      {themes.mycheck}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {THEME_COLOR_PRESETS.mycheck.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setThemes((prev) => ({ ...prev, mycheck: preset.label.toLowerCase() }))}
                        className={`flex items-center gap-2 p-2 rounded-md border text-left transition-all cursor-pointer ${
                          themes.mycheck.toLowerCase().includes(preset.label.toLowerCase().split(" ")[0])
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-hairline bg-white hover:bg-sunken"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold text-ink truncate">{preset.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* MyPerformance Tone */}
                <div className="rounded-lg border border-hairline bg-sunken/40 p-3.5 space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">MyPerformance (Scorecard & Kinerja)</span>
                    <span className="font-mono text-[10px] uppercase font-semibold text-accent">
                      {themes.myperformance}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {THEME_COLOR_PRESETS.myperformance.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setThemes((prev) => ({ ...prev, myperformance: preset.label.toLowerCase() }))}
                        className={`flex items-center gap-2 p-2 rounded-md border text-left transition-all cursor-pointer ${
                          themes.myperformance.toLowerCase().includes(preset.label.toLowerCase().split(" ")[0])
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-hairline bg-white hover:bg-sunken"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold text-ink truncate">{preset.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Live Dynamic Naming Preview */}
            <div className="rounded-xl border border-hairline bg-surface p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-hairline/80 pb-2">
                <Eye className="w-4 h-4 text-accent" weight="bold" />
                <span className="text-xs font-bold text-ink uppercase tracking-wider">
                  3. Preview Hasil Format Judul Aplikasi
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {previewApps.map((item) => (
                  <div
                    key={item.prefix}
                    className="flex items-center justify-between p-3 rounded-lg border border-hairline bg-sunken/50"
                  >
                    <div>
                      <div className="font-bold text-xs text-ink font-display">
                        {formatAppTitle(item.prefix, brandName)}
                      </div>
                      <div className="text-[10px] text-ash">
                        Tema: <span className="capitalize font-semibold text-accent">{item.color}</span>
                      </div>
                    </div>
                    <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-accent">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-end pt-3 border-t border-hairline">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-xs font-semibold text-white hover:bg-accent-soft active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs min-h-[40px]"
              >
                <FloppyDisk className="w-4 h-4" weight="bold" />
                <span>{busy ? "Menyimpan Perubahan..." : "Simpan Profil & Tema Brand"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
