// lib/domain/so-validation.ts
// Validasi & normalisasi payload Stock Opname — port dari SOValidation.js (pure, tanpa GAS).

import {
  isValidSesiId,
  isValidItemId,
  isValidTanggal,
  isValidShift,
  MAX_ITEMS_PER_SESI,
} from './ids';
import { isNonNegativeNumber, normalizeCount } from './so';
import type { SOItem, ValidatedSOPayload, ValidationError } from './so';

interface SOItemRaw {
  itemId?: unknown;
  step1?: unknown;
  step2?: unknown;
  keterangan?: unknown;
  statusIsi?: unknown;
  tglRefill?: unknown;
  tglPakai?: unknown;
}

export function validateSOPayload(payload: unknown):
  | { ok: true; data: ValidatedSOPayload }
  | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errors: [{ code: 'PAYLOAD_INVALID', message: 'Payload kosong atau bukan object' }] };
  }

  const body = payload as Record<string, unknown>;

  const sesiId = typeof body.sesiId === 'string' ? body.sesiId.trim() : '';
  if (!isValidSesiId(sesiId)) {
    errors.push({ code: 'SESI_ID_INVALID', message: 'sesiId wajib berupa identifier unik sesi' });
  }

  const tanggalOperasional = typeof body.tanggalOperasional === 'string' ? body.tanggalOperasional.trim() : '';
  if (!isValidTanggal(tanggalOperasional)) {
    errors.push({ code: 'TANGGAL_INVALID', message: 'tanggalOperasional harus format YYYY-MM-DD' });
  }

  if (!isValidShift(body.shift)) {
    errors.push({ code: 'SHIFT_INVALID', message: 'shift harus "Opening" atau "Closing"' });
  }

  const petugas = typeof body.petugas === 'string' ? body.petugas.trim() : '';
  if (!petugas) {
    errors.push({ code: 'PETUGAS_REQUIRED', message: 'petugas wajib diisi' });
  }

  const items = Array.isArray(body.items) ? (body.items as SOItemRaw[]) : null;
  if (!items || items.length === 0) {
    errors.push({ code: 'ITEMS_REQUIRED', message: 'items wajib berisi minimal 1 item' });
  } else if (items.length > MAX_ITEMS_PER_SESI) {
    errors.push({ code: 'ITEMS_TOO_MANY', message: 'items melebihi batas maksimal ' + MAX_ITEMS_PER_SESI + ' item per sesi' });
  } else {
    const seen: Record<string, boolean> = {};
    items.forEach((item, i) => {
      const label = 'item #' + (i + 1);
      if (!item || typeof item !== 'object') {
        errors.push({ code: 'ITEM_INVALID', message: label + ' bukan object' });
        return;
      }
      const itemId = typeof item.itemId === 'string' ? item.itemId.trim() : '';
      if (!isValidItemId(itemId)) {
        errors.push({ code: 'ITEM_ID_INVALID', message: label + ' memiliki itemId tidak valid' });
      } else if (seen[itemId]) {
        errors.push({ code: 'ITEM_DUPLICATE', message: 'itemId duplikat dalam satu sesi: ' + itemId });
      } else {
        seen[itemId] = true;
      }
      if (!isNonNegativeNumber(item.step1)) {
        errors.push({ code: 'STEP1_INVALID', message: label + ' step1 harus angka >= 0' });
      }
      if (!isNonNegativeNumber(item.step2)) {
        errors.push({ code: 'STEP2_INVALID', message: label + ' step2 harus angka >= 0' });
      }
      if (item.keterangan !== undefined && item.keterangan !== null && typeof item.keterangan !== 'string') {
        errors.push({ code: 'KETERANGAN_INVALID', message: label + ' keterangan harus string' });
      }
      if (item.statusIsi !== undefined && item.statusIsi !== null && item.statusIsi !== '' &&
          !['Penuh', 'Dipakai', 'Habis'].includes(String(item.statusIsi))) {
        errors.push({ code: 'STATUS_ISI_INVALID', message: label + ' statusIsi harus "Penuh", "Dipakai", atau "Habis"' });
      }
      if (item.tglRefill !== undefined && item.tglRefill !== null && item.tglRefill !== '' &&
          !isValidTanggal(item.tglRefill)) {
        errors.push({ code: 'TGL_REFILL_INVALID', message: label + ' tglRefill harus format YYYY-MM-DD' });
      }
      if (item.tglPakai !== undefined && item.tglPakai !== null && item.tglPakai !== '' &&
          !isValidTanggal(item.tglPakai)) {
        errors.push({ code: 'TGL_PAKAI_INVALID', message: label + ' tglPakai harus format YYYY-MM-DD' });
      }
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  const normalizedItems: SOItem[] = (items as SOItemRaw[]).map((item) => {
    const step1 = normalizeCount(item.step1);
    const step2 = normalizeCount(item.step2);
    const statusIsi = (['Penuh', 'Dipakai', 'Habis'].includes(String(item.statusIsi))) ? item.statusIsi as 'Penuh' | 'Dipakai' | 'Habis' : '';
    const tglRefill = typeof item.tglRefill === 'string' ? item.tglRefill : '';
    const tglPakai = typeof item.tglPakai === 'string' ? item.tglPakai : '';
    return {
      itemId: String(item.itemId).trim(),
      step1,
      step2,
      total: step1 + step2,
      keterangan: typeof item.keterangan === 'string' ? item.keterangan : '',
      statusIsi,
      tglRefill,
      tglPakai,
    };
  });

  return {
    ok: true,
    data: {
      sesiId: sesiId.toUpperCase(),
      tanggalOperasional,
      shift: String(body.shift),
      petugas,
      items: normalizedItems,
      note: typeof body.note === 'string' ? body.note.trim() : '',
    },
  };
}
