'use client';

import { useMemo, useState } from 'react';
import { MoveHorizontal, Search } from 'lucide-react';
import type { AreaGroup, InputTypeGroup, LaporanView, ViewItem } from '@/lib/domain/laporan-view';
import {
  TYPE_ORDER,
  areaSeverity,
  areaStatusSummary,
  matchesQuery,
  sortItemsByStatus,
  typeLabel,
} from './report-utils';
import { ReportHeaderCard } from './ReportHeaderCard';
import { SoCompareCards } from './SoCompareCards';
import { KpiPills } from './KpiPills';
import { AreaFilterRail } from './AreaFilterRail';
import { AreaSection, type AreaSubGroup } from './AreaSection';
import { EmptySearchState } from './EmptySearchState';

export interface LaporanReportViewProps {
  view: LaporanView;
  variant: 'app' | 'public';
  laporanId: string;
  cabangId: string;
}

interface DisplayArea {
  area: string;
  items: ViewItem[];
  subGroups: AreaSubGroup[];
  typeBadge: string;
  summary: { label: string; className: string };
}

function buildSubGroups(items: ViewItem[]): AreaSubGroup[] {
  const map = new Map<InputTypeGroup, ViewItem[]>();
  for (const it of items) {
    const list = map.get(it.group) || [];
    list.push(it);
    map.set(it.group, list);
  }
  return TYPE_ORDER
    .filter((t) => map.has(t))
    .map((type) => ({ type, items: sortItemsByStatus(map.get(type)!) }));
}

function typeBadgeFor(items: ViewItem[]): string {
  const types = [...new Set(items.map((it) => it.group))];
  if (types.length === 1) return `${typeLabel(types[0])} (${items.length} Item)`;
  return `Campuran (${items.length} Item)`;
}

function buildDisplayAreas(areaGroups: AreaGroup[], query: string, activeArea: string): DisplayArea[] {
  const result: DisplayArea[] = [];
  for (const ag of areaGroups) {
    if (activeArea !== 'all' && ag.area !== activeArea) continue;
    const filtered = ag.items.filter((it) => matchesQuery(it, query));
    if (filtered.length === 0) continue;
    const sorted = sortItemsByStatus(filtered);
    result.push({
      area: ag.area,
      items: sorted,
      subGroups: buildSubGroups(sorted),
      typeBadge: typeBadgeFor(sorted),
      summary: areaStatusSummary(sorted),
    });
  }
  result.sort((a, b) => {
    const sa = areaSeverity(a.items);
    const sb = areaSeverity(b.items);
    if (sa !== sb) return sa - sb;
    const ca = a.items.filter((it) => areaSeverity([it]) === 0).length;
    const cb = b.items.filter((it) => areaSeverity([it]) === 0).length;
    if (cb !== ca) return cb - ca;
    return a.area.localeCompare(b.area, 'id');
  });
  return result;
}

export function LaporanReportView({ view, variant, laporanId, cabangId }: LaporanReportViewProps) {
  const { meta, scoreCards, areaGroups } = view;
  const [query, setQuery] = useState('');
  const [activeArea, setActiveArea] = useState('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const areaChips = useMemo(
    () => areaGroups.map((ag) => ({
      area: ag.area,
      count: query.trim() ? ag.items.filter((it) => matchesQuery(it, query)).length : ag.items.length,
    })),
    [areaGroups, query]
  );

  const displayAreas = useMemo(
    () => buildDisplayAreas(areaGroups, query, activeArea),
    [areaGroups, query, activeArea]
  );

  const searching = query.trim().length > 0;

  function toggleArea(area: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  }

  function resetFilters() {
    setQuery('');
    setActiveArea('all');
    setCollapsed(new Set());
    setSelectedItemId(null);
  }

  function selectItem(itemId: string) {
    setSelectedItemId((prev) => (prev === itemId ? null : itemId));
  }

  return (
    <div className="flex flex-col gap-4">
      <ReportHeaderCard
        laporanId={laporanId}
        cabangId={cabangId}
        cabangNama={variant === 'public' ? meta.cabangNama : undefined}
        variant={variant}
        linkXlsx={meta.linkXlsx}
        linkPdf={meta.linkPdf}
      />

      <SoCompareCards meta={meta} />
      <KpiPills scoreCards={scoreCards} />

      <div className="sticky top-16 z-40 card bg-base-100/95 backdrop-blur-md border border-base-300 shadow-sm p-3 no-print">
        <div className="flex flex-col gap-2">
          <label className="input input-bordered flex items-center gap-2 h-11 rounded-xl">
            <Search className="w-4 h-4 text-base-content/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari item, ID, area, atau keterangan..."
              className="grow text-sm"
            />
            {query ? (
              <button type="button" className="text-base-content/40 text-xs" onClick={() => setQuery('')}>
                Hapus
              </button>
            ) : null}
          </label>
          {searching ? (
            <p className="text-[11px] text-base-content/50 px-1">
              Menampilkan jumlah item yang cocok dengan pencarian.
            </p>
          ) : null}
          <AreaFilterRail
            areas={areaChips}
            total={view.allItems.length}
            active={activeArea}
            onChange={setActiveArea}
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-base-content/50 md:hidden no-print">
        <div className="flex items-center gap-1 text-[11px] font-semibold">
          <MoveHorizontal className="w-3.5 h-3.5 text-primary" />
          <span>Geser tabel ke samping • Nama item tetap terlihat</span>
        </div>
      </div>

      {displayAreas.length === 0 ? (
        <EmptySearchState onReset={resetFilters} />
      ) : (
        <div className="flex flex-col gap-4">
          {displayAreas.map((ag) => (
            <AreaSection
              key={ag.area}
              area={ag.area}
              typeBadge={ag.typeBadge}
              summary={ag.summary}
              subGroups={ag.subGroups}
              expanded={searching || !collapsed.has(ag.area)}
              onToggle={() => toggleArea(ag.area)}
              selectedItemId={selectedItemId}
              onSelectItem={selectItem}
            />
          ))}
        </div>
      )}

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-4 gap-1.5">
          <div className="flex items-center gap-2">
            <span className="badge badge-warning badge-sm font-semibold">Note</span>
          </div>
          <p className="text-sm text-base-content/80 whitespace-pre-wrap">
            {meta.note || 'Tidak ada catatan tambahan untuk laporan ini.'}
          </p>
        </div>
      </div>

      {variant === 'public' ? (
        <footer className="mt-4 pt-4 border-t border-base-300 text-center text-[11px] text-base-content/40 leading-relaxed no-print">
          <p>Stokis — Sistem Stock Opname Multi Cabang</p>
          <p>
            Laporan ini dapat diakses tanpa login. Untuk mengedit, silakan{' '}
            <a href="/login" className="underline underline-offset-2 text-base-content/70">masuk</a>.
          </p>
        </footer>
      ) : null}
    </div>
  );
}
