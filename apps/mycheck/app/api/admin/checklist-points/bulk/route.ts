import { NextResponse } from 'next/server';
import { requireRole, withAuth } from '../../../../../lib/api-auth';
import { locateChecklistPoint } from '../../../../../lib/admin/resolve-config';
import { updateChecklistPoint } from '../../../../../lib/admin/template-service';
import { getSupabase } from '@/lib/supabase';
import { validateMasterPoints, logPointMasterChange, buildChangeRecord } from '@mochikin/shared/points';

interface BulkPointItem {
  id: string;
  points: number;
}

export const POST = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus JSON valid' }, { status: 400 });
  }

  const items = (body as { items?: BulkPointItem[] })?.items;
  const reason = (body as { reason?: string })?.reason || 'Bulk edit poin builder';

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items array wajib diisi' }, { status: 400 });
  }

  const supabase = getSupabase();
  const results: { id: string; success: boolean; points?: number; error?: string }[] = [];

  for (const item of items) {
    if (!item.id || item.points === undefined) {
      results.push({ id: item.id || '', success: false, error: 'id atau points tidak valid' });
      continue;
    }

    const pValidation = validateMasterPoints(item.points);
    if (!pValidation.valid) {
      results.push({ id: item.id, success: false, error: pValidation.error });
      continue;
    }

    try {
      const loc = await locateChecklistPoint(ctx, item.id);
      if (!loc) {
        results.push({ id: item.id, success: false, error: 'Checklist point tidak ditemukan' });
        continue;
      }

      await updateChecklistPoint(loc.spreadsheetId, item.id, {
        points: pValidation.value,
      });

      if (supabase) {
        const changeRecord = buildChangeRecord({
          appId: 'mycheck',
          entityType: 'checklist_item',
          entityRef: item.id,
          entityLabel: `Item ${item.id}`,
          oldPoints: null,
          newPoints: pValidation.value,
          action: 'set',
          reason,
          changedBy: ctx.user.username || ctx.user.name || 'admin',
        });
        await logPointMasterChange(supabase, changeRecord).catch(() => {});
      }

      results.push({ id: item.id, success: true, points: pValidation.value });
    } catch (err) {
      results.push({
        id: item.id,
        success: false,
        error: err instanceof Error ? err.message : 'Gagal menyimpan',
      });
    }
  }

  const failedCount = results.filter((r) => !r.success).length;

  return NextResponse.json({
    message: `Berhasil memperbarui ${results.length - failedCount} item${
      failedCount > 0 ? `, ${failedCount} gagal` : ''
    }`,
    results,
  });
});
