import { getSupabaseAdmin } from "./supabase";
import { getAllBranches } from "./branchService";

export interface ManagedShift {
  id: string;
  name: string;
  shortName: string;
  type: 'opening' | 'closing' | 'regular' | string;
  startHour: number;
  endHour: number;
  timeDisplay: string;
  tagline: string;
  branchId?: string | null;
  branchCode?: string | null;
  branchName?: string | null;
  isActive: boolean;
  isSystemDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateShiftInput {
  name: string;
  shortName?: string;
  type: 'opening' | 'closing' | 'regular' | string;
  startHour: number;
  endHour: number;
  timeDisplay?: string;
  tagline?: string;
  branchId?: string | null;
  isActive?: boolean;
}

export interface UpdateShiftInput {
  name?: string;
  shortName?: string;
  type?: 'opening' | 'closing' | 'regular' | string;
  startHour?: number;
  endHour?: number;
  timeDisplay?: string;
  tagline?: string;
  branchId?: string | null;
  isActive?: boolean;
}

export const DEFAULT_MANAGED_SHIFTS: ManagedShift[] = [
  {
    id: 'opening',
    name: 'Shift Pagi (Opening)',
    shortName: 'Opening',
    type: 'opening',
    startHour: 7,
    endHour: 15,
    timeDisplay: '07:00 - 15:00 WIB',
    tagline: 'Persiapan outlet, buka kasir, stock opname awal, dan SOP pagi.',
    branchId: null,
    branchCode: 'SEMUA',
    branchName: 'Semua Cabang',
    isActive: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'closing',
    name: 'Shift Sore (Closing)',
    shortName: 'Closing',
    type: 'closing',
    startHour: 15,
    endHour: 23,
    timeDisplay: '15:00 - 23:00 WIB',
    tagline: 'Operasional sore, closing kasir, stock opname akhir, dan serah terima.',
    branchId: null,
    branchCode: 'SEMUA',
    branchName: 'Semua Cabang',
    isActive: true,
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'regular',
    name: 'Shift Fleksibel (Regular)',
    shortName: 'Regular',
    type: 'regular',
    startHour: 9,
    endHour: 17,
    timeDisplay: '09:00 - 17:00 WIB',
    tagline: 'Jam operasional fleksibel untuk staf pendukung atau tim logistik.',
    branchId: null,
    branchCode: 'SEMUA',
    branchName: 'Semua Cabang',
    isActive: false,
    isSystemDefault: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

// In-memory fallback cache
let shiftStore: ManagedShift[] = [...DEFAULT_MANAGED_SHIFTS];

export function formatTimeDisplay(startHour: number, endHour: number): string {
  const pad = (n: number) => String(Math.max(0, Math.min(23, n))).padStart(2, '0');
  return `${pad(startHour)}:00 - ${pad(endHour)}:00 WIB`;
}

/**
 * Mendapatkan daftar seluruh shift operasional (Database atau Fallback Store).
 */
export async function getAllShifts(): Promise<ManagedShift[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shift_definitions")
      .select("*")
      .is("deleted_at", null)
      .order("start_hour", { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      const branches = await getAllBranches().catch(() => []);
      const branchMap = new Map(branches.map((b) => [b.id, b]));

      return data.map((row: any) => {
        const b = row.branch_id ? branchMap.get(row.branch_id) : undefined;
        return {
          id: String(row.id),
          name: String(row.name || "Shift"),
          shortName: String(row.short_name || row.type || "Shift"),
          type: String(row.type || "regular"),
          startHour: Number(row.start_hour ?? 7),
          endHour: Number(row.end_hour ?? 15),
          timeDisplay: row.time_display || formatTimeDisplay(row.start_hour ?? 7, row.end_hour ?? 15),
          tagline: String(row.tagline || ""),
          branchId: row.branch_id ?? null,
          branchCode: b ? b.code : "SEMUA",
          branchName: b ? b.name : "Semua Cabang",
          isActive: Boolean(row.is_active ?? true),
          isSystemDefault: Boolean(row.is_system_default ?? false),
          createdAt: String(row.created_at || new Date().toISOString()),
          updatedAt: row.updated_at ? String(row.updated_at) : undefined,
        };
      });
    }
  } catch (err) {
    // Database query skipped / table does not exist
  }

  // Fallback to in-memory store
  return [...shiftStore];
}

/**
 * Mendapatkan daftar shift yang aktif (opsional filter per cabang).
 */
export async function getActiveShifts(branchId?: string | null): Promise<ManagedShift[]> {
  const all = await getAllShifts();
  return all.filter((s) => {
    if (!s.isActive) return false;
    if (!s.branchId) return true; // berlaku universal
    if (branchId && s.branchId === branchId) return true;
    return false;
  });
}

/**
 * Mengambil detail shift berdasarkan ID.
 */
export async function getShiftById(id: string): Promise<ManagedShift | null> {
  const all = await getAllShifts();
  return all.find((s) => s.id === id) || null;
}

/**
 * Membuat definisi shift baru.
 */
export async function createShift(input: CreateShiftInput): Promise<ManagedShift> {
  const id = `shift_${input.type || 'custom'}_${Date.now()}`;
  const timeDisplay = input.timeDisplay || formatTimeDisplay(input.startHour, input.endHour);
  const shortName = input.shortName || (input.type === 'opening' ? 'Opening' : input.type === 'closing' ? 'Closing' : 'Regular');

  let branchCode = 'SEMUA';
  let branchName = 'Semua Cabang';
  if (input.branchId) {
    const branches = await getAllBranches().catch(() => []);
    const b = branches.find((item) => item.id === input.branchId);
    if (b) {
      branchCode = b.code;
      branchName = b.name;
    }
  }

  const newShift: ManagedShift = {
    id,
    name: input.name.trim(),
    shortName,
    type: input.type,
    startHour: input.startHour,
    endHour: input.endHour,
    timeDisplay,
    tagline: input.tagline || `Jam operasional ${timeDisplay}`,
    branchId: input.branchId || null,
    branchCode,
    branchName,
    isActive: input.isActive ?? true,
    isSystemDefault: false,
    createdAt: new Date().toISOString(),
  };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shift_definitions")
      .insert({
        id: newShift.id,
        name: newShift.name,
        short_name: newShift.shortName,
        type: newShift.type,
        start_hour: newShift.startHour,
        end_hour: newShift.endHour,
        time_display: newShift.timeDisplay,
        tagline: newShift.tagline,
        branch_id: newShift.branchId,
        is_active: newShift.isActive,
        is_system_default: false,
        created_at: newShift.createdAt,
      })
      .select()
      .single();

    if (!error && data) {
      shiftStore = [newShift, ...shiftStore];
      return newShift;
    }
  } catch (err) {
    // Database write fallback
  }

  shiftStore = [newShift, ...shiftStore];
  return newShift;
}

/**
 * Memperbarui shift yang ada.
 */
export async function updateShift(
  id: string,
  input: UpdateShiftInput
): Promise<ManagedShift | null> {
  const current = shiftStore.find((s) => s.id === id);
  if (!current) return null;

  const startHour = input.startHour !== undefined ? input.startHour : current.startHour;
  const endHour = input.endHour !== undefined ? input.endHour : current.endHour;
  const timeDisplay = input.timeDisplay || formatTimeDisplay(startHour, endHour);

  let branchCode = current.branchCode;
  let branchName = current.branchName;
  if (input.branchId !== undefined) {
    if (input.branchId) {
      const branches = await getAllBranches().catch(() => []);
      const b = branches.find((item) => item.id === input.branchId);
      branchCode = b ? b.code : "SEMUA";
      branchName = b ? b.name : "Semua Cabang";
    } else {
      branchCode = "SEMUA";
      branchName = "Semua Cabang";
    }
  }

  const updated: ManagedShift = {
    ...current,
    name: input.name !== undefined ? input.name.trim() : current.name,
    shortName: input.shortName !== undefined ? input.shortName.trim() : current.shortName,
    type: input.type !== undefined ? input.type : current.type,
    startHour,
    endHour,
    timeDisplay,
    tagline: input.tagline !== undefined ? input.tagline : current.tagline,
    branchId: input.branchId !== undefined ? input.branchId : current.branchId,
    branchCode,
    branchName,
    isActive: input.isActive !== undefined ? input.isActive : current.isActive,
    updatedAt: new Date().toISOString(),
  };

  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("shift_definitions")
      .update({
        name: updated.name,
        short_name: updated.shortName,
        type: updated.type,
        start_hour: updated.startHour,
        end_hour: updated.endHour,
        time_display: updated.timeDisplay,
        tagline: updated.tagline,
        branch_id: updated.branchId,
        is_active: updated.isActive,
        updated_at: updated.updatedAt,
      })
      .eq("id", id);
  } catch (err) {
    // Database write fallback
  }

  shiftStore = shiftStore.map((s) => (s.id === id ? updated : s));
  return updated;
}

/**
 * Menghapus shift non-sistem.
 */
export async function deleteShift(id: string): Promise<{ success: boolean; message?: string }> {
  const current = shiftStore.find((s) => s.id === id);
  if (!current) {
    return { success: false, message: "Shift tidak ditemukan" };
  }

  if (current.isSystemDefault) {
    return {
      success: false,
      message: "Shift bawaan sistem (Opening/Closing) tidak dapat dihapus, namun dapat dinonaktifkan.",
    };
  }

  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("shift_definitions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
  } catch (err) {
    // Database soft-delete fallback
  }

  shiftStore = shiftStore.filter((s) => s.id !== id);
  return { success: true };
}

/**
 * Rekomendasi shift aktif berdasarkan jam saat ini (WIB).
 */
export function getRecommendedShiftFromList(shifts?: ManagedShift[]): ManagedShift {
  const currentHour = new Date().getHours();
  const list = (shifts && shifts.length > 0) ? shifts.filter((s) => s.isActive) : DEFAULT_MANAGED_SHIFTS;
  const match = list.find((s) => currentHour >= s.startHour && currentHour < s.endHour);
  if (match) return match;
  return list[0] || DEFAULT_MANAGED_SHIFTS[0];
}
