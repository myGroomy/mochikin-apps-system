import { NextResponse } from 'next/server';
import { requireRole, withAuth } from '../../../../lib/api-auth';
import { appendAuditLogFor } from '../../../../lib/db/audit';
import { getSupabase } from '../../../../lib/supabase';
import { validateMasterPoints, logPointMasterChange, buildChangeRecord } from '@mochikin/shared/points';
import { createIncidentCategory, listIncidentCategories } from '../../../../lib/admin/template-service';
import { canDeleteConfig } from '../../../../lib/admin/lifecycle-policy';
import { listIncidentCategoryIdsInUse } from '../../../../lib/incidents';

export const GET = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const branchFilter = new URL(req.url).searchParams.get('branchId');
  if (branchFilter && !ctx.branchIds.includes(branchFilter)) {
    return NextResponse.json({ error: 'Akses ditolak untuk cabang ini.' }, { status: 403 });
  }
  const { data: branches, error } = await getSupabase()
    .from('branches')
    .select('id,code,name')
    .in('code', branchFilter ? [branchFilter] : ctx.branchIds)
    .eq('status', 'active')
    .is('deleted_at', null);
  if (error) return NextResponse.json({ error: `Supabase branch lookup failed: ${error.message}` }, { status: 500 });

  const lists = await Promise.all((branches ?? []).map(async (branch) => ({
    branch,
    categories: await listIncidentCategories(branch.id),
  })));
  const categories: Record<string, unknown>[] = lists.flatMap(({ branch, categories: rows }) =>
    rows.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sort_order,
      isActive: category.is_active,
      points: category.points,
      penaltyMinSeverity: category.penalty_min_severity,
      createdAt: category.created_at,
      branchId: branch.code,
      branchName: branch.name,
    }))
  );
  const usedCategoryIds = categories.some((category) => category['isActive'] === false)
    ? await listIncidentCategoryIdsInUse(ctx)
    : new Set<string>();
  for (const category of categories) {
    category['canDelete'] = canDeleteConfig('incident_category', {
      isActive: category['isActive'] === true,
      inUse: usedCategoryIds.has(String(category['id'])),
    });
  }
  categories.sort((a, b) => Number(a['sortOrder']) - Number(b['sortOrder']) || String(a['name']).localeCompare(String(b['name'])));
  return NextResponse.json({ categories });
});

export const POST = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;
  let body: {
    name?: string;
    sortOrder?: number;
    sort_order?: number;
    isActive?: boolean;
    is_active?: boolean;
    branchId?: string;
    points?: number;
    penaltyMinSeverity?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }
  const name = body.name?.trim() ?? '';
  if (name.length < 2) return NextResponse.json({ error: 'Nama kategori minimal 2 karakter' }, { status: 400 });
  const pointValidation = validateMasterPoints(body.points ?? 0);
  if (!pointValidation.valid) return NextResponse.json({ error: pointValidation.error }, { status: 400 });
  const threshold = body.penaltyMinSeverity ?? 'none';
  if (!['none', 'rendah', 'sedang', 'tinggi'].includes(threshold)) {
    return NextResponse.json({ error: 'threshold severity tidak valid' }, { status: 400 });
  }
  const branchCode = body.branchId ?? ctx.branchIds[0];
  if (!branchCode) return NextResponse.json({ error: 'branchId wajib diisi' }, { status: 400 });
  if (!ctx.branchIds.includes(branchCode)) return NextResponse.json({ error: 'Akses ditolak untuk cabang ini.' }, { status: 403 });

  const { data: branch, error: branchError } = await getSupabase()
    .from('branches')
    .select('id')
    .eq('code', branchCode)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();
  if (branchError) return NextResponse.json({ error: `Supabase branch lookup failed: ${branchError.message}` }, { status: 500 });
  if (!branch) return NextResponse.json({ error: 'Cabang tidak ditemukan' }, { status: 404 });

  let created;
  try {
    created = await createIncidentCategory(branch.id, {
      name,
      sort_order: Number(body.sortOrder ?? body.sort_order) || 0,
      is_active: body.isActive ?? body.is_active ?? true,
      points: pointValidation.value,
      penalty_min_severity: threshold,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ error: `Kategori incident '${name}' sudah ada.` }, { status: 409 });
    }
    throw error;
  }
  await appendAuditLogFor(branch.id, {
    actorId: ctx.user.id,
    action: 'create_incident_category',
    objectType: 'incident_category',
    objectId: created.id,
    branchId: branch.id,
    after: { name },
  });

  const record = buildChangeRecord({
    appId: 'mycheck',
    entityType: 'incident_category',
    entityRef: created.id,
    entityLabel: name,
    oldPoints: null,
    newPoints: pointValidation.value,
    action: 'set',
    reason: 'Pembuatan kategori insiden baru',
    changedBy: ctx.user.username || ctx.user.name || 'admin',
  });
  await logPointMasterChange(getSupabase(), record);
  return NextResponse.json({ message: 'Kategori incident berhasil dibuat', categoryId: created.id, branchId: branchCode });
});
