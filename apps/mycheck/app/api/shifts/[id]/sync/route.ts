import { NextResponse } from 'next/server';
import { requireBranchAccess, withAuth } from '../../../../../lib/api-auth';
import { resolveInstance } from '../../../../../lib/instance-resolver';
import { flushBufferedShift, isShiftBufferEnabled } from '../../../../../lib/shift-buffer';
import { notifySync, shiftParticipantIds } from '../../../../../lib/notify-events';
import { hashSnapshot } from '../../../../../lib/db/snapshot';
import { updateRow } from '../../../../../lib/store';
import { resolveShiftChecklist } from '../../../../../lib/template-snapshot';

export const POST = withAuth(async (req, ctx) => {
  const shiftInstanceId = new URL(req.url).pathname.split('/').slice(-2)[0];
  const resolved = await resolveInstance(ctx, shiftInstanceId);
  if (!resolved) return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });
  const accessError = requireBranchAccess(ctx, resolved.branchId);
  if (accessError) return accessError;

  try {
    let templateUpdated = false;
    if (resolved.instance['status'] === 'berjalan') {
      const checklist = await resolveShiftChecklist(
        resolved.spreadsheetId,
        resolved.instance,
        resolved.branchTimezone,
      );
      if (checklist?.changed) {
        await updateRow(resolved.spreadsheetId, 'ShiftInstances', resolved.rowNumber, {
          snapshot_encoding: 'json',
          template_snapshot: JSON.stringify(checklist.snapshot),
          snapshot_hash: hashSnapshot(checklist.snapshot),
          updated_at: new Date().toISOString(),
        });
        templateUpdated = true;
      }
    }

    if (!isShiftBufferEnabled()) {
      return NextResponse.json({ status: 'legacy', actions: 0, template_updated: templateUpdated });
    }

    const result = await flushBufferedShift(
      resolved.branchId,
      shiftInstanceId,
      resolved.spreadsheetId,
      resolved.tabMonth,
    );
    // Status sinkron ke peserta — best-effort (Fase 14).
    try {
      await notifySync({
        spreadsheetId: resolved.spreadsheetId,
        shiftInstanceId,
        scopeIds: await shiftParticipantIds(resolved.spreadsheetId, shiftInstanceId),
        status: (result.status === 'empty' ? 'berhasil' : 'tersinkron_ulang') as
          | 'berhasil'
          | 'tersinkron_ulang',
        detail:
          templateUpdated
            ? 'Checklist shift diperbarui dari template master.'
            : result.status === 'empty'
              ? 'Tidak ada aksi tertunda untuk disinkronkan.'
              : `Buffer aksi tersinkron (${result.actions ?? 0} aksi).`,
      });
    } catch {
      // kegagalan notifikasi tidak boleh menggagalkan sinkronisasi
    }
    return NextResponse.json({
      ...result,
      status: result.status === 'empty' ? 'kosong' : 'tersinkron_sheets',
      template_updated: templateUpdated,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'SHIFT_BUFFER_BUSY') {
      return NextResponse.json({ error: 'Shift sedang disinkronkan.', code: 'SHIFT_BUFFER_BUSY' }, { status: 409 });
    }
    try {
      await notifySync({
        spreadsheetId: resolved.spreadsheetId,
        shiftInstanceId,
        scopeIds: [ctx.user.id],
        status: 'gagal',
        detail: 'Template checklist atau buffer shift gagal disinkronkan. Coba sinkronkan kembali.',
      });
    } catch {
      // best-effort
    }
    return NextResponse.json({ error: 'Sinkronisasi shift gagal.', code: 'SHIFT_SYNC_FAILED' }, { status: 503 });
  }
});
