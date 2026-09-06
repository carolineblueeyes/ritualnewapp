import React from 'react';

export const HEALTH_GROUP_SURFACE =
  'rounded-2xl bg-white/[0.045] border border-white/[0.06] overflow-hidden';

interface HealthGroupProps {
  title?: string;
  padded?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function HealthGroup({
  title,
  padded = false,
  children,
  className = '',
  onClick,
}: HealthGroupProps) {
  return (
    <section className={`flex flex-col gap-2 ${className}`}>
      {title ? (
        <h2 className="text-[13px] text-[#F2EFE8]/50 px-1">{title}</h2>
      ) : null}
      <div
        onClick={onClick}
        className={`${HEALTH_GROUP_SURFACE} ${padded ? 'p-4' : 'px-4'} ${
          onClick
            ? 'cursor-pointer active:scale-[0.99] transition-transform duration-[160ms] ease-out'
            : ''
        }`}
      >
        {children}
      </div>
    </section>
  );
}
