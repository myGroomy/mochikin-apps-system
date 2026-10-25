'use client';

import React from 'react';
import { Copy, Check, FileText, User, Calendar, Clock } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';

interface WATemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
  cabangNama: string;
  tanggal: string;
  shift: string;
  petugas: string;
  totalItem: number;
  jumlahKritis: number;
  jumlahHampirHabis: number;
  laporanId?: string;
  cabangId?: string;
  linkXLSX?: string;
  linkView?: string;
}

export function WATemplateModal({ isOpen, onClose, onSent, ...data }: WATemplateModalProps) {
  const [copied, setCopied] = React.useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const activeViewLink = data.linkView ||
    (data.laporanId && data.cabangId
      ? `${origin}/laporan/view/${encodeURIComponent(data.laporanId)}?cabang=${encodeURIComponent(data.cabangId)}`
      : data.linkXLSX && data.linkXLSX.includes('/laporan/view/')
        ? data.linkXLSX
        : `${origin}/laporan/view/${data.laporanId || '[ID_LAPORAN]'}?cabang=${data.cabangId || '[ID_CABANG]'}`);

  const totalItemNum = Number(data.totalItem) || 0;
  const kritisNum = Number(data.jumlahKritis) || 0;
  const hampirNum = Number(data.jumlahHampirHabis) || 0;

  const templateText = `
*LAPORAN STOCK OPNAME*
------------------------

Cabang    : ${data.cabangNama}
Tanggal   : ${data.tanggal}
Shift     : ${data.shift.toUpperCase()}
Petugas   : ${data.petugas}

Total Item       : ${totalItemNum}
Status Kritis    : ${kritisNum}
Status Hampir Habis : ${hampirNum}

Lihat Laporan:
${activeViewLink}
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(templateText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const waBase = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? 'whatsapp://send'
    : 'https://wa.me/';
  const waHref = `${waBase}?text=${encodeURIComponent(templateText)}`;

  return (
    <BottomSheet
      open={isOpen}
      onClose={onClose}
      title="Siapkan Pesan WhatsApp"
      subtitle="Pilih file & salin teks laporan untuk dikirim"
      footer={
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all"
          >
            Tutup
          </button>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { onClose(); onSent?.(); }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-success-content bg-success shadow-lg shadow-success/20 transition-all"
          >
            <FileText className="w-4 h-4" />
            Kirim ke WhatsApp
          </a>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold text-base-content/40 uppercase tracking-wider">
              <Calendar className="w-3 h-3" /> Tanggal
            </div>
            <div className="px-3 py-2 min-h-[44px] flex items-center bg-base-200 rounded-lg text-sm font-semibold text-base-content">{data.tanggal}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold text-base-content/40 uppercase tracking-wider">
              <Clock className="w-3 h-3" /> Shift
            </div>
            <div className="px-3 py-2 min-h-[44px] flex items-center bg-base-200 rounded-lg text-sm font-semibold text-base-content">{data.shift}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold text-base-content/40 uppercase tracking-wider">
              <User className="w-3 h-3" /> Petugas
            </div>
            <div className="px-3 py-2 min-h-[44px] flex items-center bg-base-200 rounded-lg text-sm font-semibold text-base-content whitespace-normal break-words">{data.petugas}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold text-base-content/40 uppercase tracking-wider">
              <FileText className="w-3 h-3" /> Status
            </div>
            <div className="flex items-center gap-2 px-3 py-2 min-h-[44px] bg-base-200 rounded-lg">
              <span className="text-xs font-bold text-error">{data.jumlahKritis} Kritis</span>
              <span className="text-xs font-bold text-warning">{data.jumlahHampirHabis} HH</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider">Template Pesan</label>
          <div className="relative">
            <textarea
              value={templateText}
              readOnly
              className="textarea textarea-bordered w-full h-32 text-xs font-mono"
            />
            <button
              onClick={handleCopy}
              className="absolute right-2 top-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-base-content/40 hover:text-primary hover:bg-primary/10 transition-colors"
              title="Salin ke Clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {copied && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-xs text-success">
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Pesan berhasil disalin!</span>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
