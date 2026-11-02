import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';

interface RatingInput {
  question_id?: string;
  points_given?: number | string;
  feedback?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (!authResult.ok) return authResult.response;

    const { auth } = authResult;
    const body = await req.json();
    const { session_id, evaluated_id, ratings } = body;

    if (!session_id || !evaluated_id || !Array.isArray(ratings) || ratings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Data evaluasi tidak lengkap' },
        { status: 400 }
      );
    }

    // Identitas penilai selalu berasal dari token, bukan dari body request.
    const evaluatorId = auth.personId;
    if (evaluatorId === evaluated_id) {
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

    // 1. Verifikasi sesi masih dibuka dan berada di cabang yang sama.
    const { data: session, error: sErr } = await supabase
      .from('scorecard_sessions')
      .select('id, title, is_open, branch_id')
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

    if (auth.role !== 'super_admin' && session.branch_id !== auth.branchId) {
      return NextResponse.json(
        { success: false, error: 'Sesi ini bukan milik cabang Anda' },
        { status: 403 }
      );
    }

    // 2. Validasi penerima penilaian.
    const { data: targetPerson, error: pErr } = await supabase
      .from('people')
      .select('id, branch_id')
      .eq('id', evaluated_id)
      .single();

    if (pErr || !targetPerson) {
      return NextResponse.json(
        { success: false, error: 'Rekan kerja yang dinilai tidak ditemukan' },
        { status: 404 }
      );
    }

    if (
      auth.role !== 'super_admin' &&
      targetPerson.branch_id &&
      targetPerson.branch_id !== auth.branchId
    ) {
      return NextResponse.json(
        { success: false, error: 'Tidak dapat menilai rekan dari cabang lain' },
        { status: 403 }
      );
    }

    // 3. Validasi pertanyaan & bobot.
    const { data: questions, error: qErr } = await supabase
      .from('scorecard_questions')
      .select('id, max_points')
      .eq('session_id', session_id);

    if (qErr) throw qErr;

    const questionMap = new Map<string, number>(
      (questions || []).map((question) => [question.id, Number(question.max_points || 10)])
    );

    const seenQuestions = new Set<string>();
    const responsesToInsert = (ratings as RatingInput[]).map((rating) => {
      const questionId = String(rating.question_id || '');
      if (!questionMap.has(questionId)) {
        throw new Error('Pertanyaan tidak termasuk dalam sesi ini');
      }
      if (seenQuestions.has(questionId)) {
        throw new Error('Pertanyaan duplikat dalam satu penilaian');
      }
      seenQuestions.add(questionId);

      const maxPoints = questionMap.get(questionId) ?? 10;
      const rawPoints = Number(rating.points_given ?? 0);
      const score = Math.min(maxPoints, Math.max(0, Number.isFinite(rawPoints) ? rawPoints : 0));

      return {
        session_id,
        question_id: questionId,
        evaluator_id: evaluatorId,
        evaluated_id,
        points_given: score,
        feedback: rating.feedback ? String(rating.feedback).trim().slice(0, 1000) || null : null,
      };
    });

    const totalScoreAwarded = responsesToInsert.reduce(
      (sum, response) => sum + Number(response.points_given),
      0
    );

    // 4. Hitung total sebelumnya agar resubmit tidak menggandakan poin.
    const { data: existingResponses, error: eErr } = await supabase
      .from('scorecard_responses')
      .select('question_id, points_given')
      .eq('session_id', session_id)
      .eq('evaluator_id', evaluatorId)
      .eq('evaluated_id', evaluated_id);

    if (eErr) throw eErr;

    const previousTotal = (existingResponses || []).reduce(
      (sum, response) => sum + Number(response.points_given || 0),
      0
    );

    // 5. Insert atau perbarui setiap respons.
    const { error: insErr } = await supabase
      .from('scorecard_responses')
      .upsert(responsesToInsert, {
        onConflict: 'question_id,evaluator_id,evaluated_id',
      });

    if (insErr) throw insErr;

    // 6. Catat hanya selisih poin. Mengirim ulang skor yang sama = 0 poin baru.
    const delta = totalScoreAwarded - previousTotal;
    if (delta !== 0) {
      await supabase.from('point_logs').insert({
        app_id: 'myperformance',
        user_id: evaluated_id,
        branch_id: session.branch_id,
        activity_type: 'scorecard',
        points_earned: delta,
        points_original: totalScoreAwarded,
        metadata: {
          session_id,
          session_title: session.title,
          evaluator_id: evaluatorId,
          ratingsCount: responsesToInsert.length,
          previous_total: previousTotal,
          delta,
        },
      });
    }

    return NextResponse.json({
      success: true,
      totalScoreAwarded,
      previousTotal,
      delta,
      message: 'Penilaian evaluasi rekan kerja berhasil dikirim',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
