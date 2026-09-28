'use client';

import React from 'react';

export interface StandardA4SheetProps {
  children: React.ReactNode;
  orientation?: 'portrait' | 'landscape';
  className?: string;
  id?: string;
}

export const StandardA4Sheet: React.FC<StandardA4SheetProps> = ({
  children,
  orientation = 'portrait',
  className = '',
  id,
}) => {
  const isPortrait = orientation === 'portrait';
  const widthClass = isPortrait ? 'w-[210mm] min-w-[210mm]' : 'w-[297mm] min-w-[297mm]';

  return (
    <div
      id={id}
      className={`bus-a4-page ${widthClass} bg-white p-3 text-slate-900 mb-6 block shadow-sm border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 no-page-break-inside ${className}`}
    >
      {children}
    </div>
  );
};
