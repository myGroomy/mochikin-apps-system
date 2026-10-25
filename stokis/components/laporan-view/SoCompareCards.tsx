import { Calendar, Clock, User } from 'lucide-react';
import type { ViewMeta } from '@/lib/domain/laporan-view';

export function SoCompareCards({ meta }: { meta: ViewMeta }) {
  const hasPrev = Boolean(meta.prevTanggalFormatted && meta.prevTanggalFormatted !== '-');

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-success/5 border border-success/20 p-2.5 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">SO Sekarang</span>
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        </div>
        <div className="font-display font-semibold text-sm leading-tight flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-success" />
          {meta.tanggalFormatted || '-'}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-base-content/60 flex-wrap">
          <span className="badge badge-sm bg-success/15 text-success border-0">{meta.shift || '-'}</span>
          <span className="inline-flex items-center gap-1">
            <User className="w-3 h-3" />
            {meta.petugas || '-'}
          </span>
        </div>
      </div>

      <div className="rounded-lg bg-base-200/60 border border-base-300 p-2.5 flex flex-col gap-1 opacity-80">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">SO Sebelumnya</span>
          <span className="w-2 h-2 rounded-full bg-base-300" />
        </div>
        <div className="font-display font-semibold text-sm leading-tight flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {hasPrev ? meta.prevTanggalFormatted : '-'}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-base-content/60 flex-wrap">
          {hasPrev ? (
            <>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {meta.prevShift || '-'}
              </span>
              {meta.prevPetugas ? (
                <span className="inline-flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {meta.prevPetugas}
                </span>
              ) : null}
            </>
          ) : (
            <span>Data perdana</span>
          )}
        </div>
      </div>
    </div>
  );
}
