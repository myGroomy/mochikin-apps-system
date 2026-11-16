import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { ulid } from 'ulid';
import { withAuth } from '../../../../lib/api-auth';
import { resolveInstance } from '../../../../lib/instance-resolver';
import { readTemplateSnapshot } from '../../../../lib/template-snapshot';
import type { Snapshot } from '../../../../lib/db/snapshot';
import { buildPhotoBaseName } from '../../../../lib/photo-filename';
import { uploadPhotoToStorage } from '../../../../lib/db/photo-storage';
import { tabMonthOfDate } from '../../../../lib/schema/periods';
import { getSupabase } from '../../../../lib/supabase';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_INCIDENT_PHOTOS = 5;
const MAX_ATTACHED_PHOTOS = 5;

function extensionFor(mime: string): string | null {
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  return null;
}

export const POST = withAuth(async (req, ctx) => {
  const formData = await req.formData();
  const file = formData.get('file');
  const ownerType = String(formData.get('ownerType') ?? 'incident');
  const ownerId = String(formData.get('ownerId') ?? '');
  const requestedShiftId = formData.get('shiftInstanceId')?.toString() || null;

  if (!(file instanceof File) || !ownerId) {
    return NextResponse.json({ error: 'file dan ownerId wajib diisi' }, { status: 400 });
  }
  if (!['entry', 'handover', 'incident'].includes(ownerType)) {
    return NextResponse.json({ error: 'Jenis pemilik foto tidak valid.' }, { status: 400 });
  }
  const ext = extensionFor(file.type);
  if (!ext) return NextResponse.json({ error: 'Format foto yang didukung: WebP, PNG, JPEG.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Ukuran foto maksimal 5 MB.' }, { status: 400 });

  const supabase = getSupabase();
  const { data: branches, error: branchesError } = await supabase
    .from('branches')
    .select('id,code')
    .in('code', ctx.branchIds)
    .eq('status', 'active')
    .is('deleted_at', null);
  if (branchesError) {
    console.error('MyCheck photo branch lookup failed:', branchesError);
    return NextResponse.json({ error: 'Cabang tidak dapat dimuat.' }, { status: 500 });
  }

  let branch = null as (typeof branches extends (infer T)[] | null ? T : never) | null;
  let resolvedShiftId = requestedShiftId;
  let shiftDate: string | null = null;
  let startTime: string | null = null;
  let countQuery = supabase.from('mycheck_photos').select('id', { count: 'exact', head: true });

  if (ownerType === 'incident') {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId)) {
      return NextResponse.json({ error: 'Incident tidak ditemukan.' }, { status: 404 });
    }
    const branchIds = (branches ?? []).map((item) => item.id);
    if (!branchIds.length) return NextResponse.json({ error: 'Incident tidak ditemukan.' }, { status: 404 });
    const { data: incident, error } = await supabase
      .from('mycheck_incidents')
      .select('branch_id,shift_instance_id,reported_at')
      .eq('id', ownerId)
      .in('branch_id', branchIds)
      .maybeSingle();
    if (error) {
      console.error('MyCheck photo incident lookup failed:', error);
      return NextResponse.json({ error: 'Incident tidak dapat dimuat.' }, { status: 500 });
    }
    if (!incident) return NextResponse.json({ error: 'Incident tidak ditemukan.' }, { status: 404 });
    branch = branches?.find((item) => item.id === incident.branch_id) ?? null;
    if (requestedShiftId && incident.shift_instance_id && requestedShiftId !== incident.shift_instance_id) {
      return NextResponse.json({ error: 'Foto tidak sesuai dengan shift incident.' }, { status: 400 });
    }
    resolvedShiftId = incident.shift_instance_id;
    shiftDate = incident.reported_at?.slice(0, 10) ?? null;
    countQuery = countQuery
      .eq('branch_id', incident.branch_id)
      .eq('owner_type', 'incident')
      .eq('owner_id', ownerId)
      .eq('status', 'uploaded');
  } else {
    if (!requestedShiftId) {
      return NextResponse.json({ error: 'shiftInstanceId wajib untuk foto checklist/handover.' }, { status: 400 });
    }
    const resolved = await resolveInstance(ctx, requestedShiftId);
    if (!resolved) return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });
    if (String(resolved.instance.status) !== 'open') {
      return NextResponse.json({ error: 'Foto hanya dapat ditambahkan pada shift berjalan.' }, { status: 409 });
    }
    branch = branches?.find((item) => item.id === resolved.spreadsheetId) ?? null;
    shiftDate = String(resolved.instance.shift_date);
    resolvedShiftId = requestedShiftId;
    const snapshot = readTemplateSnapshot(resolved.instance) ?? ({} as Snapshot);
    if (ownerType === 'entry') {
      const pointExists = (snapshot.categories ?? []).some((category) =>
        (category.points ?? []).some((point) => point.point_ref === ownerId)
      );
      if (!pointExists) return NextResponse.json({ error: 'Item foto tidak ditemukan pada shift ini.' }, { status: 404 });
      startTime = snapshot.shift?.start_time ?? null;
    } else {
      const { data: handover, error } = await supabase
        .from('mycheck_handovers')
        .select('id')
        .eq('id', ownerId)
        .eq('shift_instance_id', requestedShiftId)
        .maybeSingle();
      if (error) {
        console.error('MyCheck photo handover lookup failed:', error);
        return NextResponse.json({ error: 'Handover tidak dapat dimuat.' }, { status: 500 });
      }
      if (!handover) return NextResponse.json({ error: 'Handover tidak ditemukan.' }, { status: 404 });
    }
    countQuery = countQuery
      .eq('branch_id', resolved.spreadsheetId)
      .eq('owner_type', ownerType)
      .eq('owner_id', ownerId)
      .eq('shift_instance_id', requestedShiftId)
      .eq('status', 'uploaded');
  }

  if (!branch) return NextResponse.json({ error: 'Cabang tidak ditemukan.' }, { status: 404 });
  const { count, error: countError } = await countQuery;
  if (countError) {
    console.error('MyCheck photo count failed:', countError);
    return NextResponse.json({ error: 'Jumlah foto tidak dapat diverifikasi.' }, { status: 500 });
  }
  const photoLimit = ownerType === 'incident' ? MAX_INCIDENT_PHOTOS : MAX_ATTACHED_PHOTOS;
  if ((count ?? 0) >= photoLimit) {
    return NextResponse.json({ error: `Maksimal ${photoLimit} foto untuk ${ownerType}.` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const baseName = buildPhotoBaseName({
    branchCode: branch.code,
    shiftDate,
    startTime,
    username: ctx.user.username || ctx.user.name,
  });
  const period = shiftDate?.slice(0, 7) ?? tabMonthOfDate();
  const filePath = `${branch.code}/${period}/${baseName}-${ulid().slice(-6)}.${ext}`;
  let uploaded: { fileUrl: string; filePath: string; sizeBytes: number };
  try {
    uploaded = await uploadPhotoToStorage(buffer, file.type, filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Foto gagal disimpan. Coba lagi.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const photoId = crypto.randomUUID();
  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from('mycheck_photos').insert({
    id: photoId,
    branch_id: branch.id,
    shift_instance_id: resolvedShiftId,
    owner_type: ownerType,
    owner_id: ownerId,
    storage_path: uploaded.filePath,
    photo_url: uploaded.fileUrl,
    mime: file.type,
    size_bytes: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    status: 'uploaded',
    uploaded_by: ctx.user.personId ?? ctx.user.id,
    uploaded_at: now,
  });
  if (insertError) {
    const { error: cleanupError } = await supabase.storage.from('mycheck-photos').remove([uploaded.filePath]);
    if (cleanupError) console.error('MyCheck orphan photo cleanup failed:', cleanupError);
    console.error('MyCheck photo metadata creation failed:', insertError);
    return NextResponse.json({ error: 'Metadata foto tidak dapat disimpan.' }, { status: 500 });
  }

  return NextResponse.json({ status: 'uploaded', photo_id: photoId, photo_url: uploaded.fileUrl });
});
