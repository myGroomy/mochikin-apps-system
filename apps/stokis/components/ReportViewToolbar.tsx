'use client';

import { useEffect, useState } from 'react';
import { FileDown, FileSpreadsheet, Pencil, Printer } from 'lucide-react';
import { ShareReportButton } from '@/components/laporan-view/ShareReportButton';

interface ReportViewToolbarProps {
  laporanId: string;
  cabangId: string;
  linkPdf?: string;
}

export function ReportViewToolbar({ laporanId, cabangId, linkPdf }: ReportViewToolbarProps) {
  const [canEdit, setCanEdit] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => setCanEdit(res.ok))
      .catch(() => setCanEdit(false))
      .finally(() => setChecking(false));
  }, []);

  return (
    <div className="no-print flex flex-wrap items-center gap-1.5 shrink-0">
      <ShareReportButton laporanId={laporanId} cabangId={cabangId} />
      <a
        href={`/api/so/${encodeURIComponent(laporanId)}/xlsx-file?cabang=${encodeURIComponent(cabangId)}`}
        download
        className="btn btn-outline btn-sm gap-1.5"
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span className="hidden sm:inline">XLSX</span>
      </a>
      {linkPdf ? (
        <a href={linkPdf} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm gap-1.5">
          <FileDown className="w-4 h-4" />
          <span className="hidden sm:inline">PDF</span>
        </a>
      ) : (
        <button type="button" onClick={() => window.print()} className="btn btn-outline btn-sm gap-1.5">
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">PDF</span>
        </button>
      )}
      {!checking && canEdit && (
        <a
          href={`/laporan/${laporanId}/edit?cabang=${encodeURIComponent(cabangId)}`}
          className="btn btn-primary btn-sm gap-1.5"
        >
          <Pencil className="w-4 h-4" />
          <span className="hidden sm:inline">Edit</span>
        </a>
      )}
    </div>
  );
}
