// lib/domain/draft-service.ts
// Service untuk mengelola SO Draft berbasis per User (username) pada Sheet SO_Draft
// Menggunakan format Opsi A: 1 JSON Stringified Object per username

import { readSheetData, sheetToObjects, ensureSheet, writeRow, deleteRow, appendRows } from '@/lib/google/sheets';
import { getSheetsClient } from '@/lib/google/client';

const DRAFT_HEADERS = ['Username', 'Cabang_ID', 'Shift', 'Draft_JSON', 'Updated_At'];

export interface UserDraftRecord {
  Username: string;
  Cabang_ID: string;
  Shift: string;
  Draft_JSON: string;
  Updated_At: number;
}

function getRegistryId(): string {
  const id = process.env.REGISTRY_SPREADSHEET_ID;
  if (!id) {
    throw new Error('REGISTRY_SPREADSHEET_ID belum dikonfigurasi');
  }
  return id;
}

/**
  * Pastikan sheet SO_Draft tersedia di registry spreadsheet.
  */
async function ensureDraftSheet(): Promise<string> {
  const registryId = getRegistryId();
  await ensureSheet(registryId, 'SO_Draft', DRAFT_HEADERS);
  return registryId;
}

/**
  * Ambil draft tersimpan untuk username tertentu.
  */
export async function getDraftByUser(username: string): Promise<UserDraftRecord | null> {
  try {
    const registryId = await ensureDraftSheet();
    const { headers, rows } = await readSheetData(registryId, 'SO_Draft');
    const list = sheetToObjects(headers, rows);
    
    const target = list.find((r) => String(r['Username'] || '').trim().toLowerCase() === username.trim().toLowerCase());
    if (!target) return null;

    return {
      Username: String(target['Username'] || ''),
      Cabang_ID: String(target['Cabang_ID'] || ''),
      Shift: String(target['Shift'] || ''),
      Draft_JSON: String(target['Draft_JSON'] || ''),
      Updated_At: Number(target['Updated_At']) || 0,
    };
  } catch (err) {
    console.error('Failed to getDraftByUser:', err);
    return null;
  }
}

/**
  * Simpan atau perbarui draft untuk username tertentu.
  */
export async function saveDraftByUser(
  username: string,
  cabangId: string,
  shift: string,
  draftJson: string
): Promise<boolean> {
  try {
    const registryId = await ensureDraftSheet();
    const { headers, rows } = await readSheetData(registryId, 'SO_Draft');

    const cleanUsername = username.trim();
    let foundIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      const rowUsername = String(rows[i][0] || '').trim();
      if (rowUsername.toLowerCase() === cleanUsername.toLowerCase()) {
        foundIndex = i;
        break;
      }
    }

    const now = Date.now();
    const newRow = [cleanUsername, cabangId, shift, draftJson, now];

    if (foundIndex >= 0) {
      // Baris fisik = index + 2 (karena header di A1)
      const rowNum = foundIndex + 2;
      await writeRow(registryId, `SO_Draft!A${rowNum}:E${rowNum}`, newRow);
    } else {
      await appendRows(registryId, 'SO_Draft', [newRow]);
    }
    return true;
  } catch (err) {
    console.error('Failed to saveDraftByUser:', err);
    return false;
  }
}

/**
  * Hapus draft milik username tertentu (saat submit sukses atau dibuang).
  */
export async function deleteDraftByUser(username: string): Promise<boolean> {
  try {
    const registryId = await ensureDraftSheet();
    const { rows } = await readSheetData(registryId, 'SO_Draft');
    const cleanUsername = username.trim().toLowerCase();

    for (let i = 0; i < rows.length; i++) {
      const rowUsername = String(rows[i][0] || '').trim().toLowerCase();
      if (rowUsername === cleanUsername) {
        const rowNum = i + 2;
        await deleteRow(registryId, 'SO_Draft', rowNum);
        return true;
      }
    }
    return true;
  } catch (err) {
    console.error('Failed to deleteDraftByUser:', err);
    return false;
  }
}
