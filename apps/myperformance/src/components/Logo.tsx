import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

export function Logo({ className = '', size = 'md', iconOnly = false }: LogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon Badge */}
      <div
        className={`${iconSizes[size]} shrink-0 rounded-[26%] bg-[#22C55E] flex items-center justify-center`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 40 40"
          className="w-[62%] h-[62%]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 27 L17 19 L23 24 L31 13"
            stroke="#FFFFFF"
            strokeWidth="3.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M23.5 13 H31 V20.5"
            stroke="#FFFFFF"
            strokeWidth="3.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Wordmark */}
      {!iconOnly && (
        <span
          className={`font-extrabold tracking-tight text-[#16A34A] font-sans ${textSizes[size]}`}
          style={{ letterSpacing: '-0.035em' }}
        >
          MYPERFORMANCE
        </span>
      )}
    </div>
  );
}
