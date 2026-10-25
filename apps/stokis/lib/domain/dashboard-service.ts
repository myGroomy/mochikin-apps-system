// lib/domain/dashboard-service.ts
// Operasi dashboard — port dari Dashboard.js.

import { resolveCabang } from '@/lib/google/registry';
import { readSheetData, sheetToObjects } from '@/lib/google/sheets';
import { calculateStatus } from './so';
import { formatDate } from './ids';

async function readAllRows(spreadsheetId: string, sheetName: string): Promise<Record<string, unknown>[]> {
  const { headers, rows } = await readSheetData(spreadsheetId, sheetName);
  return sheetToObjects(headers, rows);
}

function fmtDate(v: unknown): string {
  return formatDate(String(v ?? ''));
}

export async function getDashboardHarian(cabangId: string, tanggal: string) {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const masterRows = await readAllRows(spreadsheetId, 'Master_Item');
  const soRows = (await readAllRows(spreadsheetId, 'SO_Transaksi')).filter(
    (r) => fmtDate(r['Tanggal_Operasional']) === tanggal
  );

  const masterMap: Record<string, Record<string, unknown>> = {};
  masterRows.forEach((m) => { masterMap[String(m['Item_ID'])] = m; });

  const detail = soRows.map((r) => {
    const master = masterMap[String(r['Item_ID'])] || {};
    const step1 = Number(r['Step1']) || 0;
    const step2 = Number(r['Step2']) || 0;
    // Total bisa kosong di sheet → fallback hitung dari Step1+Step2.
    const total = Number(r['Total']) || (step1 + step2);
    return { ...r, Total: total, Status: calculateStatus(total, Number(master['Threshold']) || 0) };
  });

  return {
    tanggal,
    totalTransaksi: soRows.length,
    kritis: detail.filter((r) => r.Status === 'Kritis').length,
    hampirHabis: detail.filter((r) => r.Status === 'Hampir Habis').length,
    aman: detail.filter((r) => r.Status === 'Aman').length,
    detail,
  };
}

export async function getDashboardMingguan(
  cabangId: string,
  dari: string,
  sampai: string
) {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const masterRows = await readAllRows(spreadsheetId, 'Master_Item');
  const masterMap: Record<string, Record<string, unknown>> = {};
  masterRows.forEach((m) => { masterMap[String(m['Item_ID'])] = m; });

  const soRows = (await readAllRows(spreadsheetId, 'SO_Transaksi')).filter((r) => {
    const t = fmtDate(r['Tanggal_Operasional']);
    return (!dari || t >= dari) && (!sampai || t <= sampai);
  });
  const laporanRows = (await readAllRows(spreadsheetId, 'Laporan_SO')).filter((r) => {
    const t = fmtDate(r['Tanggal_Operasional']);
    return (!dari || t >= dari) && (!sampai || t <= sampai);
  });

  const trenPerHari: Record<string, { total: number; kritis: number; hampirHabis: number; aman: number }> = {};
  let kritis = 0;
  let hampirHabis = 0;
  let aman = 0;
  const byItem = new Map<string, { nama: string; first: number; last: number; status: string }>();
  soRows.forEach((r) => {
    const t = fmtDate(r['Tanggal_Operasional']);
    if (!trenPerHari[t]) {
      trenPerHari[t] = { total: 0, kritis: 0, hampirHabis: 0, aman: 0 };
    }
    const master = masterMap[String(r['Item_ID'])] || {};
    const step1 = Number(r['Step1']) || 0;
    const step2 = Number(r['Step2']) || 0;
    const total = Number(r['Total']) || (step1 + step2);
    const status = calculateStatus(total, Number(master['Threshold']) || 0);
    trenPerHari[t].total += 1;
    if (status === 'Kritis') trenPerHari[t].kritis += 1;
    if (status === 'Kritis') kritis += 1;
    else if (status === 'Hampir Habis') { trenPerHari[t].hampirHabis += 1; hampirHabis += 1; }
    else { trenPerHari[t].aman += 1; aman += 1; }
    const itemId = String(r['Item_ID'] || '');
    const previous = byItem.get(itemId);
    byItem.set(itemId, {
      nama: String(master['Nama_Barang'] || r['Nama_Barang'] || itemId),
      first: previous?.first ?? total,
      last: total,
      status,
    });
  });
  const perubahanTerbesar = [...byItem.entries()]
    .map(([itemId, item]) => ({
      itemId,
      nama: item.nama,
      perubahan: item.last - item.first,
      status: item.status,
    }))
    .filter((item) => item.perubahan !== 0)
    .sort((a, b) => Math.abs(b.perubahan) - Math.abs(a.perubahan))
    .slice(0, 10);
  type UsageAggregate = {
    nama: string;
    area: string;
    satuan: string;
    total: number;
    tercatat: number;
    anomali: number;
    perubahan: number[];
  };
  const penggunaanMap = new Map<string, UsageAggregate>();
  masterRows.forEach((master) => {
    const itemId = String(master['Item_ID'] || '');
    if (!itemId) return;
    penggunaanMap.set(itemId, {
      nama: String(master['Nama_Barang'] || itemId),
      area: String(master['Area'] || '-'),
      satuan: String(master['Satuan'] || ''),
      total: 0,
      tercatat: 0,
      anomali: 0,
      perubahan: [],
    });
  });
  laporanRows.forEach((row) => {
    const itemId = String(row['Item_ID'] || '');
    if (!itemId) return;
    const usageValue = Number(row['Penggunaan']);
    if (!Number.isFinite(usageValue)) return;
    const existing = penggunaanMap.get(itemId) || {
      nama: String(row['Nama_Barang'] || itemId),
      area: String(row['Area'] || '-'),
      satuan: String(row['Satuan'] || ''),
      total: 0,
      tercatat: 0,
      anomali: 0,
      perubahan: [],
    };
    existing.perubahan.push(usageValue);
    penggunaanMap.set(itemId, existing);
  });
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const analisisPemakaian = [...penggunaanMap.entries()]
    .map(([itemId, item]) => {
      const typicalChange = median(item.perubahan.map((value) => Math.abs(value)));
      const maxReasonableChange = Math.max(typicalChange * 10, 1000);
      const validChanges = item.perubahan.filter((value) => Math.abs(value) <= maxReasonableChange);
      item.anomali = item.perubahan.length - validChanges.length;
      item.total = validChanges.reduce((sum, value) => sum + value, 0);
      item.tercatat = validChanges.length;
      return {
        itemId,
        nama: item.nama,
        area: item.area,
        satuan: item.satuan,
        total: item.total,
        tercatat: item.tercatat,
        anomali: item.anomali,
        rataRata: item.tercatat ? item.total / item.tercatat : 0,
        status: item.perubahan.length === 0 ? 'Belum ada data' : item.anomali && !item.tercatat ? 'Perlu verifikasi' : item.total < 0 ? 'Berkurang' : item.total > 0 ? 'Bertambah' : 'Tetap',
      };
    })
    .sort((a, b) => {
      if (a.tercatat === 0 && b.tercatat > 0) return 1;
      if (a.tercatat > 0 && b.tercatat === 0) return -1;
      return Math.abs(b.total) - Math.abs(a.total);
    });
  return {
    dari,
    sampai,
    totalTransaksi: soRows.length,
    totalItem: byItem.size,
    kritis,
    hampirHabis,
    aman,
    perubahanTerbesar,
    analisisPemakaian,
    trenPerHari,
  };
}
