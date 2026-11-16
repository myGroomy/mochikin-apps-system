import { NextResponse } from 'next/server';
import { requireBranchAccess, withAuth } from '../../../lib/api-auth';
import { listGlobalSettings } from '../../../lib/db/settings';
import { appendAuditLogFor } from '../../../lib/db/audit';
import { getServerTime } from '../../../lib/db/server-time';
import { resolveInstance } from '../../../lib/instance-resolver';
import { listActiveCategoriesAcrossBranches } from '../../../lib/incidents';
import { getSupabase } from '../../../lib/supabase';

interface IncidentBody {
  shiftInstanceId?: string;
  categoryId?: string;
  title?: string;
  description?: string;
  occurredAt?: string;
  severity?: string;
  outsideShift?: boolean;
  branchId?: string;
  photoUrls?: string[];
  photo_urls?: string[];
}

const SEVERITIES: Record<string, string> = {
  rendah: 'low',
  sedang: 'medium',
  tinggi: 'high',
  kritis: 'critical',
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
};

async function linkWindowHours(): Promise<number> {
  const settings = await listGlobalSettings();
  const raw = Number(settings.find((setting) => setting.key === 'incident_link_window_hours')?.value ?? 4);
  return Number.isFinite(raw) && raw > 0 ? raw : 4;
}

export const GET = withAuth(async (_req, ctx) => {
  const { data: branches, error: branchesError } = await getSupabase()
    .from('branches')
    .select('id,name,code')
    .in('code', ctx.branchIds)
    .eq('status', 'active')
    .is('deleted_at', null);
  if (branchesError) {
    return NextResponse.json({ error: `Supabase branch lookup failed: ${branchesError.message}` }, { status: 500 });
  }
  const branchIds = (branches ?? []).map((branch) => branch.id);
  const { data: rows, error } = branchIds.length
    ? await getSupabase()
      .from('mycheck_incidents')
      .select('*')
      .in('branch_id', branchIds)
      .eq('is_test', false)
      .order('reported_at', { ascending: false })
      .limit(100)
    : { data: [], error: null };
  if (error) return NextResponse.json({ error: `Supabase incident list failed: ${error.message}` }, { status: 500 });

  const reporterIds = [...new Set((rows ?? []).map((row) => row.reported_by_id))];
  const [{ data: people, error: peopleError }, categories] = await Promise.all([
    reporterIds.length
      ? getSupabase().from('people').select('id,name,username').in('id', reporterIds)
      : Promise.resolve({ data: [], error: null }),
    listActiveCategoriesAcrossBranches(ctx),
  ]);
  if (peopleError) return NextResponse.json({ error: `Supabase reporter lookup failed: ${peopleError.message}` }, { status: 500 });

  const branchById = new Map((branches ?? []).map((branch) => [branch.id, branch]));
  const nameById = new Map((people ?? []).map((person) => [person.id, person.name || person.username || person.id]));
  const categoryById = new Map(categories.map((category) => [category.id, category.name]));
  const response = NextResponse.json({
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
      points: category.points,
      penaltyMinSeverity: category.penaltyMinSeverity,
    })),
    branches: (branches ?? []).map(({ id, name, code }) => ({ id, name, code })),
    incidents: (rows ?? []).map((row) => {
      const branch = branchById.get(row.branch_id);
      return {
        id: row.id,
        branchId: row.branch_id,
        branchName: branch?.name ?? row.branch_id,
        shiftInstanceId: row.shift_instance_id,
        categoryId: row.category_id ?? row.category,
        categoryName: row.category_id ? categoryById.get(row.category_id) ?? row.category : row.category,
        description: row.description,
        title: row.title,
        occurredAt: row.occurred_at,
        reportedAt: row.reported_at,
        reportedByName: nameById.get(row.reported_by_id) ?? row.reported_by_id,
        status: row.status === 'resolved' ? 'selesai' : row.status,
        severity: row.severity === 'low' ? 'rendah' : row.severity === 'medium' ? 'sedang' : row.severity === 'high' ? 'tinggi' : 'kritis',
        outsideShift: row.outside_shift,
      };
    }),
  });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Vary', 'Cookie');
  return response;
});

export const POST = withAuth(async (req, ctx) => {
  let body: IncidentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }
  const categoryId = body.categoryId?.trim();
  const description = body.description?.trim();
  if (!categoryId || !description) {
    return NextResponse.json({ error: 'categoryId dan description wajib diisi' }, { status: 400 });
  }
  if (description.length > 3000) return NextResponse.json({ error: 'Deskripsi maksimal 3000 karakter.' }, { status: 400 });
  if (body.severity && !SEVERITIES[body.severity]) return NextResponse.json({ error: 'severity tidak valid.' }, { status: 400 });
  const photoUrls = body.photoUrls ?? body.photo_urls ?? [];
  if (!Array.isArray(photoUrls) || photoUrls.some((url) => typeof url !== 'string')) {
    return NextResponse.json({ error: 'photoUrls tidak valid.' }, { status: 400 });
  }

  const now = getServerTime();
  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : now;
  if (Number.isNaN(occurredAt.getTime())) return NextResponse.json({ error: 'occurredAt tidak valid.' }, { status: 400 });
  let branchCode: string | null = null;
  const shiftInstanceId = body.shiftInstanceId?.trim() || null;
  if (shiftInstanceId) {
    const resolved = await resolveInstance(ctx, shiftInstanceId);
    if (!resolved) return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });
    const accessError = requireBranchAccess(ctx, resolved.branchId);
    if (accessError) return accessError;
    const status = String(resolved.instance.status);
    const closedAt = String(resolved.instance.closed_at ?? '');
    const windowHours = await linkWindowHours();
    const isRecentClosed = (status === 'closed' || status === 'force_closed') && closedAt
      ? now.getTime() - new Date(closedAt).getTime() <= windowHours * 60 * 60 * 1000
      : false;
    if (status !== 'open' && !isRecentClosed) {
      return NextResponse.json({ error: `Incident hanya dapat dibuat untuk shift berjalan atau ditutup maksimal ${windowHours} jam lalu.` }, { status: 400 });
    }
    branchCode = resolved.branchId;
  } else {
    const requested = body.branchId?.trim() || null;
    if (requested) {
      const accessError = requireBranchAccess(ctx, requested);
      if (accessError) return accessError;
      branchCode = requested;
    } else if (ctx.user.role === 'admin') {
      return NextResponse.json({ error: 'Pilih cabang kerja terlebih dahulu.' }, { status: 400 });
    } else {
      branchCode = ctx.branchIds[0] ?? null;
    }
  }
  if (!branchCode) return NextResponse.json({ error: 'Cabang incident tidak ditentukan' }, { status: 400 });

  const { data: branch, error: branchError } = await getSupabase()
    .from('branches')
    .select('id')
    .eq('code', branchCode)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();
  if (branchError) return NextResponse.json({ error: `Supabase branch lookup failed: ${branchError.message}` }, { status: 500 });
  if (!branch) return NextResponse.json({ error: 'Cabang incident tidak ditemukan' }, { status: 404 });
  const branchUuid = branch.id;

  const { data: category, error: categoryError } = await getSupabase()
    .from('mycheck_incident_categories')
    .select('id,name,points,penalty_min_severity')
    .eq('id', categoryId)
    .eq('branch_id', branchUuid)
    .eq('is_active', true)
    .maybeSingle();
  if (categoryError) return NextResponse.json({ error: `Supabase incident category lookup failed: ${categoryError.message}` }, { status: 500 });
  if (!category) return NextResponse.json({ error: 'Kategori incident tidak valid' }, { status: 404 });
  const userId = ctx.user.personId;
  if (!userId) return NextResponse.json({ error: 'Identitas petugas tidak tersedia.' }, { status: 401 });

  const reportedAt = now.toISOString();
  const outsideShift = shiftInstanceId ? false : Boolean(body.outsideShift ?? true);
  const { data: incident, error: insertError } = await getSupabase()
    .from('mycheck_incidents')
    .insert({
      branch_id: branchUuid,
      shift_instance_id: shiftInstanceId,
      category_id: category.id,
      category: category.name,
      title: body.title?.trim() || category.name,
      description,
      severity: SEVERITIES[body.severity ?? ''] ?? 'low',
      status: 'open',
      photo_urls: photoUrls,
      reported_by_id: userId,
      reported_at: reportedAt,
      occurred_at: occurredAt.toISOString(),
      outside_shift: outsideShift,
      points_snapshot: category.points,
      penalty_min_severity_snapshot: category.penalty_min_severity,
    })
    .select('id')
    .single();
  if (insertError) return NextResponse.json({ error: `Supabase incident creation failed: ${insertError.message}` }, { status: 500 });

  try {
    await appendAuditLogFor(branchUuid, {
      actorId: ctx.user.id,
      action: 'create_incident',
      objectType: 'incident',
      objectId: incident.id,
      branchId: branchUuid,
      shiftInstanceId: shiftInstanceId ?? undefined,
      after: { categoryId, description, occurredAt: occurredAt.toISOString(), severity: body.severity ?? null },
    });
  } catch (error) {
    console.error('Incident audit append failed after creation:', error);
    return NextResponse.json({ error: 'Incident dibuat, tetapi pencatatan audit gagal.' }, { status: 500 });
  }

  const { error: notificationError } = await getSupabase().from('mycheck_notifications').insert({
    user_id: userId,
    branch_id: branchUuid,
    type: 'incident_created',
    title: 'Incident terkirim',
    body: description.slice(0, 140),
    link: `/incident/${incident.id}`,
  });
  if (notificationError) console.error('Incident notification failed:', notificationError.message);

  try {
    const { emitTaskEvent } = await import('@mochikin/shared/events');
    const result = await emitTaskEvent({
      taskId: 'MYCHECK_INCIDENT',
      personId: userId,
      branchId: branchUuid,
      appId: 'mycheck',
      outputQty: 1,
      occurredAt: reportedAt,
      idempotencyKey: `mycheck-incident-${incident.id}-${userId}`,
      meta: { incidentId: incident.id, categoryId, severity: body.severity },
    });
    if (!result.success) console.error('MyCheck incident task event failed:', result.error, { incidentId: incident.id });
  } catch (error) {
    console.error('MyCheck incident task event exception:', error, { incidentId: incident.id });
  }
  return NextResponse.json({ status: 'dibuat', incident_id: incident.id });
});
