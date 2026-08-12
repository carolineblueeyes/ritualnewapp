import React from 'react';

interface GlassSurfaceProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'button';
}

export default function GlassSurface({
  children,
  className = '',
  onClick,
  as = 'div',
}: GlassSurfaceProps) {
  const base = [
    'relative overflow-hidden rounded-[22px]',
    'border border-white/10 bg-white/[0.06]',
    'backdrop-blur-xl',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
  ].join(' ');

  if (as === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} text-left transition-transform duration-[160ms] ease-out active:scale-[0.97] ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <div onClick={onClick} className={`${base} ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
}
