export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-base-200 ${className}`} aria-hidden="true" />;
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card card-static p-5" role="status" aria-label="Memuat data">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <div className="mt-5 space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-3 w-full" />
        ))}
      </div>
      <span className="sr-only">Memuat data…</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 p-4" role="status" aria-label="Memuat tabel">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, cellIndex) => (
            <Skeleton key={cellIndex} className="h-4 w-full" />
          ))}
        </div>
      ))}
      <span className="sr-only">Memuat tabel…</span>
    </div>
  );
}
