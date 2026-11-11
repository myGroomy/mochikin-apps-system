'use client';

import React from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  History,
  RotateCcw,
  Power,
} from 'lucide-react';
import { PointInput, PointTotalSummary } from '@mochikin/ui';
import { TipeInputDropdown } from './TipeInputDropdown';
import { sanitizeDecimalInput } from '@/lib/domain/so';

export interface MasterItem {
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
  Point?: number | null;
}

interface MasterItemDesktopTableProps {
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
  handleToggleActive: (itemId: string, currentAktif: boolean) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number | ((prev: number) => number)) => void;
  totalFiltered: number;
  PAGE_SIZE: number;
}

const INPUT_BASE = 'h-8 px-2.5 rounded-lg border border-base-300 text-xs font-normal tabular-nums bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors w-full';

export function MasterItemDesktopTable({
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
  handleToggleActive,
  currentPage,
  totalPages,
  onPageChange,
  totalFiltered,
  PAGE_SIZE,
}: MasterItemDesktopTableProps) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-base-300 bg-base-200/80 backdrop-blur-sm">
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-base-content/40 uppercase tracking-wider w-10">No</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold text-base-content/40 uppercase tracking-wider">Nama Barang</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-base-content/40 uppercase tracking-wider w-16">Satuan</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-amber-600 uppercase tracking-wider w-32">Poin</th>
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
                    className="bg-base-200/40 cursor-pointer hover:bg-base-200/60 transition-colors select-none"
                    onClick={() => toggleAreaCollapse(group.area)}
                  >
                    <td colSpan={10} className="px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-wider">
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                          {group.area}
                          <span className="text-base-content/30 font-normal normal-case tracking-normal">
                            ({totalInGroup} item)
                          </span>
                        </span>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <PointTotalSummary
                            items={group.items.map((it) => ({ points: getEffectivePoint(it) }))}
                          />
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => onSplitArea(group.area)}
                              className="btn btn-xs btn-outline btn-warning gap-1 text-[11px]"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Bagi Rata</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={onOpenHistory}
                            className="btn btn-xs btn-ghost gap-1 text-[11px] text-base-content/60 hover:text-base-content"
                          >
                            <History className="w-3 h-3" />
                            <span>Riwayat</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Items */}
                  {!isCollapsed &&
                    group.items.map((item, idx) => {
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
                            <span className="text-sm font-medium text-base-content min-w-0 truncate block">
                              {item.Nama_Barang}
                            </span>
                          </td>
                          <td className="px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-base-content/50 bg-base-200 border border-base-300">
                              {item.Satuan}
                            </span>
                          </td>

                          {/* Poin Column */}
                          <td className="px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
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
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Tipe Input */}
                          <td className="px-3 text-center">
                            <TipeInputDropdown
                              value={draft.Tipe_Input ?? item.Tipe_Input ?? ''}
                              onChange={(val) => {
                                onStartEditing();
                                updateDraft(item.Item_ID, 'Tipe_Input', val);
                              }}
                              itemName={item.Nama_Barang}
                              itemId={item.Item_ID}
                            />
                          </td>

                          {/* Threshold saat ini */}
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
                                onStartEditing();
                                updateDraft(item.Item_ID, 'Threshold', sanitizeDecimalInput(e.target.value));
                              }}
                              onFocus={onStartEditing}
                              className="w-20 h-8 text-center rounded-lg border-2 border-primary/20 bg-base-100 text-sm font-bold tabular-nums text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                          </td>

                          {/* Keterangan */}
                          <td className="px-3">
                            <input
                              type="text"
                              value={draft.Keterangan ?? item.Keterangan ?? ''}
                              onChange={(e) => {
                                onStartEditing();
                                updateDraft(item.Item_ID, 'Keterangan', e.target.value);
                              }}
                              onFocus={onStartEditing}
                              placeholder="Catatan..."
                              className={INPUT_BASE}
                            />
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
            Menampilkan <span className="font-semibold text-base-content/70">{(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, totalFiltered)}</span> dari <span className="font-semibold text-base-content/70">{totalFiltered}</span> item
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange((p) => Math.max(1, p - 1))}
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
                  onClick={() => onPageChange(pageNum)}
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
              onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md text-base-content/40 hover:bg-base-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
