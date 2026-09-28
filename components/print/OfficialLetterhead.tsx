'use client';

import React from 'react';
import { SchoolLogo } from '@/components/ui/SchoolLogo';
import schoolMetadata from '@/config/schoolMetadata.json';

export interface OfficialLetterheadProps {
  schoolName?: string;
  logoUrl?: string;
  subTitle?: string;
  academicYear?: string;
  destinationLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const OfficialLetterhead: React.FC<OfficialLetterheadProps> = ({
  schoolName = schoolMetadata.school.name,
  logoUrl,
  subTitle,
  academicYear = 'Tahun Ajaran 2025/2026',
  destinationLabel,
  size = 'md',
  className = '',
}) => {
  const isSmall = size === 'sm';
  const logoSize = isSmall ? 'w-7 h-7' : 'w-9 h-9';
  const titleClass = isSmall ? 'text-[8.5px]' : 'text-[10px]';
  const subClass = isSmall ? 'text-[7px]' : 'text-[8px]';

  return (
    <div className={`flex items-center gap-2 border-b-2 border-black pb-1 ${className}`}>
      <div className={`${logoSize} flex items-center justify-center shrink-0`}>
        <SchoolLogo src={logoUrl} className={`${logoSize} object-contain`} alt="Logo Sekolah" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`${titleClass} font-black tracking-wider text-slate-900 uppercase leading-none truncate`}>
          {schoolName}
        </h4>
        <p className={`${subClass} text-slate-600 font-bold leading-none mt-0.5`}>
          {destinationLabel ? `${destinationLabel} • ` : ''}
          {subTitle || academicYear}
        </p>
      </div>
    </div>
  );
};
