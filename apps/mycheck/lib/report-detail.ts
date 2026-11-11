// lib/report-detail.ts
// Satu sumber data untuk detail laporan dipakai oleh API route
// (`/api/reports/[id]`, `/api/public/report/[token]`) dan halaman publik
// (`/r/[token]`) supaya logika Sheets tidak terduplikasi.

import { resolveCabang, getCabangList } from './google/registry';
import { listAllUsers } from './google/registry-admin';
import { filterRows, listMonthlyRows, asJson, asStr } from './store';
import { tabMonthOf } from './instance-resolver';
import { readTemplateSnapshot } from './template-snapshot';
import { buildTemplateSnapshot, type Snapshot } from './db/snapshot';

export interface ReportDetail {
  branch: { id: string; name: string; code: string };
  shift: {
    id: string;
    shift_date: string;
    status: string;
    opened_at: string;
    closed_at: string;
    pj_user_id: string;
    pj_name: string | null;
    template_snapshot: Snapshot | null;
  };
  report: {
    id: string;
    report_number: string;
    generated_by: string;
    generated_at: string;
    status: string;
    is_locked: boolean;
    summary_stats: Record<string, unknown> | null;
    content_hash: string;
  };
  handover: {
    id: string;
    values: Record<string, unknown> | null;
    free_text: string;
    photo_ids: string;
    submitted_by: string;
    submitted_at: string;
  } | null;
  entries: {
    pointRef: string;
    state: string;
    value: unknown;
    skipReason: string | null;
    timingLabel: string | null;
    completedBy: string | null;
    completedByName: string | null;
    completedAt: string | null;
  }[];
  participants: {
    id: string;
    name: string;
    firstActionAt: string;
    firstActionType: string;
    isPj: boolean;
    itemsDone: number;
  }[];
  incidents: {
    id: string;
    categoryId: string;
    categoryName: string | null;
    description: string;
    occurredAt: string;
    status: string;
    severity: string | null;
  }[];
  photos: { id: string; fileRef: string; ownerType: string; ownerId: string; mime: string; uploadedAt: string; status: string }[];
  addenda: { id: string; note: string; authorId: string; authorName: string; createdAt: string }[];
}

/** Susun detail laporan dari spreadsheet + cabang yang sudah diketahui. */
export async function buildReportDetail(
  spreadsheetId: string,
  branchId: string,
  reportId: string
): Promise<ReportDetail | null> {
  const cabangs = await getCabangList();
  const cabang = cabangs.find((c) => c.Cabang_ID === branchId);

  const reportHits = await filterRows(
    spreadsheetId,
    'Reports',
    (r) => asStr(r['id']) === reportId
  );
  const report = reportHits[0];
  if (!report) return null;

  const shiftInstanceId = asStr(report['shift_instance_id']);
  const shiftHits = await filterRows(
    spreadsheetId,
    'ShiftInstances',
    (r) => asStr(r['id']) === shiftInstanceId
  );
  const shift = shiftHits[0];
  if (!shift) return null;

  const tabMonth = tabMonthOf(shift);
  const users = await listAllUsers();
  const nameByUsername = new Map(users.map((u) => [u.Username, u.Nama]));

  // Handover
  const handoverRow = (await listMonthlyRows(spreadsheetId, 'Handovers', tabMonth)).find(
    (h) => asStr(h['shift_instance_id']) === shiftInstanceId
  );
  const handover = handoverRow
    ? {
        id: asStr(handoverRow['id']),
        values: asJson<Record<string, unknown>>(handoverRow['values']),
        free_text: asStr(handoverRow['free_text']),
        photo_ids: asStr(handoverRow['photo_ids']),
        submitted_by: asStr(handoverRow['submitted_by']),
        submitted_at: asStr(handoverRow['submitted_at']),
      }
    : null;

  // Entries
  const entries = (await listMonthlyRows(spreadsheetId, 'Entries', tabMonth))
    .filter((e) => asStr(e['shift_instance_id']) === shiftInstanceId)
    .map((e) => {
      const by = asStr(e['completed_by']);
      return {
        pointRef: asStr(e['point_ref']),
        state: asStr(e['state']),
        value: e['value'] ?? null,
        skipReason: asStr(e['skip_reason']) || null,
        timingLabel: asStr(e['timing_label']) || null,
        completedBy: by || null,
        completedByName: by ? (nameByUsername.get(by) ?? null) : null,
        completedAt: asStr(e['completed_at']) || null,
      };
    });

  // Peserta
  const pjUserId = asStr(shift['pj_user_id']);
  const participants = (await filterRows(
    spreadsheetId,
    'Participants',
    (r) => asStr(r['shift_instance_id']) === shiftInstanceId
  ))
    .sort((a, b) => asStr(a['first_action_at']).localeCompare(asStr(b['first_action_at'])))
    .map((p) => {
      const userId = asStr(p['user_id']);
      return {
        id: userId,
        name: nameByUsername.get(userId) ?? userId,
        firstActionAt: asStr(p['first_action_at']),
        firstActionType: asStr(p['first_action_type']),
        isPj: userId === pjUserId,
        itemsDone: entries.filter((e) => e.completedBy === userId && e.state === 'selesai')
          .length,
      };
    });

  // Incident kategori per cabang
  let categoryNames = new Map<string, string>();
  try {
    const cats = await filterRows(spreadsheetId, 'IncidentCategories', () => true);
    categoryNames = new Map(cats.map((c) => [asStr(c['id']), asStr(c['name'])]));
  } catch {
    // sheet belum ada
  }

  const incidents = (await listMonthlyRows(spreadsheetId, 'Incidents', tabMonth))
    .filter((i) => asStr(i['shift_instance_id']) === shiftInstanceId)
    .map((i) => {
      const catId = asStr(i['category_id']);
      return {
        id: asStr(i['id']),
        categoryId: catId,
        categoryName: categoryNames.get(catId) ?? null,
        description: asStr(i['description']),
        occurredAt: asStr(i['occurred_at']),
        status: asStr(i['status']),
        severity: asStr(i['severity']) || null,
      };
    });

  // Foto
  const photos = (await listMonthlyRows(spreadsheetId, 'Photos', tabMonth))
    .filter((p) => asStr(p['shift_instance_id']) === shiftInstanceId)
    .map((p) => ({
      id: asStr(p['id']),
      fileRef: asStr(p['file_ref']),
      ownerType: asStr(p['owner_type']),
      ownerId: asStr(p['owner_id']),
      mime: asStr(p['mime']),
      uploadedAt: asStr(p['uploaded_at']),
      status: asStr(p['status']),
    }));

  // Addenda
  const addenda = (await filterRows(spreadsheetId, 'Addenda', (r) => asStr(r['report_id']) === reportId))
    .sort((a, b) => asStr(a['created_at']).localeCompare(asStr(b['created_at'])))
    .map((a) => {
      const authorId = asStr(a['author_id']);
      return {
        id: asStr(a['id']),
        note: asStr(a['note']),
        authorId,
        authorName: nameByUsername.get(authorId) ?? authorId,
        createdAt: asStr(a['created_at']),
      };
    });

  // Snapshot bisa tersimpan sebagai JSON biasa ATAU gzip+base64 (lihat
  // lib/template-snapshot.ts). JSON.parse buta mengembalikan null untuk yang
  // gzip, dan null berarti `categories: []` -> checklist kosong di laporan.
  let templateSnapshot = readTemplateSnapshot(shift);
  const shiftDefId = asStr(shift['shift_definition_id']) || asStr(templateSnapshot?.shift?.id);
  const timezone = asStr(cabang?.['Timezone']) || 'Asia/Jakarta';
  const hasSnapshotPoints = (templateSnapshot?.categories ?? []).some((c) => (c.points ?? []).length > 0);
  const hasHandoverFields = (templateSnapshot?.handover_fields ?? []).length > 0;

  if (shiftDefId && (!templateSnapshot || !hasSnapshotPoints || !hasHandoverFields)) {
    try {
      const latest = await buildTemplateSnapshot(spreadsheetId, shiftDefId, timezone);
      templateSnapshot = templateSnapshot?.shift
        ? {
            ...templateSnapshot,
            categories: hasSnapshotPoints ? templateSnapshot.categories : latest.categories,
            handover_fields: hasHandoverFields ? templateSnapshot.handover_fields : latest.handover_fields,
          }
        : latest;
    } catch {
      // gunakan snapshot yang ada bila master tidak tersedia
    }
  }

  // Pastikan setiap entry yang sudah selesai/skip tetap muncul di laporan meskipun
  // point_ref-nya tidak ada di snapshot (mis. item dihapus setelah dicentang).
  if (templateSnapshot && entries.length > 0) {
    const existingRefs = new Set(
      (templateSnapshot.categories ?? []).flatMap((c) => (c.points ?? []).map((p) => p.point_ref))
    );
    const missingEntries = entries.filter(
      (e) => e.pointRef && !existingRefs.has(e.pointRef) && (e.state === 'selesai' || e.state === 'skip')
    );
    if (missingEntries.length > 0) {
      let masterPointById = new Map<string, Record<string, unknown>>();
      try {
        const masterPoints = await filterRows(spreadsheetId, 'ChecklistPoints', () => true);
        masterPointById = new Map(masterPoints.map((p) => [asStr(p['id']), p]));
      } catch {
        // abaikan
      }
      const extraPoints = missingEntries.map((e, idx) => {
        const mp = masterPointById.get(e.pointRef);
        return {
          point_ref: e.pointRef,
          title: asStr(mp?.['title']) || `Item Checklist (${e.pointRef.slice(-6)})`,
          instruction: mp?.['instruction'] ? asStr(mp['instruction']) : null,
          input_type: asStr(mp?.['input_type']) || 'centang',
          input_types: [asStr(mp?.['input_type']) || 'centang'],
          options: null,
          is_required: true,
          target_time: null,
          tolerance_minutes: null,
          active_days: null,
          number_min: null,
          number_max: null,
          sort_order: 900 + idx,
          points: Number(mp?.['points'] ?? 1) || 1,
        };
      });
      const categories = [...(templateSnapshot.categories ?? [])];
      if (categories.length > 0) {
        categories[0] = {
          ...categories[0],
          points: [...(categories[0].points ?? []), ...extraPoints],
        };
      } else {
        categories.push({
          id: 'default',
          name: 'Checklist Shift',
          sort_order: 1,
          color: null,
          points: extraPoints,
        });
      }
      templateSnapshot = { ...templateSnapshot, categories };
    }
  }

  // Pastikan setiap key pada handover.values tampil meskipun field sudah dihapus dari snapshot.
  if (templateSnapshot && handover?.values && typeof handover.values === 'object') {
    const knownFieldIds = new Set((templateSnapshot.handover_fields ?? []).map((f) => f.id));
    const orphanFieldIds = Object.keys(handover.values).filter((id) => !knownFieldIds.has(id));
    if (orphanFieldIds.length > 0) {
      templateSnapshot = {
        ...templateSnapshot,
        handover_fields: [
          ...(templateSnapshot.handover_fields ?? []),
          ...orphanFieldIds.map((id, idx) => ({
            id,
            label: `Handover (${id.slice(-6)})`,
            field_type: 'teks',
            input_types: ['teks'],
            options: null,
            is_required: false,
            sort_order: 900 + idx,
          })),
        ],
      };
    }
  }

  const summaryStats = asJson<Record<string, unknown>>(report['summary_stats']);
  const approvalFeedback = summaryStats?.approval_feedback as Record<string, unknown> | undefined;
  const resolvedReportStatus =
    asStr(report['status']) ||
    asStr(summaryStats?.status) ||
    asStr(approvalFeedback?.status) ||
    'submitted';

  return {
    branch: {
      id: branchId,
      name: (cabang?.['Nama_Cabang'] as string) || branchId,
      code: (cabang?.['Kode'] as string) || branchId,
    },
    shift: {
      id: shiftInstanceId,
      shift_date: asStr(shift['shift_date']),
      status: asStr(shift['status']),
      opened_at: asStr(shift['opened_at']),
      closed_at: asStr(shift['closed_at']),
      pj_user_id: pjUserId,
      pj_name: pjUserId ? (nameByUsername.get(pjUserId) ?? null) : null,
      template_snapshot: templateSnapshot,
    },
    report: {
      id: asStr(report['id']),
      report_number: asStr(report['report_number']),
      generated_by: asStr(report['generated_by']),
      generated_at: asStr(report['generated_at']),
      status: resolvedReportStatus,
      is_locked: asStr(report['is_locked']) === 'TRUE',
      summary_stats: summaryStats,
      content_hash: asStr(report['content_hash']),
    },
    handover,
    entries,
    participants,
    incidents,
    photos,
    addenda,
  };
}

/** Detail laporan untuk halaman publik (berdasar share token). */
export async function buildPublicReportDetail(
  token: string
): Promise<
  | { state: 'invalid' }
  | { state: 'expired' }
  | { state: 'notfound' }
  | { state: 'ok'; detail: ReportDetail }
> {
  const { findTokenByValue, isTokenActive } = await import('./google/share-tokens');
  const share = await findTokenByValue(token);
  if (!share || share.revoked_at) return { state: 'invalid' };
  if (!isTokenActive(share)) return { state: 'expired' };

  let spreadsheetId = '';
  try {
    spreadsheetId = (await resolveCabang(share.branch_id)).spreadsheetId;
  } catch {
    return { state: 'notfound' };
  }

  const detail = await buildReportDetail(spreadsheetId, share.branch_id, share.report_id);
  if (!detail) return { state: 'notfound' };
  return { state: 'ok', detail };
}