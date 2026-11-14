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
    lg: "text-lg",
  };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Icon Badge */}
      <div
        className={`${iconSizes[size]} shrink-0 rounded-[26%] bg-[#F59E0B] flex items-center justify-center shadow-xs`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 40 40"
          className="w-[62%] h-[62%]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 20 L20 10 M20 20 L11 27 M20 20 L29 27"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <circle cx="20" cy="20" r="3.2" fill="#FFFFFF" />
          <circle cx="20" cy="10" r="2.8" fill="#FFFFFF" />
          <circle cx="11" cy="27" r="2.8" fill="#FFFFFF" />
          <circle cx="29" cy="27" r="2.8" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Wordmark: MyService - BrandName */}
      {!iconOnly && (
        <span
          className={`font-bold tracking-tight text-ink font-display flex items-center gap-1.5 ${textSizes[size]}`}
        >
          <span className="text-accent font-extrabold">MyService</span>
          <span className="text-ash font-normal">&bull;</span>
          <span className="text-ink font-semibold">{activeBrand}</span>
        </span>
      )}
    </div>
  );
}
