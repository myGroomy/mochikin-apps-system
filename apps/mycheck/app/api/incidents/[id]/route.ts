import { NextResponse } from 'next/server';
import { requireBranchAccess, requireRole, withAuth } from '../../../../lib/api-auth';
import { appendAuditLogFor } from '../../../../lib/db/audit';
import { findIncidentAcrossBranches } from '../../../../lib/incidents';
import { getSupabase } from '../../../../lib/supabase';

const severityToDb: Record<string, string> = {
  rendah: 'low',
  sedang: 'medium',
  tinggi: 'high',
  kritis: 'critical',
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
};

export const GET = withAuth(async (req, ctx) => {
  const incidentId = new URL(req.url).pathname.split('/').at(-1) ?? '';
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

  const incident = located.incident as Record<string, unknown> & {
    id: string;
    branch_id: string;
    reported_by_id: string;
    resolved_by_id: string | null;
    photo_urls: string[] | null;
    resolution_notes: string | null;
    version: number;
  };
  const actorIds = [...new Set([incident.reported_by_id, incident.resolved_by_id].filter((id): id is string => Boolean(id)))];
  const supabase = getSupabase();
  const [{ data: people, error: peopleError }, { data: branch, error: branchError }, { data: noteRows, error: notesError }] = await Promise.all([
    actorIds.length ? supabase.from('people').select('id,name,username').in('id', actorIds) : Promise.resolve({ data: [], error: null }),
    supabase.from('branches').select('name').eq('id', incident.branch_id).maybeSingle(),
    supabase.from('mycheck_incident_notes').select('id,note,author_id,author_role,created_at').eq('incident_id', incident.id).order('created_at'),
  ]);
  if (peopleError) return NextResponse.json({ error: `Supabase reporter lookup failed: ${peopleError.message}` }, { status: 500 });
  if (branchError) return NextResponse.json({ error: `Supabase branch lookup failed: ${branchError.message}` }, { status: 500 });
  if (notesError) return NextResponse.json({ error: `Supabase incident notes lookup failed: ${notesError.message}` }, { status: 500 });
  const nameById = new Map((people ?? []).map((person) => [person.id, person.name || person.username || person.id]));
  const notes = (noteRows ?? []).map((note) => ({
    id: note.id,
    note: note.note,
    authorName: nameById.get(note.author_id) ?? note.author_id,
    authorRole: note.author_role,
    createdAt: note.created_at,
  }));
  const photos = (incident.photo_urls ?? []).map((url, index) => ({
    id: `photo-${index + 1}`,
    uploadedAt: incident.reported_at,
    status: 'uploaded',
    url,
  }));
  const response = NextResponse.json({
    incident: {
      id: incident.id,
      branchId: located.branchId,
      branchName: branch?.name ?? located.branchId,
      shiftInstanceId: incident.shift_instance_id || null,
      categoryId: incident.category_id ?? incident.category,
      categoryName: incident.category,
      description: incident.description,
      title: incident.title,
      occurredAt: incident.occurred_at,
      reportedAt: incident.reported_at,
      reportedByName: nameById.get(incident.reported_by_id) ?? incident.reported_by_id,
      status: incident.status === 'resolved' ? 'selesai' : incident.status,
      severity: incident.severity === 'low' ? 'rendah' : incident.severity === 'medium' ? 'sedang' : incident.severity === 'high' ? 'tinggi' : 'kritis',
      outsideShift: incident.outside_shift,
      resolvedBy: incident.resolved_by_id,
      resolvedByName: incident.resolved_by_id ? nameById.get(incident.resolved_by_id) ?? incident.resolved_by_id : null,
      resolvedAt: incident.resolved_at,
      resolutionNotes: incident.resolution_notes,
    },
    notes,
    photos,
  });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Vary', 'Cookie');
  return response;
});

export const PATCH = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;
  const incidentId = new URL(req.url).pathname.split('/').at(-1) ?? '';
  let body: {
    status?: string;
    severity?: string;
    resolution_notes?: string;
    resolutionNotes?: string;
    linkToShiftId?: string;
    unlink?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }
  const wantsLink = body.linkToShiftId !== undefined || body.unlink === true;
  const wantsStatus = body.status !== undefined;
  const wantsSeverity = body.severity !== undefined;
  const resolutionNotes = body.resolution_notes ?? body.resolutionNotes;
  const wantsNotes = resolutionNotes !== undefined;
  if (!wantsLink && !wantsStatus && !wantsSeverity && !wantsNotes) {
    return NextResponse.json({ error: 'Tidak ada perubahan yang diminta.' }, { status: 400 });
  }
  if (wantsStatus && !['open', 'investigating', 'selesai', 'resolved'].includes(body.status ?? '')) {
    return NextResponse.json({ error: 'status tidak valid.' }, { status: 400 });
  }
  if (wantsSeverity && !severityToDb[body.severity ?? '']) {
    return NextResponse.json({ error: 'severity tidak valid.' }, { status: 400 });
  }

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
  const incident = located.incident as Record<string, unknown> & {
    id: string;
    branch_id: string;
    shift_instance_id: string | null;
    outside_shift: boolean;
    status: string;
    severity: string;
    version: number;
    reported_by_id: string;
    description: string;
  };
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    version: Number(incident.version ?? 1) + 1,
  };
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  if (wantsLink) {
    const nextShiftId = body.unlink === true ? null : body.linkToShiftId?.trim();
    if (body.unlink !== true && !nextShiftId) {
      return NextResponse.json({ error: 'linkToShiftId wajib diisi, atau kirim unlink: true.' }, { status: 400 });
    }
    if (nextShiftId) {
      const { data: shift, error } = await getSupabase()
        .from('mycheck_shift_instances')
        .select('id')
        .eq('id', nextShiftId)
        .eq('branch_id', incident.branch_id)
        .maybeSingle();
      if (error) return NextResponse.json({ error: `Supabase shift lookup failed: ${error.message}` }, { status: 500 });
      if (!shift) return NextResponse.json({ error: 'Shift tidak ditemukan di cabang incident ini.' }, { status: 404 });
    }
    before.shiftInstanceId = incident.shift_instance_id;
    after.shiftInstanceId = nextShiftId;
    patch.shift_instance_id = nextShiftId;
    patch.outside_shift = !nextShiftId;
    patch.link_source = body.unlink ? 'admin_unlink' : 'admin';
    patch.linked_by = ctx.user.id;
    patch.linked_at = new Date().toISOString();
  }
  if (wantsStatus) {
    const status = body.status === 'selesai' ? 'resolved' : body.status;
    before.status = incident.status;
    after.status = status;
    patch.status = status;
    patch.status_changed_by = ctx.user.id;
    patch.status_changed_at = new Date().toISOString();
    if (status === 'resolved') {
      patch.resolved_by_id = ctx.user.id;
      patch.resolved_at = new Date().toISOString();
    } else {
      patch.resolved_by_id = null;
      patch.resolved_at = null;
    }
  }
  if (wantsSeverity) {
    before.severity = incident.severity;
    after.severity = severityToDb[body.severity ?? ''];
    patch.severity = after.severity;
  }
  if (wantsNotes) {
    before.resolutionNotes = incident.resolution_notes ?? null;
    after.resolutionNotes = resolutionNotes;
    patch.resolution_notes = resolutionNotes;
    patch.resolved_by_id = ctx.user.id;
    patch.resolved_at = new Date().toISOString();
  }

  const { data: updated, error: updateError } = await getSupabase()
    .from('mycheck_incidents')
    .update(patch)
    .eq('id', incident.id)
    .eq('branch_id', incident.branch_id)
    .eq('version', incident.version)
    .select('id')
    .maybeSingle();
  if (updateError) return NextResponse.json({ error: `Supabase incident update failed: ${updateError.message}` }, { status: 500 });
  if (!updated) return NextResponse.json({ error: 'Incident telah berubah. Muat ulang sebelum mencoba lagi.' }, { status: 409 });

  await appendAuditLogFor(incident.branch_id, {
    actorId: ctx.user.id,
    action: 'update_incident',
    objectType: 'incident',
    objectId: incident.id,
    branchId: incident.branch_id,
    shiftInstanceId: String(patch.shift_instance_id ?? incident.shift_instance_id ?? '') || undefined,
    before,
    after,
  });
  if (wantsStatus) {
    const { error } = await getSupabase().from('mycheck_notifications').insert({
      user_id: incident.reported_by_id,
      branch_id: incident.branch_id,
      type: 'incident_status',
      title: `Incident ${body.status === 'selesai' || body.status === 'resolved' ? 'selesai' : 'dibuka kembali'}`,
      body: incident.description.slice(0, 140),
      link: `/incident/${incident.id}`,
    });
    if (error) console.error('Incident status notification failed:', error.message);
  }
  return NextResponse.json({ status: 'diperbarui', incident_id: incident.id });
});
