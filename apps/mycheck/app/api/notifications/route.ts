// app/api/notifications/route.ts Phase 4 (Sheets).
// GET 50 notifikasi terbaru user dari sheet statis Notifications per cabang.
import { NextResponse } from 'next/server';
import { withAuth } from '../../../lib/api-auth';
import { resolveCabang, getCabangList } from '../../../lib/google/registry';
import { asStr, filterRows } from '../../../lib/store';

export const GET = // eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
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
