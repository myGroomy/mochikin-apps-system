import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { calculateReportContributors } from '@mochikin/shared';
import { emitTaskEvent } from '@mochikin/shared/events';

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
    const { sesiId, cabangId, cabangKode, items, petugas, tanggal, shift } = body;

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

    // 1. Ambil bobot poin master items dari database
    const { data: pointItems } = await supabase
      .from('point_items')
      .select('name, points')
      .eq('app_id', 'stokis');

    const pointMap = new Map<string, number>();
    if (pointItems) {
      pointItems.forEach((pi) => {
        pointMap.set(pi.name.toLowerCase().trim(), Number(pi.points));
      });
    }

    // 2. Hitung total poin dari item yang di-input
    // Setiap item yang dihitung mendapatkan bobot dari pointMap (default: 1.0)
    const validItems: Array<{ name: string; points: number }> = (items || []).map((it: any) => {
      const name = String(it.namaBarang || it.name || '').trim();
      const points = pointMap.get(name.toLowerCase()) ?? 1.0;
      return { name, points };
    });

    const totalPoints = validItems.reduce((acc, curr) => acc + curr.points, 0);

    // 3. Ekstraksi daftar petugas (bisa satu atau multi-petugas comma-separated)
    const petugasRaw = String(petugas || 'Petugas');
    const petugasNames = petugasRaw
      .split(/[,&/]/)
      .map((p) => p.trim())
      .filter(Boolean);
    const petugasList = petugasNames.length > 0 ? petugasNames : ['Petugas'];

    // 4. Petakan user kontributor
    // Cari people record atau gunakan deterministic ID per nama petugas
    const { data: people } = await supabase
      .from('people')
      .select('id, name');

    const peopleMap = new Map<string, string>();
    if (people) {
      people.forEach((p) => {
        peopleMap.set(p.name.toLowerCase().trim(), p.id);
      });
    }

    // Generate completion counts per contributor
    // Bagi item secara adil kepada kontributor yang terdaftar
    const userCompletions: Array<{ userId: string; name: string; points: number }> = [];
    const itemsPerPetugas = Math.ceil(validItems.length / petugasList.length);

    validItems.forEach((it, idx) => {
      const assignedPetugas = petugasList[Math.floor(idx / itemsPerPetugas)] || petugasList[0];
      const matchedUserId = peopleMap.get(assignedPetugas.toLowerCase()) || '00000000-0000-0000-0000-000000000001';
      userCompletions.push({
        userId: matchedUserId,
        name: assignedPetugas,
        points: it.points,
      });
    });

    // 5. Simpan / upsert record di tabel `reports`
    // Cari branch ID
    let branchId = '00000000-0000-0000-0000-000000000001';
    if (cabangId) {
      const { data: branch } = await supabase
        .from('branches')
        .select('id')
        .or(`id.eq.${cabangId},code.eq.${cabangKode || cabangId}`)
        .maybeSingle();
      if (branch) branchId = branch.id;
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

    // 8. Emisi task event STOKIS_OPNAME ke MyPerformance
    for (const c of aggregatedContributors) {
      if (c.user_id && c.user_id !== '00000000-0000-0000-0000-000000000001') {
        try {
          await emitTaskEvent({
            taskId: 'STOKIS_OPNAME',
            personId: c.user_id,
            branchId,
            appId: 'stokis',
            outputQty: 1,
            occurredAt: new Date().toISOString(),
            idempotencyKey: `stokis-so-${sesiId}-${c.user_id}`,
            meta: { sesiId, itemsCount: c.items_count, pointsEarned: c.points_earned },
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
