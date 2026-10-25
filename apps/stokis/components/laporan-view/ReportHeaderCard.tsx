import { HelpCircle, Pencil, Table, FileDown } from 'lucide-react';
import { ReportViewToolbar } from '@/components/ReportViewToolbar';
import { ShareReportButton } from './ShareReportButton';

interface ReportHeaderCardProps {
  laporanId: string;
  cabangId: string;
  cabangNama?: string;
  variant: 'app' | 'public';
  linkXlsx?: string;
  linkPdf?: string;
}

export function ReportHeaderCard({
  laporanId,
  cabangId,
  cabangNama,
  variant,
  linkXlsx,
  linkPdf,
}: ReportHeaderCardProps) {
  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body p-4 gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-lg md:text-xl font-semibold leading-tight">
                Laporan Stock Opname
              </h1>
              <span className="badge badge-ghost font-mono text-[11px] tracking-wide">
                {laporanId}
              </span>
            </div>
            {cabangNama ? (
              <p className="text-xs text-base-content/50 mt-1 uppercase tracking-wide">{cabangNama}</p>
            ) : null}
          </div>

          {variant === 'public' ? (
            <ReportViewToolbar laporanId={laporanId} cabangId={cabangId} linkPdf={linkPdf} />
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 shrink-0 no-print">
              <ShareReportButton laporanId={laporanId} cabangId={cabangId} />
              <a
                href="/docs/user-guide/laporan"
                className="btn btn-ghost btn-sm btn-square"
                title="Buka panduan Laporan"
              >
                <HelpCircle className="w-4 h-4" />
              </a>
              <a href={`/laporan/${laporanId}/edit`} className="btn btn-primary btn-sm gap-1.5">
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </a>
              <a
                href={`/api/so/${encodeURIComponent(laporanId)}/xlsx-file?cabang=${encodeURIComponent(cabangId)}`}
                download
                className="btn btn-outline btn-sm gap-1.5"
              >
                <Table className="w-4 h-4" />
                <span className="hidden sm:inline">XLSX</span>
              </a>
              {linkPdf ? (
                <a href={linkPdf} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm gap-1.5">
                  <FileDown className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
