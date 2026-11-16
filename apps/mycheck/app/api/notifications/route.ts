import { NextResponse } from 'next/server';
import { withAuth } from '../../../lib/api-auth';
import { getSupabase } from '../../../lib/supabase';

export const GET = withAuth(async (_req, ctx) => {
  const { data, error } = await getSupabase()
    .from('mycheck_notifications')
    .select('id,type,title,body,link,is_read,created_at')
    .eq('user_id', ctx.user.personId ?? ctx.user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('MyCheck notification list failed:', error);
    return NextResponse.json({ error: 'Notifikasi tidak dapat dimuat.' }, { status: 500 });
  }

  const items = (data ?? []).map((row) => {
    const createdAt = new Date(row.created_at).toISOString();
    return {
      id: String(row.id),
      type: String(row.type),
      payload: {
        title: String(row.title),
        body: String(row.body),
        link: row.link ? String(row.link) : null,
      },
      read_at: row.is_read ? createdAt : null,
      created_at: createdAt,
    };
  });
  const response = NextResponse.json({ items });
  response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
  return response;
});
