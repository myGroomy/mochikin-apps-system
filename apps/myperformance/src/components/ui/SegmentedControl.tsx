'use client';

import { useId, useRef } from 'react';

export interface SegmentItem<T extends string> {
  value: T;
  label: string;
  icon?: React.ElementType;
  /** Small count rendered after the label, e.g. number of sessions. */
  badge?: string | number;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  items: SegmentItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Shared prefix so <TabPanel id="..."> can reference the generated tab ids. */
  idPrefix?: string;
  className?: string;
}

/**
 * Accessible segmented control used for every in-page tab switch.
 * Arrow keys move selection, Home/End jump to the edges, and only the active
 * tab is in the tab order.
 */
export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  idPrefix,
  className = '',
}: SegmentedControlProps<T>) {
  const generatedId = useId();
  const baseId = idPrefix ?? generatedId;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabled = items.filter((item) => !item.disabled);
  const activeIndex = enabled.findIndex((item) => item.value === value);

  const selectAt = (index: number) => {
    const next = enabled[index];
    if (!next) return;
    onChange(next.value);
    refs.current[index]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      selectAt((index + 1) % enabled.length);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      selectAt((index - 1 + enabled.length) % enabled.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      selectAt(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      selectAt(enabled.length - 1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-base-300 bg-base-200/60 p-1 ${className}`}
    >
      {enabled.map((item, index) => {
        const active = item.value === value;
        const Icon = item.icon;

        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            id={`${baseId}-tab-${item.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${baseId}-panel-${item.value}`}
            tabIndex={active || (activeIndex === -1 && index === 0) ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
              active
                ? 'bg-base-100 text-base-content shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-base-content/60 hover:bg-base-100/60 hover:text-base-content'
            }`}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            <span>{item.label}</span>
            {item.badge !== undefined ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  active ? 'bg-base-200 text-base-content/70' : 'bg-base-300/60 text-base-content/50'
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  value,
  children,
}: {
  id: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={`${id}-panel-${value}`}
      role="tabpanel"
      aria-labelledby={`${id}-tab-${value}`}
      tabIndex={0}
      className="focus-visible:outline-none"
    >
      {children}
    </div>
  );
}
