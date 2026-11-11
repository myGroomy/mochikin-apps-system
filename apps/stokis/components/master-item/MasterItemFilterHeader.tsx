import React from 'react';
import { Tags, Filter, ChevronDown, RotateCcw } from 'lucide-react';

export interface MasterItemFilterHeaderProps {
  selectedArea: string;
  onAreaChange: (area: string) => void;
  areas: string[];
  areaCounts: Map<string, number>;
  totalItems: number;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  activeItemCount: number;
  onReset?: () => void;
}

export function MasterItemFilterHeader({
  selectedArea,
  onAreaChange,
  areas,
  areaCounts,
  totalItems,
  selectedStatus,
  onStatusChange,
  activeItemCount,
  onReset,
}: MasterItemFilterHeaderProps) {
  const isFiltered = selectedArea !== 'Semua' || selectedStatus !== 'Semua';

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 items-center">
        {/* Kolom 1: Filter Category */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base-content/40">
            <Tags className="w-4 h-4" />
          </div>
          <select
            value={selectedArea}
            onChange={(e) => onAreaChange(e.target.value)}
            aria-label="Filter Kategori"
            className="appearance-none w-full h-9 pl-9 pr-8 rounded-lg border border-base-300 text-xs font-semibold text-base-content/80 bg-base-100 hover:border-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer truncate"
          >
            <option value="Semua">Semua Kategori ({totalItems})</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area} ({areaCounts.get(area) || 0})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40" />
        </div>

        {/* Kolom 2: Filter Status */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base-content/40">
            <Filter className="w-4 h-4" />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter Status"
            className="appearance-none w-full h-9 pl-9 pr-8 rounded-lg border border-base-300 text-xs font-semibold text-base-content/80 bg-base-100 hover:border-base-content/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer truncate"
          >
            <option value="Semua">Semua Status</option>
            <option value="Aktif">Aktif ({activeItemCount})</option>
            <option value="Nonaktif">Nonaktif ({totalItems - activeItemCount})</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40" />
        </div>
      </div>

      {isFiltered && onReset && (
        <div className="flex justify-end pt-1.5">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset filter kategori & status
          </button>
        </div>
      )}
    </div>
  );
}
