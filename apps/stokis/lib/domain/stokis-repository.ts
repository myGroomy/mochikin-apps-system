import { getSupabase } from '@/lib/supabase';

export interface StokisItemUI {
  Item_ID: string;
  Nama_Barang: string;
  Area: string;
  Satuan: string;
  Threshold: number;
  Tipe_Input: string;
  Point: number | null;
  Aktif: boolean;
  Keterangan?: string;
}

export interface SubmitSOPayload {
  cabangId: string;
  sesiId: string;
  tanggalOperasional: string;
  shift: string;
  petugas: string;
  items: Array<{
    itemId: string;
    namaBarang: string;
    area?: string;
    satuan?: string;
    threshold?: number;
    step1?: number;
    step2?: number;
    total?: number;
    keterangan?: string;
    statusIsi?: string;
    tglRefill?: string;
    tglPakai?: string;
  }>;
  note?: string;
}

export interface PreviousSOData {
  latest: {
    sesiId: string;
    tanggal: string;
    shift: string;
    petugas: string;
    waktu: string;
  } | null;
  items: Record<
    string,
    {
      step1: number;
      step2: number;
      total: number;
      tanggal: string;
      shift: string;
      petugas: string;
      keterangan: string;
      waktu: string;
      statusIsi?: 'Penuh' | 'Dipakai' | 'Habis' | '';
      tglRefill?: string;
      tglPakai?: string;
    }
  >;
  history: Array<{
    sesiId: string;
    tanggal: string;
    shift: string;
    petugas: string;
    waktu: string;
    items: Record<string, unknown>;
  }>;
}

/**
 * Mendapatkan master items aktif untuk cabang tertentu,
 * digabungkan dengan ambang batas stok spesifik cabang dari stokis_branch_thresholds.
 */
export async function getMasterItemsFromDb(cabangCodeOrId?: string): Promise<StokisItemUI[]> {
  const supabase = getSupabase();

  // 1. Ambil seluruh master item aktif
  const { data: items, error: itemsErr } = await supabase
    .from('stokis_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (itemsErr) {
    throw new Error(`Gagal mengambil master item: ${itemsErr.message}`);
  }

  // 2. Ambil threshold spesifik cabang jika parameter cabang diberikan
  const thresholdMap = new Map<string, number>();
  if (cabangCodeOrId) {
    const isUuidBranch = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cabangCodeOrId);
    let tQuery = supabase
      .from('stokis_branch_thresholds')
      .select('item_id, item_code, min_stock, warning_level');
    tQuery = isUuidBranch
      ? tQuery.or(`branch_id.eq.${cabangCodeOrId},branch_code.eq.${cabangCodeOrId}`)
      : tQuery.eq('branch_code', cabangCodeOrId);
    const { data: thresholds } = await tQuery;

    for (const t of thresholds || []) {
      const key = t.item_code || t.item_id;
      if (key) thresholdMap.set(key, Number(t.min_stock || t.warning_level || 0));
    }
  }

  return (items || []).map((it) => {
    const itemKey = it.code || it.id;
    const branchTh = thresholdMap.get(itemKey) ?? thresholdMap.get(it.id);
    const effectiveTh = branchTh !== undefined ? branchTh : Number(it.threshold || 0);

    return {
      Item_ID: itemKey,
      Nama_Barang: it.name,
      Area: it.area || 'Kitchen',
      Satuan: it.unit || 'kg',
      Threshold: effectiveTh,
      Tipe_Input: it.tipe_input || 'dual',
      Point: it.default_weight != null ? Number(it.default_weight) : 1,
      Aktif: it.is_active ?? true,
      Keterangan: it.category || '',
    };
  });
}

/**
 * Menyimpan satu sesi Stock Opname secara atomik di database Supabase (stokis_opnames + stokis_opname_lines).
 * Menjamin idempotency per sesiId.
 */
export async function submitSOToDb(payload: SubmitSOPayload): Promise<{
  status: string;
  sesiId: string;
  rows_written: number;
  laporanId: string;
}> {
  const supabase = getSupabase();
  const sesiId = payload.sesiId.trim();

  // 1. Cek Idempotency: Jika sesi sudah pernah disimpan, jangan duplikasi
  const { data: existing } = await supabase
    .from('stokis_opnames')
    .select('id, sesi_id')
    .eq('sesi_id', sesiId)
    .maybeSingle();

  if (existing) {
    return {
      status: 'already_processed',
      sesiId,
      rows_written: 0,
      laporanId: sesiId,
    };
  }

  // 2. Resolve branch ID dari tabel branches
  const isBranchUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.cabangId);
  const { data: branch } = isBranchUuid
    ? await supabase.from('branches').select('id, code, name').eq('id', payload.cabangId).maybeSingle()
    : await supabase.from('branches').select('id, code, name').eq('code', payload.cabangId).maybeSingle();

  const branchId = branch?.id || null;
  const branchCode = branch?.code || payload.cabangId;

  // 3. Simpan Opname Header
  const { data: opname, error: opnameErr } = await supabase
    .from('stokis_opnames')
    .insert({
      sesi_id: sesiId,
      branch_id: branchId,
      branch_code: branchCode,
      opname_date: payload.tanggalOperasional,
      shift_type: payload.shift?.toLowerCase() || 'closing',
      status: 'submitted',
      petugas: payload.petugas,
      notes: payload.note || null,
      xlsx_payload: payload,
    })
    .select('id')
    .single();

  if (opnameErr || !opname) {
    throw new Error(`Gagal menyimpan sesi opname: ${opnameErr?.message}`);
  }

  // 4. Simpan Opname Lines
  const linesToInsert = payload.items.map((it) => {
    const s1 = it.step1 != null ? Number(it.step1) : null;
    const s2 = it.step2 != null ? Number(it.step2) : null;
    const total = it.total != null ? Number(it.total) : (s1 || 0) + (s2 || 0);

    return {
      opname_id: opname.id,
      item_code: it.itemId,
      item_name: it.namaBarang,
      area: it.area || 'Kitchen',
      unit: it.satuan || 'pcs',
      threshold: it.threshold != null ? Number(it.threshold) : 0,
      step1: s1,
      step2: s2,
      physical_stock: total,
      keterangan: it.keterangan || null,
      status_isi: it.statusIsi || null,
      tgl_refill: it.tglRefill || null,
      tgl_pakai: it.tglPakai || null,
    };
  });

  if (linesToInsert.length > 0) {
    const { error: linesErr } = await supabase.from('stokis_opname_lines').insert(linesToInsert);
    if (linesErr) {
      throw new Error(`Gagal menyimpan rincian barang opname: ${linesErr.message}`);
    }
  }

  return {
    status: 'success',
    sesiId,
    rows_written: payload.items.length,
    laporanId: sesiId,
  };
}

/**
 * Mengambil histori Stock Opname sebelumnya dari database untuk perbandingan form & XLSX.
 */
export async function getPreviousSOFromDb(cabangCodeOrId: string): Promise<PreviousSOData> {
  const supabase = getSupabase();

  // 1. Ambil opname terakhir untuk cabang ini
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cabangCodeOrId);
  let opQuery = supabase
    .from('stokis_opnames')
    .select('id, sesi_id, opname_date, shift_type, petugas, submitted_at');
  opQuery = isUuid
    ? opQuery.or(`branch_id.eq.${cabangCodeOrId},branch_code.eq.${cabangCodeOrId}`)
    : opQuery.eq('branch_code', cabangCodeOrId);
  const { data: latestOpnames } = await opQuery.order('submitted_at', { ascending: false }).limit(8);

  if (!latestOpnames || latestOpnames.length === 0) {
    return { latest: null, items: {}, history: [] };
  }

  const latest = latestOpnames[0];
  const { data: lines } = await supabase
    .from('stokis_opname_lines')
    .select('*')
    .eq('opname_id', latest.id);

  const itemsMap: PreviousSOData['items'] = {};
  for (const l of lines || []) {
    itemsMap[l.item_code] = {
      step1: Number(l.step1 || 0),
      step2: Number(l.step2 || 0),
      total: Number(l.physical_stock || 0),
      tanggal: latest.opname_date,
      shift: latest.shift_type,
      petugas: latest.petugas || '',
      keterangan: l.keterangan || '',
      waktu: latest.submitted_at?.slice(11, 16) || '',
      statusIsi: (l.status_isi as 'Penuh' | 'Dipakai' | 'Habis') || '',
      tglRefill: l.tgl_refill || '',
      tglPakai: l.tgl_pakai || '',
    };
  }

  return {
    latest: {
      sesiId: latest.sesi_id,
      tanggal: latest.opname_date,
      shift: latest.shift_type,
      petugas: latest.petugas || '',
      waktu: latest.submitted_at?.slice(11, 16) || '',
    },
    items: itemsMap,
    history: latestOpnames.map((o) => ({
      sesiId: o.sesi_id,
      tanggal: o.opname_date,
      shift: o.shift_type,
      petugas: o.petugas || '',
      waktu: o.submitted_at?.slice(11, 16) || '',
      items: {},
    })),
  };
}

/**
 * Mengambil data laporan opname beserta baris item untuk generator XLSX dan konfirmasi.
 */
export async function getOpnameDetailFromDb(laporanOrSesiId: string): Promise<{
  header: {
    laporanId: string;
    sesiId: string;
    cabangId: string;
    cabangNama: string;
    tanggalOperasional: string;
    shift: string;
    petugas: string;
    note: string;
    jumlahKritis: number;
    jumlahHampirHabis: number;
    xlsxPayload?: unknown;
  };
  items: Array<{
    itemId: string;
    namaBarang: string;
    area: string;
    satuan: string;
    threshold: number;
    step1: number;
    step2: number;
    total: number;
    keterangan: string;
    statusIsi?: string;
    tglRefill?: string;
    tglPakai?: string;
  }>;
} | null> {
  const supabase = getSupabase();

  const isIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(laporanOrSesiId);
  const { data: opname } = isIdUuid
    ? await supabase.from('stokis_opnames').select('id, sesi_id, branch_id, branch_code, opname_date, shift_type, petugas, notes, xlsx_payload').or(`id.eq.${laporanOrSesiId},sesi_id.eq.${laporanOrSesiId}`).maybeSingle()
    : await supabase.from('stokis_opnames').select('id, sesi_id, branch_id, branch_code, opname_date, shift_type, petugas, notes, xlsx_payload').eq('sesi_id', laporanOrSesiId).maybeSingle();

  if (!opname) return null;

  const { data: lines } = await supabase
    .from('stokis_opname_lines')
    .select('*')
    .eq('opname_id', opname.id);

  let kritis = 0;
  let hampirHabis = 0;

  const items = (lines || []).map((l) => {
    const total = Number(l.physical_stock || 0);
    const th = Number(l.threshold || 0);
    if (th > 0) {
      if (total <= 0) kritis++;
      else if (total <= th) hampirHabis++;
    }

    return {
      itemId: l.item_code,
      namaBarang: l.item_name,
      area: l.area || 'Kitchen',
      satuan: l.unit,
      threshold: th,
      step1: Number(l.step1 || 0),
      step2: Number(l.step2 || 0),
      total,
      keterangan: l.keterangan || '',
      statusIsi: l.status_isi || undefined,
      tglRefill: l.tgl_refill || undefined,
      tglPakai: l.tgl_pakai || undefined,
    };
  });

  return {
    header: {
      laporanId: opname.sesi_id,
      sesiId: opname.sesi_id,
      cabangId: opname.branch_code || opname.branch_id || 'CBG01BDG',
      cabangNama: opname.branch_code || 'Mochikin Bandung Setiabudi',
      tanggalOperasional: opname.opname_date,
      shift: opname.shift_type,
      petugas: opname.petugas || '',
      note: opname.notes || '',
      jumlahKritis: kritis,
      jumlahHampirHabis: hampirHabis,
      xlsxPayload: opname.xlsx_payload,
    },
    items,
  };
}
