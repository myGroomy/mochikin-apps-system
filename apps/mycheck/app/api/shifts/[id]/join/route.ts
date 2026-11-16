import { NextResponse } from 'next/server';
import { appendAuditLogFor } from '../../../../../lib/db/audit';
import { getServerTime } from '../../../../../lib/db/server-time';
import { requireBranchAccess, withAuth } from '../../../../../lib/api-auth';
import { resolveInstance } from '../../../../../lib/instance-resolver';
import { getSupabase } from '../../../../../lib/supabase';

export const POST = withAuth(async (req, ctx) => {
  const shiftInstanceId = new URL(req.url).pathname.split('/').at(-2) ?? '';
  const isDuty = new URL(req.url).searchParams.get('duty') === '1';
  const resolved = await resolveInstance(ctx, shiftInstanceId);
  if (!resolved) return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });
  if (resolved.instance.status !== 'open') {
    return NextResponse.json({ error: 'Shift sudah ditutup. Tidak bisa bergabung.' }, { status: 409 });
  }
  const accessError = requireBranchAccess(ctx, resolved.branchId);
  if (accessError) return accessError;
  const userId = ctx.user.personId;
  if (!userId) return NextResponse.json({ error: 'Identitas petugas tidak tersedia.' }, { status: 401 });

  const supabase = getSupabase();
  const { data: existing, error: existingError } = await supabase
    .from('mycheck_shift_participants')
    .select('first_action_type')
    .eq('shift_instance_id', shiftInstanceId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: `Supabase participant lookup failed: ${existingError.message}` }, { status: 500 });

  let joined = false;
  let firstActionType = existing?.first_action_type ?? '';
  if (!existing) {
    firstActionType = isDuty ? 'saya_bertugas' : 'buka_shift';
    const { error } = await supabase.from('mycheck_shift_participants').insert({
      shift_instance_id: shiftInstanceId,
      user_id: userId,
      first_action_type: firstActionType,
      first_action_at: getServerTime().toISOString(),
    });
    if (error?.code === '23505') {
      const { data: concurrent, error: lookupError } = await supabase
        .from('mycheck_shift_participants')
        .select('first_action_type')
        .eq('shift_instance_id', shiftInstanceId)
        .eq('user_id', userId)
        .single();
      if (lookupError) return NextResponse.json({ error: `Supabase participant lookup failed: ${lookupError.message}` }, { status: 500 });
      firstActionType = concurrent.first_action_type;
    } else if (error) {
      return NextResponse.json({ error: `Supabase participant creation failed: ${error.message}` }, { status: 500 });
    } else {
      joined = true;
      await appendAuditLogFor(resolved.spreadsheetId, {
        actorId: userId,
        action: isDuty ? 'declare_duty' : 'join_shift',
        objectType: 'shift_instance',
        objectId: shiftInstanceId,
        branchId: resolved.spreadsheetId,
        shiftInstanceId,
        after: { userId, firstActionType },
      });
    }
  }

  const { count, error: countError } = await supabase
    .from('mycheck_shift_participants')
    .select('id', { count: 'exact', head: true })
    .eq('shift_instance_id', shiftInstanceId);
  if (countError) return NextResponse.json({ error: `Supabase participant count failed: ${countError.message}` }, { status: 500 });
  return NextResponse.json({
    status: 'bergabung',
    shift_instance_id: shiftInstanceId,
    already_joined: !joined,
    first_action_type: firstActionType,
    participant_count: count ?? 0,
  });
});
