'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCabang } from '@/lib/CabangContext';
import { useToast } from '@/lib/ToastContext';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  Building2,
  PlusCircle,
  Store,
  Edit2,
  X,
  CheckCircle2,
  ExternalLink,
  Zap,
  Folder,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { QuantumLoaderFull } from '@/components/ui/QuantumLoader';

interface CabangFull {
  Cabang_ID: string;
  Nama_Cabang: string;
  Alamat?: string;
  Spreadsheet_ID?: string;
  Folder_Drive_ID?: string;
  PIC_Nama?: string;
  Nomor_WA_Cabang?: string;
  Aktif: boolean;
}

export default function CabangAdminPage() {
  const { refreshCabangList } = useCabang();
  const { toast } = useToast();

  const [cabangList, setCabangList] = useState<CabangFull[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingCabang, setEditingCabang] = useState<CabangFull | null>(null);
  const [namaCabang, setNamaCabang] = useState<string>('');
  const [alamat, setAlamat] = useState<string>('');
  const [picNama, setPicNama] = useState<string>('');
  const [nomorWa, setNomorWa] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchAllCabang = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cabang');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCabangList(json.data);
      }
    } catch {
      setErrorMsg('Gagal memuat daftar cabang. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCabang();
  }, []);

  const handleOpenAdd = () => {
    setEditingCabang(null);
    setNamaCabang('');
    setAlamat('');
    setPicNama('');
    setNomorWa('');
    setSuccessInfo('');
    setShowModal(true);
  };

  const handleOpenEdit = (c: CabangFull) => {
    setEditingCabang(c);
    setNamaCabang(c.Nama_Cabang);
    setAlamat(c.Alamat || '');
    setPicNama(c.PIC_Nama || '');
    setNomorWa(c.Nomor_WA_Cabang || '');
    setSuccessInfo('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessInfo('');

      if (editingCabang) {
        const res = await fetch(`/api/cabang/${editingCabang.Cabang_ID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Nama_Cabang: namaCabang,
            Alamat: alamat,
            PIC_Nama: picNama,
            Nomor_WA_Cabang: nomorWa,
          }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success('Berhasil', `Data cabang "${namaCabang}" berhasil diperbarui.`);
          setShowModal(false);
          fetchAllCabang();
          refreshCabangList();
        } else {
          const msg = json.error?.message || 'Gagal mengubah data cabang';
          toast.error('Gagal Mengubah Cabang', msg);
          setErrorMsg(msg);
        }
      } else {
        const res = await fetch('/api/cabang', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Nama_Cabang: namaCabang,
            Alamat: alamat,
            PIC_Nama: picNama,
            Nomor_WA_Cabang: nomorWa,
          }),
        });
        const json = await res.json();
        if (json.success) {
          const msg = `Cabang "${namaCabang}" berhasil dibuat secara otomatis dengan spreadsheet Google Sheets dan folder Drive baru.`;
          toast.success('Cabang Berhasil Dibuat', msg);
          setSuccessInfo(msg);
          setShowModal(false);
          fetchAllCabang();
          refreshCabangList();
        } else {
          const msg = json.error?.message || 'Gagal membuat cabang baru';
          toast.error('Gagal Membuat Cabang', msg);
          setErrorMsg(msg);
        }
      }
    } catch (err: any) {
      const msg = 'Error: ' + err.message;
      toast.error('Gagal Menyimpan Cabang', msg);
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: CabangFull) => {
    try {
      await fetch(`/api/cabang/${c.Cabang_ID}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aktif: !c.Aktif }),
      });
      toast.info('Status Cabang Diperbarui', `Status cabang "${c.Nama_Cabang}" diubah menjadi ${!c.Aktif ? 'Aktif' : 'Nonaktif'}.`);
      fetchAllCabang();
      refreshCabangList();
    } catch (err: any) {
      const msg = 'Error: ' + err.message;
      toast.error('Gagal Mengubah Status', msg);
      setErrorMsg(msg);
    }
  };

  if (loading) {
    return <QuantumLoaderFull text="Memuat data cabang" />;
  }

  return (
    <div className="page-shell space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 data-onboard="cabang-heading" className="text-xl sm:text-2xl font-semibold text-base-content flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            <span>Administrasi Cabang Operasional</span>
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Penambahan cabang otomatis: template Google Sheets dan folder Drive disalin tanpa perlu coding.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenAdd}
          className="btn btn-primary gap-2 px-4 py-2 text-sm self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Tambah Cabang Baru</span>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {successInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="alert alert-success text-sm"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successInfo}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {errorMsg && (
        <div className="alert alert-error text-sm" role="alert">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => { setErrorMsg(''); fetchAllCabang(); }} className="btn btn-ghost btn-xs">Coba Lagi</button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="card bg-base-100 border border-base-300 overflow-hidden"
      >
        {cabangList.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <Store className="w-12 h-12 text-base-content/40 mx-auto" />
            <h3 className="text-sm font-semibold text-base-content">Belum Ada Cabang Terdaftar</h3>
            <p className="text-base-content/60 text-sm">Klik tombol di atas untuk mendaftarkan cabang perdana.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm mobile-card-table">
              <thead className="bg-base-200 border-b border-base-300">
                <tr className="font-semibold text-base-content/60">
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Nama Cabang</th>
                  <th className="px-5 py-3">PIC dan Kontak</th>
                  <th className="px-5 py-3">Alamat</th>
                  <th className="px-5 py-3 text-center">Database dan Drive</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-base-content">
                {cabangList.map((c) => (
                  <motion.tr
                    key={c.Cabang_ID}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.1 }}
                    className="border-b border-base-300 hover:bg-base-200 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-base-content/60" data-label="ID">{c.Cabang_ID}</td>
                    <td className="px-5 py-4 font-semibold" data-label="Nama Cabang">{c.Nama_Cabang}</td>
                    <td className="px-5 py-4 text-base-content/60" data-label="PIC">
                      <div className="font-medium text-base-content">PIC: {c.PIC_Nama || 'Belum diatur'}</div>
                      <div className="mt-0.5">{c.Nomor_WA_Cabang || 'Belum diatur'}</div>
                    </td>
                    <td className="px-5 py-4 text-base-content/60 max-w-xs whitespace-normal break-words" data-label="Alamat">
                      {c.Alamat || 'Belum diatur'}
                    </td>
                    <td className="px-5 py-4 text-center space-x-2" data-label="Database">
                      {c.Spreadsheet_ID && (
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${c.Spreadsheet_ID}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Buka Database Spreadsheet Cabang"
                          className="badge badge-success gap-1 hover:badge-outline transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Sheets</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {c.Folder_Drive_ID && (
                        <a
                          href={`https://drive.google.com/drive/folders/${c.Folder_Drive_ID}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Buka Folder Google Drive"
                          className="badge badge-primary gap-1 hover:badge-outline transition-colors"
                        >
                          <Folder className="w-3.5 h-3.5" />
                          <span>Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center" data-label="Status">
                      {c.Aktif ? (
                        <span className="badge badge-success">Aktif</span>
                      ) : (
                        <span className="badge badge-ghost">Nonaktif</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2" data-label="Aksi">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleOpenEdit(c)}
                        className="btn btn-ghost btn-sm min-h-[44px] min-w-[44px] text-base-content/60 hover:text-primary"
                        title="Edit Data Cabang"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      <button
                        onClick={() => handleToggleActive(c)}
                        className="btn btn-ghost btn-sm min-h-[44px] text-error hover:bg-error/10"
                        title={c.Aktif ? "Nonaktifkan" : "Aktifkan"}
                      >
                        {c.Aktif ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <BottomSheet
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingCabang ? 'Edit Informasi Cabang' : 'Tambah Cabang Baru Otomatis'}
        footer={
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all"
            >
              Batal
            </button>
            <motion.button
              type="submit"
              form="cabang-form"
              disabled={saving}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-primary-content bg-primary shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="quantum-mini-loader">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>Menyiapkan Database...</span>
                </>
              ) : (
                <span>Simpan Cabang</span>
              )}
            </motion.button>
          </div>
        }
      >
        <form id="cabang-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">Nama Cabang</label>
            <input
              type="text"
              required
              placeholder="Contoh: SO Bandung Malam"
              value={namaCabang}
              onChange={(e) => setNamaCabang(e.target.value)}
              className="input input-bordered w-full min-h-[44px] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">Alamat Cabang</label>
            <textarea
              rows={2}
              placeholder="Alamat lengkap lokasi..."
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              className="textarea textarea-bordered w-full text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">Nama PIC Cabang</label>
              <input
                type="text"
                placeholder="Nama staf PIC..."
                value={picNama}
                onChange={(e) => setPicNama(e.target.value)}
                className="input input-bordered w-full min-h-[44px] text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">Nomor WhatsApp</label>
              <input
                type="text"
                placeholder="628123456789"
                value={nomorWa}
                onChange={(e) => setNomorWa(e.target.value)}
                className="input input-bordered w-full min-h-[44px] text-sm font-mono"
              />
            </div>
          </div>

          {!editingCabang && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-info/10 border border-info/20 text-xs text-info">
              <Zap className="w-4 h-4 flex-shrink-0" />
              <span>Sistem akan menyalin template spreadsheet Google Sheets mandiri dan membuat folder Drive khusus untuk cabang ini.</span>
            </div>
          )}
        </form>
      </BottomSheet>
    </div>
  );
}
