interface AreaChip {
  area: string;
  count: number;
}

interface AreaFilterRailProps {
  areas: AreaChip[];
  total: number;
  active: string;
  onChange: (area: string) => void;
}

export function AreaFilterRail({ areas, total, active, onChange }: AreaFilterRailProps) {
  const chips: AreaChip[] = [{ area: 'all', count: total }, ...areas];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      {chips.map((chip) => {
        const isActive = active === chip.area;
        const label = chip.area === 'all' ? `Semua (${chip.count})` : `${chip.area} (${chip.count})`;
        return (
          <button
            key={chip.area}
            type="button"
            onClick={() => onChange(chip.area)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              isActive
                ? 'bg-primary text-primary-content'
                : 'bg-base-100 text-base-content/70 border border-base-300'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
