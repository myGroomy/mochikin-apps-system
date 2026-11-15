import { NextResponse } from 'next/server';
import { ulid } from 'ulid';
import { appendAuditLogFor } from '../../../../../lib/db/audit';
import { requireBranchAccess, withAuth } from '../../../../../lib/api-auth';
import {
  ensureMonthlySheet,
  findRow,
  insertRow,
  listMonthlyRows,
  updateRow,
} from '../../../../../lib/store';
import { resolveInstance } from '../../../../../lib/instance-resolver';
import { readTemplateSnapshot } from '../../../../../lib/template-snapshot';
import { getSupabase } from '../../../../../lib/supabase';
import { isUuid, toDeterministicUuid } from '../../../../../lib/resolve-person';

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
  const { instance, rowNumber, spreadsheetId, branchId, tabMonth } = resolved;

  const branchAccessError = requireBranchAccess(ctx, branchId);
  if (branchAccessError) return branchAccessError;

  const handoversTab = await ensureMonthlySheet(spreadsheetId, 'Handovers', tabMonth);
  const existing = (await listMonthlyRows(spreadsheetId, 'Handovers', tabMonth)).find(
    (r) => String(r['shift_instance_id']) === shiftInstanceId
  ) ?? null;

  if (body.prepare) {
    if (String(instance['status']) !== 'berjalan' || String(instance['pj_user_id']) !== ctx.user.id) {
      return NextResponse.json({ error: 'Hanya PJ pada shift berjalan yang dapat menyiapkan handover.' }, { status: 403 });
    }
    if (existing) {
      return NextResponse.json({ handover_id: String(existing['id']) });
    }
    const now = new Date().toISOString();
    const handoverId = ulid();
    await insertRow(spreadsheetId, handoversTab, {
      id: handoverId,
      shift_instance_id: shiftInstanceId,
      values: '{}',
      free_text: '',
      photo_ids: '',
      submitted_by: ctx.user.id,
      submitted_at: '',
      created_at: now,
      updated_at: now,
    });
    return NextResponse.json({ handover_id: handoverId });
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
    const photos = await listMonthlyRows(spreadsheetId, 'Photos', tabMonth);
    const allowed = new Set(photos.filter((photo) =>
      String(photo['owner_type']) === 'handover' &&
      String(photo['owner_id']) === String(existing['id']) &&
      String(photo['shift_instance_id']) === shiftInstanceId &&
      String(photo['status']) === 'uploaded'
    ).map((photo) => String(photo['id'])));
    if (photoIds.some((id) => !allowed.has(id))) {
      return NextResponse.json({ error: 'Foto handover tidak terhubung dengan field ini.' }, { status: 400 });
    }
  }

  const now = new Date();

  const handoverId = existing ? String(existing['id']) : ulid();
  const valuesJson = JSON.stringify(values);

  if (existing) {
    const found = await findRow(spreadsheetId, handoversTab, 'id', handoverId);
    if (found) {
      await updateRow(spreadsheetId, handoversTab, found.rowNumber, {
        values: valuesJson,
        free_text: body.free_text ?? '',
        submitted_by: ctx.user.id,
        submitted_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    }
  } else {
    await insertRow(spreadsheetId, handoversTab, {
      id: handoverId,
      shift_instance_id: shiftInstanceId,
      values: valuesJson,
      free_text: body.free_text ?? '',
      photo_ids: '',
      submitted_by: ctx.user.id,
      submitted_at: now.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  }

  await updateRow(spreadsheetId, 'ShiftInstances', rowNumber, {
    no_incident_confirmed: Boolean(body.no_incident ?? body.noIncidentConfirmed),
    updated_at: now.toISOString(),
  });

  // Best-effort dual-write ke Supabase mycheck_handovers
  try {
    const supabase = getSupabase();
    if (supabase) {
      let fromUserId = isUuid(ctx.user.personId) ? ctx.user.personId! : (isUuid(ctx.user.id) ? ctx.user.id : null);
      if (!fromUserId) {
        const { data: p } = await supabase.from('people').select('id').eq('username', ctx.user.username).maybeSingle();
        if (p?.id) fromUserId = p.id;
      }
      if (!fromUserId) fromUserId = toDeterministicUuid('people', ctx.user.username || ctx.user.id);

      const { data: existingHo } = await supabase
        .from('mycheck_handovers')
        .select('id')
        .eq('shift_instance_id', shiftInstanceId)
        .maybeSingle();

      if (existingHo?.id) {
        await supabase
          .from('mycheck_handovers')
          .update({
            from_user_id: fromUserId,
            field_values: values,
            notes: body.free_text ?? null,
            submitted_at: now.toISOString(),
          })
          .eq('id', existingHo.id);
      } else {
        await supabase
          .from('mycheck_handovers')
          .insert({
            shift_instance_id: shiftInstanceId,
            from_user_id: fromUserId,
            field_values: values,
            notes: body.free_text ?? null,
            submitted_at: now.toISOString(),
          });
      }
    }
  } catch (sbErr) {
    console.warn('mycheck_handovers dual-write warning:', sbErr);
  }

  await appendAuditLogFor(spreadsheetId, {
    actorId: ctx.user.id,
    action: 'submit_handover',
    objectType: 'handover',
    objectId: handoverId,
    branchId,
    shiftInstanceId,
    before: existing ? { id: existing['id'] } : null,
    after: {
      submittedBy: ctx.user.id,
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

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: handover, error } = await supabase
        .from('mycheck_handovers')
        .select('*')
        .eq('shift_instance_id', shiftInstanceId)
        .maybeSingle();

      if (!error && handover) {
        return NextResponse.json({
          status: 'ok',
          handover: {
            id: handover.id,
            shift_instance_id: handover.shift_instance_id,
            from_user_id: handover.from_user_id,
            field_values: handover.field_values,
            notes: handover.notes,
            submitted_at: handover.submitted_at,
            acknowledged_by_id: handover.acknowledged_by_id,
            acknowledged_at: handover.acknowledged_at,
          },
        });
      }
    } catch {
      // Fallback to Sheets
    }
  }

  const resolved = await resolveInstance(ctx, shiftInstanceId);
  if (!resolved) {
    return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });
  }
  const { spreadsheetId, branchId, tabMonth } = resolved;
  const branchAccessError = requireBranchAccess(ctx, branchId);
  if (branchAccessError) return branchAccessError;

  const handovers = await listMonthlyRows(spreadsheetId, 'Handovers', tabMonth);
  const found = handovers.find((r) => String(r['shift_instance_id']) === shiftInstanceId);
  if (!found) {
    return NextResponse.json({ status: 'ok', handover: null });
  }

  let parsedValues: Record<string, unknown> = {};
  try {
    parsedValues = typeof found['values'] === 'string' ? JSON.parse(found['values']) : (found['values'] as Record<string, unknown> ?? {});
  } catch {
    parsedValues = {};
  }

  return NextResponse.json({
    status: 'ok',
    handover: {
      id: String(found['id']),
      shift_instance_id: shiftInstanceId,
      from_user_id: String(found['submitted_by'] ?? ''),
      field_values: parsedValues,
      notes: String(found['free_text'] ?? ''),
      submitted_at: String(found['submitted_at'] ?? ''),
    },
  });
});