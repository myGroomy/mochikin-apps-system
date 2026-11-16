import { NextResponse } from 'next/server';
import { type Snapshot } from '../../../../../lib/db/snapshot';
import { getServerTime } from '../../../../../lib/db/server-time';
import { getZonedParts, isPointActiveOn } from '../../../../../lib/shift/time';
import { requireBranchAccess, withAuth } from '../../../../../lib/api-auth';
import { resolveInstance } from '../../../../../lib/instance-resolver';
import { readTemplateSnapshot } from '../../../../../lib/template-snapshot';
import { getSupabase } from '../../../../../lib/supabase';

interface ProgressEntry {
  point_ref: string;
  title: string;
  instruction: string | null;
  input_type: string;
  input_types?: string[];
  options?: string[] | null;
  is_required: boolean;
  target_time: string | null;
  number_min: number | null;
  number_max: number | null;
  sort_order: number;
  state: 'belum' | 'selesai' | 'skip';
  value: string | null;
  out_of_range: boolean;
  skip_reason: string | null;
  completed_by: string | null;
  completed_by_name: string | null;
  completed_at: string | null;
  timing_label: string | null;
  timing_delta_minutes: number | null;
  points: number;
}

interface ProgressCategory {
  id: string;
  name: string;
  sort_order: number;
  color: string | null;
  total_points: number;
  points: ProgressEntry[];
}

function storedValue(entry: Record<string, unknown>): string | null {
  if (entry.value_text !== null && entry.value_text !== undefined) return String(entry.value_text);
  if (entry.value_number !== null && entry.value_number !== undefined) return String(entry.value_number);
  if (entry.value_boolean !== null && entry.value_boolean !== undefined) return String(entry.value_boolean);
  if (entry.photo_url) return String(entry.photo_url);
  return null;
}

export const GET = withAuth(async (req, ctx) => {
  const shiftInstanceId = new URL(req.url).pathname.split('/').slice(-2)[0];
  const resolved = await resolveInstance(ctx, shiftInstanceId);
  if (!resolved) return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });

  const branchAccessError = requireBranchAccess(ctx, resolved.branchId);
  if (branchAccessError) return branchAccessError;

  const snapshot = readTemplateSnapshot(resolved.instance) as Snapshot | null;
  if (!snapshot?.shift) return NextResponse.json({ error: 'Snapshot template tidak valid' }, { status: 500 });

  const supabase = getSupabase();
  const [{ data: entries, error: entriesError }, { data: participants, error: participantsError }] = await Promise.all([
    supabase.from('mycheck_entries').select('*').eq('shift_instance_id', shiftInstanceId),
    supabase.from('mycheck_shift_participants')
      .select('user_id,first_action_type,first_action_at')
      .eq('shift_instance_id', shiftInstanceId)
      .order('first_action_at'),
  ]);
  if (entriesError || participantsError) {
    console.error('MyCheck shift progress lookup failed:', entriesError ?? participantsError);
    return NextResponse.json({ error: 'Progress shift tidak dapat dimuat.' }, { status: 500 });
  }

  const entryByPoint = new Map((entries ?? []).map((entry) => [entry.point_id, entry]));
  const userIds = [...new Set([
    ...(entries ?? []).map((entry) => entry.filled_by_user_id),
    ...(participants ?? []).map((participant) => participant.user_id),
  ].filter((id): id is string => Boolean(id)))];
  const { data: people, error: peopleError } = userIds.length
    ? await supabase.from('people').select('id,name,username').in('id', userIds)
    : { data: [], error: null };
  if (peopleError) {
    console.error('MyCheck progress people lookup failed:', peopleError);
    return NextResponse.json({ error: 'Nama petugas tidak dapat dimuat.' }, { status: 500 });
  }

  const nameById = new Map((people ?? []).map((person) => [person.id, person.name || person.username || person.id]));
  const perUser = new Map<string, number>();
  for (const entry of entries ?? []) {
    if (entry.filled_by_user_id && ['selesai', 'skip'].includes(entry.state)) {
      const userId = entry.filled_by_user_id;
      perUser.set(userId, (perUser.get(userId) ?? 0) + 1);
    }
  }

  const now = getServerTime();
  const dayKey = getZonedParts(now, resolved.branchTimezone).dayKey;
  const categories: ProgressCategory[] = (snapshot.categories ?? []).map((category) => {
    let activePoints = (category.points ?? [])
      .filter((point) => isPointActiveOn(point.active_days, dayKey))
      .sort((a, b) => a.sort_order - b.sort_order);
    if (activePoints.length === 0 && category.points.length > 0) {
      activePoints = [...category.points].sort((a, b) => a.sort_order - b.sort_order);
    }
    const points = activePoints.map((point): ProgressEntry => {
      const entry = entryByPoint.get(point.point_ref);
      const completedBy = entry?.filled_by_user_id ?? null;
      return {
        point_ref: point.point_ref,
        title: point.title,
        instruction: point.instruction,
        input_type: point.input_type,
        input_types: point.input_types ?? [point.input_type],
        options: point.options ?? null,
        is_required: point.is_required,
        target_time: point.target_time,
        number_min: point.number_min,
        number_max: point.number_max,
        sort_order: point.sort_order,
        points: Number(point.points ?? 1),
        state: entry?.state ?? 'belum',
        value: entry ? storedValue(entry) : null,
        out_of_range: entry?.out_of_range ?? false,
        skip_reason: entry?.skip_reason ?? null,
        completed_by: completedBy,
        completed_by_name: completedBy ? nameById.get(completedBy) ?? null : null,
        completed_at: entry?.filled_at ?? null,
        timing_label: entry?.timing_label ?? null,
        timing_delta_minutes: entry?.timing_delta_minutes ?? null,
      };
    });
    return {
      id: category.id,
      name: category.name,
      sort_order: category.sort_order,
      color: category.color ?? null,
      total_points: points.reduce((sum, point) => sum + point.points, 0),
      points,
    };
  });

  const allPoints = categories.flatMap((category) => category.points);
  const done = allPoints.filter((point) => point.state === 'selesai').length;
  const skipped = allPoints.filter((point) => point.state === 'skip').length;
  return NextResponse.json({
    shift: {
      id: resolved.instance.id,
      branch_id: resolved.branchId,
      branch_timezone: resolved.branchTimezone,
      shift_definition_id: resolved.instance.shift_definition_id,
      name: snapshot.shift.name,
      start_time: snapshot.shift.start_time,
      end_time: snapshot.shift.end_time,
      date: resolved.instance.shift_date,
      status: resolved.instance.status === 'open'
        ? 'berjalan'
        : resolved.instance.status === 'force_closed'
          ? 'ditutup_paksa'
          : resolved.instance.status === 'closed'
            ? 'ditutup'
            : resolved.instance.status,
      pj_user_id: resolved.instance.pj_user_id,
      opened_outside_hours: Boolean(resolved.instance.opened_outside_hours),
      is_test: Boolean(resolved.instance.is_test),
    },
    progress: {
      total: allPoints.length,
      selesai: done,
      skip: skipped,
      belum: allPoints.length - done - skipped,
      wajib_selesai: allPoints.filter((point) => point.is_required && point.state === 'selesai').length,
    },
    categories,
    participants: (participants ?? []).map((participant) => ({
      user_id: participant.user_id,
      name: nameById.get(participant.user_id) ?? participant.user_id,
      is_pj: participant.user_id === resolved.instance.pj_user_id,
      first_action_type: participant.first_action_type,
      first_action_at: participant.first_action_at,
      items_done: perUser.get(participant.user_id) ?? 0,
    })),
    handover_fields: snapshot.handover_fields ?? [],
    server_time: now.toISOString(),
  }, {
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
    },
  });
});
