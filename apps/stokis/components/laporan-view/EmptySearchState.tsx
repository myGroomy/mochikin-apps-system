import { SearchX } from 'lucide-react';

export function EmptySearchState({ onReset }: { onReset: () => void }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center text-base-content/50 mb-3">
        <SearchX className="w-8 h-8" />
      </div>
      <span className="font-display font-semibold">Tidak ada item ditemukan</span>
      <p className="text-sm text-base-content/50 mt-1 max-w-[260px]">
        Coba gunakan kata kunci lain atau reset filter area di atas.
      </p>
      <button type="button" className="btn btn-primary btn-sm mt-4" onClick={onReset}>
        Reset Pencarian
      </button>
    </div>
  );
}
