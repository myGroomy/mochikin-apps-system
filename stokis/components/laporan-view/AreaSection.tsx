import { ChevronRight } from 'lucide-react';
import type { InputTypeGroup, ViewItem } from '@/lib/domain/laporan-view';
import { typeLabel } from './report-utils';
import { TypeTable } from './LaporanTables';

export interface AreaSubGroup {
  type: InputTypeGroup;
  items: ViewItem[];
}

interface AreaSectionProps {
  area: string;
  typeBadge: string;
  summary: { label: string; className: string };
  subGroups: AreaSubGroup[];
  expanded: boolean;
  onToggle: () => void;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
}

export function AreaSection({
  area,
  typeBadge,
  summary,
  subGroups,
  expanded,
  onToggle,
  selectedItemId,
  onSelectItem,
}: AreaSectionProps) {
  return (
    <section className="card bg-base-100 border border-base-300 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 bg-base-200/60 flex items-center justify-between text-left md:pointer-events-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRight
            className={`w-5 h-5 text-primary shrink-0 transition-transform duration-200 md:hidden ${expanded ? 'rotate-90' : ''}`}
          />
          <div className="min-w-0">
            <span className="font-display font-semibold text-sm whitespace-normal break-words">{area}</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-base-200 text-base-content/60 text-[10px] font-semibold whitespace-normal break-words">
              {typeBadge}
            </span>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${summary.className}`}>
          {summary.label}
        </span>
      </button>

      <div className={`lv-body ${expanded ? 'block' : 'hidden md:block'}`}>
        {subGroups.map((sg) => (
          <div key={sg.type} className="border-t border-base-200">
            {subGroups.length > 1 && (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-base-200/40">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
                  {typeLabel(sg.type)}
                </span>
                <span className="text-[10px] text-base-content/40">{sg.items.length}</span>
              </div>
            )}
            <TypeTable
              type={sg.type}
              items={sg.items}
              selectedItemId={selectedItemId}
              onSelectItem={onSelectItem}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
