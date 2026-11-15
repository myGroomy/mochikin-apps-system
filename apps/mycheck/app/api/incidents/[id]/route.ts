// app/api/incidents/[id]/route.ts Phase 4 (Sheets).
// GET: detail + notes + photos. PATCH (admin): ubah status open<->selesai (IN-04).
import { NextResponse } from 'next/server';
import { requireBranchAccess, requireRole, withAuth } from '../../../../lib/api-auth';
import { appendAuditLogFor } from '../../../../lib/db/audit';
import { asBool, asStr, filterRows, listMonthlyRows } from '../../../../lib/store';
import { categoryNameMap, findIncidentAcrossBranches, incidentTabMonth, pushNotification, updateIncidentRow, userNameMap } from '../../../../lib/incidents';
import { getSupabase } from '../../../../lib/supabase';
import { isUuid, toDeterministicUuid } from '../../../../lib/resolve-person';

export const GET = // eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
  const incidentId = new URL(_req.url).pathname.split('/').at(-1) ?? '';
  const supabase = getSupabase();
  if (supabase) {
    try {
      const incidentUuid = isUuid(incidentId) ? incidentId : toDeterministicUuid('incident', incidentId);
      const { data: inc, error } = await supabase
        .from('mycheck_incidents')
        .select('*')
        .or(`id.eq.${incidentUuid},id.eq.${incidentId}`)
        .maybeSingle();

      if (!error && inc) {
        const branchAccessError = requireBranchAccess(ctx, inc.branch_id);
        if (branchAccessError) return branchAccessError;

        const userIds = [inc.reported_by_id, inc.resolved_by_id].filter(Boolean);
        const userMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('people')
            .select('id, name, username')
            .in('id', userIds);
          for (const u of users || []) {
            userMap.set(u.id, u.name || u.username || u.id);
          }
        }

        const { data: branch } = await supabase
          .from('branches')
          .select('id, name, code')
          .eq('id', inc.branch_id)
          .maybeSingle();

        const notes = inc.resolution_notes
          ? [{
              id: 'res-note-1',
              note: inc.resolution_notes,
              authorName: (inc.resolved_by_id ? userMap.get(inc.resolved_by_id) : '') || 'Petugas',
              authorRole: 'admin',
              createdAt: inc.resolved_at || inc.reported_at,
            }]
          : [];

        const photos = (inc.photo_urls || []).map((url: string, idx: number) => ({
          id: `photo-${idx + 1}`,
          uploadedAt: inc.reported_at,
          status: 'uploaded',
          url,
        }));

        const response = NextResponse.json({
          incident: {
            id: inc.id,
            branchId: inc.branch_id,
            branchName: branch?.name || inc.branch_id,
            shiftInstanceId: inc.shift_instance_id || null,
            categoryId: inc.category,
            categoryName: inc.category,
            description: inc.description,
            title: inc.title,
            occurredAt: inc.reported_at,
            reportedAt: inc.reported_at,
            reportedByName: userMap.get(inc.reported_by_id) ?? inc.reported_by_id,
            status: inc.status === 'resolved' ? 'selesai' : inc.status,
            severity: inc.severity === 'low' ? 'rendah' : inc.severity === 'medium' ? 'sedang' : inc.severity === 'high' ? 'tinggi' : inc.severity,
            outsideShift: !inc.shift_instance_id,
            resolvedBy: inc.resolved_by_id || null,
            resolvedByName: inc.resolved_by_id ? (userMap.get(inc.resolved_by_id) ?? inc.resolved_by_id) : null,
            resolvedAt: inc.resolved_at || null,
            resolutionNotes: inc.resolution_notes || null,
          },
          notes,
          photos,
        });
        response.headers.set('Cache-Control', 'no-store');
        response.headers.set('Vary', 'Cookie');
        return response;
      }
    } catch (sbErr) {
      console.warn('Supabase get incident error, falling back to Sheets:', sbErr);
    }
  }

  const located = await findIncidentAcrossBranches(ctx, incidentId);
  if (!located) return NextResponse.json({ error: 'Incident tidak ditemukan' }, { status: 404 });
  const branchAccessError = requireBranchAccess(ctx, located.branchId);
  if (branchAccessError) return branchAccessError;
  const { spreadsheetId, branchId, incident } = located;
  const tabMonth = incidentTabMonth(incident);
  const [nameByUsername, categoryNames] = await Promise.all([userNameMap(), categoryNameMap(ctx)]);
  const noteRows = await listMonthlyRows(spreadsheetId, 'IncidentNotes', tabMonth);
  const notes = noteRows
    .filter((n) => asStr(n['incident_id']) === incidentId)
    .sort((a, b) => asStr(a['created_at']).localeCompare(asStr(b['created_at'])))
    .map((n) => ({
      id: asStr(n['id']), note: asStr(n['note']),
      authorName: nameByUsername.get(asStr(n['author_id'])) ?? asStr(n['author_id']),
      authorRole: asStr(n['author_role']), createdAt: asStr(n['created_at']),
    }));
  const photoRows = await listMonthlyRows(spreadsheetId, 'Photos', tabMonth);
  const photos = photoRows
    .filter((p) => asStr(p['owner_type']) === 'incident' && asStr(p['owner_id']) === incidentId)
    .map((p) => ({ id: asStr(p['id']), uploadedAt: asStr(p['uploaded_at']) || null, status: asStr(p['status']) }));
  const { getCabangList } = await import('../../../../lib/google/registry');
  const cabangs = await getCabangList();
  const cabang = cabangs.find((c) => c.Cabang_ID === branchId);
  const response = NextResponse.json({
    incident: {
      id: asStr(incident['id']), branchId,
      branchName: (cabang?.['Nama_Cabang'] as string) || branchId,
      shiftInstanceId: asStr(incident['shift_instance_id']) || null,
      categoryId: asStr(incident['category_id']),
      categoryName: categoryNames.get(asStr(incident['category_id'])) ?? '',
      description: asStr(incident['description']),
      occurredAt: asStr(incident['occurred_at']), reportedAt: asStr(incident['reported_at']),
      reportedByName: nameByUsername.get(asStr(incident['reported_by'])) ?? asStr(incident['reported_by']),
      status: asStr(incident['status']), severity: asStr(incident['severity']) || null,
      outsideShift: asBool(incident['outside_shift']),
    },
    notes, photos,
  });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Vary', 'Cookie');
  return response;
});

export const PATCH = // eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;
  const incidentId = new URL(_req.url).pathname.split('/').at(-1) ?? '';
  let body: {
    status?: string;
    severity?: string;
    resolution_notes?: string;
    resolutionNotes?: string;
    linkToShiftId?: string;
    unlink?: boolean;
  } = {};
  try { body = (await _req.json()) as typeof body; } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }

  const wantsLink = body.linkToShiftId !== undefined || body.unlink === true;
  const wantsStatus = body.status !== undefined;
  const wantsSeverity = body.severity !== undefined;
  const wantsNotes = body.resolution_notes !== undefined || body.resolutionNotes !== undefined;

  if (!wantsLink && !wantsStatus && !wantsSeverity && !wantsNotes) {
    return NextResponse.json({ error: 'Tidak ada perubahan yang diminta.' }, { status: 400 });
  }
  if (wantsStatus && body.status !== 'open' && body.status !== 'selesai' && body.status !== 'investigating' && body.status !== 'resolved') {
    return NextResponse.json({ error: 'status harus open atau selesai.' }, { status: 400 });
  }

  const located = await findIncidentAcrossBranches(ctx, incidentId);
  if (!located) {
    const supabase = getSupabase();
    if (supabase) {
      const incidentUuid = isUuid(incidentId) ? incidentId : toDeterministicUuid('incident', incidentId);
      const { data: dbInc } = await supabase
        .from('mycheck_incidents')
        .select('*')
        .or(`id.eq.${incidentUuid},id.eq.${incidentId}`)
        .maybeSingle();

      if (dbInc) {
        const now = new Date().toISOString();
        let resolvedByUuid = ctx.user.personId;
        if (!isUuid(resolvedByUuid)) {
          const { data: p } = await supabase.from('people').select('id').eq('username', ctx.user.username).maybeSingle();
          if (p?.id) resolvedByUuid = p.id;
          else if (isUuid(ctx.user.id)) resolvedByUuid = ctx.user.id;
          else resolvedByUuid = toDeterministicUuid('people', ctx.user.username || ctx.user.id);
        }

        const updateData: Record<string, unknown> = {};
        if (body.status !== undefined) {
          updateData.status = (body.status === 'selesai' || body.status === 'resolved') ? 'resolved' : body.status;
          if (updateData.status === 'resolved') {
            updateData.resolved_by_id = resolvedByUuid;
            updateData.resolved_at = now;
          }
        }
        if (body.severity !== undefined) {
          const sevMap: Record<string, string> = {
            rendah: 'low',
            sedang: 'medium',
            tinggi: 'high',
            kritis: 'critical',
            low: 'low',
            medium: 'medium',
            high: 'high',
            critical: 'critical',
          };
          updateData.severity = sevMap[body.severity] || body.severity;
        }
        const resNotes = body.resolution_notes ?? body.resolutionNotes;
        if (resNotes !== undefined) {
          updateData.resolution_notes = resNotes;
          if (!updateData.resolved_by_id) updateData.resolved_by_id = resolvedByUuid;
          if (!updateData.resolved_at) updateData.resolved_at = now;
        }
        if (body.linkToShiftId !== undefined) {
          updateData.shift_instance_id = body.linkToShiftId || null;
        } else if (body.unlink === true) {
          updateData.shift_instance_id = null;
        }

        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('mycheck_incidents')
            .update(updateData)
            .eq('id', dbInc.id);
        }
        return NextResponse.json({ status: 'diperbarui', incident_id: incidentId });
      }
    }
    return NextResponse.json({ error: 'Incident tidak ditemukan' }, { status: 404 });
  }
  const { spreadsheetId, branchId, incident } = located;
  const tabMonth = incidentTabMonth(incident);
  const now = new Date().toISOString();

  // ---- Tautkan ke shift (ADM-IN-03) ----------------------------------------
  // Incident "di luar shift" berdiri sendiri; admin boleh menautkannya ke shift
  // yang tepat, atau melepaskannya lagi kembali berdiri sendiri.
  if (wantsLink) {
    const previousShiftId = asStr(incident['shift_instance_id']);
    let nextShiftId = '';

    if (body.unlink === true) {
      nextShiftId = '';
    } else {
      const target = String(body.linkToShiftId ?? '').trim();
      if (!target) {
        return NextResponse.json(
          { error: 'linkToShiftId wajib diisi, atau kirim unlink: true.' },
          { status: 400 }
        );
      }
      // Shift tujuan harus milik cabang yang sama dengan incident.
      const candidates = await filterRows(
        spreadsheetId,
        'ShiftInstances',
        (r) => asStr(r['id']) === target
      );
      if (!candidates[0]) {
        return NextResponse.json(
          { error: 'Shift tidak ditemukan di cabang incident ini.' },
          { status: 404 }
        );
      }
      nextShiftId = target;
    }

    if (previousShiftId !== nextShiftId) {
      const ok = await updateIncidentRow(spreadsheetId, tabMonth, incidentId, {
        shift_instance_id: nextShiftId,
        // Menautkan berarti incident bukan lagi "di luar shift".
        outside_shift: nextShiftId === '' ? true : false,
        link_source: body.unlink === true ? 'admin_unlink' : 'admin',
        linked_by: ctx.user.id,
        linked_at: now,
        updated_at: now,
        version: (Number(incident['version']) || 1) + 1,
      });
      if (!ok) return NextResponse.json({ error: 'Incident tidak ditemukan' }, { status: 404 });

      // Sinkronkan index supaya daftar incident lintas cabang ikut benar.
      try {
        const { listRowsWithNumber } = await import('../../../../lib/store');
        const { updateRow } = await import('../../../../lib/store');
        const numbered = await listRowsWithNumber(spreadsheetId, 'IncidentIndex');
        const hit = numbered.find((r) => asStr(r.data['incident_id']) === incidentId);
        if (hit) {
          await updateRow(spreadsheetId, 'IncidentIndex', hit.rowNumber, {
            shift_instance_id: nextShiftId,
            outside_shift: nextShiftId === '',
            updated_at: now,
          });
        }
      } catch {
        // index boleh tidak ada
      }

      await appendAuditLogFor(spreadsheetId, {
        actorId: ctx.user.id,
        action: 'link_incident_shift',
        objectType: 'incident',
        objectId: incidentId,
        branchId,
        shiftInstanceId: nextShiftId || previousShiftId || undefined,
        before: { shiftInstanceId: previousShiftId, outsideShift: asBool(incident['outside_shift']) },
        after: { shiftInstanceId: nextShiftId, outsideShift: nextShiftId === '' },
      });
    }
  }

  // ---- Ubah status (IN-04 / ADM-IN-02) -------------------------------------
  if (wantsStatus) {
    const before = asStr(incident['status']);
    if (before === body.status) {
      return NextResponse.json({ status: 'tidak_berubah', incident_id: incidentId });
    }
    const ok = await updateIncidentRow(spreadsheetId, tabMonth, incidentId, {
      status: body.status, status_changed_by: ctx.user.id, status_changed_at: now, updated_at: now, version: (Number(incident['version']) || 1) + 1,
    });
    if (!ok) return NextResponse.json({ error: 'Incident tidak ditemukan' }, { status: 404 });
    await appendAuditLogFor(spreadsheetId, {
      actorId: ctx.user.id, action: 'update_incident_status', objectType: 'incident', objectId: incidentId,
      branchId, shiftInstanceId: asStr(incident['shift_instance_id']) || undefined,
      before: { status: before }, after: { status: body.status },
    });
    try {
      await pushNotification(spreadsheetId, {
        userId: asStr(incident['reported_by']), type: 'incident_status',
        title: `Incident ${body.status === 'selesai' ? 'selesai' : 'dibuka kembali'}`,
        body: asStr(incident['description']).slice(0, 140), link: `/incident/${incidentId}`,
      });
    } catch { /* best-effort */ }
  }

  // Best-effort dual-write ke Supabase mycheck_incidents
  try {
    const supabase = getSupabase();
    if (supabase) {
      const incidentUuid = isUuid(incidentId) ? incidentId : toDeterministicUuid('incident', incidentId);

      let resolvedByUuid = ctx.user.personId;
      if (!isUuid(resolvedByUuid)) {
        const { data: p } = await supabase.from('people').select('id').eq('username', ctx.user.username).maybeSingle();
        if (p?.id) resolvedByUuid = p.id;
        else if (isUuid(ctx.user.id)) resolvedByUuid = ctx.user.id;
        else resolvedByUuid = toDeterministicUuid('people', ctx.user.username || ctx.user.id);
      }

      const updateData: Record<string, unknown> = {};
      if (body.status !== undefined) {
        updateData.status = (body.status === 'selesai' || body.status === 'resolved') ? 'resolved' : body.status;
        if (updateData.status === 'resolved') {
          updateData.resolved_by_id = resolvedByUuid;
          updateData.resolved_at = now;
        }
      }
      if (body.severity !== undefined) {
        const sevMap: Record<string, string> = {
          rendah: 'low',
          sedang: 'medium',
          tinggi: 'high',
          kritis: 'critical',
          low: 'low',
          medium: 'medium',
          high: 'high',
          critical: 'critical',
        };
        updateData.severity = sevMap[body.severity] || body.severity;
      }
      const resNotes = body.resolution_notes ?? body.resolutionNotes;
      if (resNotes !== undefined) {
        updateData.resolution_notes = resNotes;
        if (!updateData.resolved_by_id) updateData.resolved_by_id = resolvedByUuid;
        if (!updateData.resolved_at) updateData.resolved_at = now;
      }
      if (body.linkToShiftId !== undefined) {
        updateData.shift_instance_id = body.linkToShiftId || null;
      } else if (body.unlink === true) {
        updateData.shift_instance_id = null;
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('mycheck_incidents')
          .update(updateData)
          .or(`id.eq.${incidentUuid},id.eq.${incidentId}`);
      }
    }
  } catch (sbErr) {
    console.warn('mycheck_incidents update warning:', sbErr);
  }

  return NextResponse.json({ status: 'diperbarui', incident_id: incidentId });
});
