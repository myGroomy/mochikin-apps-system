import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || 'staff'; // 'admin' | 'manager' | 'staff'
    const currentUserId = searchParams.get('user_id');

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database tidak tersedia' }, { status: 500 });
    }

    // 1. Ambil sesi
    const { data: session, error: sErr } = await supabase
      .from('scorecard_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sErr || !session) {
      return NextResponse.json({ success: false, error: 'Sesi evaluasi tidak ditemukan' }, { status: 404 });
    }

    // 2. Ambil pertanyaan
    const { data: questions, error: qErr } = await supabase
      .from('scorecard_questions')
      .select('*')
      .eq('session_id', id)
      .order('sort_order');

    if (qErr) throw qErr;

    // 3. Ambil respons penilaian
    const { data: responses, error: rErr } = await supabase
      .from('scorecard_responses')
      .select('*')
      .eq('session_id', id);

    if (rErr) throw rErr;

    // 4. Ambil master data people
    const { data: people } = await supabase.from('people').select('id, name');
    const peopleMap: Record<string, string> = {};
    (people || []).forEach((p) => {
      peopleMap[p.id] = p.name;
    });

    // 5. Agregasi hasil penilaian
    // Hitung rata-rata & total poin yang diterima setiap orang
    const evaluatedMap: Record<
      string,
      {
        personId: string;
        personName: string;
        totalScore: number;
        responseCount: number;
        averageScore: number;
        feedbackList: string[];
      }
    > = {};

    (responses || []).forEach((r) => {
      if (!evaluatedMap[r.evaluated_id]) {
        evaluatedMap[r.evaluated_id] = {
          personId: r.evaluated_id,
          personName: peopleMap[r.evaluated_id] || `Petugas (${r.evaluated_id.slice(0, 6)})`,
          totalScore: 0,
          responseCount: 0,
          averageScore: 0,
          feedbackList: [],
        };
      }

      evaluatedMap[r.evaluated_id].totalScore += Number(r.points_given || 0);
      evaluatedMap[r.evaluated_id].responseCount += 1;
      if (r.feedback && r.feedback.trim()) {
        evaluatedMap[r.evaluated_id].feedbackList.push(r.feedback.trim());
      }
    });

    Object.values(evaluatedMap).forEach((e) => {
      e.averageScore = e.responseCount > 0 ? Number((e.totalScore / e.responseCount).toFixed(1)) : 0;
    });

    const summaryResults = Object.values(evaluatedMap).sort((a, b) => b.totalScore - a.totalScore);

    // Filter berdasarkan role:
    // Jika staff: anonim (hanya melihat hasil ringkasan per orang / milik sendiri tanpa tahu evaluator_id)
    const isAdmin = role === 'admin' || role === 'manager' || role === 'owner';

    const sanitizedResponses = (responses || []).map((r) => {
      if (isAdmin) {
        return {
          id: r.id,
          questionId: r.question_id,
          evaluatorId: r.evaluator_id,
          evaluatorName: peopleMap[r.evaluator_id] || 'Evaluator',
          evaluatedId: r.evaluated_id,
          evaluatedName: peopleMap[r.evaluated_id] || 'Petugas',
          pointsGiven: Number(r.points_given),
          feedback: r.feedback,
          createdAt: r.created_at,
        };
      }
      // Anonim: evaluator_id disembunyikan
      return {
        id: r.id,
        questionId: r.question_id,
        evaluatedId: r.evaluated_id,
        evaluatedName: peopleMap[r.evaluated_id] || 'Petugas',
        pointsGiven: Number(r.points_given),
        feedback: r.feedback,
        createdAt: r.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      session,
      questions: questions || [],
      summaryResults,
      responses: sanitizedResponses,
      isAdmin,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database tidak tersedia' }, { status: 500 });
    }

    const { data: session, error } = await supabase
      .from('scorecard_sessions')
      .update({
        is_open: false,
        closed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      session,
      message: 'Sesi evaluasi berhasil ditutup secara final',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
