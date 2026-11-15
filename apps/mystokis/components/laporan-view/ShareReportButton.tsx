'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

interface ShareReportButtonProps {
  laporanId: string;
  cabangId: string;
  className?: string;
}

export function ShareReportButton({
  laporanId,
  cabangId,
  className = 'btn btn-outline btn-sm gap-1.5',
}: ShareReportButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/laporan/view/${encodeURIComponent(laporanId)}?cabang=${encodeURIComponent(cabangId)}`;
    const shareData = {
      title: `Laporan Stock Opname - ${laporanId}`,
      text: `Lihat Laporan Stock Opname ${laporanId}`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share API failed -> fallback to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // fallback
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={className}
      title="Bagikan link laporan web"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-success" />
          <span className="hidden sm:inline text-success">Disalin!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Bagikan</span>
        </>
      )}
    </button>
  );
}
