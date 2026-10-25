"use client";

import React from "react";
import { Info, AlertTriangle, Lightbulb, AlertCircle } from "lucide-react";

type CalloutType = "note" | "warning" | "tip" | "important";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}

const calloutConfig = {
  note: {
    icon: Info,
    border: "border-l-info/40",
    iconColor: "text-info/70",
    titleDefault: "Note",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-l-warning/40",
    iconColor: "text-warning/70",
    titleDefault: "Warning",
  },
  tip: {
    icon: Lightbulb,
    border: "border-l-success/40",
    iconColor: "text-success/70",
    titleDefault: "Tip",
  },
  important: {
    icon: AlertCircle,
    border: "border-l-error/40",
    iconColor: "text-error/70",
    titleDefault: "Important",
  },
};

export function Callout({
  type = "note",
  title,
  children,
}: CalloutProps) {
  const config = calloutConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-r-lg border-l-2 py-3 pl-4 pr-3 ${config.border} bg-base-200/30`}
      role="note"
    >
      <div className="flex items-start gap-2.5">
        <Icon
          className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${config.iconColor}`}
        />
        <div className="space-y-0.5 text-xs leading-relaxed">
          <p className="font-semibold text-sm text-base-content/80">
            {title || config.titleDefault}
          </p>
          <div className="text-base-content/60">{children}</div>
        </div>
      </div>
    </div>
  );
}
