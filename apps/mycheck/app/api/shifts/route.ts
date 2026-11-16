import { NextResponse } from 'next/server';
import { getServerTime } from '../../../lib/db/server-time';
import { getShiftDate } from '../../../lib/shift/time';
import { withAuth } from '../../../lib/api-auth';
import { getSupabase } from '../../../lib/supabase';

export const GET = withAuth(async (req, ctx) => {
  const requested = new URL(req.url).searchParams.get('branchId');
  if (requested && !ctx.branchIds.includes(requested)) {
    return NextResponse.json({ error: 'Akses ditolak untuk cabang ini.' }, { status: 403 });
  }
  const branchCodes = requested ? [requested] : ctx.branchIds;
  const { data: branches, error: branchError } = await getSupabase()
    .from('branches')
    .select('id,name,code,settings')
    .in('code', branchCodes)
    .eq('status', 'active')
    .is('deleted_at', null);
  if (branchError) return NextResponse.json({ error: `Supabase branch lookup failed: ${branchError.message}` }, { status: 500 });
  if (!branches?.length) return NextResponse.json({ branches: [], shifts: [] });

  const branchIds = branches.map((branch) => branch.id);
  const [{ data: definitions, error: definitionsError }, { data: instances, error: instancesError }] = await Promise.all([
    getSupabase()
      .from('mycheck_shift_definitions')
      .select('id,branch_id,name,start_time,end_time,crosses_midnight,sort_order')
      .in('branch_id', branchIds)
      .eq('is_active', true)
      .order('sort_order'),
    getSupabase()
      .from('mycheck_shift_instances')
      .select('id,branch_id,shift_definition_id,shift_date,status,pj_user_id,opened_outside_hours,is_test')
      .in('branch_id', branchIds)
      .neq('status', 'void')
      .eq('is_test', false),
  ]);
  if (definitionsError) return NextResponse.json({ error: `Supabase shift definition list failed: ${definitionsError.message}` }, { status: 500 });
  if (instancesError) return NextResponse.json({ error: `Supabase shift instance list failed: ${instancesError.message}` }, { status: 500 });

  const now = getServerTime();
  const branchRows = branches.map((branch) => {
    const settings = branch.settings && typeof branch.settings === 'object'
      ? branch.settings as Record<string, unknown>
      : {};
    return {
      id: branch.code,
      name: branch.name,
      code: branch.code,
      timezone: typeof settings.timezone === 'string' ? settings.timezone : 'Asia/Jakarta',
    };
  });
  const branchById = new Map(branches.map((branch) => [branch.id, branch]));
  const todayByBranch = new Map(branches.map((branch) => {
    const settings = branch.settings && typeof branch.settings === 'object'
      ? branch.settings as Record<string, unknown>
      : {};
    return [branch.id, getShiftDate(now, typeof settings.timezone === 'string' ? settings.timezone : 'Asia/Jakarta')];
  }));
  const instanceByDefinition = new Map((instances ?? [])
    .filter((instance) => instance.shift_date === todayByBranch.get(instance.branch_id))
    .map((instance) => [`${instance.branch_id}:${instance.shift_definition_id}`, instance]));

  const shifts = (definitions ?? []).map((definition) => {
    const branch = branchById.get(definition.branch_id);
    if (!branch) return null;
    const row = branchRows.find((candidate) => candidate.code === branch.code);
    const instance = instanceByDefinition.get(`${definition.branch_id}:${definition.id}`);
    const timezone = row?.timezone ?? 'Asia/Jakarta';
    const today = todayByBranch.get(definition.branch_id) ?? getShiftDate(now, timezone);
    const status = instance?.status === 'open'
      ? 'berjalan'
      : instance?.status === 'closed'
        ? 'ditutup'
        : instance?.status === 'force_closed'
          ? 'ditutup_paksa'
          : instance?.status;
    return {
      id: definition.id,
      branchId: branch.code,
      name: definition.name,
      startTime: definition.start_time,
      endTime: definition.end_time,
      crossesMidnight: definition.crosses_midnight,
      sortOrder: definition.sort_order,
      timezone,
      today,
      instance: instance ? {
        shift_instance_id: instance.id,
        status,
        pj_user_id: instance.pj_user_id,
        opened_outside_hours: instance.opened_outside_hours,
      } : null,
    };
  }).filter((shift): shift is NonNullable<typeof shift> => shift !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const response = NextResponse.json({
    branches: branchRows,
    shifts,
    server_time: now.toISOString(),
  });
  response.headers.set('Cache-Control', 'private, max-age=30, must-revalidate');
  response.headers.set('Vary', 'Cookie');
  return response;
});
