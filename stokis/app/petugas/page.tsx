'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCabang } from '@/lib/CabangContext';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/lib/ToastContext';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  X,
  ShieldAlert,
  Shield,
  Key,
  AlertTriangle,
  Store,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { QuantumLoaderFull } from '@/components/ui/QuantumLoader';

interface User {
  User_ID: string;
  Username: string;
  Nama: string;
  Role: string;
  Cabang_ID: string;
  Aktif: boolean | string;
}

const emptyForm = {
  username: '',
  nama: '',
  role: 'petugas',
  pin: '',
  cabangIds: [] as string[],
};

export default function PetugasPage() {
  const { allCabangList } = useCabang();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUsersList(json.data);
      } else {
        setErrorMsg(json.error?.message || 'Gagal memuat daftar pengguna.');
      }
    } catch {
      setErrorMsg('Gagal memuat daftar pengguna. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const cabangName = (id: string) => {
    const match = allCabangList.find((c) => c.Cabang_ID === id);
    return match ? match.Nama_Cabang : id;
  };

  const parseCabangIds = (raw: string) =>
    String(raw || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toUpperCase());

  const isOwnUser = (u: User) =>
    !!currentUser && currentUser.username?.toLowerCase() === String(u.Username || '').toLowerCase();

  const handleOpenAdd = () => {
    setEditingUser(null);
    setForm({ ...emptyForm, cabangIds: [] });
    setShowModal(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setForm({
      username: u.Username,
      nama: u.Nama,
      role: u.Role,
      pin: '',
      cabangIds: parseCabangIds(u.Cabang_ID),
    });
    setShowModal(true);
  };

  const toggleCabang = (id: string) => {
    setForm((f) => ({
      ...f,
      cabangIds: f.cabangIds.includes(id)
        ? f.cabangIds.filter((c) => c !== id)
        : [...f.cabangIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');

      const cabangId = form.cabangIds.join(', ');
      if (editingUser) {
        const payload: Record<string, unknown> = { nama: form.nama, role: form.role, cabangId };
        if (form.pin) payload.pin = form.pin;
        const res = await fetch(`/api/users/${editingUser.User_ID}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || 'Gagal menyimpan perubahan');
        const msg = 'Data pengguna berhasil diperbarui.';
        toast.success('Berhasil', msg);
        setSuccessMsg(msg);
      } else {
        if (!form.username.trim()) throw new Error('Username wajib diisi');
        if (!form.pin.trim()) throw new Error('PIN wajib diisi');
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.username.trim(),
            pin: form.pin.trim(),
            nama: form.nama,
            role: form.role,
            cabangId,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || 'Gagal menambah pengguna');
        const msg = 'Pengguna baru berhasil ditambahkan.';
        toast.success('Pengguna Ditambahkan', msg);
        setSuccessMsg(msg);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan';
      toast.error('Gagal Menyimpan', msg);
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      setErrorMsg('');
      const isAktif = u.Aktif === true || u.Aktif === 'true' || u.Aktif === 'TRUE';
      const res = await fetch(`/api/users/${u.User_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aktif: !isAktif }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Gagal mengubah status');
      const msg = `Pengguna ${u.Username} ${isAktif ? 'dinonaktifkan' : 'diaktifkan'}.`;
      toast.info('Status Pengguna', msg);
      setSuccessMsg(msg);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengubah status';
      toast.error('Gagal Mengubah Status', msg);
      setErrorMsg(msg);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setErrorMsg('');
      const res = await fetch(`/api/users/${deleteTarget.User_ID}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Gagal menghapus pengguna');
      const msg = `Pengguna ${deleteTarget.Username} berhasil dihapus.`;
      toast.success('Pengguna Dihapus', msg);
      setSuccessMsg(msg);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus';
      toast.error('Gagal Menghapus', msg);
      setErrorMsg(msg);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <QuantumLoaderFull text="Memuat daftar pengguna" />;
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
          <h1 data-onboard="petugas-heading" className="text-xl sm:text-2xl font-semibold text-base-content flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <span>Manajemen Pengguna</span>
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Kelola seluruh akun login (admin & petugas) di semua cabang.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenAdd}
          className="btn btn-primary gap-2 px-4 py-2 text-sm self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </motion.button>
      </motion.div>

      {errorMsg && (
        <div className="alert alert-error text-sm" role="alert">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => { setErrorMsg(''); fetchUsers(); }} className="btn btn-ghost btn-xs">
            Coba Lagi
          </button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success text-sm" role="status">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="btn btn-ghost btn-xs">Tutup</button>
        </div>
      )}

      <div>
        {usersList.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <Users className="w-12 h-12 text-base-content/40 mx-auto" />
            <h3 className="text-sm font-semibold text-base-content">Belum Ada Pengguna</h3>
            <p className="text-base-content/60 text-sm">Tambahkan pengguna baru untuk memberi akses login.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm mobile-card-table">
              <thead className="bg-base-200 border-b border-base-300">
                <tr className="font-semibold text-base-content/60">
                  <th className="px-5 py-3">Username</th>
                  <th className="px-5 py-3">Nama Lengkap</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Cabang</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-base-content">
                {usersList.map((u) => {
                  const own = isOwnUser(u);
                  return (
                    <motion.tr
                      key={u.User_ID}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.1 }}
                      className="border-b border-base-300 hover:bg-base-200 transition-colors"
                    >
                      <td className="px-5 py-4" data-label="Username">
                        <span className="font-semibold text-primary">{u.Username}</span>
                        {own && <span className="badge badge-ghost badge-xs ml-2">Anda</span>}
                      </td>
                      <td className="px-5 py-4" data-label="Nama">{u.Nama}</td>
                      <td className="px-5 py-4" data-label="Role">
                        {u.Role === 'admin' ? (
                          <span className="badge badge-primary gap-1">
                            <Shield className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="badge badge-ghost gap-1">
                            <Key className="w-3 h-3" /> Petugas
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4" data-label="Cabang">
                        <div className="flex flex-wrap gap-1">
                          {parseCabangIds(u.Cabang_ID).length === 0 ? (
                            <span className="text-base-content/40 text-xs">-</span>
                          ) : (
                            parseCabangIds(u.Cabang_ID).map((id) => (
                              <span key={id} className="badge badge-outline badge-sm gap-1">
                                <Store className="w-3 h-3" /> {cabangName(id)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center" data-label="Status">
                        {u.Aktif === true || u.Aktif === 'true' || u.Aktif === 'TRUE' ? (
                          <span className="badge badge-success">Aktif</span>
                        ) : (
                          <span className="badge badge-ghost">Nonaktif</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right space-x-1" data-label="Aksi">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleOpenEdit(u)}
                          className="btn btn-ghost btn-sm min-h-[44px] min-w-[44px] text-base-content/60 hover:text-primary"
                          title="Edit Pengguna"
                        >
                          <Edit2 className="w-4 h-4" />
                        </motion.button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="btn btn-ghost btn-sm min-h-[44px] text-warning hover:bg-warning/10"
                          title={u.Aktif === true ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span className="hidden sm:inline">
                            {u.Aktif === true ? 'Nonaktifkan' : 'Aktifkan'}
                          </span>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          disabled={own}
                          className="btn btn-ghost btn-sm min-h-[44px] min-w-[44px] text-error hover:bg-error/10 disabled:text-base-content/30 disabled:cursor-not-allowed"
                          title={own ? 'Tidak bisa menghapus akun sendiri' : 'Hapus Pengguna'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <BottomSheet
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? `Edit Pengguna: ${editingUser.Username}` : 'Tambah Pengguna Baru'}
        footer={
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all">
              Batal
            </button>
            <motion.button
              type="submit"
              form="petugas-form"
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
                  <span>Menyimpan...</span>
                </>
              ) : editingUser ? (
                'Simpan Perubahan'
              ) : (
                'Tambah Pengguna'
              )}
            </motion.button>
          </div>
        }
      >
        <form id="petugas-form" onSubmit={handleSubmit} className="space-y-4">
          {!editingUser && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">Username</label>
              <input
                type="text"
                required
                placeholder="Username untuk login"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input input-bordered w-full min-h-[44px] text-sm"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
              {editingUser ? 'PIN Baru (kosongkan jika tidak diubah / reset)' : 'PIN (6 digit)'}
            </label>
            <input
              type="password"
              required={!editingUser}
              placeholder="123456"
              maxLength={6}
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
              className="input input-bordered w-full min-h-[44px] text-sm font-mono"
            />
            <p className="text-[10px] text-base-content/50 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Jangan gunakan PIN yang mudah ditebak.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">Nama Lengkap</label>
            <input
              type="text"
              required
              placeholder="Nama lengkap"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="input input-bordered w-full min-h-[44px] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="select select-bordered w-full min-h-[44px] text-sm"
            >
              <option value="petugas">Petugas</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
              Cabang (boleh pilih lebih dari satu)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-base-300 rounded-lg p-3">
              {allCabangList.length === 0 ? (
                <p className="text-sm text-base-content/50 col-span-full">Belum ada cabang terdaftar.</p>
              ) : (
                allCabangList.map((c) => {
                  const checked = form.cabangIds.includes(c.Cabang_ID.toUpperCase());
                  return (
                    <label
                      key={c.Cabang_ID}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer border text-sm transition-colors ${
                        checked
                          ? 'border-primary bg-primary/10'
                          : 'border-base-300 hover:bg-base-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCabang(c.Cabang_ID.toUpperCase())}
                        className="checkbox checkbox-primary checkbox-sm"
                      />
                      <span className="font-medium">{c.Nama_Cabang}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {editingUser && isOwnUser(editingUser) && form.role !== 'admin' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
              <ShieldAlert className="w-4 h-4" /> Anda sedang mengubah akun sendiri ke role non-admin.
            </div>
          )}
        </form>
      </BottomSheet>

      {/* Delete Confirmation */}
      <BottomSheet
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Pengguna"
        subtitle={deleteTarget ? `${deleteTarget.Username} (${deleteTarget.Nama})` : undefined}
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold text-base-content/60 bg-base-100 border border-base-300 hover:bg-base-200 transition-all">
              Batal
            </button>
            <motion.button
              onClick={handleDelete}
              disabled={deleting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-error-content bg-error shadow-lg shadow-error/20 transition-all disabled:opacity-50"
            >
              {deleting ? 'Menghapus...' : 'Yakin, Hapus'}
            </motion.button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-base-content">
            Anda yakin ingin menghapus pengguna{' '}
            <span className="font-semibold">{deleteTarget?.Username}</span> (
            {deleteTarget?.Nama}) secara permanen?
          </p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-error/10 border border-error/20 text-xs text-error">
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            <span>Tindakan ini tidak dapat dibatalkan dan menghapus baris dari spreadsheet.</span>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
