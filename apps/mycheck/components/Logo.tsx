"use client";

import React, { useState, useEffect } from "react";
import { getClientBrandName, DEFAULT_BRAND_NAME } from "@mochikin/shared/sso";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  brandName?: string;
}

export function Logo({
  className = "",
  size = "md",
  iconOnly = false,
  brandName,
}: LogoProps) {
  const [activeBrand, setActiveBrand] = useState(brandName || DEFAULT_BRAND_NAME);

  useEffect(() => {
    if (brandName) {
      setActiveBrand(brandName);
    } else {
      setActiveBrand(getClientBrandName());
    }
  }, [brandName]);

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Icon Badge */}
      <div
        className={`${iconSizes[size]} shrink-0 rounded-[26%] bg-[#09090b] flex items-center justify-center shadow-xs`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 40 40"
          className="w-[58%] h-[58%]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11 20.5 L17.5 27 L29 13.5"
            stroke="#FFFFFF"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Wordmark: MyCheck - BrandName */}
      {!iconOnly && (
        <span
          className={`font-extrabold tracking-tight text-ink font-sans flex items-center gap-1.5 ${textSizes[size]}`}
          style={{ letterSpacing: "-0.03em" }}
        >
          <span>MYCHECK</span>
          <span className="text-ink-muted font-normal text-xs">&bull;</span>
          <span className="font-semibold text-xs text-ink-muted">{activeBrand}</span>
        </span>
      )}
    </div>
  );
}
