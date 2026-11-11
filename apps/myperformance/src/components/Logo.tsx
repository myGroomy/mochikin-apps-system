"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getClientBrandName, DEFAULT_BRAND_NAME } from "@mochikin/shared/sso";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  brandName?: string;
}

export function Logo({ className = "", size = "md", iconOnly = false, brandName }: LogoProps) {
  const [activeBrand, setActiveBrand] = useState(brandName || DEFAULT_BRAND_NAME);

  useEffect(() => {
    if (brandName) {
      setActiveBrand(brandName);
    } else {
      setActiveBrand(getClientBrandName());
    }
  }, [brandName]);

  const iconSizes = {
    sm: "size-7",
    md: "size-9",
    lg: "size-11",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {/* Icon Badge */}
      <div
        className={cn(
          iconSizes[size],
          "shrink-0 rounded-xl bg-[#4d662c] flex items-center justify-center shadow-xs text-white"
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 14l5-5 4 4 7-7" />
          <path d="M14 6h6v6" />
        </svg>
      </div>

      {!iconOnly && (
        <div className="flex flex-col">
          <span
            className={cn(
              textSizes[size],
              "font-bold tracking-tight text-ink leading-tight flex items-center gap-1.5"
            )}
          >
            <span>MYPERFORMANCE</span>
            <span className="text-muted-foreground font-normal text-xs">&bull;</span>
            <span className="font-semibold text-xs text-muted-foreground">{activeBrand}</span>
          </span>
          <span className="text-[11px] font-medium text-muted-foreground leading-none">
            Points &amp; CARE Scorecard
          </span>
        </div>
      )}
    </div>
  );
}
