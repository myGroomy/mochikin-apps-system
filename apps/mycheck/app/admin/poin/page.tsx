'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { History, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/admin/api';
import { PointInput } from '@mochikin/ui/points';
import { PointTotalSummary } from '@mochikin/ui/points';
import { PointHistoryDialog, HistoryRecord } from '@mochikin/ui/points';
import { PageLoader } from '@/components/ui/QuantumLoader';

interface BranchOption {
  id: string;
  name: string;
  code: string;
}

interface ShiftOption {
  id: string;
  name: string;
}

interface ChecklistPoint {
  id: string;
  title: string;
  points: number;
}

interface CategoryGroup {
  id: string;
  name: string;
  points: ChecklistPoint[];
}

interface IncidentCategory {
  id: string;
  name: string;
  points: number;
  penaltyMinSeverity: string;
}

export default function MasterPoinPage() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [incidents, setIncidents] = useState<IncidentCategory[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // History dialog state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTitle, setHistoryTitle] = useState('Riwayat Perubahan Poin');
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load branches and incidents
  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [branchRes, incidentRes] = await Promise.all([
        apiFetch<{ branches: BranchOption[] }>('/api/admin/branches'),
        apiFetch<{ categories: IncidentCategory[] }>('/api/admin/incident-categories'),
      ]);
      setBranches(branchRes.branches || []);
      setIncidents(incidentRes.categories || []);
      if (branchRes.branches?.length > 0) {
        setSelectedBranchId(branchRes.branches[0].id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat data master poin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  // Load shifts when branch changes
  useEffect(() => {
    if (!selectedBranchId) return;
    let cancelled = false;
    async function fetchShifts() {
      setLoadingShifts(true);
      try {
        const res = await apiFetch<{ shifts: ShiftOption[] }>(
          `/api/admin/branches/${selectedBranchId}/shifts`
        );
        if (!cancelled) {
          setShifts(res.shifts || []);
          setSelectedShiftId(res.shifts?.[0]?.id || '');
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Gagal memuat daftar shift');
        }
      } finally {
        if (!cancelled) setLoadingShifts(false);
      }
    }
    void fetchShifts();
    return () => {
      cancelled = true;
    };
  }, [selectedBranchId]);

  // Load categories and points when shift changes
  const loadCategories = useCallback(async () => {
    if (!selectedShiftId) {
      setCategories([]);
      return;
    }
    try {
      const res = await apiFetch<{ categories: CategoryGroup[] }>(
        `/api/admin/shifts/${selectedShiftId}/categories`
      );
      setCategories(res.categories || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat checklist shift');
    }
  }, [selectedShiftId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // Update checklist point
  const handleUpdateChecklistPoint = async (pointId: string, newPoints: number) => {
    setSavingId(pointId);
    try {
      await apiFetch(`/api/admin/checklist-points/${pointId}`, {
        method: 'PATCH',
        body: JSON.stringify({ points: newPoints, reason: 'Edit dari Master Poin' }),
      });
      toast.success('Poin checklist berhasil diperbarui');
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          points: (cat.points || []).map((p) =>
            p.id === pointId ? { ...p, points: newPoints } : p
          ),
        }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui poin');
    } finally {
      setSavingId(null);
    }
  };

  // Update incident category points
  const handleUpdateIncidentPoints = async (id: string, name: string, newPoints: number) => {
    setSavingId(id);
    try {
      await apiFetch(`/api/admin/incident-categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, points: newPoints, reason: 'Edit dari Master Poin' }),
      });
      toast.success('Poin penalti insiden berhasil diperbarui');
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === id ? { ...inc, points: newPoints } : inc))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui poin');
    } finally {
      setSavingId(null);
    }
  };

  const handleOpenHistory = async (entityType: string, entityRef: string, label: string) => {
    setHistoryTitle(`Riwayat Poin: ${label}`);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await apiFetch<{ changes: HistoryRecord[] }>(
        `/api/admin/reports/audit-history?appId=mycheck&entityType=${encodeURIComponent(
          entityType
        )}&entityRef=${encodeURIComponent(entityRef)}`
      );
      setHistoryList(res.changes || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengambil riwayat');
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Master Poin</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola bobot poin untuk setiap aktivitas SOP checklist dan kategori insiden.
        </p>
      </div>

      {/* Forward-only Notice Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <span className="font-semibold text-primary">Prinsip Snapshot Master:</span>{' '}
          Perubahan bobot poin berlaku untuk shift berikutnya. Laporan dan shift yang sedang atau sudah
          berjalan tidak akan terpengaruh karena menggunakan snapshot poin pada saat shift dibuat.
        </div>
      </div>

      {/* Section 1: Poin Checklist SOP */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold">Poin Aktivitas Checklist SOP</h2>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Branch selector */}
            <select
              aria-label="Pilih cabang"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-10 rounded-lg border border-border bg-canvas px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  Cabang: {b.name}
                </option>
              ))}
            </select>

            {/* Shift selector */}
            <select
              aria-label="Pilih shift"
              value={selectedShiftId}
              onChange={(e) => setSelectedShiftId(e.target.value)}
              disabled={loadingShifts || shifts.length === 0}
              className="h-10 rounded-lg border border-border bg-canvas px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            >
              {shifts.length === 0 ? (
                <option value="">(Tidak ada shift)</option>
              ) : (
                shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    Shift: {s.name}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              onClick={() => void loadCategories()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
              title="Segarkan daftar"
            >
              <RefreshCw className={`h-4 w-4 ${loadingShifts ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground bg-muted/20">
            Tidak ada kategori checklist atau aktivitas ditemukan untuk shift ini.
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                {/* Category Header */}
                <div className="border-b border-border bg-muted/40 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{cat.name}</span>
                  <PointTotalSummary
                    items={cat.points || []}
                    title="Total Section"
                  />
                </div>

                {/* Points list */}
                <div className="divide-y divide-border">
                  {(cat.points || []).map((pt) => (
                    <div
                      key={pt.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{pt.title}</p>
                        <span className="text-xs text-muted-foreground">ID: {pt.id}</span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleOpenHistory('checklist_item', pt.id, pt.title)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Riwayat perubahan poin"
                        >
                          <History className="h-4 w-4" />
                        </button>

                        <PointInput
                          value={pt.points}
                          disabled={savingId === pt.id}
                          onChange={(val) => void handleUpdateChecklistPoint(pt.id, val)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Poin Kategori Insiden */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div>
          <h2 className="text-lg font-semibold">Poin Penalti Insiden</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Poin pengurang saat terjadi insiden pada kategori yang bersangkutan.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="divide-y divide-border">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{inc.name}</p>
                  <span className="text-xs text-muted-foreground">
                    Tingkat keparahan min: {inc.penaltyMinSeverity || 'none'}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleOpenHistory('incident_category', inc.id, inc.name)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Riwayat perubahan poin"
                  >
                    <History className="h-4 w-4" />
                  </button>

                  <PointInput
                    value={inc.points}
                    disabled={savingId === inc.id}
                    onChange={(val) => void handleUpdateIncidentPoints(inc.id, inc.name, val)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Point History Dialog */}
      <PointHistoryDialog
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={historyTitle}
        history={historyList}
        isLoading={historyLoading}
      />
    </div>
  );
}
