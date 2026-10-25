import { NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { readSheetData, sheetToObjects } from '@/lib/google/sheets';
import { resolveCabang } from '@/lib/google/registry';

function formatDate(date: any): string {
  if (date == null || date === '') return '';
  const s = String(date).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = date instanceof Date ? date : new Date(s);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export const GET = withAuth(async (req, context, session) => {
  try {
    const { cabang } = await context.params;
    const accessError = assertCabangAccess(session, cabang);
    if (accessError) return accessError;

    const resolved = await resolveCabang(cabang);
    const soData = await readSheetData(resolved.spreadsheetId, 'SO_Transaksi');
    const transactions = sheetToObjects(soData.headers, soData.rows);

    const datesSet = new Set<string>();
    transactions.forEach((t: any) => {
      const d = formatDate(t['Tanggal_Operasional']);
      if (d) datesSet.add(d);
    });

    const dates = Array.from(datesSet).sort().reverse();

    return NextResponse.json({ success: true, data: { dates } });
  } catch (err: any) {
    const status = err?.status || 500;
    const message = err?.message || 'Gagal memuat tanggal';
    return NextResponse.json({ success: false, error: { code: 'FETCH_DATES_ERROR', message } }, { status });
  }
});
