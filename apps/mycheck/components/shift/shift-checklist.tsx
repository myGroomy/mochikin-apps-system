'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ulid } from 'ulid';
import { AlertCircle, Clock3 } from 'lucide-react';
import { PageLoader } from '@/components/ui/QuantumLoader';
import { SkeletonTransition } from '@/components/ui/skeleton-transition';
import { Button } from '@/components/ui/button';
import { ChecklistPointControls } from '@/components/shift/checklist-point-controls';
import { ShiftCloseDialog } from '@/components/shift/shift-close-dialog';
import { PreviousHandoverCard } from '@/components/shift/previous-handover-card';
import { DraftRestoreDialog } from '@/components/shift/draft-restore-dialog';
import { useCabang } from '@/lib/CabangContext';
import { UserBadge } from '@/components/shared/user-badge';
import { resolvedSectionColor } from '@/lib/shared/section-color';
import { PointBadge } from '@mochikin/ui/points';
import type { ShiftDraftPayload, ShiftDraftPoint } from '@/lib/draft-types';
import { clearLocalShiftDraft, readLocalShiftDraft, writeLocalShiftDraft } from '@/lib/draft-client';

type EntryState = 'belum' | 'selesai' | 'skip';
type SyncState = 'idle' | 'saving' | 'saved' | 'updated' | 'error';
type InputType =
  | 'centang'
  | 'foto'
  | 'teks'
  | 'angka'
  | 'ok_tidak_ok'
  | 'paragraf'
  | 'pilihan_ganda'
  | 'kotak_centang'
  | 'dropdown'
  | 'tanggal_waktu';

interface ProgressPoint {
  point_ref: string;
  title: string;
  instruction: string | null;
  input_type: InputType;
  input_types?: InputType[];
  options: string[] | null;
  is_required: boolean;
  target_time: string | null;
  number_min: number | null;
  number_max: number | null;
  sort_order: number;
  state: EntryState;
  value: string | null;
  out_of_range: boolean;
  skip_reason: string | null;
  completed_by: string | null;
  completed_by_name: string | null;
  completed_at: string | null;
  timing_label: string | null;
  timing_delta_minutes: number | null;
  points?: number;
}

interface ProgressCategory {
  id: string;
  name: string;
  sort_order: number;
  color: string | null;
  total_points?: number;
  points: ProgressPoint[];
}

interface ShiftProgressResponse {
  shift: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    date: string;
    status: string;
    branch_timezone: string | null;
    pj_user_id: string;
  };
  progress: {
    total: number;
    selesai: number;
    skip: number;
    belum: number;
    wajib_selesai: number;
  };
  categories: ProgressCategory[];
  participants: Array<{
    user_id: string;
    name: string;
    is_pj: boolean;
    first_action_type: string;
    first_action_at: string;
    items_done: number;
  }>;
  handover_fields: Array<{
    id: string;
    label: string;
    field_type: string;
    options: string[] | null;
    is_required: boolean;
  }>;
  server_time: string;
}

function formatTime(value: string | null) {
  if (!value) return '-';
  return value.slice(0, 5);
}

function labelTiming(timing: string | null) {
  switch (timing) {
    case 'tepat_waktu':
      return 'Tepat waktu';
    case 'lebih_awal':
      return 'Lebih awal';
    case 'terlambat':
      return 'Terlambat';
    default:
      return 'Belum dihitung';
  }
}

export function ShiftChecklistClient({
  shiftId,
  userId,
}: {
  shiftId: string;
  userId: string;
}) {
  const [data, setData] = useState<ShiftProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyPoint, setBusyPoint] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [draftPoints, setDraftPoints] = useState<Record<string, ShiftDraftPoint>>({});
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<number>(Date.now());
  const [draftPromptOpen, setDraftPromptOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'semua' | 'wajib' | 'belum' | 'selesai'>('semua');
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const draftHydratedRef = useRef(false);
  const draftDirtyRef = useRef(false);
  const draftSaveTimerRef = useRef<number | null>(null);
  const [retryAction, setRetryAction] = useState<{
    point: ProgressPoint;
    action: 'selesai' | 'batal' | 'skip';
    rawValue?: string;
  } | null>(null);
  const progressRequestRef = useRef<Promise<void> | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const { refreshBranches } = useCabang();

  const buildDraft = useCallback((points: Record<string, ShiftDraftPoint>): ShiftDraftPayload | null => {
    if (!data || Object.keys(points).length === 0) return null;
    return { shiftInstanceId: shiftId, userId, shiftDate: data.shift.date, updatedAt: Date.now(), points };
  }, [data, shiftId, userId]);

  const saveDraftToCloud = useCallback(async (draft: ShiftDraftPayload) => {
    setSyncState('saving');
    try {
      const response = await fetch(`/api/shifts/${shiftId}/draft`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        body: JSON.stringify({ draft }),
      });
      if (!response.ok) throw new Error('Draft cloud gagal disimpan');
      setSyncState('saved');
    } catch {
      setSyncState('error');
      // localStorage tetap menjadi fallback.
    }
  }, [shiftId]);

  const discardDraft = useCallback(async () => {
    clearLocalShiftDraft(userId, shiftId);
    setDraftPoints({});
    draftDirtyRef.current = false;
    setDraftPromptOpen(false);
    await fetch(`/api/shifts/${shiftId}/draft`, { method: 'DELETE', headers: { 'X-Requested-With': 'fetch' } }).catch(() => {});
  }, [shiftId, userId]);

  const handleDraftChange = useCallback((pointRef: string, pointDraft: ShiftDraftPoint | null) => {
    draftDirtyRef.current = true;
    setDraftPoints((current) => {
      if (!pointDraft) {
        const next = { ...current };
        delete next[pointRef];
        return next;
      }
      return { ...current, [pointRef]: pointDraft };
    });
  }, []);

  const loadProgress = useCallback(async () => {
    if (progressRequestRef.current) return progressRequestRef.current;

    setLoading(true);
    const request = (async () => {
      try {
        const res = await fetch(`/api/shifts/${shiftId}/progress`, {
          headers: { 'X-Requested-With': 'fetch' },
        });
        if (!res.ok) {
          throw new Error('Gagal memuat progress shift');
        }
        const next = (await res.json()) as ShiftProgressResponse;
        setData(next);
        if (!draftHydratedRef.current) {
          const localDraft = readLocalShiftDraft(userId, shiftId);
          let cloudDraft: ShiftDraftPayload | null = null;
          try {
            const draftResponse = await fetch(`/api/shifts/${shiftId}/draft`, { headers: { 'X-Requested-With': 'fetch' } });
            if (draftResponse.ok) cloudDraft = ((await draftResponse.json()) as { draft?: ShiftDraftPayload | null }).draft ?? null;
          } catch { /* local draft tetap dapat dipakai */ }
          const selected = [localDraft, cloudDraft]
            .filter((draft): draft is ShiftDraftPayload => Boolean(draft))
            .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
          const completed = new Set(next.categories.flatMap((category) => category.points).filter((point) => point.state !== 'belum').map((point) => point.point_ref));
          const restoredPoints = selected
            ? Object.fromEntries(Object.entries(selected.points).filter(([pointRef]) => !completed.has(pointRef)))
            : {};
          setDraftPoints(restoredPoints);
          if (selected) setDraftUpdatedAt(selected.updatedAt);
          if (selected && Object.keys(restoredPoints).length > 0 && next.shift.status === 'berjalan') {
            const restored = { ...selected, points: restoredPoints };
            writeLocalShiftDraft(restored);
            if (!cloudDraft || selected.updatedAt > cloudDraft.updatedAt) void saveDraftToCloud(restored);
            setDraftPromptOpen(true);
          }
          draftHydratedRef.current = true;
        }
      } catch {
        setNotice('Gagal memuat progress shift. Coba refresh halaman.');
      } finally {
        setLoading(false);
      }
    })();
    progressRequestRef.current = request;
    try {
      await request;
    } finally {
      if (progressRequestRef.current === request) progressRequestRef.current = null;
    }
  }, [saveDraftToCloud, shiftId, userId]);

  useEffect(() => {
    if (!draftHydratedRef.current || !draftDirtyRef.current || !data || data.shift.status !== 'berjalan') return;
    if (draftSaveTimerRef.current !== null) window.clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = window.setTimeout(() => {
      const draft = buildDraft(draftPoints);
      if (!draft) {
        clearLocalShiftDraft(userId, shiftId);
        void fetch(`/api/shifts/${shiftId}/draft`, { method: 'DELETE', headers: { 'X-Requested-With': 'fetch' } }).catch(() => {});
        return;
      }
      writeLocalShiftDraft(draft);
      void saveDraftToCloud(draft);
    }, 700);
    return () => {
      if (draftSaveTimerRef.current !== null) window.clearTimeout(draftSaveTimerRef.current);
    };
  }, [buildDraft, data, draftPoints, saveDraftToCloud, shiftId, userId]);

  useEffect(() => {
    if (!draftHydratedRef.current || !draftDirtyRef.current || !data || data.shift.status !== 'berjalan') return;
    const persistBeforeUnload = () => {
      const draft = buildDraft(draftPoints);
      if (draft) writeLocalShiftDraft(draft);
    };
    window.addEventListener('beforeunload', persistBeforeUnload);
    return () => window.removeEventListener('beforeunload', persistBeforeUnload);
  }, [buildDraft, data, draftPoints]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        void fetch(`/api/shifts/${shiftId}/sync`, {
          method: 'POST',
          headers: { 'X-Requested-With': 'fetch' },
        }).then((response) => {
          if (!response.ok) {
            setSyncState('error');
            return;
          }
          return response.json().then((result: { template_updated?: boolean }) => {
            setSyncState(result.template_updated ? 'updated' : 'saved');
          });
        }).catch(() => {
          setSyncState('error');
        }).finally(() => { void loadProgress(); });
      }, 300);
    };
    const interval = window.setInterval(refresh, 20_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [loadProgress]);

  const applyAcceptedEntry = useCallback((
    pointRef: string,
    accepted: {
      state: EntryState;
      value: string | null;
      outOfRange: boolean;
      skipReason: string | null;
      timingLabel: string | null;
      timingDeltaMinutes: number | null;
      completedBy: string | null;
      completedByName: string | null;
      completedAt: string | null;
      itemCountDelta: number;
    },
    newParticipant: ShiftProgressResponse['participants'][number] | null,
  ) => {
    setData((current) => {
      if (!current) return current;
      let target: ProgressPoint | undefined;
      const categories = current.categories.map((category) => ({
        ...category,
        points: category.points.map((point) => {
          if (point.point_ref !== pointRef) return point;
          target = point;
          return {
            ...point,
            state: accepted.state,
            value: accepted.value,
            out_of_range: accepted.outOfRange,
            skip_reason: accepted.skipReason,
            timing_label: accepted.timingLabel,
            timing_delta_minutes: accepted.timingDeltaMinutes,
            completed_by: accepted.completedBy,
            completed_by_name: accepted.completedByName,
            completed_at: accepted.completedAt,
          };
        }),
      }));
      if (!target) return current;

      const participantExists = current.participants.some((item) => item.user_id === userId);
      const participants = newParticipant
        ? participantExists
          ? current.participants.map((item) =>
              item.user_id === userId
                ? newParticipant
                : item,
            )
          : [...current.participants, newParticipant]
        : current.participants.map((item) =>
            item.user_id === userId
              ? { ...item, items_done: item.items_done + accepted.itemCountDelta }
              : item,
          );

      const wasDone = target.state === 'selesai';
      const isDone = accepted.state === 'selesai';
      const wasSkipped = target.state === 'skip';
      const isSkipped = accepted.state === 'skip';
      const requiredDoneDelta = target.is_required ? Number(isDone) - Number(wasDone) : 0;

      return {
        ...current,
        categories,
        participants,
        progress: {
          ...current.progress,
          selesai: current.progress.selesai + Number(isDone) - Number(wasDone),
          skip: current.progress.skip + Number(isSkipped) - Number(wasSkipped),
          belum: current.progress.belum + Number(wasDone || wasSkipped) - Number(isDone || isSkipped),
          wajib_selesai: current.progress.wajib_selesai + requiredDoneDelta,
        },
      };
    });
  }, [userId]);

  const totalDone = useMemo(() => data?.progress.selesai ?? 0, [data]);
  const totalSkip = useMemo(() => data?.progress.skip ?? 0, [data]);

  const submitEntry = async (point: ProgressPoint, action: 'selesai' | 'batal' | 'skip', rawValue?: string) => {
    setBusyPoint(point.point_ref);
    setSyncState('saving');
    setRetryAction(null);
    setNotice(null);
    try {
      const payload: Record<string, string | number | boolean | null> = {
        client_action_id: ulid(),
        point_ref: point.point_ref,
        action,
      };

      if (action === 'skip') {
        const reason = (rawValue ?? '').trim();
        if (reason.length < 3) {
          throw new Error('Alasan skip minimal 3 karakter.');
        }
        payload.skip_reason = reason;
      } else if ((point.input_types?.length ?? 1) > 1) {
        payload.value = rawValue ?? null;
      } else if (point.input_type === 'angka') {
        const numeric = Number(rawValue ?? '');
        if (Number.isNaN(numeric)) {
          throw new Error('Nilai angka tidak valid.');
        }
        payload.value = numeric;
      } else if (point.input_type === 'centang' || point.input_type === 'ok_tidak_ok') {
        payload.value = rawValue === 'true' || rawValue === 'ya' || rawValue === 'ok';
      } else if (point.input_type === 'teks') {
        payload.value = (rawValue ?? '').trim();
      } else if (point.input_type === 'tanggal_waktu') {
        const date = new Date(rawValue ?? '');
        if (Number.isNaN(date.getTime())) {
          throw new Error('Tanggal dan waktu tidak valid.');
        }
        payload.value = date.toISOString();
      } else {
        payload.value = rawValue ?? null;
      }

      const res = await fetch(`/api/shifts/${shiftId}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'fetch',
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        error?: string;
        status?: string;
        code?: string;
        entry?: {
          state: EntryState;
          value: string | null;
          outOfRange: boolean;
          skipReason: string | null;
          timingLabel: string | null;
          timingDeltaMinutes: number | null;
          completedBy: string | null;
          completedByName: string | null;
          completedAt: string | null;
          itemCountDelta: number;
        };
        participant?: ShiftProgressResponse['participants'][number] | null;
      };
      if (!res.ok) {
        if (json.code === 'BR12_CONFLICT') {
          await loadProgress();
        }
        throw new Error(json.error || 'Tidak dapat menyimpan aksi checklist');
      }
      if (json.status === 'diterima' && json.entry) {
        applyAcceptedEntry(point.point_ref, json.entry, json.participant ?? null);
        handleDraftChange(point.point_ref, null);
        setSyncState('saved');
        setRetryAction(null);
      } else {
        await loadProgress();
        setSyncState('saved');
        setRetryAction(null);
      }
    } catch (error) {
      setSyncState('error');
      setRetryAction({ point, action, rawValue });
      setNotice(error instanceof Error ? error.message : 'Gagal menyimpan checklist');
    } finally {
      setBusyPoint(null);
    }
  };

  const markOnDuty = async () => {
    setNotice(null);
    try {
      const response = await fetch(`/api/shifts/${shiftId}/join?duty=1`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'fetch' },
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Gagal mencatat tugas.');
      await loadProgress();
      setNotice('Status saya bertugas sudah dicatat.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Gagal mencatat tugas.');
    }
  };

  const flushPendingDrafts = useCallback(async () => {
    if (!data) return;
    const allPts = data.categories.flatMap((c) => c.points);
    for (const point of allPts) {
      if (point.state !== 'belum') continue;
      const draft = draftPoints[point.point_ref];
      if (!draft) continue;
      const inputTypes = point.input_types?.length ? point.input_types : [point.input_type];
      if (inputTypes.length > 1) {
        const cv = draft.combinedValues;
        if (!cv) continue;
        const output: Record<string, unknown> = {};
        let complete = true;
        for (const type of inputTypes) {
          const val = cv[type];
          if (
            val === undefined ||
            val === null ||
            (typeof val === 'string' && !val.trim()) ||
            (Array.isArray(val) && val.length === 0) ||
            (type === 'centang' && val !== true)
          ) {
            complete = false;
            break;
          }
          output[type] =
            type === 'tanggal_waktu' && typeof val === 'string'
              ? new Date(val).toISOString()
              : type === 'kotak_centang'
                ? JSON.stringify(val)
                : val;
        }
        if (complete) await submitEntry(point, 'selesai', JSON.stringify(output));
      } else if (point.input_type === 'kotak_centang') {
        if (draft.selectedOptions?.length) {
          await submitEntry(point, 'selesai', JSON.stringify(draft.selectedOptions));
        }
      } else if (draft.value && draft.value.trim()) {
        await submitEntry(point, 'selesai', draft.value.trim());
      }
    }
  }, [data, draftPoints]);

  const handleClosed = useCallback(async () => {
    await Promise.all([loadProgress(), refreshBranches()]);
  }, [loadProgress, refreshBranches]);

  if (loading && !data) {
    return (
      <main className="mx-auto max-w-6xl space-y-4 px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 pb-24 md:pb-10">
        <SkeletonTransition>
          <PageLoader text="Memuat shift…" className="min-h-[60dvh]" />
        </SkeletonTransition>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 pb-24 md:pb-10">
        
            <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-ink-muted">
              Shift tidak tersedia.
            </div>
      </main>
    );
  }

  return (
    <>
    <main className="mx-auto max-w-6xl space-y-4 px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 pb-24 md:pb-10">
      {notice && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900 shadow-xs">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <span className="leading-snug">{notice}</span>
            {retryAction && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100/60"
                onClick={() => void submitEntry(retryAction.point, retryAction.action, retryAction.rawValue)}
                disabled={busyPoint !== null}
              >
                Coba lagi
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STICKY WORKFLOW HEADER */}
      <header className="sticky top-16 z-20 rounded-2xl border border-border bg-surface/95 p-4 sm:p-5 shadow-xs backdrop-blur supports-[backdrop-filter]:bg-surface/90">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">{data.shift.date}</span>
              <span className="text-ink-muted/40">•</span>
              <span className="inline-flex items-center rounded-full border border-border bg-canvas px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                {data.shift.status === 'berjalan' ? 'Shift Berjalan' : data.shift.status}
              </span>
            </div>
            <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-ink sm:text-3xl">{data.shift.name}</h1>
            <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">
              {formatTime(data.shift.start_time)} - {formatTime(data.shift.end_time)}
              {data.shift.branch_timezone ? ` (${data.shift.branch_timezone})` : ''}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-canvas px-3.5 py-2.5 md:flex-col md:items-end md:justify-center">
            <div className="text-xs text-ink-muted">
              <span className="text-base font-bold text-ink">{totalDone}</span> / {data.progress.total} selesai
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-muted" aria-live="polite">
              <span
                className={`h-2 w-2 rounded-full transition-colors ${
                  syncState === 'error'
                    ? 'bg-error ring-2 ring-error/20'
                    : syncState === 'saving'
                    ? 'bg-warning animate-pulse'
                    : syncState === 'saved' || syncState === 'updated'
                    ? 'bg-success ring-2 ring-success/20'
                    : 'bg-border-strong'
                }`}
                aria-hidden="true"
              />
              <span className="font-medium text-ink">
                {syncState === 'saving'
                  ? 'Menyimpan...'
                  : syncState === 'updated'
                  ? 'Checklist sinkron'
                  : syncState === 'saved'
                  ? 'Tersimpan aman'
                  : syncState === 'error'
                  ? 'Gagal simpan'
                  : 'Siap'}
              </span>
            </div>
          </div>
        </div>

        {/* Tactile Progress Bar */}
        <div className="mt-3.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-300 ease-out"
              style={{
                width: `${data.progress.total > 0 ? Math.min(100, Math.round(((totalDone + totalSkip) / data.progress.total) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>
      </header>

      {/* SUMMARY BENTO METRICS */}
      <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-3 sm:p-4 text-center shadow-xs">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-ink-muted">Progress</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-ink">
            {data.progress.total > 0 ? Math.round(((totalDone + totalSkip) / data.progress.total) * 100) : 0}%
          </p>
          <p className="text-[10px] sm:text-xs text-ink-muted mt-0.5">{totalDone + totalSkip} dari {data.progress.total}</p>
        </div>
        <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-3 sm:p-4 text-center shadow-xs">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-ink-muted">Sisa Belum</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-amber-700">{data.progress.belum}</p>
          <p className="text-[10px] sm:text-xs text-ink-muted mt-0.5">Tugas tersisa</p>
        </div>
        <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-3 sm:p-4 text-center shadow-xs">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-ink-muted">Tim Shift</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-ink">{data.participants.length}</p>
          <p className="text-[10px] sm:text-xs text-ink-muted mt-0.5">Orang bertugas</p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
        <section className="space-y-4">
          {/* Status Filter Pills for Staff */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setFilterStatus('semua')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === 'semua'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-canvas'
              }`}
            >
              Semua ({data.progress.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('wajib')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === 'wajib'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-canvas'
              }`}
            >
              Wajib ({data.categories.flatMap((c) => c.points).filter((p) => p.is_required).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('belum')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === 'belum'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-canvas'
              }`}
            >
              Belum Selesai ({data.progress.belum})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('selesai')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === 'selesai'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-canvas'
              }`}
            >
              Selesai ({totalDone})
            </button>
          </div>

          {/* Category Filter Chips for Multi-Category Shifts */}
          {data.categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('semua')}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedCategory === 'semua'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'border border-border bg-surface text-ink-muted hover:text-ink hover:bg-canvas'
                }`}
              >
                Semua Kategori ({data.categories.length})
              </button>
              {data.categories.map((cat, idx) => {
                const isSelected = selectedCategory === cat.id;
                const catPoints = cat.points ?? [];
                const donePoints = catPoints.filter((p) => p.state === 'selesai').length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                        : 'border border-border bg-surface text-ink-muted hover:text-ink hover:bg-canvas'
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: resolvedSectionColor(cat.color, idx) }}
                      aria-hidden="true"
                    />
                    <span>{cat.name}</span>
                    <span className={`text-[10px] font-normal ${isSelected ? 'text-primary-foreground/80' : 'text-ink-muted'}`}>
                      ({donePoints}/{catPoints.length})
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {data.categories
            .filter((cat) => selectedCategory === 'semua' || cat.id === selectedCategory)
            .every((cat) => {
              const pts = cat.points.filter((p) => {
                if (filterStatus === 'wajib') return p.is_required;
                if (filterStatus === 'belum') return p.state === 'belum';
                if (filterStatus === 'selesai') return p.state === 'selesai';
                return true;
              });
              return pts.length === 0;
            }) && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted">
              Tidak ada item checklist yang cocok dengan filter yang dipilih.
            </div>
          )}

          {data.categories
            .filter((cat) => selectedCategory === 'semua' || cat.id === selectedCategory)
            .map((category, index) => {
              const displayedPoints = category.points.filter((point) => {
                if (filterStatus === 'wajib') return point.is_required;
                if (filterStatus === 'belum') return point.state === 'belum';
                if (filterStatus === 'selesai') return point.state === 'selesai';
                return true;
              });

              if (displayedPoints.length === 0 && filterStatus !== 'semua') {
                return null;
              }

              const catTotalPoints = category.total_points ?? category.points.reduce((s, p) => s + (p.points ?? 0), 0);
              const catDoneCount = category.points.filter((p) => p.state === 'selesai').length;

              return (
                <div key={category.id} className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full border border-border/40 shadow-xs"
                        style={{ backgroundColor: resolvedSectionColor(category.color, index) }}
                        aria-hidden="true"
                      />
                      <h2 className="truncate text-base sm:text-lg font-bold text-ink">{category.name}</h2>
                    </div>
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="font-medium text-ink-muted">
                      <strong className="text-ink">{catDoneCount}</strong>/{category.points.length} selesai
                    </span>
                    <span className="rounded-full border border-border bg-canvas px-2.5 py-0.5 font-medium text-ink-muted" title="Total bobot SOP kategori ini">
                      Bobot: {catTotalPoints}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {displayedPoints.map((point) => {
                    const isDone = point.state === 'selesai';
                    const isSkipped = point.state === 'skip';
                    const cardStyle = isDone
                      ? 'border-border border-l-4 border-l-emerald-600 bg-surface shadow-xs'
                      : isSkipped
                      ? 'border-border border-l-4 border-l-amber-500 bg-surface shadow-xs'
                      : 'border-border border-l-4 border-l-zinc-300 bg-canvas/30 hover:bg-canvas/50';

                    return (
                      <div key={point.point_ref} className={`rounded-xl border p-3.5 sm:p-4 transition-all ${cardStyle}`}>
                        <div className="flex flex-col gap-2">
                          {/* Meta Badges Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {point.is_required && (
                                <span className="inline-flex items-center rounded bg-rose-50 px-2 py-0.5 text-[11px] font-bold tracking-wide text-rose-700 border border-rose-200">
                                  Wajib
                                </span>
                              )}
                              <span className="inline-flex items-center rounded bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted border border-border" title="Bobot SOP shift gerai">
                                Bobot {point.points ?? 1}
                              </span>
                              {point.target_time && (
                                <span className="inline-flex items-center gap-1 rounded bg-canvas px-2 py-0.5 text-[11px] text-ink-muted border border-border">
                                  <Clock3 className="h-3 w-3" />
                                  Target {formatTime(point.target_time)}
                                </span>
                              )}
                              {point.timing_label && (
                                <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-ink">
                                  {labelTiming(point.timing_label)}
                                </span>
                              )}
                            </div>

                            {/* Status & Performer */}
                            <div className="flex items-center gap-2">
                              {isDone ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                                  ✓ Selesai
                                </span>
                              ) : isSkipped ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                                  ⊘ Dilewati
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-canvas px-2.5 py-0.5 text-[11px] font-medium text-ink-muted border border-border">
                                  Belum
                                </span>
                              )}
                              {point.completed_by_name && (
                                <UserBadge name={point.completed_by_name} />
                              )}
                            </div>
                          </div>

                          {/* Question Title & Instructions */}
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-semibold text-ink leading-snug sm:text-base">{point.title}</p>
                            {point.instruction && (
                              <p className="text-xs text-ink-muted leading-relaxed">{point.instruction}</p>
                            )}
                          </div>
                        </div>

                        {/* Input Controls */}
                        <div className="mt-3 pt-2.5 border-t border-border/40">
                          <ChecklistPointControls
                            point={point}
                            shiftId={shiftId}
                            draft={draftPoints[point.point_ref]}
                            onDraftChange={(draft) => handleDraftChange(point.point_ref, draft)}
                            disabled={data.shift.status !== 'berjalan'}
                            busy={busyPoint === point.point_ref}
                            onComplete={(value) => submitEntry(point, 'selesai', value)}
                            onCancel={() => submitEntry(point, 'batal')}
                            onSkip={(reason) => submitEntry(point, 'skip', reason)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <h3 className="text-base font-bold text-ink">Peserta shift</h3>
            <div className="mt-3 space-y-2">
              {data.participants.map((participant) => (
                <div key={participant.user_id} className="flex items-center justify-between rounded-lg border border-border bg-canvas px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-ink">{participant.name}</p>
                    <p className="text-xs uppercase tracking-wide text-ink-muted">{participant.first_action_type}</p>
                  </div>
                  <div className="text-right text-xs text-ink-muted">
                    <p>{participant.items_done} item</p>
                    {participant.is_pj && <p className="font-semibold text-emerald-700">PJ</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Handover dari shift sebelumnya (PRD 6.3.1). Displaced ke atas
              supaya petugas membacanya sebelum mulai mengerjakan checklist. */}
          <PreviousHandoverCard shiftId={shiftId} />

          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <h3 className="text-base font-bold text-ink">Handover</h3>
            <div className="mt-3 space-y-2 text-sm text-ink-muted">
              {data.handover_fields.length === 0 ? (
                <p>Belum ada field handover.</p>
              ) : (
                data.handover_fields.map((field) => (
                  <div key={field.id} className="rounded-lg border border-border bg-canvas px-3 py-2">
                    {field.label}
                    {field.is_required && <span className="ml-2 text-error">Wajib</span>}
                  </div>
                ))
              )}
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Isian handover diisi saat menutup shift.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <h3 className="text-base font-bold text-ink">Aksi shift</h3>
            <div className="mt-3 flex flex-col gap-3">
              {data.shift.status === 'berjalan' &&
                !data.participants.some((participant) => participant.user_id === userId) && (
                  <Button type="button" variant="secondary" onClick={() => void markOnDuty()}>
                    Saya bertugas
                  </Button>
                )}
              {data.shift.status === 'berjalan' && data.shift.pj_user_id === userId && (
                <ShiftCloseDialog
                  shiftId={shiftId}
                  shiftName={data.shift.name}
                  shiftDate={data.shift.date}
                  isPj
                  missingRequiredItems={data.categories.flatMap((category) =>
                    category.points
                      .filter((point) => point.is_required && point.state === 'belum')
                      .map((point) => point.title)
                  )}
                  fields={data.handover_fields}
                  onBeforeOpen={flushPendingDrafts}
                  onClosed={handleClosed}
                />
              )}
              {data.shift.status !== 'berjalan' && (
                <p className="rounded-lg border border-border bg-canvas p-3 text-sm text-ink-muted">
                  Shift sudah ditutup. Checklist tampil hanya untuk dibaca.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
    {draftPromptOpen && data.shift.status === 'berjalan' && Object.keys(draftPoints).length > 0 && (
      <DraftRestoreDialog
        pointCount={Object.keys(draftPoints).length}
        updatedAt={draftUpdatedAt}
        onContinue={() => setDraftPromptOpen(false)}
        onDiscard={() => void discardDraft()}
      />
    )}
    </>
  );
}
