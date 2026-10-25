// lib/appsscript.ts
// DISPATCHER LOKAL — pengganti panggilan Google Apps Script.
//
// Sebelumnya modul ini melakukan fetch ke endpoint GAS. Kini seluruh logika
// bisnis dijalankan langsung sebagai TypeScript di server Vercel memakai
// Google Sheets API + Google Drive API (Service Account). Dengan begini:
//   - Tidak ada deployment GAS / consent / 404 / clasp.
//   - Semua route yang memanggil callAppsScript tetap bekerja tanpa perubahan.
//
// Kontrak dipelihara identik dengan GAS: { success, data?, error? }.
// Untuk upload file ke Drive, kita panggil GAS asli karena service account
// tidak punya storage quota.

import {
  getCabangList as cabangList,
  createCabang as createCabangSvc,
  updateCabang as updateCabangSvc,
  setCabangActive as setCabangActiveSvc,
} from '@/lib/domain/cabang-service';
import {
  getMasterItems,
  addItem,
  updateThreshold,
  setItemActive,
  updateTipeInput,
  updateKeterangan,
  batchUpdate,
} from '@/lib/domain/master-item-service';
import {
  getPetugasList,
  addPetugas,
  updatePetugas,
  setPetugasActive,
} from '@/lib/domain/petugas-service';
import {
  login as loginSvc,
  getUsers,
  addUser,
  updateUser,
  setUserActive,
  deleteUser,
} from '@/lib/domain/users-service';
import {
  submitSO,
  getPreviousSO,
} from '@/lib/domain/so-service';
import {
  saveLaporan as saveLaporanSvc,
  searchLaporan,
  getShareWhatsAppLink,
  updateStatusKirimWA,
} from '@/lib/domain/laporan-service';
import {
  getDashboardHarian,
  getDashboardMingguan,
} from '@/lib/domain/dashboard-service';
import { toApiError, isApiError } from '@/lib/domain/errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

function fail(err: unknown): ApiResponse<never> {
  const apiErr = isApiError(err) ? err : toApiError(err);
  return { success: false, error: { code: apiErr.code, message: apiErr.message } };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callAppsScript<T = any>(
  action: string,
  cabangId?: string,
  payload?: Record<string, unknown>
): Promise<ApiResponse<T>> {
  const p = payload || {};
  try {
    switch (action) {
      // Cabang
      case 'getCabangList':        return ok<T>(await cabangList() as T);
      case 'createCabang':         return ok<T>(await createCabangSvc(p as never) as T);
      case 'updateCabang':         return ok<T>(await updateCabangSvc(cabangId!, p as never) as T);
      case 'setCabangActive':      return ok<T>(await setCabangActiveSvc(cabangId!, p.aktif) as T);
      // Master Item
      case 'getMasterItems':       return ok<T>(await getMasterItems(cabangId!) as T);
      case 'addItem':              return ok<T>(await addItem(cabangId!, p as never) as T);
      case 'updateThreshold':      return ok<T>(await updateThreshold(cabangId!, String(p.itemId), p.threshold) as T);
      case 'setItemActive':        return ok<T>(await setItemActive(cabangId!, String(p.itemId), p.aktif) as T);
      case 'updateTipeInput':      return ok<T>(await updateTipeInput(cabangId!, String(p.itemId), p.tipeInput) as T);
      case 'updateKeterangan':     return ok<T>(await updateKeterangan(cabangId!, String(p.itemId), p.keterangan) as T);
      case 'batchUpdate':          return ok<T>(await batchUpdate(cabangId!, p.updates as Parameters<typeof batchUpdate>[1]) as T);
      // Petugas
      case 'getPetugasList':       return ok<T>(await getPetugasList(cabangId!) as T);
      case 'addPetugas':           return ok<T>(await addPetugas(cabangId!, p as never) as T);
      case 'updatePetugas':        return ok<T>(await updatePetugas(cabangId!, String(p.petugasId), p as never) as T);
      case 'setPetugasActive':     return ok<T>(await setPetugasActive(cabangId!, String(p.petugasId), p.aktif) as T);
      // Users (autentikasi)
      case 'login':                return ok<T>(await loginSvc(p as never) as T);
      case 'getUsers':             return ok<T>(await getUsers(cabangId || '') as T);
      case 'addUser':              return ok<T>(await addUser(p as never) as T);
      case 'updateUser':           return ok<T>(await updateUser(String(p.userId), p as never) as T);
      case 'setUserActive':        return ok<T>(await setUserActive(String(p.userId), p.aktif) as T);
      case 'deleteUser':           return ok<T>(await deleteUser(String(p.userId)) as T);
      // SO
      case 'submitSO':             return ok<T>(await submitSO(cabangId!, p) as T);
      case 'getPreviousSO':        return ok<T>(await getPreviousSO(cabangId!) as T);
      // Laporan
      case 'saveLaporan':          return ok<T>(await saveLaporanSvc(cabangId!, p as never) as T);
      case 'searchLaporan':        return ok<T>(await searchLaporan(cabangId!, p as never) as T);
      case 'getShareWhatsAppLink': return ok<T>(await getShareWhatsAppLink(cabangId!, String(p.laporanId)) as T);
      case 'updateStatusKirimWA':  return ok<T>(await updateStatusKirimWA(cabangId!, String(p.laporanId)) as T);
      // Dashboard
      case 'getDashboardHarian':   return ok<T>(await getDashboardHarian(cabangId!, String(p.tanggal || '')) as T);
      case 'getDashboardMingguan': return ok<T>(await getDashboardMingguan(cabangId!, String(p.dari || ''), String(p.sampai || '')) as T);

      default:
        return { success: false, error: { code: 'invalid_action', message: 'Action tidak dikenal: ' + action } };
    }
  } catch (err) {
    return fail(err) as ApiResponse<T>;
  }
}

/**
 * Panggil Google Apps Script yang sudah di-deploy untuk upload file ke Drive.
 * Karena service account tidak punya storage quota, upload dilakukan lewat
 * GAS yang berjalan di akun Google user dengan akses Drive penuh.
 */
export async function uploadFileToGASDrive(params: {
  folderId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ fileId: string; webViewLink: string; downloadUrl: string }> {
  const gasUrl = process.env.APPS_SCRIPT_URL;
  const apiKey = process.env.STOKIS_API_KEY;
  if (!gasUrl) throw new Error('APPS_SCRIPT_URL belum dikonfigurasi');
  if (!apiKey) throw new Error('STOKIS_API_KEY belum dikonfigurasi');

  const fileBase64 = params.buffer.toString('base64');

  const res = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      action: 'uploadFileToDrive',
      cabangId: '',
      'x-api-key': apiKey,
      payload: {
        folderId: params.folderId,
        fileName: params.fileName,
        mimeType: params.mimeType,
        fileBase64,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`GAS HTTP error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json() as ApiResponse<{ fileId: string; webViewLink: string; downloadUrl: string }>;
  if (!json.success || !json.data) {
    throw new Error(json.error?.message || 'GAS upload gagal');
  }

  return json.data;
}
