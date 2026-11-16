import { NextResponse } from 'next/server';
import { appendAuditLogFor } from '../../../../../lib/db/audit';
import { requireBranchAccess, withAuth } from '../../../../../lib/api-auth';
import { resolveInstance } from '../../../../../lib/instance-resolver';
import { getSupabase } from '../../../../../lib/supabase';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const POST = withAuth(async (req, ctx) => {
  const handoverId = new URL(req.url).pathname.split('/').slice(-2)[0];
  if (!isUuid(handoverId)) {
    return NextResponse.json({ error: 'Handover tidak ditemukan' }, { status: 404 });
  }
  const supabase = getSupabase();
  const { data: handover, error } = await supabase
    .from('mycheck_handovers')
    .select('id,shift_instance_id')
    .eq('id', handoverId)
    .maybeSingle();
  if (error) {
    console.error('MyCheck handover lookup failed:', error);
    return NextResponse.json({ error: 'Handover tidak dapat dimuat.' }, { status: 500 });
  }
  if (!handover) return NextResponse.json({ error: 'Handover tidak ditemukan' }, { status: 404 });

  const handoverShift = await resolveInstance(ctx, handover.shift_instance_id);
  if (!handoverShift) return NextResponse.json({ error: 'Handover tidak ditemukan' }, { status: 404 });
  const branchAccessError = requireBranchAccess(ctx, handoverShift.branchId);
  if (branchAccessError) return branchAccessError;

  let readingShiftInstanceId = handover.shift_instance_id;
  let readingBranchId = handoverShift.spreadsheetId;
  try {
    const body = await req.json() as { shift_instance_id?: string };
    if (body.shift_instance_id) {
      const readingShift = await resolveInstance(ctx, body.shift_instance_id);
      if (!readingShift || readingShift.spreadsheetId !== handoverShift.spreadsheetId) {
        return NextResponse.json({ error: 'Shift pembaca tidak ditemukan' }, { status: 404 });
      }
      readingShiftInstanceId = body.shift_instance_id;
      readingBranchId = readingShift.spreadsheetId;
    }
  } catch {
    // Missing or empty request body uses the handover's own shift.
  }

  const userId = ctx.user.personId ?? ctx.user.id;
  const { error: insertError } = await supabase.from('mycheck_handover_acks').insert({
    handover_id: handover.id,
    reading_shift_instance_id: readingShiftInstanceId,
    user_id: userId,
  });
  if (insertError?.code === '23505') {
    return NextResponse.json({ status: 'sudah_dibaca', handover_id: handoverId });
  }
  if (insertError) {
    console.error('MyCheck handover acknowledgement failed:', insertError);
    return NextResponse.json({ error: 'Handover tidak dapat ditandai sebagai dibaca.' }, { status: 500 });
  }

  await appendAuditLogFor(readingBranchId, {
    actorId: userId,
    action: 'ack_handover',
    objectType: 'handover',
    objectId: handoverId,
    branchId: readingBranchId,
    shiftInstanceId: handover.shift_instance_id,
    after: { readingShiftInstanceId },
  });
  return NextResponse.json({ status: 'dibaca', handover_id: handoverId });
});
