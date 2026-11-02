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
        className={`${iconSizes[size]} shrink-0 rounded-[26%] bg-[#1A1A1A] flex items-center justify-center`}
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

      {/* Wordmark */}
      {!iconOnly && (
        <span
          className={`font-extrabold tracking-tight text-[#1A1A1A] font-sans ${textSizes[size]}`}
          style={{ letterSpacing: '-0.035em' }}
        >
          MYCHECK
        </span>
      )}
    </div>
  );
}
