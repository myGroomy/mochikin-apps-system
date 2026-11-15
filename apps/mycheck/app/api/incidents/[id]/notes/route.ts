// app/api/incidents/[id]/notes/route.ts Phase 4 (Sheets).
// POST catatan tindak lanjut (IN-06): penulis + waktu tercatat, isi awal tak diubah.
import { NextResponse } from 'next/server';
import { ulid } from 'ulid';
import { requireBranchAccess, withAuth } from '../../../../../lib/api-auth';
import { appendAuditLogFor } from '../../../../../lib/db/audit';
import { getPeriodSheet, insertRow } from '../../../../../lib/store';
import { ensureIncidentTabs, findIncidentAcrossBranches, incidentTabMonth } from '../../../../../lib/incidents';
import { getSupabase } from '../../../../../lib/supabase';
import { isUuid, toDeterministicUuid } from '../../../../../lib/resolve-person';

export const POST = // eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
  const incidentId = new URL(_req.url).pathname.split('/').slice(-2)[0];
  let body: { note?: string } = {};
  try { body = (await _req.json()) as { note?: string }; } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }
  const note = body.note?.trim();
  if (!note) return NextResponse.json({ error: 'note wajib diisi' }, { status: 400 });
  if (note.length > 2000) return NextResponse.json({ error: 'Catatan maksimal 2000 karakter.' }, { status: 400 });
  const located = await findIncidentAcrossBranches(ctx, incidentId);
  const now = new Date().toISOString();
  const rowId = ulid();
  if (!located) {
    const supabase = getSupabase();
    if (supabase) {
      const incidentUuid = isUuid(incidentId) ? incidentId : toDeterministicUuid('incident', incidentId);
      const { data: dbInc } = await supabase
        .from('mycheck_incidents')
        .select('id, branch_id, resolution_notes')
        .or(`id.eq.${incidentUuid},id.eq.${incidentId}`)
        .maybeSingle();

      if (dbInc) {
        const branchAccessError = requireBranchAccess(ctx, dbInc.branch_id);
        if (branchAccessError) return branchAccessError;

        const author = ctx.user.name || ctx.user.username || ctx.user.id;
        const entry = `[${now} - ${author}] ${note}`;
        const updatedNotes = dbInc.resolution_notes
          ? `${dbInc.resolution_notes}\n${entry}`
          : entry;

        await supabase
          .from('mycheck_incidents')
          .update({ resolution_notes: updatedNotes })
          .eq('id', dbInc.id);

        return NextResponse.json({ status: 'dibuat', note_id: rowId });
      }
    }
    return NextResponse.json({ error: 'Incident tidak ditemukan' }, { status: 404 });
  }
  const branchAccessError = requireBranchAccess(ctx, located.branchId);
  if (branchAccessError) return branchAccessError;
  const tabMonth = incidentTabMonth(located.incident);
  await ensureIncidentTabs(located.spreadsheetId, tabMonth);
  await insertRow(located.spreadsheetId, await getPeriodSheet(located.spreadsheetId, 'IncidentNotes', tabMonth), {
    id: rowId, incident_id: incidentId, author_id: ctx.user.id,
    author_role: ctx.user.role, note, created_at: now,
  });
  await appendAuditLogFor(located.spreadsheetId, {
    actorId: ctx.user.id, action: 'add_incident_note', objectType: 'incident', objectId: incidentId,
    branchId: located.branchId, after: { note: note.slice(0, 200) },
  });

  // Best-effort append resolution notes ke Supabase mycheck_incidents
  try {
    const supabase = getSupabase();
    if (supabase) {
      const incidentUuid = isUuid(incidentId) ? incidentId : toDeterministicUuid('incident', incidentId);
      const { data: dbInc } = await supabase
        .from('mycheck_incidents')
        .select('id, resolution_notes')
        .or(`id.eq.${incidentUuid},id.eq.${incidentId}`)
        .maybeSingle();

      if (dbInc) {
        const author = ctx.user.name || ctx.user.username || ctx.user.id;
        const entry = `[${now} - ${author}] ${note}`;
        const updatedNotes = dbInc.resolution_notes
          ? `${dbInc.resolution_notes}\n${entry}`
          : entry;

        await supabase
          .from('mycheck_incidents')
          .update({ resolution_notes: updatedNotes })
          .eq('id', dbInc.id);
      }
    }
  } catch (sbErr) {
    console.warn('mycheck_incidents append notes warning:', sbErr);
  }
  return NextResponse.json({ status: 'dibuat', note_id: rowId });
});
