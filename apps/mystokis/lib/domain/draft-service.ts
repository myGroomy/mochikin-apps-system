// lib/domain/draft-service.ts
// In-memory / server-side draft storage pengganti Google Sheets Draft_SO

export interface DraftRow {
  Username: string;
  Cabang_ID: string;
  Shift: string;
  Draft_JSON: string;
  Updated_At: string;
}

const memoryDrafts = new Map<string, DraftRow>();

export async function getDraftByUser(username: string): Promise<DraftRow | null> {
  const key = String(username || '').toLowerCase().trim();
  return memoryDrafts.get(key) || null;
}

export async function saveDraftByUser(
  username: string,
  cabangId: string,
  shift: string,
  draftJson: string
): Promise<boolean> {
  const key = String(username || '').toLowerCase().trim();
  memoryDrafts.set(key, {
    Username: username,
    Cabang_ID: cabangId,
    Shift: shift,
    Draft_JSON: draftJson,
    Updated_At: new Date().toISOString(),
  });
  return true;
}

export async function deleteDraftByUser(username: string): Promise<boolean> {
  const key = String(username || '').toLowerCase().trim();
  memoryDrafts.delete(key);
  return true;
}
