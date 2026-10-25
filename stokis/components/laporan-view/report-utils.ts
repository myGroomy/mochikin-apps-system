import type { InputTypeGroup, ViewItem } from '@/lib/domain/laporan-view';

export const TYPE_ORDER: InputTypeGroup[] = [
  'dual', 'single', 'boolean', 'date', 'expiry', 'text', 'utilitas',
];

export function typeLabel(type: InputTypeGroup): string {
  const labels: Record<InputTypeGroup, string> = {
    dual: 'Dual Step',
    single: 'Single Input',
    boolean: 'Boolean',
    date: 'Tanggal',
    expiry: 'Kedaluwarsa',
    text: 'Teks',
    utilitas: 'Utilitas',
  };
  return labels[type];
}

export function typeOrder(type: InputTypeGroup): number {
  const i = TYPE_ORDER.indexOf(type);
  return i === -1 ? 99 : i;
}

export function statusRank(label: string): number {
  const s = String(label || '').toLowerCase();
  if (s.includes('kritis') || s.includes('habis')) return 0;
  if (s.includes('hampir') || s.includes('dipakai')) return 1;
  if (s.includes('aman') || s.includes('penuh')) return 2;
  return 3;
}

export function cleanStatus(label: string): string {
  const s = String(label || '—').replace(/[🔴🟠🟢]/g, '').replace(/\s+/g, ' ').trim();
  return s || '—';
}

export function sortItemsByStatus(items: ViewItem[]): ViewItem[] {
  return [...items].sort((a, b) => {
    const r = statusRank(a.statusLabel) - statusRank(b.statusLabel);
    if (r !== 0) return r;
    const t = typeOrder(a.group) - typeOrder(b.group);
    if (t !== 0) return t;
    return (a.namaBarang || '').localeCompare(b.namaBarang || '', 'id', { sensitivity: 'base' });
  });
}

export function areaStatusSummary(items: ViewItem[]): { label: string; className: string } {
  let kritis = 0;
  let hampir = 0;
  let aman = 0;
  for (const it of items) {
    const r = statusRank(it.statusLabel);
    if (r === 0) kritis += 1;
    else if (r === 1) hampir += 1;
    else if (r === 2) aman += 1;
  }
  if (kritis > 0) return { label: `${kritis} Kritis`, className: 'bg-error/10 text-error' };
  if (hampir > 0) return { label: `${hampir} Hampir Habis`, className: 'bg-warning/20 text-warning-content' };
  if (aman > 0) return { label: 'Semua Aman', className: 'bg-success/10 text-success' };
  return { label: `${items.length} Tercatat`, className: 'bg-base-200 text-base-content' };
}

export function areaSeverity(items: ViewItem[]): number {
  if (items.length === 0) return 3;
  return Math.min(...items.map((it) => statusRank(it.statusLabel)));
}

export function isRegular(type: InputTypeGroup): boolean {
  return type === 'dual' || type === 'single';
}

export function displayNum(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return String(value);
}

export function matchesQuery(item: ViewItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return `${item.namaBarang} ${item.itemId} ${item.keterangan} ${item.area}`.toLowerCase().includes(q);
}
