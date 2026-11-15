// app/api/incidents/route.ts
// Phase 4 (Sheets): daftar + buat incident.
import { NextResponse } from 'next/server';
import { ulid } from 'ulid';
import { requireBranchAccess, withAuth } from '../../../lib/api-auth';
import { resolveCabang, getCabangList, getSettingsGlobal } from '../../../lib/google/registry';
import { appendAuditLogFor } from '../../../lib/db/audit';
import { getServerTime } from '../../../lib/db/server-time';
import { asBool, asStr, filterRows, insertRow, listMonthlyRows, getPeriodSheet } from '../../../lib/store';
import { resolveInstance, tabMonthOf } from '../../../lib/instance-resolver';
import { ensureIncidentTabs, incidentPeriods, incidentTabMonth, listActiveCategoriesAcrossBranches, pushNotification, upsertIncidentIndex, userNameMap, categoryNameMap } from '../../../lib/incidents';
import { getSupabase } from '../../../lib/supabase';
import { isUuid, toDeterministicUuid } from '../../../lib/resolve-person';

interface IncidentBody {
  shiftInstanceId?: string;
  categoryId?: string;
  description?: string;
  occurredAt?: string;
  severity?: 'rendah' | 'sedang' | 'tinggi';
  outsideShift?: boolean;
  branchId?: string;
}
const SEVERITIES = new Set(['rendah', 'sedang', 'tinggi']);
async function linkWindowHours(): Promise<number> {
  try {
    const s = await getSettingsGlobal();
    const raw = Number(s['incident_link_window_hours'] ?? 4);
    return Number.isFinite(raw) && raw > 0 ? raw : 4;
  } catch { return 4; }
}
export const GET = // eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: branchRows } = await supabase
        .from('branches')
        .select('id, name, code');

      const allowedBranchUuids: string[] = [];
      const branchMap = new Map<string, { id: string; name: string; code: string }>();
      for (const b of branchRows || []) {
        branchMap.set(b.id, b);
        if (ctx.branchIds.includes(b.id) || ctx.branchIds.includes(b.code)) {
          allowedBranchUuids.push(b.id);
        }
      }

      if (allowedBranchUuids.length > 0) {
        const { data: incidentsDb, error } = await supabase
          .from('mycheck_incidents')
          .select('*')
          .in('branch_id', allowedBranchUuids)
          .order('reported_at', { ascending: false })
          .limit(100);

        if (!error && incidentsDb) {
          const reporterIds = Array.from(new Set(incidentsDb.map((i) => i.reported_by_id).filter(Boolean)));
          const userMap = new Map<string, string>();
          if (reporterIds.length > 0) {
            const { data: people } = await supabase
              .from('people')
              .select('id, name, username')
              .in('id', reporterIds);
            for (const p of people || []) {
              userMap.set(p.id, p.name || p.username || p.id);
            }
          }

          const mappedIncidents = incidentsDb.map((row) => {
            const b = branchMap.get(row.branch_id);
            return {
              id: row.id,
              branchId: row.branch_id,
              branchName: b?.name || row.branch_id,
              shiftInstanceId: row.shift_instance_id || null,
              categoryId: row.category,
              categoryName: row.category,
              description: row.description,
              title: row.title,
              occurredAt: row.reported_at,
              reportedAt: row.reported_at,
              reportedByName: userMap.get(row.reported_by_id) ?? row.reported_by_id,
              status: row.status === 'resolved' ? 'selesai' : row.status,
              severity: row.severity === 'low' ? 'rendah' : row.severity === 'medium' ? 'sedang' : row.severity === 'high' ? 'tinggi' : row.severity,
              outsideShift: !row.shift_instance_id,
            };
          });

          const categories = await listActiveCategoriesAcrossBranches(ctx);
          const branches = (branchRows || [])
            .filter((b) => allowedBranchUuids.includes(b.id))
            .map((b) => ({ id: b.id, name: b.name, code: b.code }));

          const response = NextResponse.json({
            categories: categories.map((c) => ({
              id: c.id,
              name: c.name,
              sortOrder: c.sortOrder,
              points: c.points,
              penaltyMinSeverity: c.penaltyMinSeverity,
            })),
            branches,
            incidents: mappedIncidents,
          });
          response.headers.set('Cache-Control', 'no-store');
          response.headers.set('Vary', 'Cookie');
          return response;
        }
      }
    } catch (sbErr) {
      console.warn('Supabase incidents query error, falling back to Sheets:', sbErr);
    }
  }

  const cabangs = await getCabangList();
  const branchRows = cabangs.filter((c) => ctx.branchIds.includes(c.Cabang_ID)).map((c) => ({
    id: c.Cabang_ID, name: (c['Nama_Cabang'] as string) || c.Cabang_ID, code: (c['Kode'] as string) || c.Cabang_ID,
  }));
  const categories = await listActiveCategoriesAcrossBranches(ctx);
  const nameByUsername = await userNameMap();
  const categoryNames = await categoryNameMap(ctx);
  const incidents: Record<string, unknown>[] = [];
  for (const cabang of cabangs) {
    if (!ctx.branchIds.includes(cabang.Cabang_ID) || !cabang.Spreadsheet_ID) continue;
    let spreadsheetId = '';
    try { spreadsheetId = (await resolveCabang(cabang.Cabang_ID)).spreadsheetId; } catch { continue; }
    let indexed: Record<string, unknown>[] = [];
    try { indexed = await filterRows(spreadsheetId, 'IncidentIndex', () => true); } catch { indexed = []; }
    if (indexed.length > 0) {
      const byMonth = new Map<string, Record<string, unknown>[]>();
      for (const idx of indexed) {
        if (asBool(idx['is_test'])) continue;
        const m = asStr(idx['tab_month']);
        if (!byMonth.has(m)) byMonth.set(m, []);
        byMonth.get(m)!.push(idx);
      }
      for (const [month, list] of byMonth) {
        const rows = await listMonthlyRows(spreadsheetId, 'Incidents', month);
        const byId = new Map(rows.map((r) => [asStr(r['id']), r]));
        for (const idx of list) {
          const row = byId.get(asStr(idx['incident_id']));
          if (!row || asBool(row['is_test'])) continue;
          incidents.push({
            id: asStr(row['id']), branchId: cabang.Cabang_ID,
            branchName: (cabang['Nama_Cabang'] as string) || cabang.Cabang_ID,
            shiftInstanceId: asStr(row['shift_instance_id']) || null,
            categoryId: asStr(row['category_id']),
            categoryName: categoryNames.get(asStr(row['category_id'])) ?? '',
            description: asStr(row['description']), occurredAt: asStr(row['occurred_at']),
            reportedAt: asStr(row['reported_at']),
            reportedByName: nameByUsername.get(asStr(row['reported_by'])) ?? asStr(row['reported_by']),
            status: asStr(row['status']), severity: asStr(row['severity']) || null,
            outsideShift: asBool(row['outside_shift']),
          });
        }
      }
    } else {
      for (const month of await incidentPeriods(spreadsheetId)) {
        const rows = await listMonthlyRows(spreadsheetId, 'Incidents', month);
        for (const row of rows) {
          if (asBool(row['is_test'])) continue;
          incidents.push({
            id: asStr(row['id']), branchId: cabang.Cabang_ID,
            branchName: (cabang['Nama_Cabang'] as string) || cabang.Cabang_ID,
            shiftInstanceId: asStr(row['shift_instance_id']) || null,
            categoryId: asStr(row['category_id']),
            categoryName: categoryNames.get(asStr(row['category_id'])) ?? '',
            description: asStr(row['description']), occurredAt: asStr(row['occurred_at']),
            reportedAt: asStr(row['reported_at']),
            reportedByName: nameByUsername.get(asStr(row['reported_by'])) ?? asStr(row['reported_by']),
            status: asStr(row['status']), severity: asStr(row['severity']) || null,
            outsideShift: asBool(row['outside_shift']),
          });
        }
      }
    }
  }
  incidents.sort((a, b) => String(b['reportedAt'] ?? '').localeCompare(String(a['reportedAt'] ?? '')));
  const response = NextResponse.json({
    categories: categories.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder, points: c.points, penaltyMinSeverity: c.penaltyMinSeverity })),
    branches: branchRows, incidents: incidents.slice(0, 100),
  });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Vary', 'Cookie');
  return response;
});
export const POST = // eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
  let body: IncidentBody = {};
  try { body = (await _req.json()) as IncidentBody; } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }
  const categoryId = body.categoryId;
  const description = body.description?.trim();
  if (!categoryId || !description) {
    return NextResponse.json({ error: 'categoryId dan description wajib diisi' }, { status: 400 });
  }
  if (description.length > 3000) return NextResponse.json({ error: 'Deskripsi maksimal 3000 karakter.' }, { status: 400 });
  if (body.severity && !SEVERITIES.has(body.severity)) return NextResponse.json({ error: 'severity tidak valid.' }, { status: 400 });
  const now = getServerTime();
  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : now;
  if (Number.isNaN(occurredAt.getTime())) return NextResponse.json({ error: 'occurredAt tidak valid.' }, { status: 400 });
  const categories = await listActiveCategoriesAcrossBranches(ctx);
  if (!categories.some((c) => c.id === categoryId)) return NextResponse.json({ error: 'Kategori incident tidak valid' }, { status: 404 });
  let branchId: string | null = null;
  let spreadsheetId = '';
  let tabMonth = '';
  const shiftInstanceId: string | null = body.shiftInstanceId ?? null;
  if (shiftInstanceId) {
    const resolved = await resolveInstance(ctx, shiftInstanceId);
    if (!resolved) return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });
    const branchAccessError = requireBranchAccess(ctx, resolved.branchId);
    if (branchAccessError) return branchAccessError;
    const status = asStr(resolved.instance['status']);
    const windowHours = await linkWindowHours();
    const closedAtRaw = asStr(resolved.instance['closed_at']);
    const isActiveShift = status === 'berjalan';
    const isRecentClosedShift = (status === 'ditutup' || status === 'ditutup_paksa') && closedAtRaw
      ? now.getTime() - new Date(closedAtRaw).getTime() <= windowHours * 60 * 60 * 1000 : false;
    if (!isActiveShift && !isRecentClosedShift) {
      return NextResponse.json({ error: `Incident hanya dapat dibuat untuk shift berjalan atau ditutup maksimal ${windowHours} jam lalu.` }, { status: 400 });
    }
    branchId = resolved.branchId;
    spreadsheetId = resolved.spreadsheetId;
    tabMonth = tabMonthOf(resolved.instance);
  } else {
    // Incident di luar shift tidak punya shift yang bisa menentukan cabang,
    // jadi client wajib menyebutkannya.
    //
    // Untuk petugas ini aman karena branchIds mereka adalah cabang
    // penugasan. Untuk admin TIDAK: branchIds = seluruh cabang aktif
    // (lib/api-auth.ts), sehingga `branchIds[0]` hanya cabang pertama secara
    // alfabetis dan sama sekali tidak menyatakan niat. Dulu kode ini memakai
    // fallback itu, sehingga incident admin diam-diam masuk ke cabang yang
    // salah. Sekarang: admin tanpa branchId ditolak, bukan ditebak.
    const requested = body.branchId?.trim() || null;
    if (requested) {
      const accessError = requireBranchAccess(ctx, requested);
      if (accessError) return accessError;
      branchId = requested;
    } else if (ctx.user.role === 'admin') {
      return NextResponse.json(
        { error: 'Pilih cabang kerja terlebih dahulu.' },
        { status: 400 }
      );
    } else {
      branchId = ctx.branchIds[0] ?? null;
    }
  }
  if (!branchId) return NextResponse.json({ error: 'Cabang incident tidak ditentukan' }, { status: 400 });
  try {
    const { spreadsheetId: sid, cabang } = await resolveCabang(branchId);
    spreadsheetId = spreadsheetId || sid;
    if (!tabMonth) {
      const timezone = String(cabang['Timezone'] || 'Asia/Jakarta');
      const { tabMonthOfDate } = await import('../../../lib/schema/periods');
      tabMonth = tabMonthOfDate(occurredAt, timezone);
    }
  } catch { return NextResponse.json({ error: 'Cabang incident tidak ditemukan' }, { status: 404 }); }
  const incidentId = ulid();
  const reportedAt = now.toISOString();
  const outsideShift = shiftInstanceId ? false : Boolean(body.outsideShift ?? true);
  try {
    tabMonth = incidentTabMonth({ tab_month: tabMonth, occurred_at: occurredAt.toISOString() });
    await ensureIncidentTabs(spreadsheetId, tabMonth);
    const categoryPoints = categories.find((category) => category.id === categoryId)?.points ?? 0;
    await insertRow(spreadsheetId, await getPeriodSheet(spreadsheetId, 'Incidents', tabMonth), {
      id: incidentId, shift_instance_id: shiftInstanceId ?? '', tab_month: tabMonth,
      category_id: categoryId, description, occurred_at: occurredAt.toISOString(),
      reported_by: ctx.user.id, reported_at: reportedAt, status: 'open',
      outside_shift: outsideShift, link_source: shiftInstanceId ? 'otomatis' : 'none',
      linked_by: '', linked_at: '', source_entry_id: '', severity: body.severity ?? '',
      points_snapshot: categoryPoints,
      penalty_min_severity_snapshot: categories.find((category) => category.id === categoryId)?.penaltyMinSeverity ?? 'none',
      status_changed_by: '', status_changed_at: '', is_test: false,
      created_at: reportedAt, updated_at: reportedAt, version: 1,
    });
    await upsertIncidentIndex(spreadsheetId, {
      incident_id: incidentId, tab_month: tabMonth, status: 'open', category_id: categoryId,
      shift_instance_id: shiftInstanceId ?? '', outside_shift: outsideShift, reported_at: reportedAt, is_test: false,
    });
    await appendAuditLogFor(spreadsheetId, {
      actorId: ctx.user.id, action: 'create_incident', objectType: 'incident', objectId: incidentId,
      branchId, shiftInstanceId: shiftInstanceId ?? undefined,
      after: { categoryId, description, occurredAt: occurredAt.toISOString(), severity: body.severity ?? null },
    });
    try {
      await pushNotification(spreadsheetId, {
        userId: ctx.user.id, type: 'incident_created', title: 'Incident terkirim',
        body: description.slice(0, 140), link: `/incident/${incidentId}`,
      });
    } catch { /* best-effort */ }

    // Best-effort dual-write ke Supabase mycheck_incidents
    try {
      const supabase = getSupabase();
      if (supabase) {
        let branchUuid = branchId;
        if (!isUuid(branchUuid)) {
          const { data: b } = await supabase
            .from('branches')
            .select('id')
            .or(`code.eq.${branchId},name.eq.${branchId}`)
            .maybeSingle();
          if (b?.id) branchUuid = b.id;
          else branchUuid = toDeterministicUuid('branch', branchId || 'branch');
        }

        let reportedByUuid = ctx.user.personId;
        if (!isUuid(reportedByUuid)) {
          const { data: p } = await supabase
            .from('people')
            .select('id')
            .eq('username', ctx.user.username)
            .maybeSingle();
          if (p?.id) reportedByUuid = p.id;
          else if (isUuid(ctx.user.id)) reportedByUuid = ctx.user.id;
          else reportedByUuid = toDeterministicUuid('people', ctx.user.username || ctx.user.id);
        }

        const catName = categories.find((c) => c.id === categoryId)?.name || categoryId;
        const rawBody = body as { title?: string; photoUrls?: string[]; photo_urls?: string[] };
        const title = rawBody.title || catName || description.slice(0, 80);
        const photoUrls: string[] = rawBody.photoUrls || rawBody.photo_urls || [];

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
        const sev = sevMap[body.severity ?? ''] || 'low';
        const incidentUuid = isUuid(incidentId) ? incidentId : toDeterministicUuid('incident', incidentId);

        await supabase.from('mycheck_incidents').insert({
          id: incidentUuid,
          branch_id: branchUuid,
          shift_instance_id: shiftInstanceId || null,
          category: catName,
          title,
          description,
          severity: sev,
          status: 'open',
          photo_urls: photoUrls,
          reported_by_id: reportedByUuid,
          reported_at: reportedAt,
        });
      }
    } catch (sbErr) {
      console.warn('mycheck_incidents dual-write warning:', sbErr);
    }

    // Emisi task event MYCHECK_INCIDENT ke MyPerformance
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
          const shiftDate = now.toISOString().slice(0, 10);
          const idempotencyKey = `mycheck-incident-${incidentId}-${resolved.personId}`;

          // Kirim via PointOutbox sheet lokal gerai
          try {
            const { enqueueAndProcessOutbox } = await import('@/lib/outbox-service');
            enqueueAndProcessOutbox(spreadsheetId, {
              eventType: 'session_ingest',
              idempotencyKey,
              payload: {
                appId: 'mycheck',
                taskCode: 'MYCHECK_INCIDENT',
                personId: resolved.personId,
                branchId: resolved.branchId,
                shiftDate,
                occurredAt: reportedAt,
                sessionRef: incidentId,
                idempotencyKey,
                meta: { incidentId, categoryId, severity: body.severity },
              },
            }).catch((outErr: unknown) => console.warn('⚠️ MyCheck Incident Outbox enqueue warning:', outErr));
          } catch (outboxImportErr) {
            console.warn('⚠️ MyCheck Incident Outbox import warning:', outboxImportErr);
          }

          const emitRes = await emitTaskEvent({
            taskId: 'MYCHECK_INCIDENT',
            personId: resolved.personId,
            branchId: resolved.branchId,
            appId: 'mycheck',
            outputQty: 1,
            occurredAt: reportedAt,
            idempotencyKey,
            meta: { incidentId, categoryId, severity: body.severity },
          });
          if (!emitRes.success) {
            console.error('❌ emitTaskEvent MYCHECK_INCIDENT gagal:', emitRes.error, {
              incidentId,
              personId: resolved.personId,
            });
          }
        } else {
          console.error('❌ emitTaskEvent MYCHECK_INCIDENT dibatalkan: personId atau branchId valid tidak ditemukan', {
            incidentId,
            username: ctx.user.username,
          });
        }
      }
    } catch (emitErr) {
      console.error('❌ emitTaskEvent MYCHECK_INCIDENT exception:', emitErr, {
        incidentId,
        user: ctx.user.username,
      });
    }
    return NextResponse.json({ status: 'dibuat', incident_id: incidentId });
  } catch (error) {
    console.error('Create incident error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server saat membuat incident' }, { status: 500 });
  }
});
