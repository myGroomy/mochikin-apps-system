import { CheckCircle2 } from 'lucide-react';
import type { ViewScoreCards } from '@/lib/domain/laporan-view';

export function KpiPills({ scoreCards }: { scoreCards: ViewScoreCards }) {
  const tercatat = Math.max(0, scoreCards.total - scoreCards.tidakDipantau);
  const pct = scoreCards.total > 0 ? Math.round((tercatat / scoreCards.total) * 100) : 0;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      {scoreCards.kritis > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error/10 text-error shrink-0 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-error" />
          {scoreCards.kritis} Kritis
        </span>
      )}
      {scoreCards.hampirHabis > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/20 text-warning-content shrink-0 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-warning" />
          {scoreCards.hampirHabis} Hampir Habis
        </span>
      )}
      {scoreCards.aman > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success shrink-0 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-success" />
          {scoreCards.aman} Aman
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-base-200 text-base-content shrink-0 text-xs font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
        {tercatat} / {scoreCards.total} Tercatat ({pct}%)
      </span>
    </div>
  );
}
