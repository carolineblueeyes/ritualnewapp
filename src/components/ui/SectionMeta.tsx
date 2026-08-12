import React from 'react';

interface SectionMetaProps {
  children: React.ReactNode;
  className?: string;
}

/** Minimal section label — 13px meta, no kickers above headings */
export default function SectionMeta({ children, className = '' }: SectionMetaProps) {
  return (
    <span className={`text-[13px] text-[#F2EFE8]/42 font-medium ${className}`}>
      {children}
    </span>
  );
}
