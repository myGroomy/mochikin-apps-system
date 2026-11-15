// app/api/notifications/route.ts Phase 4 (Sheets) & Supabase Dual-Path.
// GET 50 notifikasi terbaru user dari Supabase mycheck_notifications atau fallback ke sheet statis Notifications.
import { NextResponse } from 'next/server';
import { withAuth } from '../../../lib/api-auth';
import { resolveCabang, getCabangList } from '../../../lib/google/registry';
import { asStr, filterRows } from '../../../lib/store';
import { getSupabase } from '../../../lib/supabase';

export const GET =
withAuth(async (_req, ctx, _session) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const targetUserId = isUuid.test(ctx.user.id)
        ? ctx.user.id
        : (ctx.user.personId && isUuid.test(ctx.user.personId) ? ctx.user.personId : ctx.user.id);

      const { data, error } = await supabase
        .from('mycheck_notifications')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        const items = data.map((row) => {
          const isRead = Boolean(row.is_read);
          const createdAt = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
          return {
            id: String(row.id),
            type: String(row.type || ''),
            payload: {
              title: String(row.title || ''),
              body: String(row.body || ''),
              link: row.link ? String(row.link) : null,
            },
            read_at: isRead ? createdAt : null,
            created_at: createdAt,
          };
        });
        const response = NextResponse.json({ items });
        response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
        return response;
      }
    } catch {
      // Fallback ke Google Sheets
    }
  }
  const cabangs = await getCabangList();
  const targetCabangs = cabangs.filter(
    (c) => ctx.branchIds.includes(c.Cabang_ID) && Boolean(c.Spreadsheet_ID)
  );

  const results = await Promise.all(
    targetCabangs.map(async (cabang) => {
      try {
        const { spreadsheetId } = await resolveCabang(cabang.Cabang_ID);
        const rows = await filterRows(spreadsheetId, 'Notifications', (r) => asStr(r['user_id']) === ctx.user.id);
        return rows.map((r) => {
          const readRaw = asStr(r['is_read']);
          const isRead = readRaw.toLowerCase() === 'true' || readRaw === '1';
          const createdAt = asStr(r['created_at']);
          return {
            id: asStr(r['id']),
            type: asStr(r['type']),
            payload: { title: asStr(r['title']), body: asStr(r['body']), link: asStr(r['link']) || null },
            read_at: isRead ? createdAt : null,
            created_at: createdAt,
          };
        });
      } catch {
        return [];
      }
    })
  );

  const items = results.flat().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
  const response = NextResponse.json({ items });
  response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
  return response;
});
