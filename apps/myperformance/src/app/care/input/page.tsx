"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Sparkle,
  CheckCircle,
  Warning,
  PaperPlaneRight,
  Info,
  User,
  ChatsCircle,
  Question,
  Lock,
  ArrowRight,
  ArrowLeft,
  FloppyDisk,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Dimension {
  dimension_id: string;
  code: string;
  name: string;
  icon: string | null;
  sort_order: number;
  bars_1: string;
  bars_2: string;
  bars_3: string;
  bars_4: string;
}

interface RateeProgress {
  rateeId: string;
  name: string;
  role: string;
  ratedCount: number;
  isComplete: boolean;
}

interface PeriodData {
  period_id: string;
  period_key: string;
  label: string;
  status: "draft" | "open" | "closed";
}

const SCORE_LABELS: Record<number, string> = {
  1: "Perlu Perhatian",
  2: "Berkembang",
  3: "Sesuai Standar",
  4: "Unggul",
};

const COMPLAINT_CATEGORIES = [
  "Sistem",
  "Rekan Kerja",
  "Atasan",
  "Fasilitas & Alat",
  "Lainnya",
];

export default function CareInputPage() {
  const { personId, authenticated } = useSession();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodData | null>(null);
  const [ratees, setRatees] = useState<RateeProgress[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<"none" | "draft" | "submitted">("none");
  const [dimensions, setDimensions] = useState<Dimension[]>([]);

  // Stepper state: index 0..(ratees.length - 1) is a ratee, index ratees.length is "Keluhan", index ratees.length + 1 is "Ringkasan"
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Current ratee evaluation state: record of dimensionId -> { score, note }
  const [currentScores, setCurrentScores] = useState<Record<string, { score: number; note: string }>>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  // Complaint state
  const [complaintCategory, setComplaintCategory] = useState("Lainnya");
  const [complaintText, setComplaintText] = useState("");
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);

  // BARS Sheet for all dimensions
  const [barsSheetOpen, setBarsSheetOpen] = useState(false);
  const [selectedDimensionForBars, setSelectedDimensionForBars] = useState<Dimension | null>(null);

  // Load initial data
  const loadPeriodAndDimensions = useCallback(async () => {
    try {
      setLoading(true);
      const [dimRes, perRes] = await Promise.all([
        fetch("/api/care/dimensions"),
        fetch("/api/care/period/current"),
      ]);

      const dimJson = await dimRes.json();
      const perJson = await perRes.json();

      if (dimJson.ok) setDimensions(dimJson.data);
      if (perJson.ok) {
        setPeriod(perJson.data.period);
        setRatees(perJson.data.ratees || []);
        setSubmissionStatus(perJson.data.submissionStatus || "none");
      }
    } catch {
      setFeedback({ type: "err", message: "Gagal memuat data periode/dimensi." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeriodAndDimensions();
  }, [loadPeriodAndDimensions]);

  // Load draft scores whenever current ratee changes
  const loadRateeDraft = useCallback(
    async (rateeId: string) => {
      try {
        const res = await fetch(`/api/care/input/${rateeId}`);
        const json = await res.json();
        const initial: Record<string, { score: number; note: string }> = {};

        // Default all dimensions to score 3
        for (const dim of dimensions) {
          initial[dim.dimension_id] = { score: 3, note: "" };
        }

        if (json.ok && Array.isArray(json.data)) {
          for (const item of json.data) {
            initial[item.dimensionId] = {
              score: item.score || 3,
              note: item.note || "",
            };
          }
        }
        setCurrentScores(initial);
      } catch {
        // keep defaults
      }
    },
    [dimensions]
  );

  useEffect(() => {
    if (ratees.length > 0 && currentStep < ratees.length) {
      loadRateeDraft(ratees[currentStep].rateeId);
    }
  }, [currentStep, ratees, loadRateeDraft]);

  // Auto-save draft for current ratee
  const saveCurrentDraft = async () => {
    if (currentStep >= ratees.length || !period || period.status !== "open") return;
    const ratee = ratees[currentStep];
    setSavingDraft(true);
    try {
      const scoresPayload = Object.entries(currentScores).map(([dimensionId, val]) => ({
        dimensionId,
        score: val.score,
        note: val.note,
      }));

      await fetch(`/api/care/input/${ratee.rateeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: scoresPayload }),
      });

      // Update ratees progress locally
      setRatees((prev) =>
        prev.map((r) =>
          r.rateeId === ratee.rateeId ? { ...r, ratedCount: 7, isComplete: true } : r
        )
      );
    } catch {
      // ignore draft save error silently
    } finally {
      setSavingDraft(false);
    }
  };

  const handleScoreChange = (dimensionId: string, score: number) => {
    setCurrentScores((prev) => ({
      ...prev,
      [dimensionId]: {
        score,
        note: prev[dimensionId]?.note || "",
      },
    }));
  };

  const handleNoteChange = (dimensionId: string, note: string) => {
    setCurrentScores((prev) => ({
      ...prev,
      [dimensionId]: {
        score: prev[dimensionId]?.score ?? 3,
        note,
      },
    }));
  };

  // Next / Prev Navigation
  const handleNext = async () => {
    // Validate current ratee before advancing: if score != 3, note >= 10 chars required
    if (currentStep < ratees.length) {
      for (const dim of dimensions) {
        const val = currentScores[dim.dimension_id];
        if (val && val.score !== 3) {
          if (!val.note || val.note.trim().length < 10) {
            setFeedback({
              type: "err",
              message: `Dimensi "${dim.name}" bernilai ${val.score} membutuhkan deskripsi minimal 10 karakter.`,
            });
            return;
          }
        }
      }
      setFeedback(null);
      await saveCurrentDraft();
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrev = async () => {
    if (currentStep < ratees.length) {
      await saveCurrentDraft();
    }
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  // Send Complaint
  const handleSendComplaint = async () => {
    if (!complaintText.trim()) return;
    try {
      const res = await fetch("/api/care/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: complaintCategory, text: complaintText }),
      });
      const json = await res.json();
      if (json.ok) {
        setComplaintSubmitted(true);
        setFeedback({ type: "ok", message: "Keluhan Anda berhasil dicatat." });
      }
    } catch {
      setFeedback({ type: "err", message: "Gagal mengirim keluhan." });
    }
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/care/submit", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Gagal mengirim penilaian.");
      }
      setSubmissionStatus("submitted");
      setFeedback({
        type: "ok",
        message: "Seluruh penilaian Anda telah berhasil dikirimkan!",
      });
    } catch (err) {
      setFeedback({
        type: "err",
        message: err instanceof Error ? err.message : "Gagal submit.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader kicker="PENILAIAN ORANG TEPAT" title="Formulir Input CARE" />
        <CardSkeleton />
      </div>
    );
  }

  // If no open period
  if (!period || period.status !== "open") {
    return (
      <div className="space-y-6">
        <PageHeader
          kicker="PENILAIAN ORANG TEPAT"
          title="Formulir Input CARE"
          description="Evaluasi berkala 7 dimensi budaya kerja antar rekan kerja satu cabang."
        />
        <div className="rounded-2xl border border-hairline bg-surface p-8 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-ash/10 text-ash">
            <Lock className="size-6" />
          </div>
          <h3 className="text-base font-bold text-ink">Tidak Ada Periode Penilaian yang Buka</h3>
          <p className="text-xs text-ash max-w-md mx-auto leading-relaxed">
            Formulir penilaian CARE hanya aktif saat periode penilaian dibuka oleh Admin. Silakan hubungi Captain atau Admin cabang Anda jika sesi evaluasi bulan ini telah dimulai.
          </p>
        </div>
      </div>
    );
  }

  const completedCount = ratees.filter((r) => r.isComplete).length;
  const isAllComplete = completedCount === ratees.length;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          kicker="PENILAIAN ORANG TEPAT"
          title={`Input CARE — ${period.label}`}
          description="Nilai setiap rekan tim Anda secara objektif. Admin melihat nama penilai, sesama staf tidak."
          badge={
            <div className="flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-xs font-semibold text-accent">
              <Sparkle className="size-3.5" />
              <span>
                Progress: {completedCount} / {ratees.length} Rekan Selesai
              </span>
            </div>
          }
        />

        {/* BARS Guidance Drawer */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setBarsSheetOpen(true)}
          className="gap-1.5 self-start sm:self-center"
        >
          <Question className="size-4 text-accent" />
          <span>Panduan BARS (1-4)</span>
        </Button>
        <Sheet open={barsSheetOpen} onOpenChange={setBarsSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-ink">Panduan Rubrik BARS (7 Dimensi)</SheetTitle>
              <p className="text-xs text-ash">
                Skala perilaku nyata: 1 = Perlu Perhatian, 2 = Berkembang, 3 = Sesuai Standar, 4 = Unggul.
              </p>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              {dimensions.map((dim) => (
                <div key={dim.dimension_id} className="rounded-xl border border-hairline p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{dim.icon || "📌"}</span>
                    <h4 className="text-sm font-bold text-ink">{dim.name}</h4>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="rounded-lg bg-destructive/5 p-2 text-destructive border border-destructive/20">
                      <strong>1 — Perlu Perhatian:</strong> {dim.bars_1}
                    </div>
                    <div className="rounded-lg bg-amber-500/5 p-2 text-amber-700 border border-amber-500/20">
                      <strong>2 — Berkembang:</strong> {dim.bars_2}
                    </div>
                    <div className="rounded-lg bg-accent/5 p-2 text-accent border border-accent/20">
                      <strong>3 — Sesuai Standar (Normal):</strong> {dim.bars_3}
                    </div>
                    <div className="rounded-lg bg-emerald/5 p-2 text-emerald-800 border border-emerald/20">
                      <strong>4 — Unggul:</strong> {dim.bars_4}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
            feedback.type === "ok"
              ? "border-emerald/30 bg-emerald/10 text-emerald-900"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.type === "ok" ? (
            <CheckCircle className="size-4.5 shrink-0 mt-0.5 text-emerald" />
          ) : (
            <Warning className="size-4.5 shrink-0 mt-0.5 text-destructive" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Stepper Horizontal Scroll */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-2 min-w-max">
          {ratees.map((ratee, idx) => {
            const isCurrent = currentStep === idx;
            return (
              <button
                key={ratee.rateeId}
                onClick={async () => {
                  if (currentStep < ratees.length) await saveCurrentDraft();
                  setCurrentStep(idx);
                }}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all border ${
                  isCurrent
                    ? "border-accent bg-accent text-white shadow-2xs"
                    : ratee.isComplete
                    ? "border-emerald/30 bg-emerald/10 text-emerald-900"
                    : "border-hairline bg-surface text-ink hover:bg-canvas"
                }`}
              >
                <span className="flex size-4.5 items-center justify-center rounded-full bg-black/10 text-[10px]">
                  {idx + 1}
                </span>
                <span>{ratee.name}</span>
                {ratee.isComplete && <CheckCircle className="size-3.5" />}
              </button>
            );
          })}

          {/* Step Keluhan */}
          <button
            onClick={async () => {
              if (currentStep < ratees.length) await saveCurrentDraft();
              setCurrentStep(ratees.length);
            }}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all border ${
              currentStep === ratees.length
                ? "border-accent bg-accent text-white shadow-2xs"
                : complaintSubmitted
                ? "border-emerald/30 bg-emerald/10 text-emerald-900"
                : "border-hairline bg-surface text-ink hover:bg-canvas"
            }`}
          >
            <ChatsCircle className="size-4" />
            <span>Keluhan Tim</span>
          </button>

          {/* Step Ringkasan & Submit */}
          <button
            onClick={async () => {
              if (currentStep < ratees.length) await saveCurrentDraft();
              setCurrentStep(ratees.length + 1);
            }}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all border ${
              currentStep === ratees.length + 1
                ? "border-accent bg-accent text-white shadow-2xs"
                : "border-hairline bg-surface text-ink hover:bg-canvas"
            }`}
          >
            <PaperPlaneRight className="size-4" />
            <span>Ringkasan & Kirim</span>
          </button>
        </div>
      </div>

      {/* Main Content Step */}
      {currentStep < ratees.length && (
        <div className="rounded-2xl border border-hairline bg-surface p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-hairline pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-accent/10 font-bold text-accent">
                {ratees[currentStep].name.charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">
                  Menilai: {ratees[currentStep].name}
                </h3>
                <p className="text-xs text-ash capitalize">
                  Posisi: {ratees[currentStep].role.replace("role_", "")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {savingDraft && (
                <span className="flex items-center gap-1 text-[11px] text-ash">
                  <FloppyDisk className="size-3 animate-spin" />
                  Menyimpan draf...
                </span>
              )}
              <Badge variant="outline" className="font-mono text-xs">
                {currentStep + 1} dari {ratees.length} Rekan
              </Badge>
            </div>
          </div>

          {/* 7 Dimensions Form */}
          <div className="space-y-6">
            {dimensions.map((dim) => {
              const currentVal = currentScores[dim.dimension_id] || { score: 3, note: "" };
              const isNotStandard = currentVal.score !== 3;

              return (
                <div
                  key={dim.dimension_id}
                  className="rounded-xl border border-hairline/80 bg-canvas/30 p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{dim.icon || "📌"}</span>
                      <span className="text-sm font-bold text-ink">{dim.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDimensionForBars(dim);
                          setBarsSheetOpen(true);
                        }}
                        className="text-ash hover:text-accent transition-colors"
                        title="Lihat kriteria BARS dimensi ini"
                      >
                        <Info className="size-4" />
                      </button>
                    </div>

                    {/* Segmented Control 1-4 */}
                    <div className="flex items-center gap-1 rounded-xl border border-hairline bg-surface p-1">
                      {[1, 2, 3, 4].map((num) => {
                        const selected = currentVal.score === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleScoreChange(dim.dimension_id, num)}
                            className={`flex flex-col items-center justify-center rounded-lg px-3 py-1.5 min-w-[56px] transition-all ${
                              selected
                                ? num === 3
                                  ? "bg-accent text-white shadow-2xs"
                                  : num === 4
                                  ? "bg-emerald text-white shadow-2xs"
                                  : num === 2
                                  ? "bg-amber-500 text-white shadow-2xs"
                                  : "bg-destructive text-white shadow-2xs"
                                : "text-ash hover:bg-canvas hover:text-ink"
                            }`}
                          >
                            <span className="font-mono text-xs font-bold">{num}</span>
                            <span className="text-[9px] font-medium leading-none mt-0.5 opacity-90 truncate max-w-[50px]">
                              {SCORE_LABELS[num]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Textarea Deskripsi Perilaku */}
                  <div>
                    <label className="flex items-center justify-between text-xs font-medium text-ash mb-1">
                      <span>
                        Fakta & Perilaku Teramati:{" "}
                        {isNotStandard ? (
                          <span className="text-destructive font-bold">
                            *(Wajib min. 10 karakter karena skor ≠ 3)
                          </span>
                        ) : (
                          <span className="text-ash">(Opsional untuk skor standar 3)</span>
                        )}
                      </span>
                      <span className="text-[11px] font-mono">
                        {currentVal.note.length} karakter
                      </span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder={
                        isNotStandard
                          ? "Ceritakan situasi nyata atau contoh tindakan konkret yang Anda amati..."
                          : "Catatan tambahan atau apresiasi konkret (opsional)..."
                      }
                      value={currentVal.note}
                      onChange={(e) => handleNoteChange(dim.dimension_id, e.target.value)}
                      onBlur={saveCurrentDraft}
                      className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-hairline">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" />
              <span>Sebelumnya</span>
            </Button>

            <Button variant="accent" size="sm" onClick={handleNext} className="gap-1.5">
              <span>Simpan & Lanjut</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step Keluhan Tim */}
      {currentStep === ratees.length && (
        <div className="rounded-2xl border border-hairline bg-surface p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-ink">Kotak Keluhan & Aspirasi Tim</h3>
            <p className="text-xs text-ash mt-1 leading-relaxed">
              &quot;Apa saja keluhanmu selama ini? Ceritakan fakta dan situasinya, bukan siapa yang salah.&quot;
              Keluhan ini akan ditinjau langsung oleh Admin/Owner untuk dicari solusinya bersama lewat alur ITO (Identify, Discuss, Solve).
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Kategori Keluhan:
              </label>
              <div className="flex flex-wrap gap-2">
                {COMPLAINT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setComplaintCategory(cat)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${
                      complaintCategory === cat
                        ? "border-accent bg-accent text-white"
                        : "border-hairline bg-canvas text-ink hover:bg-surface"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Deskripsi Fakta & Situasi:
              </label>
              <textarea
                rows={5}
                placeholder="Tuliskan kendala operasional, fasilitas gerai, sistem aplikasi, atau situasi kerja yang perlu perbaikan..."
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                disabled={complaintSubmitted}
                className="w-full rounded-xl border border-hairline bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-accent"
              />
            </div>

            {!complaintSubmitted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendComplaint}
                disabled={!complaintText.trim()}
                className="gap-1.5"
              >
                <FloppyDisk className="size-4" />
                <span>Kirim Keluhan Ini</span>
              </Button>
            ) : (
              <p className="text-xs font-semibold text-emerald flex items-center gap-1.5">
                <CheckCircle className="size-4" />
                Keluhan Anda telah tersimpan.
              </p>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-hairline">
            <Button variant="outline" size="sm" onClick={handlePrev} className="gap-1.5">
              <ArrowLeft className="size-4" />
              <span>Kembali ke Penilaian Rekan</span>
            </Button>

            <Button
              variant="accent"
              size="sm"
              onClick={() => setCurrentStep(ratees.length + 1)}
              className="gap-1.5"
            >
              <span>Lanjut ke Ringkasan</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step Ringkasan & Submit */}
      {currentStep === ratees.length + 1 && (
        <div className="rounded-2xl border border-hairline bg-surface p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-ink">Ringkasan Pengisian Penilaian CARE</h3>
            <p className="text-xs text-ash mt-0.5">
              Periksa kelengkapan penilaian sebelum mengirimkan ke sistem.
            </p>
          </div>

          <div className="divide-y divide-hairline">
            {ratees.map((ratee) => (
              <div key={ratee.rateeId} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                    {ratee.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink">{ratee.name}</p>
                    <p className="text-[11px] text-ash capitalize">
                      {ratee.role.replace("role_", "")}
                    </p>
                  </div>
                </div>

                <div>
                  {ratee.isComplete ? (
                    <Badge variant="success" className="text-xs gap-1">
                      <CheckCircle className="size-3.5" />
                      Lengkap (7 Dimensi)
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <Warning className="size-3.5" />
                      Belum Lengkap
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Transparency notice */}
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-xs space-y-1">
            <p className="font-semibold text-accent flex items-center gap-1.5">
              <ShieldCheck className="size-4" />
              Pemberitahuan Transparansi & Kerahasiaan
            </p>
            <p className="text-ash leading-relaxed">
              Admin & Manajemen dapat melihat nama penilai untuk akuntabilitas. Sesama rekan staf <strong>tidak akan pernah</strong> melihat nama Anda (skor dan masukan ditampilkan secara anonim).
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-hairline">
            <Button variant="outline" size="sm" onClick={handlePrev} className="gap-1.5">
              <ArrowLeft className="size-4" />
              <span>Periksa Kembali</span>
            </Button>

            <Button
              variant="accent"
              size="sm"
              onClick={handleFinalSubmit}
              disabled={!isAllComplete || submitting}
              className="gap-1.5"
            >
              <PaperPlaneRight className="size-4" />
              <span>{submitting ? "Mengirim..." : "Kirim Seluruh Penilaian (Submit)"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
