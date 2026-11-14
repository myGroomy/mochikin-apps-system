import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { ulid } from 'ulid';
import { getSupabase } from '../../../../../lib/supabase';
import { appendAuditLogFor } from '../../../../../lib/db/audit';
import { getServerTime } from '../../../../../lib/db/server-time';
import { requireBranchAccess, withAuth } from '../../../../../lib/api-auth';
import {
  ensureMonthlySheet,
  filterRows,
  findRow,
  findRowFresh,
  insertRow,
  listMonthlyRows,
  listMonthlyRowsFresh,
  updateRow,
} from '../../../../../lib/store';
import { resolveInstance } from '../../../../../lib/instance-resolver';
import { readTemplateSnapshot, resolveShiftChecklist } from '../../../../../lib/template-snapshot';
import { hashSnapshot, type Snapshot } from '../../../../../lib/db/snapshot';
import { flushBufferedShift, isShiftBufferEnabled, removeBufferedShiftState } from '../../../../../lib/shift-buffer';
import { calculateScore } from '../../../../../lib/scoring';
import { calculateAndRecordShiftScoring, isScoringEnabled } from '../../../../../lib/scoring-engine';
import { notifyShiftClosed } from '../../../../../lib/notify-events';

interface CloseBody {
  values?: Record<string, unknown>;
  free_text?: string;
  no_incident?: boolean;
}

export const POST = // eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
  const pathParts = new URL(_req.url).pathname.split('/');
  const shiftInstanceId = pathParts[pathParts.length - 2];

  let body: CloseBody = {};
  try {
    body = (await _req.json()) as CloseBody;
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }

  const resolved = await resolveInstance(ctx, shiftInstanceId);
  if (!resolved) {
    return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });
  }
  const { instance, rowNumber, spreadsheetId, branchId, tabMonth } = resolved;

  if (String(instance['pj_user_id']) !== ctx.user.id) {
    return NextResponse.json({ error: 'Hanya PJ yang dapat menutup shift' }, { status: 403 });
  }

  const branchAccessError = requireBranchAccess(ctx, branchId);
  if (branchAccessError) return branchAccessError;

  if (String(instance['status']) !== 'berjalan') {
    return NextResponse.json({ error: 'Shift tidak sedang berjalan' }, { status: 409 });
  }

  if (isShiftBufferEnabled()) {
    try {
      await flushBufferedShift(branchId, shiftInstanceId, spreadsheetId, tabMonth);
    } catch {
      return NextResponse.json({ error: 'Data checklist belum berhasil disinkronkan. Coba tutup shift lagi.', code: 'SHIFT_SYNC_FAILED' }, { status: 503 });
    }
  }


  // Build & reconcile snapshot from template so items/handover fields added or fixed after shift open are included
  const reconciled = await resolveShiftChecklist(spreadsheetId, instance, resolved.branchTimezone).catch(() => null);
  const snapshot: Snapshot = reconciled?.snapshot ?? readTemplateSnapshot(instance) ?? ({} as Snapshot);

  const requiredPoints = (snapshot.categories ?? []).flatMap((category) => category.points ?? []);
  const requiredIds = requiredPoints.filter((point) => point.is_required).map((point) => point.point_ref);

  const allEntryRows = (await listMonthlyRowsFresh(spreadsheetId, 'Entries', tabMonth)).filter(
    (r) => String(r['shift_instance_id']) === shiftInstanceId
  );
  const entryRows = requiredIds.length
    ? allEntryRows.filter((r) => requiredIds.includes(String(r['point_ref'])))
    : [];

  const invalid = requiredIds.filter((pointRef) => {
    const row = entryRows.find((entry) => String(entry['point_ref']) === pointRef);
    return !row || !['selesai', 'skip'].includes(String(row['state']));
  });

  if (invalid.length > 0) {
    return NextResponse.json(
      { error: 'Ada item wajib yang belum selesai/skip.', invalid_points: invalid },
      { status: 400 }
    );
  }

  const handoverTab = await ensureMonthlySheet(spreadsheetId, 'Handovers', tabMonth);
  const existingHandover = (await listMonthlyRows(spreadsheetId, 'Handovers', tabMonth)).find(
    (r) => String(r['shift_instance_id']) === shiftInstanceId
  ) ?? null;
  const allHandoverFields = snapshot.handover_fields ?? [];
  const handoverValues = body.values ?? {};
  const configuredFieldIds = new Set(allHandoverFields.map((field) => field.id));
  if (Object.keys(handoverValues).some((id) => !configuredFieldIds.has(id))) {
    return NextResponse.json({ error: 'Field handover tidak sesuai dengan konfigurasi shift.' }, { status: 400 });
  }
  const missingHandover: string[] = [];
  const invalidHandover: string[] = [];
  const handoverPhotoIds: string[] = [];
  for (const field of allHandoverFields) {
    const types = field.input_types?.length ? field.input_types : [field.field_type];
    const raw = handoverValues[field.id];
    const values = types.length > 1 && raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : types.length === 1 ? { [types[0]]: raw } : {};
    const complete: Record<string, unknown> = {};
    for (const type of types) {
      const value = values[type];
      const empty = value === undefined || value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0);
      if (empty) {
        if (field.is_required) missingHandover.push(field.id);
        continue;
      }
      let valid = true;
      if (type === 'foto') {
        valid = Array.isArray(value) && value.length <= 5 && value.every((id) => typeof id === 'string');
        if (valid) handoverPhotoIds.push(...value as string[]);
      } else if (type === 'angka') {
        valid = Number.isFinite(Number(value));
      } else if (['pilihan', 'pilihan_ganda', 'dropdown'].includes(type)) {
        valid = typeof value === 'string' && (field.options ?? []).includes(value);
      } else if (type === 'kotak_centang') {
        valid = Array.isArray(value) && value.length > 0 &&
          value.every((item) => typeof item === 'string' && (field.options ?? []).includes(item)) &&
          new Set(value).size === value.length;
      } else if (type === 'ya_tidak') {
        valid = value === 'Ya' || value === 'Tidak' || value === 'ya' || value === 'tidak';
      } else if (type === 'tanggal_waktu') {
        valid = typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
      } else {
        valid = typeof value === 'string' && value.trim().length <= 2000;
      }
      if (!valid) invalidHandover.push(field.id);
      complete[type] = value;
    }
    if (types.length > 1) handoverValues[field.id] = complete;
  }

  if (missingHandover.length > 0 || invalidHandover.length > 0) {
    return NextResponse.json(
      {
        error: missingHandover.length ? 'Semua komponen handover wajib diisi.' : 'Nilai handover tidak sesuai dengan tipe input.',
        missing: [...new Set(missingHandover)],
        invalid: [...new Set(invalidHandover)],
      },
      { status: 400 }
    );
  }
  if (handoverPhotoIds.length) {
    if (!existingHandover) {
      return NextResponse.json({ error: 'Foto handover belum terhubung dengan handover shift ini.' }, { status: 400 });
    }
    const storedPhotos = await listMonthlyRows(spreadsheetId, 'Photos', tabMonth);
    const allowed = new Set(storedPhotos.filter((photo) =>
      String(photo['owner_type']) === 'handover' &&
      String(photo['owner_id']) === String(existingHandover['id']) &&
      String(photo['shift_instance_id']) === shiftInstanceId &&
      String(photo['status']) === 'uploaded'
    ).map((photo) => String(photo['id'])));
    if (handoverPhotoIds.some((id) => !allowed.has(id)) || new Set(handoverPhotoIds).size !== handoverPhotoIds.length) {
      return NextResponse.json({ error: 'Foto handover tidak valid.' }, { status: 400 });
    }
  }

  const now = getServerTime();

  // Upsert handover (tab bulanan Handovers_<YYYY-MM>)
  const handoverValuesJson = JSON.stringify(handoverValues);
  if (existingHandover) {
    const handoverRow = await findRow(spreadsheetId, handoverTab, 'shift_instance_id', shiftInstanceId);
    if (handoverRow) {
      await updateRow(spreadsheetId, handoverTab, handoverRow.rowNumber, {
        values: handoverValuesJson,
        free_text: body.free_text ?? '',
        submitted_by: ctx.user.id,
        submitted_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    }
  } else {
    await insertRow(spreadsheetId, handoverTab, {
      id: ulid(),
      shift_instance_id: shiftInstanceId,
      values: handoverValuesJson,
      free_text: body.free_text ?? '',
      photo_ids: '',
      submitted_by: ctx.user.id,
      submitted_at: now.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  }

  const contentHash = createHash('sha256')
    .update(
      JSON.stringify({
        shiftInstanceId,
        shiftDate: instance['shift_date'],
        submittedBy: ctx.user.id,
        handoverValues,
        requiredPoints: requiredIds,
        createdAt: now.toISOString(),
      })
    )
    .digest('hex');

  const reportNumber = `R-${String(instance['shift_date']).replace(/-/g, '')}-${shiftInstanceId.slice(-4)}`;
  const incidentRows = await listMonthlyRows(spreadsheetId, 'Incidents', tabMonth).catch(() => [] as Record<string, unknown>[]);
  const scoringItems = (snapshot.categories ?? []).flatMap((category) => (category.points ?? []).map((point) => {
    const entry = allEntryRows.find((row) => String(row['shift_instance_id']) === shiftInstanceId && String(row['point_ref']) === point.point_ref);
    return { pointRef: point.point_ref, points: point.points ?? 1, state: String(entry?.['state'] ?? 'belum'), outOfRange: String(entry?.['out_of_range']).toLowerCase() === 'true' };
  }));
  const scoringIncidents = incidentRows
    .filter((row) => String(row['shift_instance_id']) === shiftInstanceId)
    .map((row) => ({ points: Number(row['points_snapshot'] ?? 0), severity: String(row['severity'] ?? ''), penaltyMinSeverity: String(row['penalty_min_severity_snapshot'] ?? 'none') }));
  const score = calculateScore(scoringItems, scoringIncidents);
  const summaryStatsJson = JSON.stringify({
    total_required: requiredIds.length,
    done: entryRows.filter((row) => String(row['state']) === 'selesai').length,
    skipped: entryRows.filter((row) => String(row['state']) === 'skip').length,
    score_version: snapshot.score_version ?? 'weighted-v1',
    score_available: score.available,
    score_earned: score.earned,
    completion_percent: score.completionPercent,
    incident_penalty: score.incidentPenalty,
    score_final: score.finalScore,
    score_percent: score.scorePercent,
  });
  const existingReportRow = await findRowFresh(spreadsheetId, 'Reports', 'shift_instance_id', shiftInstanceId);
  const reportId = existingReportRow ? String(existingReportRow.data['id']) : ulid();
  if (existingReportRow) {
    await updateRow(spreadsheetId, 'Reports', existingReportRow.rowNumber, {
      report_number: reportNumber,
      generated_by: ctx.user.id,
      generated_at: now.toISOString(),
      is_locked: true,
      summary_stats: summaryStatsJson,
      content_hash: contentHash,
      updated_at: now.toISOString(),
    });
  } else {
    await insertRow(spreadsheetId, 'Reports', {
      id: reportId,
      shift_instance_id: shiftInstanceId,
      report_number: reportNumber,
      generated_by: ctx.user.id,
      generated_at: now.toISOString(),
      is_locked: true,
      summary_stats: summaryStatsJson,
      content_hash: contentHash,
      unlock_count: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  }

  // Update Shift_Instances: tutup shift + bekukan snapshot terbaru
  await updateRow(spreadsheetId, 'ShiftInstances', rowNumber, {
    status: 'ditutup',
    closed_at: now.toISOString(),
    closed_by: ctx.user.id,
    close_type: 'normal',
    no_incident_confirmed: body.no_incident ?? false,
    ...(snapshot.shift
      ? {
          snapshot_encoding: 'json',
          template_snapshot: JSON.stringify(snapshot),
          snapshot_hash: hashSnapshot(snapshot),
        }
      : {}),
    updated_at: now.toISOString(),
  });

  // Best-effort dual-write status ke Supabase mycheck_shift_instances
  try {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('mycheck_shift_instances')
        .update({ status: 'closed', closed_at: now.toISOString() })
        .eq('id', shiftInstanceId);
    }
  } catch { /* best-effort: Sheets tetap sumber utama */ }

  await appendAuditLogFor(spreadsheetId, {
    actorId: ctx.user.id,
    action: 'close_shift',
    objectType: 'shift_instance',
    objectId: shiftInstanceId,
    branchId,
    shiftInstanceId,
    after: {
      status: 'ditutup',
      closedBy: ctx.user.id,
      reportNumber,
      score,
      handoverValues,
    },
  });

  // Fase 18: catat skor ke ScoreLedger saat tutup shift. ID ledger
  // deterministik + upsert menjadikan retry idempoten dan koreksi review final
  // memperbarui nilai. Best-effort: kegagalan tidak boleh membatalkan tutup.
  if (isScoringEnabled()) {
    try {
      await calculateAndRecordShiftScoring(spreadsheetId, branchId, shiftInstanceId, reportId, 1);
    } catch {
      // skor dapat dihitung ulang saat review final atau close berikutnya.
    }
  }  if (isShiftBufferEnabled()) {
    await removeBufferedShiftState(branchId, shiftInstanceId).catch(() => undefined);
  }

  // Fan-out notifikasi \"Tutup shift\" — best-effort (Fase 14).
  try {
    await notifyShiftClosed({
      spreadsheetId,
      branchId,
      shiftInstanceId,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      shiftName: String(snapshot.shift?.name ?? shiftInstanceId),
      link: '/report',
    });
  } catch {
    // kegagalan notifikasi tidak boleh menggagalkan tutup shift
  }

  // Emisi task event MYCHECK_SHIFT_CLOSE ke MyPerformance
  try {
    const { emitTaskEvent } = await import('@mochikin/shared/events');
    const { createClient } = await import('@supabase/supabase-js');
    const { resolvePersonForTaskEvent } = await import('@/lib/resolve-person');

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const resolved = await resolvePersonForTaskEvent(
        {
          personId: ctx.user.personId || _req.cookies.get('mochikin_person_id')?.value,
          activeBranchId: _req.cookies.get('mochikin_active_branch_id')?.value || branchId,
          username: ctx.user.username,
          name: ctx.user.name,
        },
        supabase
      );

      if (resolved) {
        const complianceRatio = score.available > 0
          ? Math.max(0, Math.min(1, Number((score.finalScore / score.available).toFixed(4))))
          : 1.0;
        const shiftDate = now.toISOString().slice(0, 10);
        const idempotencyKey = `mycheck-close-${shiftInstanceId}-${resolved.personId}`;

        // Kirim via PointOutbox sheet lokal gerai
        try {
          const { enqueueAndProcessOutbox } = await import('@/lib/outbox-service');
          enqueueAndProcessOutbox(spreadsheetId, {
            eventType: 'session_ingest',
            idempotencyKey,
            payload: {
              appId: 'mycheck',
              taskCode: 'MYCHECK_SHIFT_CLOSE',
              personId: resolved.personId,
              branchId: resolved.branchId,
              shiftDate,
              occurredAt: now.toISOString(),
              sessionRef: shiftInstanceId,
              idempotencyKey,
              meta: {
                shiftInstanceId,
                reportNumber,
                ratio: complianceRatio,
                scoreFinal: score.finalScore,
                scoreAvailable: score.available,
              },
            },
          }).catch((outErr: unknown) => console.warn('⚠️ MyCheck Outbox enqueue warning:', outErr));
        } catch (outboxImportErr) {
          console.warn('⚠️ MyCheck Outbox import warning:', outboxImportErr);
        }

        // Dual-write legacy emitTaskEvent
        const emitRes = await emitTaskEvent({
          taskId: 'MYCHECK_SHIFT_CLOSE',
          personId: resolved.personId,
          branchId: resolved.branchId,
          appId: 'mycheck',
          outputQty: 1,
          occurredAt: now.toISOString(),
          idempotencyKey,
          meta: { shiftInstanceId, reportNumber, ratio: complianceRatio },
        });
        if (!emitRes.success) {
          console.error('❌ emitTaskEvent MYCHECK_SHIFT_CLOSE gagal:', emitRes.error, {
            shiftInstanceId,
            personId: resolved.personId,
          });
        }
      } else {
        console.error('❌ emitTaskEvent MYCHECK_SHIFT_CLOSE dibatalkan: personId atau branchId valid tidak ditemukan', {
          shiftInstanceId,
          username: ctx.user.username,
        });
      }
    }
  } catch (emitErr) {
    console.error('❌ emitTaskEvent MYCHECK_SHIFT_CLOSE exception:', emitErr, {
      shiftInstanceId,
      user: ctx.user.username,
    });
  }

  // Ambil report yang baru dibuat untuk popup
  const reportRow = (await filterRows(
    spreadsheetId,
    'Reports',
    (r) => String(r['report_number']) === reportNumber
  ))[0];

  return NextResponse.json({
    status: 'ditutup',
    report_number: reportNumber,
    report_id: reportRow ? String(reportRow['id']) : null,
    summary_stats: reportRow
      ? (JSON.parse(String(reportRow['summary_stats'] ?? '{}')) as {
          total_required: number;
          done: number;
          skipped: number;
        })
      : null,
  });
});
