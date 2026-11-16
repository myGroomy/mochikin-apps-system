import { NextResponse } from 'next/server';
import { withAuth } from '../../../../../lib/api-auth';
import { getSupabase } from '../../../../../lib/supabase';

const markAsRead = withAuth(async (req, ctx) => {
  const notificationId = new URL(req.url).pathname.split('/').slice(-2)[0];
  const { data, error } = await getSupabase()
    .from('mycheck_notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', ctx.user.personId ?? ctx.user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('MyCheck notification update failed:', error);
    return NextResponse.json({ error: 'Notifikasi tidak dapat diperbarui.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Notifikasi tidak ditemukan' }, { status: 404 });
  return NextResponse.json({ status: 'dibaca', notification_id: notificationId });
});

export const POST = markAsRead;
export const PATCH = markAsRead;
