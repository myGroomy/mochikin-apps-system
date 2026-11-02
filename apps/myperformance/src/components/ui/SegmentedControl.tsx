"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/utils";

export interface SegmentItem<T extends string> {
  value: T;
  label: string;
  icon?: React.ElementType;
  badge?: string | number;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  items: SegmentItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  idPrefix?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  idPrefix,
  className = "",
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
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      selectAt((index + 1) % enabled.length);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      selectAt((index - 1 + enabled.length) % enabled.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectAt(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectAt(enabled.length - 1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-hairline bg-muted p-1",
        className
      )}
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
            className={cn(
              "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-all cursor-pointer",
              active
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            )}
          >
            {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
            <span>{item.label}</span>
            {item.badge !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
                  active ? "bg-muted text-foreground" : "bg-muted/70 text-muted-foreground"
                )}
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
