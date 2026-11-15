import React from 'react';

interface QuantumLoaderProps {
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function QuantumLoader({ text, className, size = 'md' }: QuantumLoaderProps) {
  const sizeMap = {
    sm: 40,
    md: 52,
    lg: 65,
  };
  const px = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className || ''}`}>
      <div className="relative" style={{ width: px, height: px }}>
        <span
          className="absolute animate-loaderAnim rounded-[50px] shadow-[inset_0_0_0_3px_var(--color-primary)]"
        />
        <span
          className="absolute animate-loaderAnim animation-delay rounded-[50px] shadow-[inset_0_0_0_3px_var(--color-primary)]"
        />
      </div>
      {text && (
        <p className="text-xs font-medium text-base-content/60 tracking-wide">{text}</p>
      )}
      <style jsx>{`
        @keyframes loaderAnim {
          0% { inset: 0 35px 35px 0; }
          12.5% { inset: 0 35px 0 0; }
          25% { inset: 35px 35px 0 0; }
          37.5% { inset: 35px 0 0 0; }
          50% { inset: 35px 0 0 35px; }
          62.5% { inset: 0 0 0 35px; }
          75% { inset: 0 0 35px 35px; }
          87.5% { inset: 0 0 35px 0; }
          100% { inset: 0 35px 35px 0; }
        }
        .animate-loaderAnim {
          animation: loaderAnim 2.5s infinite;
        }
        .animation-delay {
          animation-delay: -1.25s;
        }
      `}</style>
    </div>
  );
}

export function QuantumLoaderFull({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <QuantumLoader text={text || 'Memuat'} size="lg" />
    </div>
  );
}

export function QuantumLoaderMini() {
  return (
    <div
      className="inline-flex items-center justify-center relative"
      style={{ width: 20, height: 20 }}
      aria-hidden="true"
    >
      <span
        className="absolute rounded-[50px] animate-loaderAnimMini"
        style={{ boxShadow: 'inset 0 0 0 2px currentColor' }}
      />
      <span
        className="absolute rounded-[50px] animate-loaderAnimMini animation-delay"
        style={{ boxShadow: 'inset 0 0 0 2px currentColor' }}
      />
      <style jsx>{`
        @keyframes loaderAnimMini {
          0% { inset: 0 12px 12px 0; }
          12.5% { inset: 0 12px 0 0; }
          25% { inset: 12px 12px 0 0; }
          37.5% { inset: 12px 0 0 0; }
          50% { inset: 12px 0 0 12px; }
          62.5% { inset: 0 0 0 12px; }
          75% { inset: 0 0 12px 12px; }
          87.5% { inset: 0 0 12px 0; }
          100% { inset: 0 12px 12px 0; }
        }
        .animate-loaderAnimMini {
          animation: loaderAnimMini 2.5s infinite;
        }
        .animation-delay {
          animation-delay: -1.25s;
        }
      `}</style>
    </div>
  );
}
