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
    lg: 'text-xl',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon Badge */}
      <div
        className={`${iconSizes[size]} shrink-0 rounded-[26%] bg-[#F59E0B] flex items-center justify-center`}
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

      {/* Wordmark */}
      {!iconOnly && (
        <span
          className={`font-extrabold tracking-tight text-[#D97706] font-sans ${textSizes[size]}`}
          style={{ letterSpacing: '-0.025em' }}
        >
          MOCHIKIN SERVICE
        </span>
      )}
    </div>
  );
}
