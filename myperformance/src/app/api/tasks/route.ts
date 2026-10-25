import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth-guard';
import { getSupabaseAnon, getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = getAuthContext(request as never);
  // task_definitions is readable by all authenticated roles (RLS in 009).
  void auth;

  try {
    const { data, error } = await getSupabaseAnon()
      .from('task_definitions')
      .select('*')
      .order('task_code');
    if (error) {
      return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: err instanceof Error ? err.message : 'Gagal' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = getAuthContext(request as never);
  if (auth.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Hanya super admin yang dapat menambah task' } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { data, error } = await getSupabaseAdmin()
      .from('task_definitions')
      .insert([body])
      .select()
      .single();
    if (error) {
      return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 400 });
    }
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: err instanceof Error ? err.message : 'Invalid request' } },
      { status: 400 }
    );
  }
}
