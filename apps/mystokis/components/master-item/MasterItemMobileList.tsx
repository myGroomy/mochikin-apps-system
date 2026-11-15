'use client';

import React from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  History,
  RotateCcw,
  Filter,
  Power,
  Package,
} from 'lucide-react';
import { PointInput, PointTotalSummary } from '@mochikin/ui';
import { formatTipeLabel, tipeBadgeColor } from './TipeInputDropdown';
import { sanitizeDecimalInput } from '@/lib/domain/so';
import type { MasterItem } from './MasterItemDesktopTable';

interface MasterItemMobileListProps {
  loading: boolean;
  items: MasterItem[];
  filteredItems: MasterItem[];
  groupedPaginated: Array<{ area: string; items: MasterItem[]; startIndex: number }>;
  collapsedAreas: Set<string>;
  toggleAreaCollapse: (area: string) => void;
  areaCounts: Map<string, number>;
  getEffectivePoint: (item: MasterItem) => number;
  isAdmin: boolean;
  onSplitArea: (area: string) => void;
  onOpenHistory: () => void;
  isEditing: boolean;
  draftItems: Map<string, MasterItem>;
  pointDrafts: Map<string, number>;
  onPointChange: (itemId: string, val: number) => void;
  onResetPoint: (item: MasterItem) => void;
  updateDraft: (itemId: string, field: string, value: unknown) => void;
  onStartEditing: () => void;
  openBottomSheet: (itemId: string, currentTipe?: string) => void;
  handleToggleActive: (itemId: string, currentAktif: boolean) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number | ((prev: number) => number)) => void;
  PAGE_SIZE: number;
}

export function MasterItemMobileList({
  loading,
  items,
  filteredItems,
  groupedPaginated,
  collapsedAreas,
  toggleAreaCollapse,
  areaCounts,
  getEffectivePoint,
  isAdmin,
  onSplitArea,
  onOpenHistory,
  isEditing,
  draftItems,
  pointDrafts,
  onPointChange,
  onResetPoint,
  updateDraft,
  onStartEditing,
  openBottomSheet,
  handleToggleActive,
  currentPage,
  totalPages,
  onPageChange,
  PAGE_SIZE,
}: MasterItemMobileListProps) {
  if (loading) {
    return (
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
          </div>
        ))}
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-3">
      {groupedPaginated.map((group) => {
        const isCollapsed = collapsedAreas.has(group.area);
        const totalInGroup = areaCounts.get(group.area) || group.items.length;

        return (
          <React.Fragment key={group.area}>
            {/* Area group header */}
            <div
              className="flex items-center justify-between px-2 py-3 min-h-[44px] cursor-pointer active:bg-base-200/50 transition-colors select-none"
              onClick={() => toggleAreaCollapse(group.area)}
            >
              <div className="flex items-center gap-2">
                <ChevronDown className={`w-3.5 h-3.5 text-base-content/40 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{group.area}</span>
                <span className="text-[10px] text-base-content/30">({totalInGroup})</span>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <PointTotalSummary
                  items={group.items.map((it) => ({ points: getEffectivePoint(it) }))}
                />
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onSplitArea(group.area)}
                    className="btn btn-xs btn-outline btn-warning gap-1 text-[10px]"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Bagi Rata</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="btn btn-xs btn-ghost gap-1 text-[10px] text-base-content/60"
                >
                  <History className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Cards */}
            {!isCollapsed &&
              group.items.map((item, idx) => {
                const draft = isEditing ? (draftItems.get(item.Item_ID) || item) : item;
                const isDirty = draftItems.has(item.Item_ID);

                return (
                  <div
                    key={item.Item_ID}
                    className={`bg-base-100 rounded-xl border shadow-xs overflow-hidden transition-all ${
                      isDirty ? 'border-primary/30 ring-1 ring-primary/10' : 'border-base-300'
                    }`}
                  >
                    <div className="px-4 py-3">
                      {/* Card header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                            isDirty ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-base-200 text-base-content/50'
                          }`}>
                            {group.startIndex + idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-base-content whitespace-normal break-words leading-snug">{item.Nama_Barang}</h3>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-base-content/50 bg-base-200">{item.Area}</span>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-base-content/50 bg-base-200">{item.Satuan}</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.Aktif
                              ? 'bg-success/10 text-success border border-success/20'
                              : 'bg-base-200 text-base-content/40'
                          }`}>
                            {item.Aktif && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
                            {item.Aktif ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                      </div>

                      {/* Poin Setup */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-amber-200/60 bg-amber-50/40 dark:bg-amber-950/20 mb-3">
                        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Bobot Poin</span>
                        <div className="flex items-center gap-1.5">
                          <PointInput
                            value={getEffectivePoint(item)}
                            onChange={(val) => onPointChange(item.Item_ID, val)}
                            disabled={!isAdmin}
                            size="sm"
                          />
                          {isAdmin && (item.Point != null || pointDrafts.has(item.Item_ID)) && (
                            <button
                              type="button"
                              onClick={() => onResetPoint(item)}
                              title="Kembalikan ke default (1.0)"
                              className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Tipe Input trigger */}
                      <button
                        onClick={() => {
                          onStartEditing();
                          openBottomSheet(item.Item_ID, draft.Tipe_Input ?? item.Tipe_Input ?? '');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-base-300 bg-base-200/30 text-left mb-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Filter className="w-3.5 h-3.5 text-base-content/40" />
                          <span className="text-xs font-semibold text-base-content/60">Tipe Input</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${tipeBadgeColor(draft.Tipe_Input ?? item.Tipe_Input)}`}>
                            {formatTipeLabel(draft.Tipe_Input ?? item.Tipe_Input)}
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
                              onStartEditing();
                              updateDraft(item.Item_ID, 'Threshold', sanitizeDecimalInput(e.target.value));
                            }}
                            onFocus={onStartEditing}
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
                            onStartEditing();
                            updateDraft(item.Item_ID, 'Keterangan', e.target.value);
                          }}
                          onFocus={onStartEditing}
                          placeholder="Catatan..."
                          className="h-9 w-full px-3 rounded-lg border border-base-300 text-xs text-base-content/60 bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => handleToggleActive(item.Item_ID, item.Aktif)}
                        title={item.Aktif ? 'Nonaktifkan' : 'Aktifkan'}
                        className={`w-full h-9 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
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
              onClick={() => onPageChange((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-base-content/40 bg-base-200 border border-base-300 disabled:opacity-30 active:bg-base-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-base-content/60 px-2">{currentPage}/{totalPages}</span>
            <button
              onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-base-content/40 bg-base-200 border border-base-300 disabled:opacity-30 active:bg-base-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
