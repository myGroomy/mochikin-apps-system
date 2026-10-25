'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCabang } from '@/lib/CabangContext';
import { useToast } from '@/lib/ToastContext';
import {
  Package,
  PlusCircle,
  Edit3,
  Check,
  X,
  Loader2,
  ShieldAlert,
  Search,
  Filter,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Tags,
  Plus,
  Power,
  HelpCircle,
  Save,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { parseThreshold, sanitizeDecimalInput } from '@/lib/domain/so';
import type { KategoriItem } from '@/lib/domain/kategori-service';

interface MasterItem {
  Item_ID: string;
  Nama_Barang: string;
  Area: string;
  Satuan: string;
  Konversi_Isi?: string;
  Konversi_Keterangan?: string;
  Threshold: number;
  Aktif: boolean;
  Tipe_Input?: string;
  Keterangan?: string;
}

const DEFAULT_AREAS = [
  'Meja Biru Depan',
  'Chiller',
  'Freezer Ayam dan Alat',
  'Barang Alat dan Kebersihan',
  'Meja Laci',
  'Gas dan Utilitas',
  'Area Umum',
];

// ── Standardized input classes ───────────────────────────────

const INPUT_BASE = 'h-9 px-3 rounded-lg border border-base-300 text-sm font-normal tabular-nums bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';
const INPUT_TEXT = `${INPUT_BASE} w-full`;

// ── Tipe Input helpers ──────────────────────────────────────

function haptic(ms = 10) {
  try { navigator.vibrate?.(ms); } catch {}
}

const TIPE_TYPES = ['dual', 'single', 'boolean', 'date', 'expiry', 'text'] as const;

function parseTipeSelection(val: string): Set<string> {
  return new Set((val || 'dual').split(',').map((s) => s.trim()).filter(Boolean));
}

function tipeSelectionToComma(selected: Set<string>): string {
  if (selected.size === 0) return 'dual';
  if (selected.has('dual') && selected.has('single')) selected.delete('single');
  if (selected.size === 0) return 'dual';
  const primary = selected.has('dual') ? 'dual' : selected.has('single') ? 'single' : [...selected][0];
  const rest = [...selected].filter((t) => t !== primary);
  return rest.length > 0 ? `${primary},${rest.join(',')}` : primary;
}

function tipeBadgeColor(t?: string) {
  if (!t) return 'bg-base-200 text-base-content/60';
  const primary = t.split(',')[0].trim();
  if (primary === 'boolean') return 'bg-info/15 text-info-content border border-info/20';
  if (primary === 'date') return 'bg-secondary/15 text-secondary-content border border-secondary/20';
  if (primary === 'expiry') return 'bg-error/15 text-error border border-error/20';
  if (primary === 'text') return 'bg-accent/15 text-accent-content border border-accent/20';
  return 'bg-base-200 text-base-content/60 border border-base-300';
}

// ── TipeInputDropdown component ─────────────────────────────

function TipeInputDropdown({
  value,
  onChange,
  itemName,
  itemId,
}: {
  value: string;
  onChange: (val: string) => void;
  itemName?: string;
  itemId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(() => parseTipeSelection(value));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    setDraft(parseTipeSelection(value));
    setOpen(true);
  };

  const handleSave = () => {
    onChange(tipeSelectionToComma(draft));
    setOpen(false);
  };

  const handleReset = () => {
    setDraft(parseTipeSelection(value));
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const displayValue = value || 'dual';
  const displayLabel = displayValue.split(',')[0].trim();

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-md text-[11px] font-bold bg-base-100 border border-base-300 hover:border-base-content/30 active:bg-base-200 transition-all cursor-pointer"
      >
        <span className={tipeBadgeColor(displayValue)}>
          {displayLabel}
        </span>
        <ChevronDown className="w-3 h-3 text-base-content/40" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-base-100 border border-base-300 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-base-300">
            <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider">Tipe Input</p>
            {itemName && (
              <p className="text-xs text-base-content/60 mt-0.5 whitespace-normal break-words">{itemName}</p>
            )}
            {itemId && (
              <p className="text-[10px] text-base-content/30 font-mono">{itemId}</p>
            )}
          </div>

          {/* Options */}
          <div className="py-1">
            {TIPE_TYPES.map((t) => {
              const isSelected = draft.has(t);
              const handleToggle = () => {
                setDraft(prev => {
                  const next = new Set(prev);
                  if (t === 'dual' || t === 'single') {
                    if (next.has(t)) {
                      next.delete(t);
                    } else {
                      next.delete('dual');
                      next.delete('single');
                      next.add(t);
                    }
                  } else {
                    if (next.has(t)) next.delete(t);
                    else next.add(t);
                  }
                  return next;
                });
              };
              return (
                <div
                  key={t}
                  onClick={handleToggle}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-base-200/50 transition-colors"
                >
                  <div className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center border-2 ${
                    isSelected
                      ? 'border-primary bg-primary'
                      : 'border-base-300 bg-base-100'
                  }`}>
                    {isSelected && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-base-content">
                      {t === 'dual' ? 'Dual' : t === 'single' ? 'Single' : t === 'boolean' ? 'Boolean' : t === 'date' ? 'Date' : t === 'expiry' ? 'Expiry' : 'Text'}
                    </span>
                  </div>
                  {t === 'dual' && (
                    <span className="flex-shrink-0 text-[9px] font-bold text-primary/50">Default</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-base-300 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-semibold text-base-content/40 hover:text-base-content/60 min-h-[36px] px-2 transition-colors"
            >
              Reset
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 min-h-[36px] rounded-md text-[11px] font-semibold text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 min-h-[36px] rounded-md text-[11px] font-bold text-primary-content bg-primary hover:bg-primary/90 transition-all"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
  const [newItem, setNewItem] = useState({
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
    } finally {
      setKategoriLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchKategori();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCabang]);

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
    setCollapsedAreas(prev => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const openBottomSheet = (itemId: string, currentTipe: string) => {
    setBottomSheetItemId(itemId);
    setBottomSheetDraft(parseTipeSelection(currentTipe || 'dual'));
    setBottomSheetOpen(true);
  };

  const closeBottomSheet = () => {
    setBottomSheetOpen(false);
    setBottomSheetItemId(null);
  };

  const toggleBottomSheetTipe = (t: string) => {
    setBottomSheetDraft(prev => {
      const next = new Set(prev);
      if (t === 'dual' || t === 'single') {
        next.delete('dual');
        next.delete('single');
        next.add(t);
      } else {
        if (next.has(t)) next.delete(t);
        else next.add(t);
      }
      return next;
    });
  };

  const applyBottomSheet = () => {
    haptic();
    if (bottomSheetItemId) {
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
      // Check if actually changed from original
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const origVal = (original as any)[field];
      if (value === origVal || (value === '' && origVal == null)) {
        // Revert — no change
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
    const areaSet = new Set(items.map(i => i.Area || 'Area Umum'));
    if (activeKategoriNames.length > 0) {
      activeKategoriNames.forEach(a => areaSet.add(a));
    } else if (areaSet.size === 0) {
      DEFAULT_AREAS.forEach(a => areaSet.add(a));
    }
    return Array.from(areaSet).sort();
  }, [activeKategoriNames, items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesArea = selectedArea === 'Semua' || (item.Area || 'Area Umum') === selectedArea;
      const matchesStatus = selectedStatus === 'Semua' ||
        (selectedStatus === 'Aktif' && item.Aktif) ||
        (selectedStatus === 'Nonaktif' && !item.Aktif);
      const tipeSet = parseTipeSelection(item.Tipe_Input || 'dual');
      const matchesTipe = selectedTipe === 'Semua' || tipeSet.has(selectedTipe);
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query ||
        item.Nama_Barang.toLowerCase().includes(query) ||
        item.Item_ID.toLowerCase().includes(query) ||
        item.Area.toLowerCase().includes(query);
      return matchesArea && matchesStatus && matchesTipe && matchesSearch;
    });
  }, [items, selectedArea, selectedStatus, selectedTipe, searchQuery]);

  const groupedByArea = useMemo(() => {
    const groups: Array<{ area: string; items: MasterItem[] }> = [];
    const byArea = new Map<string, MasterItem[]>();
    filteredItems.forEach((it) => {
      const key = it.Area || 'Area Umum';
      if (!byArea.has(key)) byArea.set(key, []);
      byArea.get(key)!.push(it);
    });
    byArea.forEach((items, area) => groups.push({ area, items }));
    return groups;
  }, [filteredItems]);

  const activeFilterCount = (selectedArea !== 'Semua' ? 1 : 0) + (searchQuery ? 1 : 0) +
    (selectedStatus !== 'Semua' ? 1 : 0) + (selectedTipe !== 'Semua' ? 1 : 0);

  const areaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach(item => {
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

  const activeItemCount = useMemo(() => items.filter(i => i.Aktif).length, [items]);

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
        {/* ─── STICKY HEADER ─── */}
        <header className="sticky top-0 z-40 bg-base-100 border-b border-base-300">
          <div className="max-w-[1400px] mx-auto px-6 py-3">
            {/* Top row: breadcrumbs + quick actions */}
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
                <a
                  href="/docs/user-guide/master-item"
                  className="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-primary"
                  title="Panduan Master Item"
                >
                  <HelpCircle className="w-4 h-4" />
                </a>
                {isAdmin && (
                  <button
                    onClick={() => setShowKategoriModal(true)}
                    className="btn btn-sm gap-1.5 text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all"
                  >
                    <Tags className="w-3.5 h-3.5" />
                    Kelola Kategori
                  </button>
                )}
                <button
                  onClick={() => setShowModal(true)}
                  className="btn btn-primary btn-sm gap-1.5 shadow-sm shadow-primary/20"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Tambah Item
                </button>
                {isAdmin && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-sm gap-1.5 text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Ubah
                  </button>
                )}
              </div>
            </div>

            {/* Description row */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-base-content/50 leading-relaxed">
                Atur batas minimum stok (threshold) untuk setiap item. Semua sheet SO akan otomatis menggunakan threshold baru.
              </p>
            </div>
          </div>

          {/* ─── FILTER TOOLBAR ─── */}
          <div className="max-w-[1400px] mx-auto px-6 pb-3">
            <div className="flex items-center gap-3">
              {/* Area tabs */}
              <div className="flex items-center gap-1 bg-base-200/60 rounded-lg p-1 overflow-x-auto hide-scrollbar">
                <button
                  onClick={() => { setSelectedArea('Semua'); setCurrentPage(1); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    selectedArea === 'Semua'
                      ? 'bg-base-100 text-primary shadow-sm'
                      : 'text-base-content/50 hover:bg-base-100/50'
                  }`}
                >
                  Semua Area
                  <span className="ml-1 opacity-60">{items.length}</span>
                </button>
                {areas.map(area => (
                  <button
                    key={area}
                    onClick={() => { setSelectedArea(area); setCurrentPage(1); }}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all whitespace-nowrap ${
                      selectedArea === area
                        ? 'bg-base-100 text-primary shadow-sm'
                        : 'text-base-content/50 hover:bg-base-100/50'
                    }`}
                  >
                    {area}
                    <span className="ml-1 opacity-50">{areaCounts.get(area) || 0}</span>
                  </button>
                ))}
              </div>

              <div className="w-px h-6 bg-base-300 flex-shrink-0" />

              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="text"
                  placeholder="Cari nama barang..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="h-8 pl-9 pr-8 rounded-lg border border-base-300 text-sm bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-base-content/30 hover:text-base-content transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  className="appearance-none h-8 pl-3 pr-7 rounded-lg border border-base-300 text-[10px] font-semibold text-base-content/60 bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-base-content/40 pointer-events-none" />
              </div>

              {/* Tipe Input filter */}
              <div className="relative">
                <select
                  value={selectedTipe}
                  onChange={(e) => { setSelectedTipe(e.target.value); setCurrentPage(1); }}
                  className="appearance-none h-8 pl-3 pr-7 rounded-lg border border-base-300 text-[10px] font-semibold text-base-content/60 bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                >
                  <option value="Semua">Semua Tipe</option>
                  <option value="dual">Dual</option>
                  <option value="single">Single</option>
                  <option value="boolean">Boolean</option>
                  <option value="date">Date</option>
                  <option value="expiry">Expiry</option>
                  <option value="text">Text</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-base-content/40 pointer-events-none" />
              </div>

              {/* Reset */}
              {activeFilterCount > 0 && (
                <button onClick={resetAllFilters} className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors">
                  Reset filter
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ─── ERROR ─── */}
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
                <button onClick={() => { setErrorMsg(''); fetchItems(); }} className="btn btn-ghost btn-xs">
                  Muat ulang
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── MAIN CONTENT ─── */}
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
                <button onClick={resetAllFilters} className="btn btn-ghost btn-xs text-primary">
                  Reset filter
                </button>
              )}
            </div>
          ) : (
            <div className="bg-base-100 border border-base-300 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-base-300 bg-base-200/80 backdrop-blur-sm">
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-base-content/40 uppercase tracking-wider w-10">No</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-base-content/40 uppercase tracking-wider">Nama Barang</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-base-content/40 uppercase tracking-wider w-16">Satuan</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-base-content/40 uppercase tracking-wider w-36">Tipe Input</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-base-content/40 uppercase tracking-wider w-20">Threshold</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-primary uppercase tracking-wider w-24 bg-primary/5 rounded-t-lg">Threshold Baru</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-base-content/40 uppercase tracking-wider w-44">Keterangan</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-base-content/40 uppercase tracking-wider w-24">Status</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-base-content/40 uppercase tracking-wider w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-200">
                    {groupedPaginated.map((group) => {
                      const isCollapsed = collapsedAreas.has(group.area);
                      const totalInGroup = areaCounts.get(group.area) || group.items.length;
                      return (
                        <React.Fragment key={group.area}>
                          {/* Area divider */}
                          <tr
                            className="bg-base-200/40 cursor-pointer hover:bg-base-200/60 transition-colors"
                            onClick={() => toggleAreaCollapse(group.area)}
                          >
                            <td colSpan={9} className="px-3 py-2.5">
                              <span className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-wider">
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                {group.area}
                                <span className="text-base-content/30 font-normal normal-case tracking-normal">
                                  ({totalInGroup} item)
                                </span>
                              </span>
                            </td>
                          </tr>
                          {/* Items */}
                    {!isCollapsed && group.items.map((item, idx) => {
                      const draft = isEditing ? (draftItems.get(item.Item_ID) || item) : item;
                      const isDirty = draftItems.has(item.Item_ID);
                      return (
                        <tr
                          key={item.Item_ID}
                          className={`h-14 transition-colors group/row border-b border-base-200 ${
                            isDirty ? 'bg-primary/5' : 'hover:bg-base-200/30'
                          }`}
                        >
                          <td className="px-3 text-center text-base-content/40 text-xs tabular-nums">
                            {group.startIndex + idx + 1}
                          </td>
                                <td className="px-3 py-2.5">
                                  <span className="text-sm font-medium text-base-content">{item.Nama_Barang}</span>
                                </td>
                                <td className="px-3 text-center">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-base-content/50 bg-base-200 border border-base-300">
                                    {item.Satuan}
                                  </span>
                                </td>
                                {/* Tipe Input */}
                                <td className="px-3 text-center">
                                  {isEditing ? (
                                    <TipeInputDropdown
                                      value={draft.Tipe_Input || 'dual'}
                                      onChange={(val) => updateDraft(item.Item_ID, 'Tipe_Input', val)}
                                      itemName={item.Nama_Barang}
                                      itemId={item.Item_ID}
                                    />
                                  ) : (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${tipeBadgeColor(item.Tipe_Input)}`}>
                                      {item.Tipe_Input || 'dual'}
                                    </span>
                                  )}
                                </td>
                                {/* Threshold (current) */}
                                <td className="px-3 text-center">
                                  <span className="inline-flex items-center justify-center h-8 min-w-[3rem] px-2 rounded-lg bg-base-200/60 text-sm font-bold tabular-nums text-base-content/60">
                                    {item.Threshold}
                                  </span>
                                </td>
                                {/* Threshold Baru */}
                                <td className="px-3 text-center bg-primary/5">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={draft.Threshold}
                                    onChange={(e) => {
                                      if (!isEditing) setIsEditing(true);
                                      updateDraft(item.Item_ID, 'Threshold', sanitizeDecimalInput(e.target.value));
                                    }}
                                    onFocus={() => { if (!isEditing) setIsEditing(true); }}
                                    className="w-20 h-8 text-center rounded-lg border-2 border-primary/20 bg-base-100 text-sm font-bold tabular-nums text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                  />
                                </td>
                                {/* Keterangan */}
                                <td className="px-3">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={draft.Keterangan || ''}
                                      onChange={(e) => updateDraft(item.Item_ID, 'Keterangan', e.target.value)}
                                      placeholder="Catatan..."
                                      className={`${INPUT_TEXT} h-8 text-xs`}
                                    />
                                  ) : (
                                    <span className="inline-flex items-center text-xs text-base-content/40 max-w-[240px] whitespace-normal break-words min-h-8 py-1 font-normal">
                                      {item.Keterangan || <span className="italic opacity-40">-</span>}
                                    </span>
                                  )}
                                </td>
                                {/* Status */}
                                <td className="px-3 text-center">
                                  {item.Aktif ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                      Aktif
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-base-200 text-base-content/40">
                                      Nonaktif
                                    </span>
                                  )}
                                </td>
                                {/* Aksi */}
                                <td className="px-3 text-center">
                                  <button
                                    onClick={() => handleToggleActive(item.Item_ID, item.Aktif)}
                                    title={item.Aktif ? "Nonaktifkan item" : "Aktifkan item"}
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer ${
                                      item.Aktif
                                        ? 'text-error hover:bg-error/10'
                                        : 'text-success hover:bg-success/10'
                                    }`}
                                  >
                                    <Power className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-base-300 bg-base-200/30">
                  <span className="text-xs text-base-content/50">
                    Menampilkan <span className="font-semibold text-base-content/70">{(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredItems.length)}</span> dari <span className="font-semibold text-base-content/70">{filteredItems.length}</span> item
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-md text-base-content/40 hover:bg-base-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-md text-xs font-bold transition-all ${
                            currentPage === pageNum
                              ? 'bg-primary text-primary-content shadow-sm'
                              : 'text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-md text-base-content/40 hover:bg-base-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ─── DESKTOP FLOATING SAVE BAR ─── */}
        {isAdmin && isEditing && draftItems.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-base-100 border-t border-base-300 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
            <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="w-4 h-4 text-warning" />
                <span className="text-sm font-semibold text-warning">{draftItems.size} item belum disimpan</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={savingBatch}
                  className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveBatch}
                  disabled={savingBatch}
                  className="inline-flex items-center gap-2 px-5 py-2 min-h-[44px] rounded-lg text-sm font-bold text-primary-content bg-primary shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  {savingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MOBILE LAYOUT (<md) ═══ */}
      <div className="block md:hidden">
        {/* ─── MOBILE STICKY HEADER ─── */}
        <header className="sticky top-0 z-40 bg-base-100 border-b border-base-300">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.history.back()}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-1 rounded-lg hover:bg-base-200 transition-colors"
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
                  href="/docs/user-guide/master-item"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-base-content/40 hover:text-primary hover:bg-base-200 transition-colors"
                  title="Panduan Master Item"
                >
                  <HelpCircle className="w-4 h-4" />
                </a>
                {isAdmin && !isEditing && (
                  <button
                    onClick={() => setShowKategoriModal(true)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-base-content/60 bg-base-200 border border-base-300"
                    title="Kelola Kategori"
                  >
                    <Tags className="w-4 h-4" />
                  </button>
                )}
                {isAdmin && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-base-200 text-base-content/60 border border-base-300"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowModal(true)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Search */}
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-base-content/30 hover:text-base-content active:bg-base-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {/* Category pills */}
          <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => { setSelectedArea('Semua'); setCurrentPage(1); }}
              className={`flex-shrink-0 px-4 py-2.5 min-h-[44px] rounded-full text-xs font-bold transition-all ${
                selectedArea === 'Semua'
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'bg-base-200 text-base-content/60 border border-base-300 active:bg-base-300'
              }`}
            >
              Semua
              <span className="ml-1 opacity-80">{items.length}</span>
            </button>
            {areas.map(area => (
              <button
                key={area}
                onClick={() => { setSelectedArea(area); setCurrentPage(1); }}
                className={`flex-shrink-0 px-4 py-2.5 min-h-[44px] rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedArea === area
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'bg-base-200 text-base-content/60 border border-base-300 active:bg-base-300'
                }`}
              >
                {area}
                <span className="ml-1 opacity-50">{areaCounts.get(area) || 0}</span>
              </button>
            ))}
          </div>
          {/* Status & Tipe filters */}
          <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <span className="flex-shrink-0 text-[10px] font-bold text-base-content/30 uppercase tracking-wider">Status:</span>
            {['Semua', 'Aktif', 'Nonaktif'].map(s => (
              <button
                key={s}
                onClick={() => { setSelectedStatus(s); setCurrentPage(1); }}
                className={`flex-shrink-0 px-3 py-1.5 min-h-[36px] rounded-lg text-[10px] font-semibold transition-all ${
                  selectedStatus === s
                    ? 'bg-base-content text-base-100'
                    : 'bg-base-200/50 text-base-content/50 border border-base-300 active:bg-base-300'
                }`}
              >
                {s}
              </button>
            ))}
            <span className="flex-shrink-0 w-px h-4 bg-base-300 mx-0.5" />
            <span className="flex-shrink-0 text-[10px] font-bold text-base-content/30 uppercase tracking-wider">Tipe:</span>
            {['Semua', 'dual', 'single', 'boolean', 'date', 'expiry', 'text'].map(t => (
              <button
                key={t}
                onClick={() => { setSelectedTipe(t); setCurrentPage(1); }}
                className={`flex-shrink-0 px-3 py-1.5 min-h-[36px] rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${
                  selectedTipe === t
                    ? 'bg-base-content text-base-100'
                    : 'bg-base-200/50 text-base-content/50 border border-base-300 active:bg-base-300'
                }`}
              >
                {t === 'Semua' ? 'Semua' : t === 'dual' ? 'Dual' : t === 'single' ? 'Single' : 'Boolean'}
              </button>
            ))}
            {(selectedStatus !== 'Semua' || selectedTipe !== 'Semua') && (
              <button
                onClick={() => { setSelectedStatus('Semua'); setSelectedTipe('Semua'); setCurrentPage(1); }}
                className="flex-shrink-0 px-2 py-1.5 min-h-[36px] rounded-lg text-[10px] font-bold text-error active:bg-error/10 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </header>

        {/* ─── CARD LIST ─── */}
        <main className="px-4 py-3 pb-24 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-base-100 rounded-xl border border-base-300 p-4 animate-pulse">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-base-200" />
                      <div>
                        <div className="h-4 w-32 bg-base-200 rounded mb-1" />
                        <div className="flex gap-1.5">
                          <div className="h-3 w-12 bg-base-200 rounded" />
                          <div className="h-3 w-8 bg-base-200 rounded" />
                        </div>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-base-200" />
                  </div>
                  <div className="h-9 w-full bg-base-200/50 rounded-lg mb-3" />
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="h-9 bg-base-200/50 rounded-lg" />
                    <div className="h-9 bg-base-200/50 rounded-lg" />
                  </div>
                  <div className="h-9 bg-base-200/50 rounded-lg" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-base-200 flex items-center justify-center">
                <Package className="w-7 h-7 text-base-content/30" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-semibold text-base-content">
                  {items.length === 0 ? 'Belum Ada Item' : 'Tidak ada hasil'}
                </h3>
                <p className="text-sm text-base-content/50 mt-1">
                  {items.length === 0
                    ? 'Tambahkan master barang untuk memulai.'
                    : 'Ubah filter atau kata kunci pencarian.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {groupedPaginated.map((group) => {
                const isCollapsed = collapsedAreas.has(group.area);
                const totalInGroup = areaCounts.get(group.area) || group.items.length;
                return (
                  <React.Fragment key={group.area}>
                    {/* Area group header */}
                    <div
                      className="flex items-center gap-2 px-2 py-3 min-h-[44px] cursor-pointer active:bg-base-200/50 transition-colors"
                      onClick={() => toggleAreaCollapse(group.area)}
                    >
                      <ChevronDown className={`w-3.5 h-3.5 text-base-content/40 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">{group.area}</span>
                      <span className="text-[10px] text-base-content/30">({totalInGroup})</span>
                    </div>

                    {!isCollapsed && group.items.map((item, idx) => {
                      const draft = isEditing ? (draftItems.get(item.Item_ID) || item) : item;
                      const isDirty = draftItems.has(item.Item_ID);
                      return (
                        <div
                          key={item.Item_ID}
                          className={`bg-base-100 rounded-xl border shadow-sm overflow-hidden transition-all ${
                            isDirty ? 'border-primary/30 ring-1 ring-primary/10' : 'border-base-300'
                          }`}
                        >
                          <div className="px-4 py-3">
                            {/* Card header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                  isDirty ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-base-200 text-base-content/50'
                                }`}>
                                  {group.startIndex + idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <h3 className="text-sm font-semibold text-base-content whitespace-normal break-words">{item.Nama_Barang}</h3>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-base-content/50 bg-base-200">{item.Area}</span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-base-content/50 bg-base-200">{item.Satuan}</span>
                                  </div>
                                </div>
                              </div>
                              <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.Aktif
                                  ? 'bg-success/10 text-success border border-success/20'
                                  : 'bg-base-200 text-base-content/40'
                              }`}>
                                {item.Aktif && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
                                {item.Aktif ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </div>

                            {/* Tipe Input trigger */}
                            <button
                              onClick={() => isEditing && openBottomSheet(item.Item_ID, draft.Tipe_Input || 'dual')}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-base-300 bg-base-200/30 text-left mb-3"
                            >
                              <div className="flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5 text-base-content/40" />
                                <span className="text-xs font-semibold text-base-content/60">Tipe Input</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${tipeBadgeColor(draft.Tipe_Input)}`}>
                                  {draft.Tipe_Input || 'dual'}
                                </span>
                                <ChevronDown className="w-4 h-4 text-base-content/40" />
                              </div>
                            </button>

                            {/* Threshold grid */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div>
                                <label className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider mb-1 block">Threshold Saat Ini</label>
                                <div className="h-9 flex items-center justify-center rounded-lg bg-base-200/60 text-sm font-bold tabular-nums text-base-content/60">{item.Threshold}</div>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 block">Threshold Baru</label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={draft.Threshold}
                                  onChange={(e) => {
                                    if (!isEditing) setIsEditing(true);
                                    updateDraft(item.Item_ID, 'Threshold', sanitizeDecimalInput(e.target.value));
                                  }}
                                  onFocus={() => { if (!isEditing) setIsEditing(true); }}
                                  className="h-9 w-full text-center rounded-lg border-2 border-primary/20 bg-base-100 text-sm font-bold tabular-nums text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                              </div>
                            </div>

                            {/* Keterangan */}
                            <div className="mb-3">
                              <label className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider mb-1 block">Keterangan</label>
                              <input
                                type="text"
                                value={draft.Keterangan || ''}
                                onChange={(e) => {
                                  if (!isEditing) setIsEditing(true);
                                  updateDraft(item.Item_ID, 'Keterangan', e.target.value);
                                }}
                                onFocus={() => { if (!isEditing) setIsEditing(true); }}
                                placeholder="Catatan..."
                                className="h-9 w-full px-3 rounded-lg border border-base-300 text-xs text-base-content/60 bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              />
                            </div>

                            {/* Action */}
                            <button
                              onClick={() => handleToggleActive(item.Item_ID, item.Aktif)}
                              title={item.Aktif ? 'Nonaktifkan' : 'Aktifkan'}
                              className={`w-full h-9 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
                                item.Aktif
                                  ? 'border border-error/30 text-error hover:bg-error/5'
                                  : 'border border-success/30 text-success hover:bg-success/5'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                              {item.Aktif ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Mobile pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-1 py-2">
                  <span className="text-[10px] text-base-content/40">
                    {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredItems.length)} / {filteredItems.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-base-content/40 bg-base-200 border border-base-300 disabled:opacity-30 active:bg-base-300 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-base-content/60 px-2">{currentPage}/{totalPages}</span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-base-content/40 bg-base-200 border border-base-300 disabled:opacity-30 active:bg-base-300 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* ─── MOBILE FLOATING SAVE BAR ─── */}
        {isAdmin && isEditing && draftItems.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-base-100 border-t border-base-300 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                <span className="text-xs font-semibold text-base-content/60">{draftItems.size} belum disimpan</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={savingBatch}
                  className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold text-base-content/60 bg-base-100 border border-base-300 active:bg-base-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveBatch}
                  disabled={savingBatch}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-primary-content bg-primary shadow-lg shadow-primary/20 active:bg-primary/90 transition-colors"
                >
                  {savingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ BOTTOM SHEET — Tipe Input (Mobile) ═══ */}
      <AnimatePresence>
        {bottomSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 md:hidden"
              onClick={closeBottomSheet}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-base-100 rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] max-h-[85vh] flex flex-col md:hidden"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-base-300" />
              </div>

              {/* Header */}
              <div className="px-5 pb-3 border-b border-base-300">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold text-base-content">Tipe Input</h3>
                  <button onClick={closeBottomSheet} className="p-1.5 rounded-lg hover:bg-base-200 transition-colors">
                    <X className="w-5 h-5 text-base-content/40" />
                  </button>
                </div>
                {bottomSheetItemId && (
                  <>
                    <p className="text-xs text-base-content/60">{items.find(i => i.Item_ID === bottomSheetItemId)?.Nama_Barang}</p>
                    <p className="text-[10px] text-base-content/40 font-mono">{bottomSheetItemId}</p>
                  </>
                )}
              </div>

              {/* Options list */}
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                {(['dual', 'single', 'boolean', 'date', 'expiry', 'text'] as const).map((t) => {
                  const isSelected = bottomSheetDraft.has(t);
                  const isDualOrSingle = t === 'dual' || t === 'single';
                  const handleToggle = () => {
                    setBottomSheetDraft(prev => {
                      const next = new Set(prev);
                      if (t === 'dual' || t === 'single') {
                        if (next.has(t)) {
                          next.delete(t);
                        } else {
                          next.delete('dual');
                          next.delete('single');
                          next.add(t);
                        }
                      } else {
                        if (next.has(t)) next.delete(t);
                        else next.add(t);
                      }
                      return next;
                    });
                  };
                  return (
                    <div
                      key={t}
                      onClick={handleToggle}
                      className={`flex items-center gap-3 p-3 min-h-[48px] rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'border-2 border-primary/30 bg-primary/5'
                          : 'border border-base-300 bg-base-100 active:bg-base-200/50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded-${
                        isDualOrSingle ? 'full' : 'md'
                      } border-2 flex items-center justify-center ${
                        isSelected ? 'border-primary bg-primary' : 'border-base-300 bg-white'
                      }`}>
                        {isSelected && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-base-content">{t === 'dual' ? 'Dual Input' : t === 'single' ? 'Single Input' : t === 'boolean' ? 'Boolean' : t === 'date' ? 'Date' : t === 'expiry' ? 'Expiry' : 'Text'}</p>
                        <p className="text-[10px] text-base-content/50 mt-0.5">
                          {t === 'dual' ? 'S1 (awal) + S2 (akhir), status dihitung dari selisih' :
                           t === 'single' ? 'Hanya S2 (akhir), input langsung sebagai stok akhir' :
                           t === 'boolean' ? 'Input Ya/Tidak, untuk item yang perlu dikonfirmasi' :
                           t === 'date' ? 'Input tanggal, untuk item yang perlu pencatatan tanggal' :
                           t === 'expiry' ? 'Input tanggal kedaluwarsa, untuk item masa simpan' :
                           'Input teks bebas, untuk catatan tambahan'}
                        </p>
                      </div>
                      {t === 'dual' && (
                        <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">Default</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-base-300 flex items-center justify-between">
                <button
                  onClick={() => setBottomSheetDraft(new Set(['dual']))}
                  className="text-xs font-medium text-base-content/50 hover:text-base-content/70 min-h-[44px] px-2 transition-colors"
                >
                  Reset ke Default
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={closeBottomSheet} className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all">
                    Batal
                  </button>
                  <button onClick={applyBottomSheet} className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-primary-content bg-primary shadow-lg shadow-primary/20 transition-all">
                    <Check className="w-3.5 h-3.5" />
                    Terapkan
                    <span className="ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/20">{bottomSheetDraft.size}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── ADD ITEM MODAL ─── */}
      <BottomSheet
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Tambah Item Baru"
        subtitle="Isi data master item untuk cabang ini"
        footer={
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              form="add-item-form"
              disabled={savingItem}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-primary-content bg-primary shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              {savingItem ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Simpan
                </>
              )}
            </button>
          </div>
        }
      >
        <form id="add-item-form" onSubmit={handleAddItem} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
              Nama Barang <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Beras Pandan Wangi 5kg"
              value={newItem.Nama_Barang}
              onChange={(e) => setNewItem({ ...newItem, Nama_Barang: e.target.value })}
              className={`${INPUT_BASE} w-full`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
                Area <span className="text-error">*</span>
              </label>
              <select
                value={newItem.Area}
                onChange={(e) => setNewItem({ ...newItem, Area: e.target.value })}
                className={`${INPUT_BASE} w-full`}
              >
                {areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
                Satuan <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="kg, pcs, gr..."
                value={newItem.Satuan}
                onChange={(e) => setNewItem({ ...newItem, Satuan: e.target.value })}
                className={`${INPUT_BASE} w-full`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
                Tipe Input
              </label>
              <TipeInputDropdown
                value={newItem.Tipe_Input}
                onChange={(val) => setNewItem({ ...newItem, Tipe_Input: val })}
                itemName={newItem.Nama_Barang || 'Item Baru'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
                Threshold (Batas Minimum)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={newItem.Threshold}
                onChange={(e) => setNewItem({ ...newItem, Threshold: sanitizeDecimalInput(e.target.value) })}
                className={`${INPUT_BASE} w-full font-semibold tabular-nums`}
              />
              <p className="text-xs text-base-content/40">Threshold = 0 berarti tidak dipantau</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
                Keterangan
              </label>
              <input
                type="text"
                placeholder="Catatan (opsional)"
                value={newItem.Keterangan}
                onChange={(e) => setNewItem({ ...newItem, Keterangan: e.target.value })}
                className={`${INPUT_BASE} w-full`}
              />
            </div>
          </div>
        </form>
      </BottomSheet>

      {/* ─── KELOLA KATEGORI MODAL (admin only) ─── */}
      <BottomSheet
        open={showKategoriModal}
        onClose={() => { setShowKategoriModal(false); setEditingKategoriId(null); }}
        title="Kelola Kategori"
        subtitle={`${selectedCabang.Nama_Cabang} · Kategori untuk grouping item`}
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => { setShowKategoriModal(false); setEditingKategoriId(null); }}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all"
            >
              Tutup
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddKategori} className="flex gap-2 mb-4">
          <input
            type="text"
            required
            placeholder="Nama kategori baru..."
            value={newKategoriName}
            onChange={(e) => setNewKategoriName(e.target.value)}
            className={`${INPUT_BASE} flex-1`}
          />
          <button type="submit" disabled={kategoriSaving} className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-secondary-content bg-secondary hover:bg-secondary/90 transition-all disabled:opacity-50">
            {kategoriSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </form>

        {kategoriError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-error/10 border border-error/20 mb-3" role="alert">
            <AlertTriangle className="w-4 h-4 text-error shrink-0" />
            <span className="flex-1 text-xs text-error">{kategoriError}</span>
            <button onClick={() => setKategoriError('')} className="text-xs text-error/60 hover:text-error">Tutup</button>
          </div>
        )}

        {kategoriLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-secondary" />
            <p className="text-xs text-base-content/50">Memuat kategori...</p>
          </div>
        ) : kategoriList.length === 0 ? (
          <p className="text-sm text-base-content/50 text-center py-8">
            Belum ada kategori. Tambahkan kategori pertama di atas.
          </p>
        ) : (
          <ul className="space-y-2">
            {kategoriList.map((k) => (
              <li
                key={k.Kategori_ID}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${
                  k.Aktif ? 'border-base-300 bg-base-100' : 'border-base-300 bg-base-200/40 opacity-70'
                }`}
              >
                {editingKategoriId === k.Kategori_ID ? (
                  <>
                    <input
                      type="text"
                      value={tempKategoriName}
                      onChange={(e) => setTempKategoriName(e.target.value)}
                      className={`${INPUT_BASE} flex-1 min-w-0`}
                      autoFocus
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={tempKategoriUrutan}
                      onChange={(e) => setTempKategoriUrutan(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="Urutan"
                      className={`${INPUT_BASE} w-16 text-center text-xs tabular-nums`}
                    />
                    <button
                      onClick={() => handleSaveKategori(k)}
                      disabled={kategoriSaving}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-success hover:bg-success/10 transition-colors"
                      title="Simpan"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingKategoriId(null)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-base-content/40 hover:bg-base-200 transition-colors"
                      title="Batal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-base-content whitespace-normal break-words">{k.Nama_Kategori}</p>
                      <p className="text-xs text-base-content/40">{k.Kategori_ID}</p>
                    </div>
                    {!k.Aktif && (
                      <span className="text-[10px] font-bold text-base-content/50 bg-base-200 px-2 py-0.5 rounded">Nonaktif</span>
                    )}
                    <button
                      onClick={() => {
                        setEditingKategoriId(k.Kategori_ID);
                        setTempKategoriName(k.Nama_Kategori);
                        setTempKategoriUrutan(String(k.Urutan));
                      }}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-base-content/40 hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Ubah nama / urutan"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleKategoriActive(k)}
                      disabled={kategoriSaving}
                      className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors ${
                        k.Aktif
                          ? 'text-error/70 hover:text-error hover:bg-error/10'
                          : 'text-success/70 hover:text-success hover:bg-success/10'
                      }`}
                      title={k.Aktif ? 'Nonaktifkan kategori' : 'Aktifkan kategori'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>
    </div>
  );
}
