// app/laporan/[laporanId]/edit/page.tsx
// Edit page for existing laporan — update item counts and regenerate XLSX in-place.
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useCabang } from '@/lib/CabangContext';
import { useToast } from '@/lib/ToastContext';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Save, Loader2, AlertTriangle, Check, FileText,
} from 'lucide-react';
import { sanitizeDecimalInput } from '@/lib/domain/so';

interface LaporanItem {
  Item_ID: string;
  Nama_Barang: string;
  Area: string;
  Satuan: string;
  Threshold: number;
  Step1: number;
  Step2: number;
  Keterangan: string;
  Tipe_Input: string;
  Status_Isi: string;
  Tgl_Refill: string;
  Tgl_Pakai: string;
  Tgl_Kedaluwarsa: string;
}

export default function EditLaporanPage({ params }: { params: Promise<{ laporanId: string }> }) {
  const { laporanId } = use(params);
  const router = useRouter();
  const { selectedCabang } = useCabang();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<LaporanItem[]>([]);
  const [laporanInfo, setLaporanInfo] = useState<{
    Tanggal_Operasional: string;
    Shift: string;
    Petugas: string;
  } | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isNewFile, setIsNewFile] = useState(false);

  // Group items by area
  const groupedItems = items.reduce((acc, it) => {
    const area = it.Area || 'Area Umum';
    if (!acc[area]) acc[area] = [];
    acc[area].push(it);
    return acc;
  }, {} as Record<string, LaporanItem[]>);

  useEffect(() => {
    if (!selectedCabang?.Cabang_ID || !laporanId) return;

    fetch(`/api/laporan/${laporanId}?cabang=${selectedCabang.Cabang_ID}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setLaporanInfo({
            Tanggal_Operasional: json.data.Tanggal_Operasional || '',
            Shift: json.data.Shift || '',
            Petugas: json.data.Petugas || '',
          });
        }
      })
      .catch(() => {
        // abaikan: info header opsional
      });

    // Fetch detail items
    fetch(`/api/laporan/${laporanId}/detail?cabang=${selectedCabang.Cabang_ID}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setItems(json.data);
        } else {
          setError('Gagal memuat detail laporan');
        }
      })
      .catch(() => {
        setError('Gagal memuat detail laporan');
      })
      .finally(() => setLoading(false));

  }, [selectedCabang?.Cabang_ID, laporanId]);

  const handleCountChange = (itemId: string, field: 'Step1' | 'Step2' | 'Keterangan', value: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.Item_ID !== itemId) return it;
        if (field === 'Keterangan') {
          return { ...it, [field]: value };
        }
        return { ...it, [field]: sanitizeDecimalInput(value) };
      })
    );
  };

  const handleStatusChange = (itemId: string, statusIsi: string) => {
    setItems((prev) =>
      prev.map((it) => (it.Item_ID === itemId ? { ...it, Status_Isi: statusIsi } : it))
    );
  };

  const handleDateChange = (itemId: string, field: 'Tgl_Refill' | 'Tgl_Pakai' | 'Tgl_Kedaluwarsa', value: string) => {
    setItems((prev) =>
      prev.map((it) => (it.Item_ID === itemId ? { ...it, [field]: value } : it))
    );
  };

  const handleSave = async () => {
    if (!selectedCabang?.Cabang_ID) return;

    setSaving(true);
    setError('');
    setSuccessMsg('');
    setIsNewFile(false);

    try {
      const payloadItems = items.map((it) => ({
        itemId: it.Item_ID,
        step1: Number(it.Step1) || 0,
        step2: Number(it.Step2) || 0,
        keterangan: it.Keterangan || '',
        statusIsi: it.Status_Isi || '',
        tglRefill: it.Tgl_Refill || '',
        tglPakai: it.Tgl_Pakai || '',
        tglKedaluwarsa: it.Tgl_Kedaluwarsa || '',
      }));

      const res = await fetch(`/api/laporan/${laporanId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId: selectedCabang.Cabang_ID,
          items: payloadItems,
        }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success('Berhasil', 'Laporan berhasil diperbarui. File XLSX telah diperbarui.');
        setSuccessMsg('Laporan berhasil diperbarui. File XLSX telah diperbarui.');
        if (json.data?.isNewFile) {
          setIsNewFile(true);
        }
      } else {
        const msg = json.error?.message || 'Gagal menyimpan perubahan';
        toast.error('Gagal Menyimpan', msg);
        setError(msg);
      }
    } catch {
      toast.error('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan');
      setError('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const isDual = (tipeInput: string) => {
    const t = (tipeInput || '').toLowerCase();
    return t.includes('dual') || (!t.includes('single') && !t.includes('boolean') && !t.includes('date') && !t.includes('text') && !t.includes('expiry'));
  };

  const isSingle = (tipeInput: string) => (tipeInput || '').toLowerCase().includes('single');
  const isBoolean = (tipeInput: string) => (tipeInput || '').toLowerCase().includes('boolean');
  const isDate = (tipeInput: string) => (tipeInput || '').toLowerCase().includes('date');
  const isExpiry = (tipeInput: string) => (tipeInput || '').toLowerCase().includes('expiry');

  if (!selectedCabang) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 mx-auto text-warning" />
        <h3 className="mt-4 font-semibold">Pilih cabang terlebih dahulu</h3>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -8 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6"
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-base-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Edit Laporan
            </h1>
            {laporanInfo && (
              <p className="text-sm text-base-content/60">
                {laporanInfo.Tanggal_Operasional} • {laporanInfo.Shift} • {laporanInfo.Petugas}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary gap-2 min-h-[44px]"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Simpan & Perbarui XLSX
        </button>
      </motion.div>

      {/* Messages */}
      {error && (
        <div className="alert alert-error mb-4">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success mb-4">
          <Check className="w-5 h-5" />
          <span>{successMsg}</span>
          {isNewFile && (
            <span className="text-xs ml-2 bg-warning/20 px-2 py-1 rounded-lg">
              (File baru dibuat — link berubah)
            </span>
          )}
        </div>
      )}

      {/* Items by Area */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([area, areaItems]) => (
          <motion.div
            key={area}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-base-100 border border-base-300"
          >
            <div className="bg-base-200 px-4 py-2 border-b border-base-300 font-semibold text-sm">
              ▶ {area}
            </div>
            <div className="p-4 space-y-3">
              {areaItems.map((it) => {
                const dual = isDual(it.Tipe_Input);
                const single = isSingle(it.Tipe_Input);
                const bool = isBoolean(it.Tipe_Input);
                const date = isDate(it.Tipe_Input);
                const expiry = isExpiry(it.Tipe_Input);

                return (
                  <div 
                    key={it.Item_ID} 
                    className="flex flex-wrap items-center gap-3 p-3 bg-base-50 rounded-lg border border-base-200"
                  >
                    {/* Nama Barang - always shown */}
                    <div className="flex-1 min-w-[150px]">
                      <div className="font-medium text-sm">{it.Nama_Barang}</div>
                      <div className="text-xs text-base-content/50">{it.Satuan}</div>
                    </div>

                    {/* Dual/Single: Step1 and Step2 inputs */}
                    {(dual || single) && (
                      <>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-primary">S1</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={it.Step1}
                            onChange={(e) => handleCountChange(it.Item_ID, 'Step1', e.target.value)}
                            className="input input-bordered w-20 text-center tabular-nums min-h-[44px]"
                          />
                        </div>
                        {dual && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-primary">S2</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={it.Step2}
                              onChange={(e) => handleCountChange(it.Item_ID, 'Step2', e.target.value)}
                            className="input input-bordered w-20 text-center tabular-nums min-h-[44px]"
                            />
                          </div>
                        )}
                        {single && (
                          <div className="text-xs text-base-content/50 italic">
                            (Step 2 tidak digunakan)
                          </div>
                        )}
                      </>
                    )}

                    {/* Boolean: Status toggle */}
                    {bool && (
                      <select
                        value={it.Status_Isi || ''}
                        onChange={(e) => handleStatusChange(it.Item_ID, e.target.value)}
                        className="select select-bordered min-h-[44px]"
                      >
                        <option value="">--</option>
                        <option value="Penuh">Penuh</option>
                        <option value="Dipakai">Dipakai</option>
                        <option value="Habis">Habis</option>
                      </select>
                    )}

                    {/* Date: Tgl_Refill input */}
                    {date && (
                      <input
                        type="date"
                        value={it.Tgl_Refill || ''}
                        onChange={(e) => handleDateChange(it.Item_ID, 'Tgl_Refill', e.target.value)}
                        className="input input-bordered min-h-[44px]"
                      />
                    )}

                    {/* Expiry: Tgl_Kedaluwarsa input */}
                    {expiry && (
                      <input
                        type="date"
                        value={it.Tgl_Kedaluwarsa || ''}
                        onChange={(e) => handleDateChange(it.Item_ID, 'Tgl_Kedaluwarsa', e.target.value)}
                        className="input input-bordered min-h-[44px]"
                      />
                    )}

                    {/* Text type: no input, just keterangan */}

                    {/* Keterangan - always available */}
                    <input
                      type="text"
                      placeholder="Keterangan..."
                      value={it.Keterangan || ''}
                      onChange={(e) => handleCountChange(it.Item_ID, 'Keterangan', e.target.value)}
                      className="input input-bordered flex-1 min-w-[120px] min-h-[44px]"
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}