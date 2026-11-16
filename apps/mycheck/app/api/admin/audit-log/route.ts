import { NextResponse } from 'next/server';
import { requireRole, withAuth } from '../../../../lib/api-auth';
import { getSupabase } from '../../../../lib/supabase';

export const GET = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const { searchParams } = new URL(req.url);
  const actorId = searchParams.get('actorId');
  const action = searchParams.get('action');
  const requestedBranch = searchParams.get('branchId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const parsedLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
  const limit = Math.min(100, Math.max(1, Number.isNaN(parsedLimit) ? 50 : parsedLimit));
  const cursorParam = searchParams.get('cursor');
  const cursor = cursorParam === null ? null : Number.parseInt(cursorParam, 10);
  if (cursorParam !== null && Number.isNaN(cursor)) {
    return NextResponse.json({ error: 'cursor harus berupa angka.' }, { status: 400 });
  }
  if (requestedBranch && !ctx.branchIds.includes(requestedBranch)) {
    return NextResponse.json({ error: 'Akses ditolak untuk cabang ini.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { data: branches, error: branchesError } = await supabase
    .from('branches')
    .select('id,code,name')
    .in('code', requestedBranch ? [requestedBranch] : ctx.branchIds)
    .eq('status', 'active')
    .is('deleted_at', null);
  if (branchesError) {
    return NextResponse.json({ error: `Supabase branch lookup failed: ${branchesError.message}` }, { status: 500 });
  }
  const branchById = new Map((branches ?? []).map((branch) => [branch.id, branch]));
  const branchIds = [...branchById.keys()];
  if (!branchIds.length) return NextResponse.json({ logs: [], nextCursor: null });

  let query = supabase
    .from('mycheck_audit_log')
    .select('id,branch_id,seq,at,actor_id,action,object_type,object_id,shift_instance_id,before,after,reason,hash,prev_hash')
    .in('branch_id', branchIds)
    .order('at', { ascending: false })
    .order('seq', { ascending: false })
    .limit(limit + 1);
  if (actorId) query = query.eq('actor_id', actorId);
  if (action) query = query.eq('action', action);
  if (from) query = query.gte('at', from);
  if (to) query = query.lte('at', to);
  if (cursor !== null) query = query.lt('seq', cursor);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: `Supabase audit log read failed: ${error.message}` }, { status: 500 });
  }
  const page = (data ?? []).slice(0, limit);
  const actorNames = [...new Set(page.map(({ actor_id }) => actor_id).filter((value): value is string => Boolean(value)))];
  const { data: people, error: peopleError } = actorNames.length
    ? await supabase.from('people').select('username,name').in('username', actorNames)
    : { data: [], error: null };
  if (peopleError) {
    return NextResponse.json({ error: `Supabase actor lookup failed: ${peopleError.message}` }, { status: 500 });
  }
  const nameByUsername = new Map((people ?? []).map((person) => [person.username, person.name]));
  const logs = page.map((row) => {
    const branch = branchById.get(row.branch_id);
    return {
      id: row.id,
      seq: row.seq,
      at: row.at,
      actorId: row.actor_id,
      actorName: row.actor_id ? nameByUsername.get(row.actor_id) ?? null : null,
      actorUsername: row.actor_id ?? '',
      action: row.action,
      objectType: row.object_type,
      objectId: row.object_id,
      branchId: branch?.code ?? null,
      branchName: branch?.name ?? null,
      shiftInstanceId: row.shift_instance_id,
      reason: row.reason,
      before: row.before,
      after: row.after,
      hash: row.hash,
      prevHash: row.prev_hash,
    };
  });
  return NextResponse.json({
    logs,
    nextCursor: (data?.length ?? 0) > limit ? page.at(-1)?.seq ?? null : null,
  });
});
