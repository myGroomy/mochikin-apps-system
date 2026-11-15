// Resolve report table type(s) from Master Item tipeInput.
// boolean,date → two report rows (boolean table + date table).

export type ReportItemType = 'dual' | 'single' | 'boolean' | 'date' | 'text' | 'expiry';

const TYPE_ORDER: ReportItemType[] = ['dual', 'single', 'boolean', 'date', 'text', 'expiry'];

/**
 * Returns one or more report types for an item.
 * `single` and `dual` are mutually exclusive here (dual wins if both present).
 * Compound `boolean,date` yields both boolean and date (two rows / two tables).
 */
export function getReportTypes(tipeInput: string | undefined | null): ReportItemType[] {
  const parts = String(tipeInput || '')
    .trim()
    .toLowerCase()
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (parts.length === 0) return ['dual'];

  const has = (t: string) => parts.includes(t);
  const out: ReportItemType[] = [];

  if (has('dual')) out.push('dual');
  else if (has('single')) out.push('single');

  if (has('boolean')) out.push('boolean');
  if (has('date')) out.push('date');
  if (has('text')) out.push('text');
  if (has('expiry')) out.push('expiry');

  if (out.length === 0) return ['dual'];
  return out;
}

/** Stable sort key for sub-tables within an Area. */
export function reportTypeOrder(t: ReportItemType): number {
  const i = TYPE_ORDER.indexOf(t);
  return i === -1 ? 99 : i;
}

export function daysBetweenUtc(from: Date | null, to: Date | null): number | null {
  if (!from || !to) return null;
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((b - a) / 86400000);
}

/** date type: KRITIS if elapsed >= threshold; HAMPIR HABIS if >= 70% threshold. */
export function dateTypeStatus(hariBerlalu: number | null, threshold: number | null): string {
  if (hariBerlalu == null || threshold == null || threshold <= 0) return '—';
  if (hariBerlalu >= threshold) return '🔴 KRITIS';
  if (hariBerlalu >= threshold * 0.7) return '🟠 HAMPIR HABIS';
  return '🟢 AMAN';
}

export function dateTypeStatusRank(hariBerlalu: number | null, threshold: number | null): number {
  if (hariBerlalu == null || threshold == null || threshold <= 0) return 3;
  if (hariBerlalu >= threshold) return 0;
  if (hariBerlalu >= threshold * 0.7) return 1;
  return 2;
}

/** expiry type: KRITIS if remaining days <= threshold; else AMAN. */
export function expiryTypeStatus(sisaHari: number | null, threshold: number | null): string {
  if (sisaHari == null || threshold == null || threshold <= 0) return '—';
  if (sisaHari <= threshold) return '🔴 KRITIS';
  return '🟢 AMAN';
}

export function expiryTypeStatusRank(sisaHari: number | null, threshold: number | null): number {
  if (sisaHari == null || threshold == null || threshold <= 0) return 3;
  if (sisaHari <= threshold) return 0;
  return 2;
}
