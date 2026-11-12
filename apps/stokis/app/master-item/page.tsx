'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCabang } from '@/lib/CabangContext';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/lib/ToastContext';
import {
  Package,
  PlusCircle,
  Edit3,
  Loader2,
  ShieldAlert,
  Search,
  Filter,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Tags,
  HelpCircle,
  X,
} from 'lucide-react';
import { SplitPreviewDialog, PointHistoryDialog } from '@mochikin/ui';
import { parseThreshold } from '@/lib/domain/so';
import type { KategoriItem } from '@/lib/domain/kategori-service';
import { parseTipeSelection, tipeSelectionToComma } from '@/components/master-item/TipeInputDropdown';
import { TipeInputBottomSheet } from '@/components/master-item/TipeInputBottomSheet';
import { AddItemModal, type NewItemFormState } from '@/components/master-item/AddItemModal';
import { KategoriModal } from '@/components/master-item/KategoriModal';
import { MasterItemDesktopTable, type MasterItem } from '@/components/master-item/MasterItemDesktopTable';
import { MasterItemMobileList } from '@/components/master-item/MasterItemMobileList';
import { MasterItemSaveBar } from '@/components/master-item/MasterItemSaveBar';
import { MasterItemFilterHeader } from '@/components/master-item/MasterItemFilterHeader';

const DEFAULT_AREAS = [
  'Meja Biru Depan',
  'Chiller',
  'Freezer Ayam dan Alat',
  'Barang Alat dan Kebersihan',
  'Meja Laci',
  'Gas dan Utilitas',
  'Area Umum',
];

const INPUT_BASE = 'h-9 px-3 rounded-lg border border-base-300 text-sm font-normal tabular-nums bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

function haptic(ms = 10) {
  try { navigator.vibrate?.(ms); } catch {}
}

export default function MasterItemPage() {
  const { selectedCabang } = useCabang();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [kategoriList, setKategoriList] = useState<KategoriItem[]>([]);
  const [kategoriLoading, setKategoriLoading] = useState<boolean>(false);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [newItem, setNewItem] = useState<NewItemFormState>({
    Nama_Barang: '',
    Area: DEFAULT_AREAS[0],
    Satuan: 'pcs',
    Konversi_Isi: '',
    Konversi_Keterangan: '',
    Threshold: '0',
    Tipe_Input: 'dual',
    Keterangan: '',
  });
  const [savingItem, setSavingItem] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftItems, setDraftItems] = useState<Map<string, MasterItem>>(new Map());
  const [savingBatch, setSavingBatch] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('Semua');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');
  const [selectedTipe, setSelectedTipe] = useState<string>('Semua');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [collapsedAreas, setCollapsedAreas] = useState<Set<string>>(new Set());
  const [bottomSheetOpen, setBottomSheetOpen] = useState<boolean>(false);
  const [bottomSheetItemId, setBottomSheetItemId] = useState<string | null>(null);
  const [bottomSheetDraft, setBottomSheetDraft] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 10;

  // ── Points System State ─────────────────────────────────────
  const [pointMap, setPointMap] = useState<Record<string, number>>({});
  const [pointDrafts, setPointDrafts] = useState<Map<string, number>>(new Map());
  const [splitDialogArea, setSplitDialogArea] = useState<string | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [pointHistory, setPointHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [savingPoints, setSavingPoints] = useState<boolean>(false);

  const loadPoints = useCallback(async () => {
    try {
      const res = await fetch(`/api/master-item/points?cabangId=${selectedCabang?.Cabang_ID || 'BJ01'}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          const pMap: Record<string, number> = {};
          data.items.forEach((it: any) => {
            if (it.name) {
              pMap[it.name.toLowerCase().trim()] = Number(it.point);
            }
          });
          setPointMap(pMap);
        }
      }
    } catch {
      // offline / transient
    }
  }, [selectedCabang]);

  const loadPointHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/master-item/points?cabangId=${selectedCabang?.Cabang_ID || 'BJ01'}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.history)) {
          setPointHistory(data.history);
        }
      }
    } catch {
      toast.error('Gagal', 'Gagal memuat riwayat poin');
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedCabang, toast]);

  const getEffectivePoint = useCallback((item: MasterItem): number => {
    if (pointDrafts.has(item.Item_ID)) {
      return pointDrafts.get(item.Item_ID)!;
    }
    if (item.Point != null && !isNaN(Number(item.Point))) {
      return Number(item.Point);
    }
    const mapped = pointMap[String(item.Nama_Barang || '').toLowerCase().trim()];
    if (typeof mapped === 'number' && !isNaN(mapped)) {
      return mapped;
    }
    return 1.0;
  }, [pointDrafts, pointMap]);

  const handlePointChange = (itemId: string, newPoints: number) => {
    haptic();
    setPointDrafts((prev) => {
      const next = new Map(prev);
      const it = items.find((i) => i.Item_ID === itemId);
      const original = it?.Point ?? 1.0;
      if (newPoints === original) {
        next.delete(itemId);
      } else {
        next.set(itemId, newPoints);
      }
      return next;
    });
  };

  const handleResetPoint = async (item: MasterItem) => {
    if (!selectedCabang) return;
    try {
      const res = await fetch('/api/master-item/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId: selectedCabang.Cabang_ID,
          action: 'reset',
          updates: [
            {
              itemId: item.Item_ID,
              name: item.Nama_Barang,
              oldPoints: getEffectivePoint(item),
              reason: 'Reset ke bobot default',
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Poin Direset', `Poin ${item.Nama_Barang} dikembalikan ke default.`);
        setPointDrafts((prev) => {
          const next = new Map(prev);
          next.delete(item.Item_ID);
          return next;
        });
        fetchItems();
        loadPoints();
      } else {
        toast.error('Gagal', data.error || 'Gagal mereset poin');
      }
    } catch {
      toast.error('Gagal', 'Terjadi kesalahan jaringan');
    }
  };

  const handleSavePointDrafts = async () => {
    if (!selectedCabang || pointDrafts.size === 0) return;
    setSavingPoints(true);
    try {
      const updates: any[] = [];
      pointDrafts.forEach((points, itemId) => {
        const it = items.find((i) => i.Item_ID === itemId);
        updates.push({
          itemId,
          name: it?.Nama_Barang,
          oldPoints: it ? (it.Point ?? 1.0) : 1.0,
          points,
          reason: 'Penyesuaian bobot poin master',
        });
      });

      const res = await fetch('/api/master-item/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId: selectedCabang.Cabang_ID,
          action: 'set',
          updates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Poin Berhasil Disimpan', `${updates.length} perubahan poin berhasil disimpan.`);
        setPointDrafts(new Map());
        fetchItems();
        loadPoints();
      } else {
        toast.error('Gagal', data.error || 'Gagal menyimpan bobot poin');
      }
    } catch {
      toast.error('Gagal', 'Terjadi kesalahan jaringan');
    } finally {
      setSavingPoints(false);
    }
  };

  const handleApplySplit = async (
    distributed: { id?: string; name: string; oldPoints: number; newPoints: number }[]
  ) => {
    if (!selectedCabang || distributed.length === 0) return;
    setSavingPoints(true);
    try {
      const updates = distributed.map((d) => ({
        itemId: d.id,
        name: d.name,
        oldPoints: d.oldPoints,
        points: d.newPoints,
        reason: 'Bagi rata poin area',
      }));

      const res = await fetch('/api/master-item/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId: selectedCabang.Cabang_ID,
          action: 'bulk_split',
          updates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Bagi Rata Berhasil', `Poin berhasil dibagi rata untuk ${distributed.length} item.`);
        setSplitDialogArea(null);
        fetchItems();
        loadPoints();
      } else {
        toast.error('Gagal', data.error || 'Gagal menerapkan bagi rata poin');
      }
    } catch {
      toast.error('Gagal', 'Terjadi kesalahan jaringan');
    } finally {
      setSavingPoints(false);
    }
  };

  const fetchItems = async () => {
    if (!selectedCabang) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/master-item?cabang=${selectedCabang.Cabang_ID}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch {
      setErrorMsg('Gagal memuat data barang. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  const fetchKategori = async () => {
    if (!selectedCabang) return;
    try {
      setKategoriLoading(true);
      const res = await fetch(`/api/master-item/kategori?cabang=${selectedCabang.Cabang_ID}&includeNonaktif=true`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setKategoriList(json.data);
      }
    } catch {
      // offline / transient
    } finally {
      setKategoriLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchKategori();
    loadPoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCabang, loadPoints]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCabang) return;

    try {
      setSavingItem(true);
      const res = await fetch('/api/master-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId: selectedCabang.Cabang_ID,
          ...newItem,
          Threshold: parseThreshold(newItem.Threshold) ?? 0,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Berhasil', `Master item "${newItem.Nama_Barang}" berhasil ditambahkan.`);
        setShowModal(false);
        setNewItem({
          Nama_Barang: '',
          Area: DEFAULT_AREAS[0],
          Satuan: 'pcs',
          Konversi_Isi: '',
          Konversi_Keterangan: '',
          Threshold: '0',
          Tipe_Input: 'dual',
          Keterangan: '',
        });
        fetchItems();
      } else {
        const msg = json.error?.message || 'Gagal menambahkan master item';
        toast.error('Gagal Menambahkan Item', msg);
        setErrorMsg(msg);
      }
    } catch (err: any) {
      const msg = 'Error: ' + err.message;
      toast.error('Gagal Menambahkan Item', msg);
      setErrorMsg(msg);
    } finally {
      setSavingItem(false);
    }
  };

  const handleSaveBatch = async () => {
    if (!selectedCabang || draftItems.size === 0) return;
    haptic(15);
    try {
      setSavingBatch(true);
      const updates = [...draftItems.values()].map((d) => ({
        itemId: d.Item_ID,
        threshold: d.Threshold,
        tipeInput: d.Tipe_Input || 'dual',
        keterangan: d.Keterangan || '',
      }));
      const res = await fetch('/api/master-item/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cabangId: selectedCabang.Cabang_ID, updates }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Berhasil', `${draftItems.size} perubahan item berhasil disimpan.`);
        setIsEditing(false);
        setDraftItems(new Map());
        fetchItems();
      } else {
        const msg = json.error?.message || 'Gagal menyimpan perubahan';
        toast.error('Gagal Menyimpan', msg);
        setErrorMsg(msg);
      }
    } catch (err: any) {
      const msg = 'Gagal menyimpan: ' + err.message;
      toast.error('Gagal Menyimpan', msg);
      setErrorMsg(msg);
    } finally {
      setSavingBatch(false);
    }
  };

  const handleCancelEdit = () => {
    haptic();
    setIsEditing(false);
    setDraftItems(new Map());
  };

  const toggleAreaCollapse = (area: string) => {
    setCollapsedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const openBottomSheet = (itemId: string, currentTipe?: string) => {
    setBottomSheetItemId(itemId);
    setBottomSheetDraft(parseTipeSelection(currentTipe));
    setBottomSheetOpen(true);
  };

  const closeBottomSheet = () => {
    setBottomSheetOpen(false);
    setBottomSheetItemId(null);
  };

  const applyBottomSheet = () => {
    haptic();
    if (bottomSheetItemId) {
      if (!isEditing) setIsEditing(true);
      updateDraft(bottomSheetItemId, 'Tipe_Input', tipeSelectionToComma(bottomSheetDraft));
    }
    closeBottomSheet();
  };

  const resetAllFilters = () => {
    setSelectedArea('Semua');
    setSelectedStatus('Semua');
    setSelectedTipe('Semua');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const updateDraft = useCallback((itemId: string, field: string, value: unknown) => {
    setDraftItems((prev) => {
      const next = new Map(prev);
      const original = items.find((i) => i.Item_ID === itemId);
      if (!original) return next;
      const existing = next.get(itemId) || { ...original };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (existing as any)[field] = value;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const origVal = (original as any)[field];
      if (value === origVal || (value === '' && origVal == null)) {
        if (next.has(itemId)) {
          const reverted = { ...original };
          let hasChange = false;
          for (const key of ['Threshold', 'Tipe_Input', 'Keterangan']) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const orig = (original as any)[key];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cur = (existing as any)[key];
            if (cur !== orig) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (reverted as any)[key] = cur;
              hasChange = true;
            }
          }
          if (hasChange) next.set(itemId, reverted as MasterItem);
          else next.delete(itemId);
        }
      } else {
        next.set(itemId, existing as MasterItem);
      }
      return next;
    });
  }, [items]);

  const handleToggleActive = async (itemId: string, currentAktif: boolean) => {
    if (!selectedCabang) return;
    haptic();
    try {
      const res = await fetch(`/api/master-item/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId: selectedCabang.Cabang_ID,
          aktif: !currentAktif,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchItems();
      }
    } catch (err: any) {
      setErrorMsg('Gagal mengubah status item: ' + err.message);
    }
  };

  // ─── Kelola Kategori (admin only) ───
  const [showKategoriModal, setShowKategoriModal] = useState<boolean>(false);
  const [kategoriError, setKategoriError] = useState<string>('');
  const [kategoriSaving, setKategoriSaving] = useState<boolean>(false);
  const [newKategoriName, setNewKategoriName] = useState<string>('');
  const [editingKategoriId, setEditingKategoriId] = useState<string | null>(null);
  const [tempKategoriName, setTempKategoriName] = useState<string>('');
  const [tempKategoriUrutan, setTempKategoriUrutan] = useState<string>('');

  const activeKategoriNames = useMemo(
    () => kategoriList.filter((k) => k.Aktif).map((k) => k.Nama_Kategori),
    [kategoriList]
  );

  const handleAddKategori = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCabang) return;
    const nama = newKategoriName.trim();
    if (!nama) return;
    try {
      setKategoriSaving(true);
      setKategoriError('');
      const res = await fetch('/api/master-item/kategori', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cabangId: selectedCabang.Cabang_ID, Nama_Kategori: nama }),
      });
      const json = await res.json();
      if (json.success) {
        setNewKategoriName('');
        await fetchKategori();
      } else {
        setKategoriError(json.error?.message || 'Gagal menambah kategori');
      }
    } catch (err: any) {
      setKategoriError('Error: ' + err.message);
    } finally {
      setKategoriSaving(false);
    }
  };

  const handleSaveKategori = async (k: KategoriItem) => {
    if (!selectedCabang) return;
    const nama = tempKategoriName.trim();
    const urutan = Number(tempKategoriUrutan);
    if (!nama) return;
    try {
      setKategoriSaving(true);
      setKategoriError('');
      const res = await fetch(`/api/master-item/kategori/${k.Kategori_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId: selectedCabang.Cabang_ID,
          Nama_Kategori: nama,
          Urutan: Number.isFinite(urutan) ? urutan : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingKategoriId(null);
        await fetchKategori();
        if (json.data?.updatedAreas > 0) await fetchItems();
      } else {
        setKategoriError(json.error?.message || 'Gagal menyimpan kategori');
      }
    } catch (err: any) {
      setKategoriError('Error: ' + err.message);
    } finally {
      setKategoriSaving(false);
    }
  };

  const handleToggleKategoriActive = async (k: KategoriItem) => {
    if (!selectedCabang) return;
    try {
      setKategoriError('');
      const res = await fetch(`/api/master-item/kategori/${k.Kategori_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId: selectedCabang.Cabang_ID,
          Aktif: !k.Aktif,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchKategori();
      } else {
        setKategoriError(json.error?.message || 'Gagal mengubah status kategori');
      }
    } catch (err: any) {
      setKategoriError('Error: ' + err.message);
    }
  };

  const areas = useMemo(() => {
    const areaSet = new Set(items.map((i) => i.Area || 'Area Umum'));
    if (activeKategoriNames.length > 0) {
      activeKategoriNames.forEach((a) => areaSet.add(a));
    } else if (areaSet.size === 0) {
      DEFAULT_AREAS.forEach((a) => areaSet.add(a));
    }
    return Array.from(areaSet).sort();
  }, [activeKategoriNames, items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesArea = selectedArea === 'Semua' || (item.Area || 'Area Umum') === selectedArea;
      const matchesStatus =
        selectedStatus === 'Semua' ||
        (selectedStatus === 'Aktif' && item.Aktif) ||
        (selectedStatus === 'Nonaktif' && !item.Aktif);
      const tipeSet = parseTipeSelection(item.Tipe_Input || 'dual');
      const matchesTipe = selectedTipe === 'Semua' || tipeSet.has(selectedTipe);
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        item.Nama_Barang.toLowerCase().includes(query) ||
        item.Item_ID.toLowerCase().includes(query) ||
        item.Area.toLowerCase().includes(query);
      return matchesArea && matchesStatus && matchesTipe && matchesSearch;
    });
  }, [items, selectedArea, selectedStatus, selectedTipe, searchQuery]);

  const activeFilterCount =
    (selectedArea !== 'Semua' ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (selectedStatus !== 'Semua' ? 1 : 0) +
    (selectedTipe !== 'Semua' ? 1 : 0);

  const areaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      const area = item.Area || 'Area Umum';
      counts.set(area, (counts.get(area) || 0) + 1);
    });
    return counts;
  }, [items]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const groupedPaginated = useMemo(() => {
    const groups: Array<{ area: string; items: MasterItem[]; startIndex: number }> = [];
    const byArea = new Map<string, MasterItem[]>();
    paginatedItems.forEach((it) => {
      const key = it.Area || 'Area Umum';
      if (!byArea.has(key)) byArea.set(key, []);
      byArea.get(key)!.push(it);
    });
    let runningIndex = 0;
    byArea.forEach((items, area) => {
      groups.push({ area, items, startIndex: runningIndex });
      runningIndex += items.length;
    });
    return groups;
  }, [paginatedItems]);

  const activeItemCount = useMemo(() => items.filter((i) => i.Aktif).length, [items]);

  if (!selectedCabang) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-warning" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-semibold text-base-content">Pilih Cabang Terlebih Dahulu</h3>
          <p className="text-sm text-base-content/50 mt-1">Pilih cabang dari menu untuk mengelola master item.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200/30">
      {/* ═══ DESKTOP LAYOUT (md+) ═══ */}
      <div className="hidden md:block">
        {/* Sticky Desktop Header */}
        <header className="sticky top-0 z-40 bg-base-100 border-b border-base-300">
          <div className="max-w-[1400px] mx-auto px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <nav className="flex items-center gap-1.5 text-[10px] text-base-content/40">
                    <a href="/master-item" className="hover:text-primary transition-colors">Master Item</a>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-base-content/60 font-medium">Input Barang & Konfigurasi</span>
                  </nav>
                  <h1 data-onboard="master-heading" className="text-lg font-bold tracking-tight text-base-content mt-0.5">
                    Daftar Threshold & Input Barang
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-base-200 text-base-content/60 border border-base-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-base-content/30" />
                  {items.length} Total Item
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  {activeItemCount} Aktif
                </span>
                <div className="w-px h-6 bg-base-300 mx-1" />
                <div className="relative w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                  <input
                    type="text"
                    placeholder="Cari nama barang..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="h-8 pl-9 pr-8 rounded-lg border border-base-300 text-xs bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-base-content/30 hover:text-base-content transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <a
                  href="/panduan"
                  className="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-primary"
                  title="Panduan Master Item"
                >
                  <HelpCircle className="w-4 h-4" />
                </a>
                {isAdmin && (
                  <button
                    onClick={() => setShowKategoriModal(true)}
                    className="btn btn-sm gap-1.5 text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all cursor-pointer"
                  >
                    <Tags className="w-3.5 h-3.5" />
                    Kelola Kategori
                  </button>
                )}
                <button
                  onClick={() => setShowModal(true)}
                  className="btn btn-primary btn-sm gap-1.5 shadow-sm shadow-primary/20 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Tambah Item
                </button>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-sm gap-1.5 text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Ubah
                  </button>
                )}
              </div>
            </div>

            {/* 2-Kolom Sticky Filter Header: Kategori & Status */}
            <div className="pt-2 border-t border-base-200">
              <MasterItemFilterHeader
                selectedArea={selectedArea}
                onAreaChange={(area) => { setSelectedArea(area); setCurrentPage(1); }}
                areas={areas}
                areaCounts={areaCounts}
                totalItems={items.length}
                selectedStatus={selectedStatus}
                onStatusChange={(status) => { setSelectedStatus(status); setCurrentPage(1); }}
                activeItemCount={activeItemCount}
                onReset={() => {
                  setSelectedArea('Semua');
                  setSelectedStatus('Semua');
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </header>

        {/* Error notification */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-[1400px] mx-auto px-6 pt-3"
            >
              <div className="alert alert-error text-sm rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{errorMsg}</span>
                <button onClick={() => { setErrorMsg(''); fetchItems(); }} className="btn btn-ghost btn-xs cursor-pointer">
                  Muat ulang
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Main Content */}
        <main className="max-w-[1400px] mx-auto px-6 py-4 pb-24">
          {loading ? (
            <div className="bg-base-100 border border-base-300 rounded-xl flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-sm text-base-content/50">Memuat data barang...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-base-100 border border-base-300 rounded-xl flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-base-200 flex items-center justify-center">
                <Package className="w-7 h-7 text-base-content/30" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-semibold text-base-content">
                  {items.length === 0 ? 'Belum Ada Item' : 'Tidak ada hasil'}
                </h3>
                <p className="text-sm text-base-content/50 mt-1">
                  {items.length === 0
                    ? 'Tambahkan master barang untuk memulai pencatatan SO.'
                    : 'Ubah filter atau kata kunci pencarian.'}
                </p>
              </div>
              {items.length > 0 && (
                <button onClick={resetAllFilters} className="btn btn-ghost btn-xs text-primary cursor-pointer">
                  Reset filter
                </button>
              )}
            </div>
          ) : (
            <MasterItemDesktopTable
              groupedPaginated={groupedPaginated}
              collapsedAreas={collapsedAreas}
              toggleAreaCollapse={toggleAreaCollapse}
              areaCounts={areaCounts}
              getEffectivePoint={getEffectivePoint}
              isAdmin={isAdmin}
              onSplitArea={setSplitDialogArea}
              onOpenHistory={() => {
                loadPointHistory();
                setHistoryModalOpen(true);
              }}
              isEditing={isEditing}
              draftItems={draftItems}
              pointDrafts={pointDrafts}
              onPointChange={handlePointChange}
              onResetPoint={handleResetPoint}
              updateDraft={updateDraft}
              onStartEditing={() => { if (!isEditing) setIsEditing(true); }}
              handleToggleActive={handleToggleActive}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalFiltered={filteredItems.length}
              PAGE_SIZE={PAGE_SIZE}
            />
          )}
        </main>
      </div>

      {/* ═══ MOBILE LAYOUT (<md) ═══ */}
      <div className="block md:hidden">
        <header className="sticky top-0 z-40 bg-base-100 border-b border-base-300">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.history.back()}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-1 rounded-lg hover:bg-base-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5 text-base-content/60" />
                </button>
                <div>
                  <h1 data-onboard="master-heading" className="text-base font-bold text-base-content">Master Item</h1>
                  <p className="text-[10px] text-base-content/40">{activeItemCount} aktif / {items.length} total</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="/panduan"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-base-content/40 hover:text-primary hover:bg-base-200 transition-colors"
                  title="Panduan Master Item"
                >
                  <HelpCircle className="w-4 h-4" />
                </a>
                {isAdmin && !isEditing && (
                  <button
                    onClick={() => setShowKategoriModal(true)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-base-content/60 bg-base-200 border border-base-300 cursor-pointer"
                    title="Keloa Kategori"
                  >
                    <Tags className="w-4 h-4" />
                  </button>
                )}
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-base-200 text-base-content/60 border border-base-300 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowModal(true)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Cari barang..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-base-300 text-sm bg-base-200/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-base-100 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-base-content/30 hover:text-base-content active:bg-base-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* 2-Kolom Sticky Filter Header: Kategori & Status */}
            <div className="pt-2">
              <MasterItemFilterHeader
                selectedArea={selectedArea}
                onAreaChange={(area) => { setSelectedArea(area); setCurrentPage(1); }}
                areas={areas}
                areaCounts={areaCounts}
                totalItems={items.length}
                selectedStatus={selectedStatus}
                onStatusChange={(status) => { setSelectedStatus(status); setCurrentPage(1); }}
                activeItemCount={activeItemCount}
                onReset={() => {
                  setSelectedArea('Semua');
                  setSelectedStatus('Semua');
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </header>

        {/* Mobile Main Content */}
        <main className="px-4 py-3 pb-24 space-y-3">
          <MasterItemMobileList
            loading={loading}
            items={items}
            filteredItems={filteredItems}
            groupedPaginated={groupedPaginated}
            collapsedAreas={collapsedAreas}
            toggleAreaCollapse={toggleAreaCollapse}
            areaCounts={areaCounts}
            getEffectivePoint={getEffectivePoint}
            isAdmin={isAdmin}
            onSplitArea={setSplitDialogArea}
            onOpenHistory={() => {
              loadPointHistory();
              setHistoryModalOpen(true);
            }}
            isEditing={isEditing}
            draftItems={draftItems}
            pointDrafts={pointDrafts}
            onPointChange={handlePointChange}
            onResetPoint={handleResetPoint}
            updateDraft={updateDraft}
            onStartEditing={() => { if (!isEditing) setIsEditing(true); }}
            openBottomSheet={openBottomSheet}
            handleToggleActive={handleToggleActive}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            PAGE_SIZE={PAGE_SIZE}
          />
        </main>
      </div>

      {/* ═══ UNIFIED FLOATING ACTION BAR ═══ */}
      <MasterItemSaveBar
        draftCount={draftItems.size}
        pointDraftCount={pointDrafts.size}
        savingBatch={savingBatch}
        savingPoints={savingPoints}
        onCancelDrafts={handleCancelEdit}
        onSaveDrafts={handleSaveBatch}
        onCancelPoints={() => setPointDrafts(new Map())}
        onSavePoints={handleSavePointDrafts}
      />

      {/* ═══ BOTTOM SHEET — Tipe Input (Mobile) ═══ */}
      <TipeInputBottomSheet
        open={bottomSheetOpen}
        itemId={bottomSheetItemId}
        itemName={items.find((i) => i.Item_ID === bottomSheetItemId)?.Nama_Barang}
        draft={bottomSheetDraft}
        onDraftChange={setBottomSheetDraft}
        onClose={closeBottomSheet}
        onApply={applyBottomSheet}
      />

      {/* ─── ADD ITEM MODAL ─── */}
      <AddItemModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleAddItem}
        saving={savingItem}
        areas={areas}
        newItem={newItem}
        onItemChange={setNewItem}
        inputBaseClass={INPUT_BASE}
      />

      {/* ─── KELOLA KATEGORI MODAL (admin only) ─── */}
      <KategoriModal
        open={showKategoriModal}
        onClose={() => { setShowKategoriModal(false); setEditingKategoriId(null); }}
        cabangName={selectedCabang.Nama_Cabang}
        kategoriList={kategoriList}
        kategoriLoading={kategoriLoading}
        kategoriSaving={kategoriSaving}
        kategoriError={kategoriError}
        onClearError={() => setKategoriError('')}
        newKategoriName={newKategoriName}
        onNewKategoriNameChange={setNewKategoriName}
        onAddKategori={handleAddKategori}
        editingKategoriId={editingKategoriId}
        onStartEdit={(k) => {
          setEditingKategoriId(k.Kategori_ID);
          setTempKategoriName(k.Nama_Kategori);
          setTempKategoriUrutan(String(k.Urutan));
        }}
        onCancelEdit={() => setEditingKategoriId(null)}
        tempKategoriName={tempKategoriName}
        onTempNameChange={setTempKategoriName}
        tempKategoriUrutan={tempKategoriUrutan}
        onTempUrutanChange={setTempKategoriUrutan}
        onSaveKategori={handleSaveKategori}
        onToggleActive={handleToggleKategoriActive}
        inputBaseClass={INPUT_BASE}
      />

      {/* ─── POINTS SPLIT DIALOG ─── */}
      {splitDialogArea && (
        <SplitPreviewDialog
          isOpen={Boolean(splitDialogArea)}
          title={`Bagi Rata Poin: ${splitDialogArea}`}
          items={items
            .filter((i) => (i.Area || 'Area Umum') === splitDialogArea)
            .map((i) => ({
              id: i.Item_ID,
              name: i.Nama_Barang,
              points: getEffectivePoint(i),
            }))}
          onClose={() => setSplitDialogArea(null)}
          onApply={handleApplySplit}
        />
      )}

      {/* ─── POINTS HISTORY DIALOG ─── */}
      <PointHistoryDialog
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        history={pointHistory}
        isLoading={loadingHistory}
      />
    </div>
  );
}
