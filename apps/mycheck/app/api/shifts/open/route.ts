import { NextResponse } from 'next/server';
import { ulid } from 'ulid';
import { appendAuditLogFor } from '../../../../lib/db/audit';
import { buildTemplateSnapshot, hashSnapshot } from '../../../../lib/db/snapshot';
import { getServerTime } from '../../../../lib/db/server-time';
import { requireBranchAccess, withAuth } from '../../../../lib/api-auth';
import { shiftInstanceId } from '../../../../lib/ids';
import { notifyShiftOpened } from '../../../../lib/notify-events';
import { isWithinShiftHours, getShiftDate } from '../../../../lib/shift/time';
import { getSupabase } from '../../../../lib/supabase';

interface OpenShiftBody {
  shiftDefinitionId?: string;
  isTest?: boolean;
  branchId?: string;
}

export const POST = withAuth(async (req, ctx) => {
  let body: OpenShiftBody;
  try {
    body = (await req.json()) as OpenShiftBody;
  } catch {
    body = {};
  }

  const definitionId = body.shiftDefinitionId?.trim();
  if (!definitionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(definitionId)) {
    return NextResponse.json({ error: 'shiftDefinitionId tidak valid' }, { status: 400 });
  }

  const requestedBranchId = body.branchId?.trim() || null;
  if (requestedBranchId) {
    const accessError = requireBranchAccess(ctx, requestedBranchId);
    if (accessError) return accessError;
  } else if (ctx.user.role === 'admin') {
    return NextResponse.json({ error: 'Pilih cabang kerja terlebih dahulu.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const branchQuery = supabase
    .from('branches')
    .select('id,code,settings')
    .eq('status', 'active')
    .is('deleted_at', null);
  let branches;
  let branchesError;
  if (requestedBranchId) {
    const { data: branch, error } = await branchQuery.eq(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedBranchId) ? 'id' : 'code',
      requestedBranchId
    ).maybeSingle();
    branches = branch ? [branch] : [];
    branchesError = error;
  } else {
    const result = await branchQuery.in('code', ctx.branchIds);
    branches = result.data;
    branchesError = result.error;
  }
  if (branchesError) {
    console.error('MyCheck shift branch lookup failed:', branchesError);
    return NextResponse.json({ error: 'Cabang tidak dapat dimuat.' }, { status: 500 });
  }
  if (!branches?.length) return NextResponse.json({ error: 'Cabang tidak ditemukan' }, { status: 404 });

  const branchIds = branches.map((branch) => branch.id);
  const { data: definition, error: definitionError } = await supabase
    .from('mycheck_shift_definitions')
    .select('id,branch_id,name,start_time,end_time,is_active')
    .eq('id', definitionId)
    .in('branch_id', branchIds)
    .maybeSingle();
  if (definitionError) {
    console.error('MyCheck shift definition lookup failed:', definitionError);
    return NextResponse.json({ error: 'Definisi shift tidak dapat dimuat.' }, { status: 500 });
  }
  if (!definition) return NextResponse.json({ error: 'Definisi shift tidak ditemukan' }, { status: 404 });
  if (!definition.is_active) {
    return NextResponse.json({ error: 'Definisi shift tidak aktif' }, { status: 400 });
  }

  const branch = branches.find((item) => item.id === definition.branch_id);
  if (!branch) return NextResponse.json({ error: 'Cabang tidak ditemukan' }, { status: 404 });
  const accessError = requireBranchAccess(ctx, branch.code);
  if (accessError) return accessError;

  const now = getServerTime();
  const timezone = typeof branch.settings?.timezone === 'string'
    ? branch.settings.timezone
    : 'Asia/Jakarta';
  const date = getShiftDate(now, timezone);
  const snapshot = await buildTemplateSnapshot(branch.id, definition.id, timezone);
  const id = shiftInstanceId(branch.code, definition.id, date, body.isTest === true);
  const openedOutsideHours = !isWithinShiftHours(
    now,
    timezone,
    String(definition.start_time),
    String(definition.end_time)
  );
  const { data: opened, error: openError } = await supabase.rpc('mycheck_open_shift', {
    p_candidate_id: id,
    p_new_id: ulid(),
    p_branch_id: branch.id,
    p_shift_definition_id: definition.id,
    p_shift_date: date,
    p_is_test: body.isTest === true,
    p_person_id: ctx.user.personId ?? ctx.user.id,
    p_opened_at: now.toISOString(),
    p_opened_outside_hours: openedOutsideHours,
    p_snapshot: snapshot,
    p_snapshot_hash: hashSnapshot(snapshot),
  });
  if (openError) {
    console.error('MyCheck shift open failed:', openError);
    return NextResponse.json({ error: 'Shift tidak dapat dibuka.' }, { status: 500 });
  }

  const result = opened as { id: string; created: boolean };
  if (result.created) {
    await appendAuditLogFor(branch.id, {
      actorId: ctx.user.personId ?? ctx.user.id,
      action: 'open_shift',
      objectType: 'shift_instance',
      objectId: result.id,
      branchId: branch.id,
      shiftInstanceId: result.id,
      after: {
        shiftDefinitionId: definition.id,
        shiftDate: date,
        isTest: body.isTest === true,
        openedOutsideHours,
        totalItems: snapshot.categories.reduce((sum, category) => sum + category.points.length, 0),
      },
    });
    try {
      await notifyShiftOpened({
        spreadsheetId: branch.id,
        branchId: branch.id,
        shiftInstanceId: result.id,
        actorId: ctx.user.personId ?? ctx.user.id,
        actorName: ctx.user.name,
        shiftName: definition.name,
      });
    } catch (error) {
      console.error('MyCheck shift notification failed:', error);
    }
  }

  return NextResponse.json({
    status: result.created ? 'dibuka' : 'bergabung',
    shift_instance_id: result.id,
    opened_outside_hours: openedOutsideHours,
    shift_date: date,
    total_items: snapshot.categories.reduce((sum, category) => sum + category.points.length, 0),
    cleaned_draft_shift_ids: [],
  });
});
