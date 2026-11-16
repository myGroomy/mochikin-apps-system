import { NextResponse } from 'next/server';
import { withAuth } from '../../../lib/api-auth';
import { countFilledFields, parseHandoverSnapshot, parseHandoverValues, resolveHandoverFields, type HandoverFieldView } from '../../../lib/handover-fields';
import { getSupabase } from '../../../lib/supabase';

export interface HandoverHistoryEntry {
  shiftInstanceId: string;
  branchId: string;
  branchName: string;
  shiftName: string;
  shiftDate: string;
  closedAt: string;
  status: string;
  handover: {
    id: string;
    fields: HandoverFieldView[];
    freeText: string;
    photoIds: string[];
    submittedBy: string;
    submittedByName: string;
    submittedAt: string;
  } | null;
  filledCount: number;
  photoCount: number;
  ack: { readAt: string | null; readByCount: number; readByMe: boolean };
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const branchFilter = url.searchParams.get('branchId')?.trim() ?? '';
  const parsedLimit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(parsedLimit) ? Math.trunc(parsedLimit) : DEFAULT_LIMIT));
  const supabase = getSupabase();
  const branchQuery = supabase
    .from('branches')
    .select('id,code,name')
    .in('code', ctx.branchIds)
    .eq('status', 'active')
    .is('deleted_at', null);
  const { data: branches, error: branchError } = await branchQuery;
  if (branchError) {
    console.error('MyCheck handover branch lookup failed:', branchError);
    return NextResponse.json({ error: 'Cabang tidak dapat dimuat.' }, { status: 500 });
  }
  const allowedBranches = (branches ?? []).filter((branch) => !branchFilter || branch.code === branchFilter);
  if (branchFilter && !allowedBranches.length) {
    return NextResponse.json({ entries: [], branches: [] });
  }
  if (!allowedBranches.length) return NextResponse.json({ entries: [], branches: [] });
  const branchById = new Map(allowedBranches.map((branch) => [branch.id, branch]));
  const branchOptions = allowedBranches.map((branch) => ({ id: branch.code, name: branch.name || branch.code }));

  const { data: instances, error: instanceError } = await supabase
    .from('mycheck_shift_instances')
    .select('id,branch_id,shift_definition_id,shift_date,opened_at,closed_at,status,template_snapshot')
    .in('branch_id', allowedBranches.map((branch) => branch.id))
    .in('status', ['closed', 'force_closed'])
    .order('closed_at', { ascending: false })
    .limit(limit);
  if (instanceError) {
    console.error('MyCheck handover shift history lookup failed:', instanceError);
    return NextResponse.json({ error: 'Riwayat shift tidak dapat dimuat.' }, { status: 500 });
  }
  const selected = instances ?? [];
  const shiftIds = selected.map((instance) => instance.id);
  const handoversResult = shiftIds.length
    ? await supabase.from('mycheck_handovers').select('id,shift_instance_id,from_user_id,field_values,notes,submitted_at').in('shift_instance_id', shiftIds)
    : { data: [], error: null };
  if (handoversResult.error) {
    console.error('MyCheck handover history lookup failed:', handoversResult.error);
    return NextResponse.json({ error: 'Riwayat handover tidak dapat dimuat.' }, { status: 500 });
  }

  const handovers = handoversResult.data ?? [];
  const handoverIds = handovers.map((handover) => handover.id);
  const userIds = [...new Set(handovers.map((handover) => handover.from_user_id))];
  const [acksResult, namesResult] = await Promise.all([
    handoverIds.length
      ? supabase.from('mycheck_handover_acks').select('handover_id,user_id,read_at').in('handover_id', handoverIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase.from('people').select('id,name,username').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (acksResult.error || namesResult.error) {
    console.error('MyCheck handover acknowledgement lookup failed:', acksResult.error ?? namesResult.error);
    return NextResponse.json({ error: 'Status baca handover tidak dapat dimuat.' }, { status: 500 });
  }

  const handoverByShift = new Map(handovers.map((handover) => [handover.shift_instance_id, handover]));
  const nameById = new Map((namesResult.data ?? []).map((person) => [person.id, person.name || person.username || person.id]));
  const acksByHandover = new Map<string, Array<{ user_id: string; read_at: string }>>();
  for (const ack of acksResult.data ?? []) {
    const list = acksByHandover.get(ack.handover_id) ?? [];
    list.push(ack);
    acksByHandover.set(ack.handover_id, list);
  }
  const currentUserId = ctx.user.personId ?? ctx.user.id;

  const entries = selected.flatMap((instance): HandoverHistoryEntry[] => {
    const branch = branchById.get(instance.branch_id);
    if (!branch) return [];
    const snapshot = parseHandoverSnapshot(instance.template_snapshot);
    const row = handoverByShift.get(instance.id);
    const fields = row
      ? resolveHandoverFields(snapshot, parseHandoverValues(row.field_values))
      : [];
    const acks = row ? acksByHandover.get(row.id) ?? [] : [];
    const myAck = acks.find((ack) => ack.user_id === currentUserId);
    return [{
      shiftInstanceId: instance.id,
      branchId: branch.code,
      branchName: branch.name || branch.code,
      shiftName: snapshot?.shift?.name || instance.shift_definition_id,
      shiftDate: instance.shift_date,
      closedAt: instance.closed_at ?? '',
      status: instance.status === 'force_closed' ? 'ditutup_paksa' : 'ditutup',
      handover: row ? {
        id: row.id,
        fields,
        freeText: row.notes ?? '',
        photoIds: [],
        submittedBy: row.from_user_id,
        submittedByName: nameById.get(row.from_user_id) ?? row.from_user_id,
        submittedAt: row.submitted_at ?? '',
      } : null,
      filledCount: countFilledFields(fields),
      photoCount: fields.filter((field) => field.hasPhoto).length,
      ack: { readAt: myAck?.read_at ?? null, readByCount: acks.length, readByMe: Boolean(myAck) },
    }];
  });

  const response = NextResponse.json({
    entries: entries.sort((a, b) => (b.closedAt || b.shiftDate).localeCompare(a.closedAt || a.shiftDate)).slice(0, limit),
    branches: branchOptions,
  });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Vary', 'Cookie');
  return response;
});
