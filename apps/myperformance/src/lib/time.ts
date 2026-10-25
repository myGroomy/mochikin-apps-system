/**
 * Business-time helpers.
 *
 * All point calculations that touch "which day / which month / which shift" must
 * resolve through these helpers so the whole system uses one timezone rule:
 *
 *   APP_TIMEZONE — IANA timezone, default "Asia/Jakarta"
 *   BUSINESS_DATE(occurredAt) → "YYYY-MM-DD"  (local wall-clock day)
 *   BUSINESS_MONTH(businessDate) → "YYYY-MM"
 */

export const APP_TIMEZONE_DEFAULT = 'Asia/Jakarta';

export function getAppTimezone(): string {
  return process.env.APP_TIMEZONE || APP_TIMEZONE_DEFAULT;
}

/**
 * Resolve the business date (YYYY-MM-DD) for an ISO-8601 timestamp, expressed
 * in the application timezone.
 */
export function businessDateOf(occurredAt: string, timezone: string = getAppTimezone()): string {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Resolve the monthly period key (YYYY-MM) for a business date.
 */
export function monthKeyOf(businessDate: string): string {
  return businessDate.slice(0, 7);
}

/**
 * Resolve the previous local day (YYYY-MM-DD) in the application timezone.
 * Used by the daily rollup when no explicit date is provided.
 */
export function previousBusinessDate(timezone: string = getAppTimezone()): string {
  const shifted = new Date(Date.now() - 86_400_000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(shifted);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export interface MonthRange {
  start: string;
  end: string;
}

export function monthRange(monthKey: string): MonthRange {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }
  const start = `${monthKey}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export function monthKeyOfIso(iso: string, tz: string = getAppTimezone()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}`;
}

/**
 * Standard monthly points target (points / month). Overridable via env.
 */
export function monthlyTarget(): number {
  const raw = process.env.MONTHLY_POINTS_TARGET || process.env.NEXT_PUBLIC_MONTHLY_POINTS_TARGET;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1044;
}

/**
 * Effective working hours per month used for "estimasi jam efektif".
 * Default 173 (8h × 21.6 working days) per PRD.
 */
export function effectiveHoursPerMonth(): number {
  const parsed = Number(process.env.EFFECTIVE_HOURS_PER_MONTH);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 173;
}
