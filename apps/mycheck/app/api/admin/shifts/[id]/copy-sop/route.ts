import { NextResponse } from 'next/server';
import { requireRole, withAuth } from '../../../../../../lib/api-auth';
import { locateShiftDefinition } from '../../../../../../lib/admin/resolve-config';
import { copySopFromShift } from '../../../../../../lib/admin/template-service';
import { appendAuditLogFor } from '../../../../../../lib/db/audit';

export const POST = withAuth(async (req, ctx, session) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const pathParts = new URL(req.url).pathname.split('/');
  // /api/admin/shifts/[id]/copy-sop -> targetShiftId is at index length - 2
  const targetShiftId = pathParts[pathParts.length - 2];

  let body: { sourceShiftId?: string };
  try {
    body = (await req.json()) as { sourceShiftId?: string };
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 });
  }

  const { sourceShiftId } = body;
  if (!sourceShiftId) {
    return NextResponse.json({ error: 'sourceShiftId wajib diisi.' }, { status: 400 });
  }

  if (targetShiftId === sourceShiftId) {
    return NextResponse.json({ error: 'Shift tujuan dan sumber tidak boleh sama.' }, { status: 400 });
  }

  const [targetLoc, sourceLoc] = await Promise.all([
    locateShiftDefinition(ctx, targetShiftId),
    locateShiftDefinition(ctx, sourceShiftId),
  ]);

  if (!targetLoc) {
    return NextResponse.json({ error: 'Definisi shift tujuan tidak ditemukan.' }, { status: 404 });
  }
  if (!sourceLoc) {
    return NextResponse.json({ error: 'Definisi shift sumber tidak ditemukan.' }, { status: 404 });
  }

  const result = await copySopFromShift(
    sourceLoc.spreadsheetId,
    sourceShiftId,
    targetLoc.spreadsheetId,
    targetShiftId
  );

  await appendAuditLogFor(targetLoc.spreadsheetId, {
    action: 'COPY_SOP',
    actorId: ctx.user.id,
    objectType: 'ShiftDefinition',
    objectId: targetShiftId,
    reason: `Menyalin SOP dari shift ${sourceShiftId}`,
  }).catch(() => undefined);

  return NextResponse.json({
    message: `Berhasil menyalin ${result.categoriesCopied} section dan ${result.pointsCopied} item checklist ke shift ini.`,
    ...result,
  });
});
