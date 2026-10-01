'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { getSchoolLogoUrl } from '@/lib/logoHelper';
import { AppSettings } from '@/types';

interface SchoolLogoProps {
  className?: string;
  src?: string;
  settings?: Partial<AppSettings> | null;
  alt?: string;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  className = 'w-10 h-10',
  src,
  settings,
  alt = 'Logo Resmi Sekolah',
}) => {
  const [imageError, setImageError] = useState(false);

  // Prioritize direct src if provided, otherwise resolve from settings
  const resolvedUrl = src && src.trim() !== '' ? src.trim() : getSchoolLogoUrl(settings);

  if (imageError || !resolvedUrl) {
    return (
      <div 
        id="school-crest-fallback"
        className={`${className} bg-slate-900 text-amber-400 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-1 font-black text-center select-none shrink-0 shadow-xs`}
      >
        <span className="text-[9px] uppercase tracking-tighter leading-tight text-white">SMK</span>
        <span className="text-[7px] text-amber-300 font-extrabold leading-none">PGRI 2</span>
      </div>
    );
  }

  return (
    <Image
      src={resolvedUrl}
      alt={alt}
      width={44}
      height={44}
      onError={() => setImageError(true)}
      className={`${className} object-contain select-none transition-transform hover:scale-105 duration-200 shrink-0`}
      id="school-crest-logo"
      unoptimized
      referrerPolicy="no-referrer"
    />
  );
};


