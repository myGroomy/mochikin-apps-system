import { NextResponse } from 'next/server';
import { appendAuditLogFor } from '../../../../../lib/db/audit';
import { requireBranchAccess, withAuth } from '../../../../../lib/api-auth';
import { resolveInstance } from '../../../../../lib/instance-resolver';
import { readTemplateSnapshot } from '../../../../../lib/template-snapshot';
import { getSupabase } from '../../../../../lib/supabase';

interface HandoverFieldSnapshot {
  id: string;
  label: string;
  field_type: string;
  input_types?: string[];
  options?: string[] | null;
  is_required?: boolean;
}

interface HandoverBody {
  prepare?: boolean;
  values?: Record<string, unknown>;
  free_text?: string;
  no_incident?: boolean;
  noIncidentConfirmed?: boolean;
}

export const POST = // eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
  const pathParts = new URL(_req.url).pathname.split('/');
  const shiftInstanceId = pathParts[pathParts.length - 2];

  let body: HandoverBody = {};
  try {
    body = (await _req.json()) as HandoverBody;
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }

  const resolved = await resolveInstance(ctx, shiftInstanceId);
  if (!resolved) {
    return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });
  }
  const { instance, spreadsheetId, branchId } = resolved;

  const branchAccessError = requireBranchAccess(ctx, branchId);
  if (branchAccessError) return branchAccessError;

  const supabase = getSupabase();
  const { data: existing, error: existingError } = await supabase
    .from('mycheck_handovers')
    .select('id,field_values,from_user_id,status')
    .eq('shift_instance_id', shiftInstanceId)
    .maybeSingle();
  if (existingError) {
    console.error('MyCheck handover lookup failed:', existingError);
    return NextResponse.json({ error: 'Handover tidak dapat dimuat.' }, { status: 500 });
  }

  if (body.prepare) {
    if (String(instance['status']) !== 'open' || String(instance['pj_user_id']) !== ctx.user.id) {
      return NextResponse.json({ error: 'Hanya PJ pada shift berjalan yang dapat menyiapkan handover.' }, { status: 403 });
    }
    if (existing) {
      return NextResponse.json({ handover_id: existing.id });
    }
    const { data: created, error } = await supabase.from('mycheck_handovers').insert({
      shift_instance_id: shiftInstanceId,
      from_user_id: ctx.user.personId ?? ctx.user.id,
      field_values: {},
      notes: null,
      status: 'draft',
    }).select('id').single();
    if (error) {
      console.error('MyCheck handover draft creation failed:', error);
      return NextResponse.json({ error: 'Handover tidak dapat disiapkan.' }, { status: 500 });
    }
    return NextResponse.json({ handover_id: created.id });
  }

  let snapshot: { handover_fields?: HandoverFieldSnapshot[] };
  // Snapshot bisa gzip+base64 (lihat lib/template-snapshot.ts). JSON.parse buta
  // membuat field wajib hilang, jadi handover bisa disimpan tanpa field wajib.
  snapshot = readTemplateSnapshot(instance) ?? ({} as { handover_fields?: HandoverFieldSnapshot[] });
  const values = body.values ?? {};
  const missingRequired: string[] = [];
  const invalidFields: string[] = [];
  const photoIds: string[] = [];
  for (const field of snapshot.handover_fields ?? []) {
    const types = field.input_types?.length ? field.input_types : [field.field_type];
    const raw = values[field.id];
    const parts = types.length > 1 && raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : types.length === 1 ? { [types[0]]: raw } : {};
    for (const type of types) {
      const value = parts[type];
      const empty = value === undefined || value === null ||
        (typeof value === 'string' && !value.trim()) ||
        (Array.isArray(value) && value.length === 0);
      if (empty) {
        if (field.is_required) missingRequired.push(field.id);
        continue;
      }
      const valid = type === 'foto'
        ? Array.isArray(value) && value.length <= 5 && value.every((id) => typeof id === 'string')
        : type === 'angka'
          ? Number.isFinite(Number(value))
          : ['pilihan', 'pilihan_ganda', 'dropdown'].includes(type)
            ? typeof value === 'string' && (field.options ?? []).includes(value)
            : type === 'kotak_centang'
              ? Array.isArray(value) && value.length > 0 &&
                value.every((item) => typeof item === 'string' && (field.options ?? []).includes(item)) &&
                new Set(value).size === value.length
              : type === 'ya_tidak'
                ? ['Ya', 'Tidak', 'ya', 'tidak'].includes(String(value))
                : type === 'tanggal_waktu'
                  ? typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
                  : typeof value === 'string' && value.trim().length <= 2000;
      if (!valid) invalidFields.push(field.id);
      if (type === 'foto' && Array.isArray(value)) photoIds.push(...value as string[]);
    }
  }
  const configuredFieldIds = new Set((snapshot.handover_fields ?? []).map((field) => field.id));
  if (Object.keys(values).some((id) => !configuredFieldIds.has(id))) {
    return NextResponse.json({ error: 'Field handover tidak sesuai dengan konfigurasi shift.' }, { status: 400 });
  }

  if (missingRequired.length > 0 || invalidFields.length > 0) {
    return NextResponse.json(
      {
        error: missingRequired.length ? 'Field handover wajib belum diisi.' : 'Nilai handover tidak sesuai dengan tipe input.',
        missing: [...new Set(missingRequired)],
        invalid: [...new Set(invalidFields)],
      },
      { status: 400 }
    );
  }
  if (photoIds.length) {
    if (!existing || new Set(photoIds).size !== photoIds.length) {
      return NextResponse.json({ error: 'Foto handover tidak valid.' }, { status: 400 });
    }
    const { data: photos, error } = await supabase
      .from('mycheck_photos')
      .select('id')
      .eq('branch_id', spreadsheetId)
      .eq('owner_type', 'handover')
      .eq('owner_id', existing.id)
      .eq('shift_instance_id', shiftInstanceId)
      .eq('status', 'uploaded')
      .in('id', photoIds);
    if (error) {
      console.error('MyCheck handover photo lookup failed:', error);
      return NextResponse.json({ error: 'Foto handover tidak dapat diverifikasi.' }, { status: 500 });
    }
    if ((photos ?? []).length !== photoIds.length) {
      return NextResponse.json({ error: 'Foto handover tidak terhubung dengan field ini.' }, { status: 400 });
    }
  }

  const now = new Date().toISOString();
  let handoverId = existing?.id;
  if (existing) {
    const { error } = await supabase.from('mycheck_handovers').update({
      from_user_id: ctx.user.personId ?? ctx.user.id,
      field_values: values,
      notes: body.free_text ?? null,
      submitted_at: now,
      status: 'submitted',
    }).eq('id', existing.id);
    if (error) {
      console.error('MyCheck handover update failed:', error);
      return NextResponse.json({ error: 'Handover tidak dapat disimpan.' }, { status: 500 });
    }
  } else {
    const { data: created, error } = await supabase.from('mycheck_handovers').insert({
      shift_instance_id: shiftInstanceId,
      from_user_id: ctx.user.personId ?? ctx.user.id,
      field_values: values,
      notes: body.free_text ?? null,
      submitted_at: now,
      status: 'submitted',
    }).select('id').single();
    if (error) {
      console.error('MyCheck handover creation failed:', error);
      return NextResponse.json({ error: 'Handover tidak dapat disimpan.' }, { status: 500 });
    }
    handoverId = created.id;
  }

  const { error: shiftUpdateError } = await supabase.from('mycheck_shift_instances').update({
    no_incident_confirmed: Boolean(body.no_incident ?? body.noIncidentConfirmed),
    updated_at: now,
  }).eq('id', shiftInstanceId).eq('branch_id', spreadsheetId);
  if (shiftUpdateError) {
    console.error('MyCheck shift handover state update failed:', shiftUpdateError);
    return NextResponse.json({ error: 'Konfirmasi shift tidak dapat disimpan.' }, { status: 500 });
  }

  await appendAuditLogFor(spreadsheetId, {
    actorId: ctx.user.personId ?? ctx.user.id,
    action: 'submit_handover',
    objectType: 'handover',
    objectId: handoverId,
    branchId: spreadsheetId,
    shiftInstanceId,
    before: existing ? { id: existing.id } : null,
    after: {
      submittedBy: ctx.user.personId ?? ctx.user.id,
      noIncidentConfirmed: Boolean(body.no_incident ?? body.noIncidentConfirmed),
      values,
    },
  });

  return NextResponse.json({
    status: 'ok',
    handover_id: handoverId,
    action: existing ? 'diperbarui' : 'dibuat',
  });
});

export const GET = // eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
  const pathParts = new URL(_req.url).pathname.split('/');
  const shiftInstanceId = pathParts[pathParts.length - 2];

  const resolved = await resolveInstance(ctx, shiftInstanceId);
  if (!resolved) {
    return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });
  }
  const { branchId } = resolved;
  const branchAccessError = requireBranchAccess(ctx, branchId);
  if (branchAccessError) return branchAccessError;

  const { data: handover, error } = await getSupabase()
    .from('mycheck_handovers')
    .select('id,shift_instance_id,from_user_id,field_values,notes,submitted_at,acknowledged_by_id,acknowledged_at')
    .eq('shift_instance_id', shiftInstanceId)
    .maybeSingle();
  if (error) {
    console.error('MyCheck handover lookup failed:', error);
    return NextResponse.json({ error: 'Handover tidak dapat dimuat.' }, { status: 500 });
  }
  if (!handover) {
    return NextResponse.json({ status: 'ok', handover: null });
  }

  return NextResponse.json({
    status: 'ok',
    handover: {
      id: handover.id,
      shift_instance_id: shiftInstanceId,
      from_user_id: handover.from_user_id,
      field_values: handover.field_values,
      notes: handover.notes,
      submitted_at: handover.submitted_at,
      acknowledged_by_id: handover.acknowledged_by_id,
      acknowledged_at: handover.acknowledged_at,
    },
  });
});