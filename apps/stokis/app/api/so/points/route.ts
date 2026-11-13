import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { calculateReportContributors, sumPoints } from '@mochikin/shared';
import { emitTaskEvent } from '@mochikin/shared/events';
import { getMasterItems } from '../../../../lib/domain/master-item-service';
import { syncMasterItemsToDimItem } from '../../../../lib/domain/sync-dim-items';
import { enqueueAndProcessOutbox } from '../../../../lib/domain/outbox-service';
import { verifySessionToken } from '../../../../lib/session';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sesiId = searchParams.get('sesiId') || searchParams.get('laporanId');

    if (!sesiId) {
      return NextResponse.json(
        { success: false, error: 'sesiId atau laporanId wajib disertakan' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        report: null,
        contributors: [],
        logs: [],
        message: 'Database tidak terhubung',
      });
    }

    // 1. Ambil report
    const { data: report, error: repErr } = await supabase
      .from('reports')
      .select('*')
      .eq('app_id', 'stokis')
      .eq('source_report_id', sesiId)
      .maybeSingle();

    if (repErr) throw repErr;

    if (!report) {
      return NextResponse.json({
        success: true,
        report: null,
        contributors: [],
        logs: [],
      });
    }

    // 2. Ambil contributors
    const { data: contributors } = await supabase
      .from('report_contributors')
      .select('*')
      .eq('report_id', report.id)
      .order('points_earned', { ascending: false });

    // 3. Ambil point_logs
    const { data: logs } = await supabase
      .from('point_logs')
      .select('*')
      .eq('report_id', report.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      success: true,
      report,
      contributors: contributors || [],
      logs: logs || [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sesiId, cabangId, cabangKode, items, petugas, tanggal, shift, personId: bodyPersonId } = body;

    if (!sesiId) {
      return NextResponse.json(
        { success: false, error: 'sesiId wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        message: 'Database tidak terhubung (demo mode)',
      });
    }

    // 1. Ambil bobot poin master item dari Google Sheets (prioritas utama)
    const masterPointMap = new Map<string, number>();
    const masterNameMap = new Map<string, number>();
    if (cabangId) {
      try {
        // Sinkronisasi item master ke katalog server dim_item
        syncMasterItemsToDimItem(cabangId, supabase).catch(() => {});

        const masterItems = await getMasterItems(cabangId);
        for (const mi of masterItems as any[]) {
          if (mi.Point !== null && mi.Point !== undefined && !isNaN(Number(mi.Point))) {
            if (mi.Item_ID) masterPointMap.set(String(mi.Item_ID), Number(mi.Point));
            if (mi.Nama_Barang) masterNameMap.set(String(mi.Nama_Barang).toLowerCase().trim(), Number(mi.Point));
          }
        }
      } catch (err) {
        console.warn('[stokis:points] Gagal membaca master item points dari sheets:', err);
      }
    }

    // 2. Ambil fallback point_items dari database Supabase (legacy)
    const { data: pointItems } = await supabase
      .from('point_items')
      .select('name, points')
      .eq('app_id', 'stokis');

    const legacyPointMap = new Map<string, number>();
    if (pointItems) {
      pointItems.forEach((pi) => {
        legacyPointMap.set(pi.name.toLowerCase().trim(), Number(pi.points));
      });
    }

    // 3. Hitung bobot poin setiap item sesuai urutan prioritas:
    //    1. Master item Point
    //    2. Supabase legacy point_items (dengan console.warn)
    //    3. Default 1.0
    const validItems: Array<{ name: string; points: number }> = (items || []).map((it: any) => {
      const name = String(it.namaBarang || it.name || '').trim();
      const itemId = String(it.itemId || it.Item_ID || '').trim();
      const nameKey = name.toLowerCase();

      let points: number;
      if (itemId && masterPointMap.has(itemId)) {
        points = masterPointMap.get(itemId)!;
      } else if (nameKey && masterNameMap.has(nameKey)) {
        points = masterNameMap.get(nameKey)!;
      } else if (nameKey && legacyPointMap.has(nameKey)) {
        points = legacyPointMap.get(nameKey)!;
        console.warn(`[stokis:points] item "${name}" falling back to legacy point_items (${points})`);
      } else {
        points = 1.0;
      }

      return { name, points };
    });

    const totalPoints = sumPoints(validItems.map((v) => v.points));

    // 3. Ekstraksi daftar petugas (bisa satu atau multi-petugas comma-separated)
    const petugasRaw = String(petugas || 'Petugas');
    const petugasNames = petugasRaw
      .split(/[,&/]/)
      .map((p) => p.trim())
      .filter(Boolean);
    const petugasList = petugasNames.length > 0 ? petugasNames : ['Petugas'];

    // 4. Petakan user kontributor
    const sessionCookie = req.cookies.get('stokis_session')?.value;
    const session = sessionCookie ? verifySessionToken(sessionCookie) : null;
    const callerPersonId =
      bodyPersonId ||
      req.cookies.get('mochikin_person_id')?.value ||
      session?.personId ||
      null;

    const { data: people } = await supabase
      .from('people')
      .select('id, name, branch_id');

    const peopleMap = new Map<string, { id: string; branchId?: string }>();
    if (people) {
      people.forEach((p) => {
        peopleMap.set(p.name.toLowerCase().trim(), { id: p.id, branchId: p.branch_id });
      });
    }

    let defaultUserBranchId: string | undefined;

    // Generate completion counts per contributor
    // Bagi item secara adil kepada kontributor yang terdaftar
    const userCompletions: Array<{ userId: string; name: string; points: number }> = [];
    const itemsPerPetugas = Math.ceil(validItems.length / petugasList.length);

    validItems.forEach((it, idx) => {
      const assignedPetugas = petugasList[Math.floor(idx / itemsPerPetugas)] || petugasList[0];
      const pMatch = peopleMap.get(assignedPetugas.toLowerCase().trim());
      let matchedUserId = pMatch?.id;
      let matchedBranchId = pMatch?.branchId;

      if (!matchedUserId && callerPersonId) {
        matchedUserId = callerPersonId;
        const callerRecord = people?.find((p) => p.id === callerPersonId);
        if (callerRecord?.branch_id) matchedBranchId = callerRecord.branch_id;
      }
      if (!matchedUserId && session?.nama) {
        const byNama = peopleMap.get(session.nama.toLowerCase().trim());
        if (byNama) {
          matchedUserId = byNama.id;
          matchedBranchId = byNama.branchId;
        }
      }
      if (!matchedUserId && people && people.length > 0) {
        matchedUserId = people[0].id;
        matchedBranchId = people[0].branch_id;
      }
      if (!matchedUserId) {
        matchedUserId = '00000000-0000-0000-0000-000000000001';
      }
      if (matchedBranchId) {
        defaultUserBranchId = matchedBranchId;
      }

      userCompletions.push({
        userId: matchedUserId,
        name: assignedPetugas,
        points: it.points,
      });
    });

    // 5. Simpan / upsert record di tabel `reports`
    // Cari branch ID (prioritaskan branch UUID resmi yang sesuai dengan data user)
    let branchId = defaultUserBranchId || '00000000-0000-0000-0000-000000000001';
    if (cabangId || cabangKode) {
      const target = String(cabangKode || cabangId).trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);
      const query = isUuid
        ? supabase.from('branches').select('id').eq('id', target).maybeSingle()
        : supabase.from('branches').select('id').ilike('code', target).maybeSingle();
      const { data: branch } = await query;
      if (branch?.id) {
        branchId = branch.id;
      }
    }

    const { data: report, error: repErr } = await supabase
      .from('reports')
      .upsert(
        {
          app_id: 'stokis',
          branch_id: branchId,
          source_report_id: sesiId,
          status: 'submitted',
          total_points: totalPoints,
          metadata: { tanggal, shift, cabangKode, totalItems: validItems.length },
        },
        { onConflict: 'app_id,source_report_id' }
      )
      .select()
      .single();

    if (repErr) throw repErr;

    const aggregatedContributors = calculateReportContributors(report.id, userCompletions);

    // 6. Simpan report_contributors
    if (report && aggregatedContributors.length > 0) {
      // Hapus yang lama jika re-submit
      await supabase.from('report_contributors').delete().eq('report_id', report.id);

      const contributorsToInsert = aggregatedContributors.map((c) => ({
        report_id: report.id,
        user_id: c.user_id,
        items_completed: c.items_count,
        points_earned: c.points_earned,
        share_percentage: totalPoints > 0 ? (c.points_earned / totalPoints) * 100 : 0,
      }));

      await supabase.from('report_contributors').insert(contributorsToInsert);
    }

    // 7. Simpan granular log di `point_logs`
    if (report && userCompletions.length > 0) {
      await supabase.from('point_logs').delete().eq('report_id', report.id);

      const logsToInsert = userCompletions.map((uc) => ({
        app_id: 'stokis',
        user_id: uc.userId,
        branch_id: branchId,
        activity_type: 'so_item',
        points_earned: uc.points,
        points_original: uc.points,
        report_id: report.id,
        metadata: { item_name: uc.name, sesi_id: sesiId },
      }));

      await supabase.from('point_logs').insert(logsToInsert);
    }

    // 8. Emisi task event STOKIS_OPNAME ke MyPerformance & PointOutbox
    for (const c of aggregatedContributors) {
      if (c.user_id && c.user_id !== '00000000-0000-0000-0000-000000000001') {
        const contributorLines = userCompletions
          .filter((uc) => uc.userId === c.user_id)
          .map((uc) => ({
            itemCode: uc.name,
            qty: 1,
            lineRef: uc.name,
          }));

        const sessionPayload = {
          appId: 'stokis' as const,
          taskCode: 'STOKIS_OPNAME',
          personId: c.user_id,
          branchId,
          shiftDate: (tanggal || new Date().toISOString().slice(0, 10)),
          occurredAt: new Date().toISOString(),
          sessionRef: sesiId,
          idempotencyKey: `stokis-so-${sesiId}-${c.user_id}`,
          meta: { sesiId, itemsCount: c.items_count, pointsEarned: c.points_earned },
          lines: contributorLines.length > 0 ? contributorLines : undefined,
        };

        // Kirim via PointOutbox sheet lokal
        if (cabangId) {
          enqueueAndProcessOutbox(cabangId, {
            eventType: 'session_ingest',
            idempotencyKey: sessionPayload.idempotencyKey,
            payload: sessionPayload,
          }).catch((err: unknown) => console.warn('⚠️ Stokis Outbox enqueue warning:', err));
        }

        // Tetap emit legacy event untuk backward compatibility
        try {
          await emitTaskEvent({
            taskId: 'STOKIS_OPNAME',
            personId: c.user_id,
            branchId,
            appId: 'stokis',
            outputQty: 1,
            occurredAt: new Date().toISOString(),
            idempotencyKey: sessionPayload.idempotencyKey,
            meta: sessionPayload.meta,
          });
        } catch (emitErr) {
          console.warn('⚠️ emitTaskEvent to MyPerformance failed:', emitErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      reportId: report?.id,
      totalPoints,
      contributors: aggregatedContributors,
      message: 'Poin SO berhasil dicatat',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
