import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, evaluator_id, evaluated_id, ratings } = body;

    if (!session_id || !evaluator_id || !evaluated_id || !Array.isArray(ratings)) {
      return NextResponse.json(
        { success: false, error: 'Data evaluasi tidak lengkap' },
        { status: 400 }
      );
    }

    if (evaluator_id === evaluated_id) {
      return NextResponse.json(
        { success: false, error: 'Tidak dapat menilai diri sendiri' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database tidak tersedia' },
        { status: 500 }
      );
    }

    // 1. Verifikasi sesi masih dibuka
    const { data: session, error: sErr } = await supabase
      .from('scorecard_sessions')
      .select('id, branch_id, is_open, title')
      .eq('id', session_id)
      .single();

    if (sErr || !session) {
      return NextResponse.json(
        { success: false, error: 'Sesi evaluasi tidak ditemukan' },
        { status: 404 }
      );
    }

    if (!session.is_open) {
      return NextResponse.json(
        { success: false, error: 'Sesi evaluasi sudah ditutup' },
        { status: 400 }
      );
    }

    // 2. Insert atau upsert setiap response
    let totalScoreAwarded = 0;
    const responsesToInsert = ratings.map((r: any) => {
      const score = Math.max(0, Number(r.points_given || 0));
      totalScoreAwarded += score;
      return {
        session_id,
        question_id: r.question_id,
        evaluator_id,
        evaluated_id,
        points_given: score,
        feedback: r.feedback || null,
      };
    });

    const { error: insErr } = await supabase
      .from('scorecard_responses')
      .upsert(responsesToInsert, {
        onConflict: 'question_id,evaluator_id,evaluated_id',
      });

    if (insErr) throw insErr;

    // 3. Catat transaksi poin ke point_logs untuk pihak yang dinilai (evaluated_id)
    if (totalScoreAwarded > 0) {
      await supabase.from('point_logs').insert({
        app_id: 'myperformance',
        user_id: evaluated_id,
        branch_id: session.branch_id,
        activity_type: 'scorecard',
        points_earned: totalScoreAwarded,
        points_original: totalScoreAwarded,
        metadata: {
          session_id,
          session_title: session.title,
          evaluator_id,
          ratingsCount: ratings.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      totalScoreAwarded,
      message: 'Penilaian evaluasi rekan kerja berhasil dikirim',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
