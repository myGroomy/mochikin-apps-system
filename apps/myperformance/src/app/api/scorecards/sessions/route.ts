import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthContext, requireAuth } from '@/lib/auth-guard';
import { getRoleCapabilities } from '@/lib/roles';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    const capabilities = getRoleCapabilities(auth.role);
    const requestedBranch = new URL(req.url).searchParams.get('branch_id');

    // Staff/lead hanya melihat sesi cabangnya sendiri. Hanya super admin yang
    // boleh meminta cabang lain atau melihat seluruh cabang.
    const branchId = capabilities.canViewAllBranches
      ? requestedBranch
      : auth.branchId || '00000000-0000-0000-0000-000000000000';

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: true, sessions: [] });
    }

    let query = supabase
      .from('scorecard_sessions')
      .select('id, branch_id, title, opened_by, opened_at, closed_at, is_open, created_at')
      .order('created_at', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data: sessions, error } = await query;
    if (error) throw error;

    // Ambil jumlah pertanyaan per sesi
    const sessionIds = (sessions || []).map((s) => s.id);
    const questionCountMap: Record<string, number> = {};
    const responseCountMap: Record<string, number> = {};

    if (sessionIds.length > 0) {
      const { data: qData } = await supabase
        .from('scorecard_questions')
        .select('session_id')
        .in('session_id', sessionIds);

      (qData || []).forEach((q) => {
        questionCountMap[q.session_id] = (questionCountMap[q.session_id] || 0) + 1;
      });

      const { data: rData } = await supabase
        .from('scorecard_responses')
        .select('session_id')
        .in('session_id', sessionIds);

      (rData || []).forEach((r) => {
        responseCountMap[r.session_id] = (responseCountMap[r.session_id] || 0) + 1;
      });
    }

    const enriched = (sessions || []).map((s) => ({
      ...s,
      questionCount: questionCountMap[s.id] || 0,
      responseCount: responseCountMap[s.id] || 0,
    }));

    return NextResponse.json({ success: true, sessions: enriched });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (!authResult.ok) return authResult.response;

    const { auth } = authResult;
    const capabilities = getRoleCapabilities(auth.role);
    if (!capabilities.canManageScorecards) {
      return NextResponse.json(
        { success: false, error: 'Hanya Manajer atau Admin yang dapat membuka sesi' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, questions, branch_id } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json(
        { success: false, error: 'Judul sesi evaluasi wajib diisi' },
        { status: 400 }
      );
    }

    if (questions !== undefined && !Array.isArray(questions)) {
      return NextResponse.json(
        { success: false, error: 'Daftar pertanyaan tidak valid' },
        { status: 400 }
      );
    }

    const questionsList: Array<{ question_text: string; max_points?: number; sort_order?: number }> =
      Array.isArray(questions) && questions.length > 0
        ? questions
        : [
            { question_text: 'Tanggung jawab dan ketepatan waktu dalam tugas harian', max_points: 10 },
            { question_text: 'Komunikasi dan kerjasama tim antar rekan kerja', max_points: 10 },
            { question_text: 'Kerapian, kebersihan, dan standar operasional kerja', max_points: 10 },
          ];

    if (questionsList.length > 20) {
      return NextResponse.json(
        { success: false, error: 'Maksimal 20 pertanyaan per sesi' },
        { status: 400 }
      );
    }

    const invalidQuestion = questionsList.find((question) => {
      const max = Number(question.max_points ?? 10);
      return !question.question_text?.trim() || !Number.isFinite(max) || max < 1 || max > 50;
    });
    if (invalidQuestion) {
      return NextResponse.json(
        { success: false, error: 'Teks pertanyaan wajib diisi dan bobot harus 1–50 poin' },
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

    // Cabang ditentukan server. Super admin boleh menentukan cabang lain.
    const branchId = capabilities.canViewAllBranches && branch_id ? branch_id : auth.branchId;
    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'Cabang pengguna tidak ditemukan' },
        { status: 400 }
      );
    }

    // Pastikan opened_by valid terhadap tabel people, atau null jika tidak terdaftar
    let openedBy: string | null = auth.personId;
    if (openedBy) {
      const { data: personExists } = await supabase
        .from('people')
        .select('id')
        .eq('id', openedBy)
        .maybeSingle();
      if (!personExists) {
        openedBy = null;
      }
    }

    // 1. Buat sesi
    const { data: session, error: sErr } = await supabase
      .from('scorecard_sessions')
      .insert({
        branch_id: branchId,
        title: String(title).trim(),
        opened_by: openedBy,
        is_open: true,
      })
      .select()
      .single();

    if (sErr) throw sErr;

    // 2. Buat daftar pertanyaan
    const questionsToInsert = questionsList.map((q, idx) => ({
      session_id: session.id,
      question_text: q.question_text.trim(),
      max_points: Number(q.max_points ?? 10),
      sort_order: q.sort_order ?? idx + 1,
    }));

    const { data: createdQuestions, error: qErr } = await supabase
      .from('scorecard_questions')
      .insert(questionsToInsert)
      .select();

    if (qErr) {
      // Jangan tinggalkan sesi tanpa pertanyaan jika insert pertanyaan gagal.
      await supabase.from('scorecard_sessions').delete().eq('id', session.id);
      throw qErr;
    }

    return NextResponse.json({
      success: true,
      session,
      questions: createdQuestions,
      message: 'Sesi evaluasi scorecard berhasil dibuka',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
