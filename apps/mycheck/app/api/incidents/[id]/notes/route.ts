import { NextResponse } from 'next/server';
import { requireBranchAccess, withAuth } from '../../../../../lib/api-auth';
import { appendAuditLogFor } from '../../../../../lib/db/audit';
import { findIncidentAcrossBranches } from '../../../../../lib/incidents';
import { getSupabase } from '../../../../../lib/supabase';

export const POST = withAuth(async (req, ctx) => {
  const incidentId = new URL(req.url).pathname.split('/').slice(-2)[0] ?? '';
  let body: { note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }
  const note = body.note?.trim();
  if (!note) return NextResponse.json({ error: 'note wajib diisi' }, { status: 400 });
  if (note.length > 2000) return NextResponse.json({ error: 'Catatan maksimal 2000 karakter.' }, { status: 400 });

  let located;
  try {
    located = await findIncidentAcrossBranches(ctx, incidentId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase incident lookup failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
  if (!located) return NextResponse.json({ error: 'Incident tidak ditemukan' }, { status: 404 });
  const accessError = requireBranchAccess(ctx, located.branchId);
  if (accessError) return accessError;
  if (!ctx.user.personId) return NextResponse.json({ error: 'Identitas petugas tidak tersedia.' }, { status: 401 });

  const { data, error } = await getSupabase()
    .from('mycheck_incident_notes')
    .insert({
      incident_id: incidentId,
      author_id: ctx.user.personId,
      author_role: ctx.user.role,
      note,
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: `Supabase incident note creation failed: ${error.message}` }, { status: 500 });

  await appendAuditLogFor(located.spreadsheetId, {
    actorId: ctx.user.id,
    action: 'add_incident_note',
    objectType: 'incident',
    objectId: incidentId,
    branchId: located.spreadsheetId,
    after: { note: note.slice(0, 200) },
  });
  return NextResponse.json({ status: 'dibuat', note_id: data.id });
});
