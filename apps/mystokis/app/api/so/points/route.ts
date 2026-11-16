import { NextRequest, NextResponse } from 'next/server';
import { emitSessionEvent } from '@mochikin/shared/events';
import { assertCabangAccess, withAuth } from '@/lib/auth';
import { syncMasterItemsToDimItem } from '@/lib/domain/sync-dim-items';
import { partitionOpnameLines } from '@/lib/domain/stokis-points';
import { getSupabase } from '@/lib/supabase';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export const GET = withAuth(async (req: NextRequest, _ctx, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get('sesiId') || searchParams.get('laporanId');
    if (!target) return jsonError('sesiId atau laporanId wajib disertakan', 400);

    const supabase = getSupabase();
    let reportQuery = supabase.from('app_reports').select('*').eq('app_id', 'stokis');
    reportQuery = isUuid(target)
      ? reportQuery.eq('id', target)
      : reportQuery.eq('source_ref', target);
    const { data: report, error: reportError } = await reportQuery.maybeSingle();
    if (reportError) throw reportError;
    if (!report) {
      return NextResponse.json({ success: true, report: null, contributors: [], logs: [] });
    }

    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('code')
      .eq('id', report.branch_id)
      .single();
    if (branchError) throw branchError;
    const accessError = assertCabangAccess(session, branch.code);
    if (accessError) return accessError;

    const { data: events, error: eventsError } = await supabase
      .from('point_event')
      .select('event_id, person_id, points, kind, occurred_at')
      .eq('app_id', 'stokis')
      .eq('session_ref', report.source_ref)
      .order('occurred_at', { ascending: true });
    if (eventsError) throw eventsError;

    const eventIds = (events || []).map((event) => event.event_id);
    const { data: lines, error: linesError } = eventIds.length
      ? await supabase
          .from('point_event_line')
          .select('line_id, event_id, item_id, points, kind, reverses_line_id')
          .in('event_id', eventIds)
      : { data: [], error: null };
    if (linesError) throw linesError;

    const itemIds = Array.from(new Set((lines || []).map((line) => line.item_id)));
    const { data: items, error: itemsError } = itemIds.length
      ? await supabase.from('dim_item').select('item_id, item_code, item_name').in('item_id', itemIds)
      : { data: [], error: null };
    if (itemsError) throw itemsError;

    const itemById = new Map((items || []).map((item) => [item.item_id, item]));
    const peopleIds = Array.from(new Set((events || []).map((event) => event.person_id)));
    const { data: people, error: peopleError } = peopleIds.length
      ? await supabase.from('people').select('id, name').in('id', peopleIds)
      : { data: [], error: null };
    if (peopleError) throw peopleError;
    const personNames = new Map((people || []).map((person) => [person.id, person.name]));
    const eventById = new Map((events || []).map((event) => [event.event_id, event]));
    const reversedPoints = new Map<number, number>();
    for (const line of lines || []) {
      if (line.kind === 'reversal' && line.reverses_line_id) {
        reversedPoints.set(
          line.reverses_line_id,
          (reversedPoints.get(line.reverses_line_id) || 0) + Number(line.points)
        );
      }
    }

    const logs = (lines || [])
      .filter((line) => line.kind === 'earn')
      .map((line) => {
        const event = eventById.get(line.event_id);
        const item = itemById.get(line.item_id);
        return {
          id: String(line.line_id),
          person_id: event?.person_id,
          userName: event ? personNames.get(event.person_id) || 'Petugas' : 'Petugas',
          points_original: Number(line.points),
          points_earned: Number(line.points) + (reversedPoints.get(line.line_id) || 0),
          activity_type: 'so_item',
          metadata: { item_name: item?.item_name || item?.item_code || 'Item SO' },
        };
      });

    const contributorTotals = new Map<string, { items_completed: number; points_earned: number }>();
    for (const event of events || []) {
      const current = contributorTotals.get(event.person_id) || { items_completed: 0, points_earned: 0 };
      current.points_earned += Number(event.points);
      if (event.kind === 'earn') {
        current.items_completed += (lines || []).filter(
          (line) => line.event_id === event.event_id && line.kind === 'earn'
        ).length;
      }
      contributorTotals.set(event.person_id, current);
    }

    const totalPoints = (events || []).reduce((total, event) => total + Number(event.points), 0);
    const contributors = Array.from(contributorTotals, ([user_id, values]) => ({
      user_id,
      name: personNames.get(user_id) || 'Petugas',
      ...values,
    })).sort((a, b) => b.points_earned - a.points_earned);

    return NextResponse.json({
      success: true,
      report: { ...report, total_points: totalPoints },
      contributors,
      logs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Kesalahan server';
    return jsonError(message, 500);
  }
});

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  try {
    const body = await req.json();
    const sesiId = typeof body?.sesiId === 'string' ? body.sesiId.trim() : '';
    if (!sesiId) return jsonError('sesiId wajib diisi', 400);

    const supabase = getSupabase();
    const { data: opname, error: opnameError } = await supabase
      .from('stokis_opnames')
      .select('id, sesi_id, branch_id, branch_code, opname_date, shift_type, petugas')
      .eq('sesi_id', sesiId)
      .single();
    if (opnameError || !opname) return jsonError('Sesi stock opname tidak ditemukan', 404);
    if (!opname.branch_id || !opname.branch_code) {
      return jsonError('Sesi stock opname belum memiliki cabang Supabase yang valid', 409);
    }
    const accessError = assertCabangAccess(session, opname.branch_code);
    if (accessError) return accessError;

    const { data: existingReport, error: existingReportError } = await supabase
      .from('app_reports')
      .select('id, branch_id, status')
      .eq('app_id', 'stokis')
      .eq('source_ref', sesiId)
      .maybeSingle();
    if (existingReportError) throw existingReportError;
    if (existingReport) {
      if (existingReport.branch_id !== opname.branch_id) {
        return jsonError('Laporan dan sesi opname menunjuk cabang yang berbeda', 409);
      }
      const { data: events, error: eventsError } = await supabase
        .from('point_event')
        .select('points')
        .eq('app_id', 'stokis')
        .eq('session_ref', sesiId);
      if (eventsError) throw eventsError;
      const totalPoints = (events || []).reduce((total, event) => total + Number(event.points), 0);
      return NextResponse.json({
        success: true,
        reportId: existingReport.id,
        totalPoints,
        message: 'Poin sesi stock opname sudah tercatat',
      });
    }

    const { data: lines, error: linesError } = await supabase
      .from('stokis_opname_lines')
      .select('id, item_code, item_name')
      .eq('opname_id', opname.id)
      .order('created_at', { ascending: true });
    if (linesError) throw linesError;
    if (!lines?.length) return jsonError('Sesi stock opname tidak memiliki item', 409);

    const { data: actor, error: actorError } = await supabase
      .from('people')
      .select('id, name')
      .eq('username', session.username)
      .eq('status', 'active')
      .maybeSingle();
    if (actorError) throw actorError;
    if (!actor) return jsonError('Identitas pengguna tidak lagi aktif di Supabase', 403);

    const { data: memberships, error: membershipError } = await supabase
      .from('branch_members')
      .select('person_id')
      .eq('branch_id', opname.branch_id)
      .eq('is_active', true);
    if (membershipError) throw membershipError;
    const personIds = Array.from(new Set([...(memberships || []).map((member) => member.person_id), actor.id]));
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('id, name, status')
      .in('id', personIds)
      .eq('status', 'active');
    if (peopleError) throw peopleError;
    const peopleByName = new Map(
      (people || []).map((person) => [person.name.trim().toLowerCase(), person])
    );

    const petugasNames = String(opname.petugas || actor.name)
      .split(/[,&/]/)
      .map((name) => name.trim())
      .filter(Boolean);
    const resolvedContributors = petugasNames.map((name) => peopleByName.get(name.toLowerCase()));
    if (!resolvedContributors.length || resolvedContributors.some((person) => !person)) {
      return jsonError('Semua petugas sesi harus terdaftar dan aktif sebagai anggota cabang di Supabase', 409);
    }
    const contributors = Array.from(
      new Map(resolvedContributors.map((person) => [person!.id, person!])).values()
    );

    const sync = await syncMasterItemsToDimItem(opname.branch_code, supabase);
    const itemCodes = new Set(sync.items.map((item) => item.itemCode));
    const missingItems = lines.filter((line) => !itemCodes.has(line.item_code));
    if (missingItems.length) {
      return jsonError(`Item belum tersedia di katalog poin Supabase: ${missingItems.map((item) => item.item_code).join(', ')}`, 409);
    }

    const byPerson = partitionOpnameLines(lines, contributors);

    const eventResults = [];
    for (const person of contributors) {
      if (!person) continue;
      const personLines = byPerson.get(person.id) || [];
      if (!personLines.length) continue;
      const result = await emitSessionEvent({
        appId: 'stokis',
        taskCode: 'STOKIS_OPNAME',
        personId: person.id,
        branchId: opname.branch_id,
        shiftDate: opname.opname_date,
        occurredAt: new Date().toISOString(),
        sessionRef: sesiId,
        idempotencyKey: `stokis-so-${sesiId}-${person.id}`,
        meta: { sesiId, itemsCount: personLines.length },
        lines: personLines.map((line) => ({
          itemCode: line.item_code,
          qty: 1,
          lineRef: line.id,
        })),
      });
      if (!result.success) {
        return jsonError(`Gagal mencatat poin di Supabase: ${result.error || 'MyPerformance event ingest gagal'}`, 502);
      }
      eventResults.push({
        user_id: person.id,
        name: person.name,
        items_count: personLines.length,
        points_earned: Number(result.points || 0),
      });
    }

    const totalPoints = eventResults.reduce((total, event) => total + event.points_earned, 0);
    const reportValues = {
      app_id: 'stokis',
      branch_id: opname.branch_id,
      source_ref: sesiId,
      period_label: `${opname.opname_date} (${opname.shift_type})`,
      period_start: `${opname.opname_date}T00:00:00.000Z`,
      period_end: `${opname.opname_date}T23:59:59.999Z`,
      total_points: totalPoints,
      metadata: {
        sesiId,
        cabangKode: opname.branch_code,
        shift: opname.shift_type,
        totalItems: lines.length,
      },
      summary: { contributors: eventResults },
    };
    const { data: report, error: reportError } = await supabase
      .from('app_reports')
      .insert({
        ...reportValues,
        status: 'submitted',
        created_by: actor.id,
      })
      .select()
      .single();
    if (reportError) {
      if (reportError.code !== '23505') throw reportError;
      const { data: racedReport, error: racedReportError } = await supabase
        .from('app_reports')
        .select('id')
        .eq('app_id', 'stokis')
        .eq('source_ref', sesiId)
        .single();
      if (racedReportError) throw racedReportError;
      return NextResponse.json({
        success: true,
        reportId: racedReport.id,
        totalPoints,
        message: 'Poin sesi stock opname sudah tercatat',
      });
    }

    return NextResponse.json({
      success: true,
      reportId: report.id,
      totalPoints,
      contributors: eventResults,
      message: 'Poin SO berhasil dicatat',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Kesalahan server';
    return jsonError(message, 500);
  }
});
