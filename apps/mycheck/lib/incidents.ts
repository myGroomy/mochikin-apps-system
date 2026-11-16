import type { AuthContext } from './api-auth';
import { getSupabase } from './supabase';

export interface LocatedIncident {
  spreadsheetId: string;
  branchId: string;
  incident: Record<string, unknown>;
}

export async function findIncidentAcrossBranches(
  ctx: AuthContext,
  incidentId: string
): Promise<LocatedIncident | null> {
  const supabase = getSupabase();
  const { data: branches, error: branchesError } = await supabase
    .from('branches')
    .select('id,code')
    .in('code', ctx.branchIds)
    .eq('status', 'active')
    .is('deleted_at', null);
  if (branchesError) throw new Error(`Supabase authorized branch lookup failed: ${branchesError.message}`);
  if (!branches?.length) return null;

  const { data, error } = await supabase
    .from('mycheck_incidents')
    .select('*')
    .eq('id', incidentId)
    .in('branch_id', branches.map((branch) => branch.id))
    .maybeSingle();
  if (error) throw new Error(`Supabase incident lookup failed: ${error.message}`);
  if (!data) return null;
  const branch = branches.find((item) => item.id === data.branch_id);
  if (!branch) return null;

  return {
    spreadsheetId: branch.id,
    branchId: branch.code,
    incident: {
      ...data,
      category_id: data.category_id ?? '',
      occurred_at: data.occurred_at ?? data.reported_at,
      reported_by: data.reported_by_id,
      status: data.status === 'resolved' ? 'selesai' : data.status,
      severity: data.severity === 'low'
        ? 'rendah'
        : data.severity === 'medium'
          ? 'sedang'
          : data.severity === 'high'
            ? 'tinggi'
            : data.severity,
      outside_shift: data.outside_shift,
    },
  };
}

/** Cabang aktif milik ctx — dipakai dua helper kategori di bawah. */
async function authorizedBranchIds(ctx: AuthContext): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('branches')
    .select('id')
    .in('code', ctx.branchIds)
    .eq('status', 'active')
    .is('deleted_at', null);
  if (error) throw new Error(`Supabase authorized branch lookup failed: ${error.message}`);
  return (data ?? []).map((branch) => branch.id);
}

/** Kategori incident aktif lintas cabang admin; dedupe per nama (lintas cabang). */
export async function listActiveCategoriesAcrossBranches(
  ctx: AuthContext
): Promise<{ id: string; name: string; sortOrder: number; points: number; penaltyMinSeverity: string }[]> {
  const branchIds = await authorizedBranchIds(ctx);
  if (!branchIds.length) return [];

  const { data, error } = await getSupabase()
    .from('mycheck_incident_categories')
    .select('id, name, sort_order, points, penalty_min_severity')
    .in('branch_id', branchIds)
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  if (error) throw new Error(`Supabase incident category list failed: ${error.message}`);

  const seen = new Map<string, { id: string; name: string; sortOrder: number; points: number; penaltyMinSeverity: string }>();
  for (const row of data ?? []) {
    const name = row.name as string;
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.set(name.toLowerCase(), {
      id: row.id,
      name,
      sortOrder: row.sort_order ?? 0,
      points: Math.trunc(row.points ?? 0),
      penaltyMinSeverity: row.penalty_min_severity || 'none',
    });
  }
  return [...seen.values()];
}

/** Id kategori yang masih dirujuk incident di cabang admin (untuk guard hapus). */
export async function listIncidentCategoryIdsInUse(ctx: AuthContext): Promise<Set<string>> {
  const branchIds = await authorizedBranchIds(ctx);
  const used = new Set<string>();
  if (!branchIds.length) return used;

  // Insiden lama hanya menyimpan nama kategori (kolom `category`), jadi
  // petakan nama→id per cabang agar id hasil refactor ikut terdeteksi.
  const { data: categories, error: categoriesError } = await getSupabase()
    .from('mycheck_incident_categories')
    .select('id, branch_id, name')
    .in('branch_id', branchIds);
  if (categoriesError) throw new Error(`Supabase incident category list failed: ${categoriesError.message}`);
  const idByName = new Map(
    (categories ?? []).map((category) => [`${category.branch_id}|${String(category.name).toLowerCase()}`, category.id])
  );

  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await getSupabase()
      .from('mycheck_incidents')
      .select('branch_id, category_id, category')
      .in('branch_id', branchIds)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Supabase incident use lookup failed: ${error.message}`);
    const rows = data ?? [];
    for (const row of rows) {
      if (row.category_id) used.add(row.category_id);
      else if (row.category) {
        const id = idByName.get(`${row.branch_id}|${String(row.category).toLowerCase()}`);
        if (id) used.add(id);
      }
    }
    if (!rows.length) break; // berhenti saat halaman kosong (aman dari cap server)
  }
  return used;
}

export async function isCategoryInUse(branchId: string, categoryId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: category, error: categoryError } = await supabase
    .from('mycheck_incident_categories')
    .select('name')
    .eq('branch_id', branchId)
    .eq('id', categoryId)
    .maybeSingle();
  if (categoryError) throw new Error(`Supabase incident category lookup failed: ${categoryError.message}`);
  if (!category) return false;

  const { data, error } = await supabase
    .from('mycheck_incidents')
    .select('id')
    .eq('branch_id', branchId)
    .eq('category', category.name)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Supabase incident use lookup failed: ${error.message}`);
  return Boolean(data);
}
