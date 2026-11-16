import { NextResponse } from 'next/server';
import { requireBranchAccess, withAuth } from '../../../../../lib/api-auth';
import { resolveInstance } from '../../../../../lib/instance-resolver';
import { parseHandoverSnapshot, parseHandoverValues, resolveHandoverFields } from '../../../../../lib/handover-fields';
import { getSupabase } from '../../../../../lib/supabase';

export const GET = withAuth(async (req, ctx) => {
  const shiftInstanceId = new URL(req.url).pathname.split('/').slice(-2)[0];
  const resolved = await resolveInstance(ctx, shiftInstanceId);
  if (!resolved) return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });

  const branchAccessError = requireBranchAccess(ctx, resolved.branchId);
  if (branchAccessError) return branchAccessError;

  const supabase = getSupabase();
  const current = resolved.instance;
  const { data: previous, error: previousError } = await supabase
    .from('mycheck_shift_instances')
    .select('id,shift_definition_id,shift_date,opened_at,closed_at,status,template_snapshot')
    .eq('branch_id', resolved.spreadsheetId)
    .in('status', ['closed', 'force_closed'])
    .lt('opened_at', String(current['opened_at']))
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previousError) {
    console.error('MyCheck previous shift lookup failed:', previousError);
    return NextResponse.json({ error: 'Shift sebelumnya tidak dapat dimuat.' }, { status: 500 });
  }

  const { data: incidents, error: incidentsError } = await supabase
    .from('mycheck_incidents')
    .select('id,category,title,description,reported_at,severity')
    .eq('branch_id', resolved.spreadsheetId)
    .eq('status', 'open')
    .order('reported_at', { ascending: false });
  if (incidentsError) {
    console.error('MyCheck open incident lookup failed:', incidentsError);
    return NextResponse.json({ error: 'Insiden aktif tidak dapat dimuat.' }, { status: 500 });
  }

  const handoverResult = previous
    ? await supabase.from('mycheck_handovers').select('*').eq('shift_instance_id', previous.id).maybeSingle()
    : { data: null, error: null };
  if (handoverResult.error) {
    console.error('MyCheck previous handover lookup failed:', handoverResult.error);
    return NextResponse.json({ error: 'Handover sebelumnya tidak dapat dimuat.' }, { status: 500 });
  }

  const handover = handoverResult.data;
  let handoverData = null;
  let acknowledgements: Array<{ user_id: string; read_at: string }> = [];
  if (handover) {
    const [personResult, ackResult] = await Promise.all([
      supabase.from('people').select('name,username').eq('id', handover.from_user_id).maybeSingle(),
      supabase.from('mycheck_handover_acks').select('user_id,read_at').eq('handover_id', handover.id),
    ]);
    if (personResult.error || ackResult.error) {
      console.error('MyCheck handover details lookup failed:', personResult.error ?? ackResult.error);
      return NextResponse.json({ error: 'Detail handover tidak dapat dimuat.' }, { status: 500 });
    }
    acknowledgements = ackResult.data ?? [];
    handoverData = {
      id: handover.id,
      fields: resolveHandoverFields(
        parseHandoverSnapshot(previous?.template_snapshot),
        parseHandoverValues(handover.field_values)
      ),
      freeText: handover.notes ?? '',
      photoIds: [],
      submittedBy: handover.from_user_id,
      submittedByName: personResult.data?.name || personResult.data?.username || handover.from_user_id,
      submittedAt: handover.submitted_at,
    };
  }

  const currentPersonId = ctx.user.personId ?? ctx.user.id;
  const myAck = acknowledgements.find((ack) => ack.user_id === currentPersonId);
  return NextResponse.json({
    previousShift: previous ? {
      shiftInstanceId: previous.id,
      name: parseHandoverSnapshot(previous.template_snapshot)?.shift?.name || previous.shift_definition_id,
      shiftDate: previous.shift_date,
      closedAt: previous.closed_at,
      status: previous.status,
    } : null,
    handover: handoverData,
    openIncidents: (incidents ?? []).map((incident) => ({
      id: incident.id,
      description: incident.description || incident.title,
      reportedAt: incident.reported_at,
      severity: incident.severity === 'low'
        ? 'rendah'
        : incident.severity === 'medium'
          ? 'sedang'
          : incident.severity === 'high'
            ? 'tinggi'
            : incident.severity || 'normal',
      categoryName: incident.category || 'Tanpa kategori',
    })),
    ack: {
      readAt: myAck?.read_at ?? null,
      readByCount: acknowledgements.length,
      readByMe: Boolean(myAck),
    },
  });
});
