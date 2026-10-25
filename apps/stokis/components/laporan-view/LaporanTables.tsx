import type { KeyboardEvent, ReactNode } from 'react';
import type { InputTypeGroup, ViewItem } from '@/lib/domain/laporan-view';
import { cleanStatus, displayNum, isRegular } from './report-utils';

const ITEM_W = 130;
const FREEZE_BG_SELECTED = 'color-mix(in oklch, var(--color-primary) 18%, var(--color-base-100))';

function statusTone(item: ViewItem): 'kritis' | 'hampir' | 'aman' | 'normal' {
  const status = `${item.statusLabel} ${item.statusRaw}`.toLowerCase();
  if (status.includes('kritis') || status.includes('habis')) return 'kritis';
  if (status.includes('hampir') || status.includes('dipakai')) return 'hampir';
  if (status.includes('aman') || status.includes('penuh')) return 'aman';
  return 'normal';
}

function rowClass(selected: boolean, item: ViewItem): string {
  const tone = statusTone(item);
  return selected
    ? 'cursor-pointer bg-primary/15 shadow-[inset_3px_0_0_0_var(--color-primary)]'
    : `lv-row lv-row-${tone} cursor-pointer hover:bg-base-200/70 transition-colors`;
}

function FreezeTh({
  children,
  left,
  width,
  extra,
  rowSpan,
  compact,
}: {
  children: ReactNode;
  left: number;
  width: number;
  extra?: string;
  rowSpan?: number;
  compact?: boolean;
}) {
  return (
    <th
      rowSpan={rowSpan}
      className={`sticky z-30 py-2 bg-base-200 text-left lv-freeze-first ${compact ? 'px-1' : 'px-2'} ${extra || ''}`}
      style={{ left, minWidth: width, width, backgroundColor: 'var(--color-base-200)' }}
    >
      {children}
    </th>
  );
}

function FreezeTd({
  children,
  left,
  width,
  extra,
  selected,
  compact,
}: {
  children: ReactNode;
  left: number;
  width: number;
  extra?: string;
  selected?: boolean;
  compact?: boolean;
}) {
  return (
    <td
      className={`sticky z-20 py-2 ${left === 0 ? 'lv-freeze-first' : ''} ${compact ? 'px-1' : 'px-2'} ${extra || ''}`}
      style={{ left, minWidth: width, width, backgroundColor: selected ? FREEZE_BG_SELECTED : undefined }}
    >
      {children}
    </td>
  );
}

function ItemCell({ item }: { item: ViewItem }) {
  return (
    <>
      <div className="font-semibold text-base-content whitespace-normal break-words">{item.namaBarang}</div>
      <div className="font-mono text-[10px] text-base-content/40 whitespace-normal break-all">{item.itemId}</div>
    </>
  );
}

function StatusBadge({ item }: { item: ViewItem }) {
  return (
    <span className={`badge badge-sm whitespace-nowrap ${item.badgeClass}`}>
      {cleanStatus(item.statusLabel)}
    </span>
  );
}

function PakaiCell({ value }: { value: number }) {
  const cls = value > 0 ? 'text-success' : value < 0 ? 'text-error' : 'text-base-content/40';
  const text = value > 0 ? `+${value}` : value || '-';
  return (
    <td className={`px-2 py-2 text-right tabular-nums font-bold ${cls}`}>{text}</td>
  );
}

interface RowSelectProps {
  selected: boolean;
  onSelect: () => void;
}

function rowSelectProps({ selected, onSelect, item }: RowSelectProps & { item: ViewItem }) {
  return {
    className: rowClass(selected, item),
    onClick: onSelect,
    onKeyDown: (e: KeyboardEvent<HTMLTableRowElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect();
      }
    },
    tabIndex: 0,
  };
}

function RegularRow({ item, type, selected, onSelect }: { item: ViewItem; type: InputTypeGroup } & RowSelectProps) {
  const single = type === 'single';
  return (
    <tr {...rowSelectProps({ selected, onSelect, item })} data-status={statusTone(item)}>
      <FreezeTd left={0} width={ITEM_W} selected={selected}>
        <ItemCell item={item} />
      </FreezeTd>
      <td className="px-1.5 py-2 text-center text-base-content/60 border-r border-base-300">
        {item.satuan || '-'}
      </td>
      <td className="px-2 py-2 text-right tabular-nums font-display text-xs">{displayNum(item.threshold)}</td>
      <td className="px-1.5 py-2 text-right tabular-nums text-base-content/40 bg-base-200/30">{displayNum(item.prevStep1)}</td>
      <td className="px-1.5 py-2 text-right tabular-nums text-base-content/40 bg-base-200/30">{single ? '-' : displayNum(item.prevStep2)}</td>
      <td className="px-1.5 py-2 text-right tabular-nums font-semibold text-base-content/50 bg-base-200/30">{displayNum(item.prevTotal)}</td>
      <td className="px-1.5 py-2 text-right tabular-nums font-display text-xs bg-primary/5">{displayNum(item.step1)}</td>
      <td className="px-1.5 py-2 text-right tabular-nums font-display text-xs bg-primary/5">{single ? '-' : displayNum(item.step2)}</td>
      <td className="px-2 py-2 text-right tabular-nums font-display text-xs font-bold text-primary bg-primary/10">{displayNum(item.total)}</td>
      <PakaiCell value={item.penggunaan} />
      <td className="px-3 py-2 text-center"><StatusBadge item={item} /></td>
      <td className="px-3 py-2 text-base-content/60 max-w-[240px] whitespace-normal break-words">{item.keterangan || '-'}</td>
    </tr>
  );
}

function BooleanRow({ item, selected, onSelect }: { item: ViewItem } & RowSelectProps) {
  return (
    <tr {...rowSelectProps({ selected, onSelect, item })} data-status={statusTone(item)}>
      <FreezeTd left={0} width={140} selected={selected}>
        <ItemCell item={item} />
      </FreezeTd>
      <td className="px-3 py-2 text-center border-r border-base-300">
        <span className="badge badge-sm badge-ghost">{item.statusIsi || '-'}</span>
      </td>
      <td className="px-2.5 py-2 tabular-nums font-display text-xs">{item.tglRefillFormatted}</td>
      <td className="px-2.5 py-2 tabular-nums font-display text-xs">{item.tglPakaiFormatted}</td>
      <td className="px-3 py-2 text-center"><StatusBadge item={item} /></td>
      <td className="px-3 py-2 text-base-content/60 max-w-[240px] whitespace-normal break-words">{item.keterangan || '-'}</td>
    </tr>
  );
}

function DateRow({ item, selected, onSelect }: { item: ViewItem } & RowSelectProps) {
  return (
    <tr {...rowSelectProps({ selected, onSelect, item })} data-status={statusTone(item)}>
      <FreezeTd left={0} width={140} selected={selected}>
        <ItemCell item={item} />
      </FreezeTd>
      <td className="px-2.5 py-2 tabular-nums font-display text-xs border-r border-base-300">
        {item.tglRefillFormatted}
      </td>
      <td className="px-2.5 py-2 text-center tabular-nums font-display text-xs font-bold text-primary">
        {item.hariBerlalu != null ? `${item.hariBerlalu} Hari` : '-'}
      </td>
      <td className="px-3 py-2 text-center"><StatusBadge item={item} /></td>
      <td className="px-3 py-2 text-base-content/60 max-w-[240px] whitespace-normal break-words">{item.keterangan || '-'}</td>
    </tr>
  );
}

function ExpiryRow({ item, selected, onSelect }: { item: ViewItem } & RowSelectProps) {
  return (
    <tr {...rowSelectProps({ selected, onSelect, item })} data-status={statusTone(item)}>
      <FreezeTd left={0} width={140} selected={selected}>
        <ItemCell item={item} />
      </FreezeTd>
      <td className="px-2.5 py-2 tabular-nums font-display text-xs border-r border-base-300">
        {item.tglKedaluwarsaFormatted}
      </td>
      <td className="px-2.5 py-2 text-center tabular-nums font-display text-xs font-bold">
        {item.sisaHari != null ? item.sisaHari : '-'}
      </td>
      <td className="px-3 py-2 text-center"><StatusBadge item={item} /></td>
      <td className="px-3 py-2 text-base-content/60 max-w-[240px] whitespace-normal break-words">{item.keterangan || '-'}</td>
    </tr>
  );
}

function TextRow({ item, selected, onSelect }: { item: ViewItem } & RowSelectProps) {
  return (
    <tr {...rowSelectProps({ selected, onSelect, item })} data-status={statusTone(item)}>
      <FreezeTd left={0} width={140} selected={selected}>
        <ItemCell item={item} />
      </FreezeTd>
      <td className="px-3 py-2 text-base-content/70 whitespace-pre-wrap">{item.keterangan || '-'}</td>
    </tr>
  );
}

function RegularHead() {
  return (
    <thead className="text-[10px] uppercase tracking-wider text-base-content/60 font-semibold">
      <tr className="border-b border-base-300 text-center">
        <FreezeTh left={0} width={ITEM_W} extra="text-left" rowSpan={2}>Item / ID</FreezeTh>
        <th rowSpan={2} className="px-1.5 py-2 text-center bg-base-200 min-w-[36px]">Sat</th>
        <th rowSpan={2} className="px-2 py-2 text-center bg-base-200 min-w-[65px]">Thresh</th>
        <th colSpan={3} className="px-2 py-1.5 bg-base-300/60">
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-base-content/30" />
            SO Sebelumnya
          </div>
        </th>
        <th colSpan={3} className="px-2 py-1.5 bg-primary/10 text-primary">
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            SO Sekarang
          </div>
        </th>
        <th
          rowSpan={2}
          title="Perubahan stok: tanda + berarti bertambah, tanda − berarti berkurang"
          className="px-2 py-2 text-center bg-base-200 min-w-[80px]"
        >
          Perubahan
        </th>
        <th rowSpan={2} className="px-3 py-2 text-center bg-base-200 min-w-[70px]">Status</th>
        <th rowSpan={2} className="px-3 py-2 text-left bg-base-200 min-w-[100px]">Keterangan</th>
      </tr>
      <tr className="bg-base-200 text-[10px] uppercase">
        <th className="px-1.5 py-1 text-center min-w-[48px] text-base-content/40">S1</th>
        <th className="px-1.5 py-1 text-center min-w-[48px] text-base-content/40">S2</th>
        <th className="px-1.5 py-1 text-center min-w-[48px] text-base-content/40">Tot</th>
        <th className="px-1.5 py-1 text-center min-w-[48px] bg-primary/10 text-primary">S1</th>
        <th className="px-1.5 py-1 text-center min-w-[48px] bg-primary/10 text-primary">S2</th>
        <th className="px-1.5 py-1 text-center min-w-[48px] bg-primary/10 text-primary">Tot</th>
      </tr>
    </thead>
  );
}

export function TypeTable({
  type,
  items,
  selectedItemId,
  onSelectItem,
}: {
  type: InputTypeGroup;
  items: ViewItem[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
}) {
  const select = (id: string) => onSelectItem(id);

  return (
    <div className="lv-table-wrap overflow-x-auto w-full relative">
      <table className="w-full text-left text-xs">
        {isRegular(type) ? (
          <>
            <RegularHead />
            <tbody>
              {items.map((it) => (
                <RegularRow
                  key={it.itemId}
                  item={it}
                  type={type}
                  selected={selectedItemId === it.itemId}
                  onSelect={() => select(it.itemId)}
                />
              ))}
            </tbody>
          </>
        ) : type === 'boolean' || type === 'utilitas' ? (
          <>
            <thead className="bg-base-200 text-[10px] uppercase tracking-wider text-base-content/60 font-semibold">
              <tr>
                <FreezeTh left={0} width={140}>Item / ID</FreezeTh>
                <th className="px-3 py-2.5 text-center">Nilai Saat Ini</th>
                <th className="px-2.5 py-2.5">Tgl Isi</th>
                <th className="px-2.5 py-2.5">Tgl Pakai</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <BooleanRow
                  key={it.itemId}
                  item={it}
                  selected={selectedItemId === it.itemId}
                  onSelect={() => select(it.itemId)}
                />
              ))}
            </tbody>
          </>
        ) : type === 'date' ? (
          <>
            <thead className="bg-base-200 text-[10px] uppercase tracking-wider text-base-content/60 font-semibold">
              <tr>
                <FreezeTh left={0} width={140}>Parameter</FreezeTh>
                <th className="px-3 py-2.5">Tgl Tercatat</th>
                <th className="px-2.5 py-2.5 text-center">Hari Berlalu</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <DateRow
                  key={it.itemId}
                  item={it}
                  selected={selectedItemId === it.itemId}
                  onSelect={() => select(it.itemId)}
                />
              ))}
            </tbody>
          </>
        ) : type === 'expiry' ? (
          <>
            <thead className="bg-base-200 text-[10px] uppercase tracking-wider text-base-content/60 font-semibold">
              <tr>
                <FreezeTh left={0} width={140}>Item / ID</FreezeTh>
                <th className="px-3 py-2.5">Tgl Exp</th>
                <th className="px-2.5 py-2.5 text-center">Sisa</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <ExpiryRow
                  key={it.itemId}
                  item={it}
                  selected={selectedItemId === it.itemId}
                  onSelect={() => select(it.itemId)}
                />
              ))}
            </tbody>
          </>
        ) : (
          <>
            <thead className="bg-base-200 text-[10px] uppercase tracking-wider text-base-content/60 font-semibold">
              <tr>
                <FreezeTh left={0} width={140}>Item / ID</FreezeTh>
                <th className="px-3 py-2.5">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <TextRow
                  key={it.itemId}
                  item={it}
                  selected={selectedItemId === it.itemId}
                  onSelect={() => select(it.itemId)}
                />
              ))}
            </tbody>
          </>
        )}
      </table>
    </div>
  );
}
