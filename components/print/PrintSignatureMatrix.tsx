'use client';

import React from 'react';
import { DestinationRulesService } from '@/services/destinationRules';
import { Bus } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';

export interface PrintSignatureMatrixProps {
  waveOrDestination?: string | null;
  bus?: Partial<Bus> | null;
  busNumber?: number | string | null;
  isUnassigned?: boolean;
  schoolName?: string;
  city?: string;
  year?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const PrintSignatureMatrix: React.FC<PrintSignatureMatrixProps> = ({
  waveOrDestination,
  bus,
  busNumber,
  isUnassigned = false,
  schoolName = schoolMetadata.school.name,
  city = 'Ponorogo',
  year = '2025',
  size = 'sm',
  className = '',
}) => {
  const { guide1Name, secondaryGuideLabel, secondaryGuideName } =
    DestinationRulesService.resolveChaperones(waveOrDestination, bus);

  const busLabel = isUnassigned ? 'Armada Bus' : `Armada Bus #${busNumber || '-'}`;
  const isXs = size === 'xs';
  const isSm = size === 'sm';

  const textHeaderClass = isXs ? 'text-[8px]' : isSm ? 'text-[9.5px]' : 'text-[11px]';
  const textSubClass = isXs ? 'text-[7px]' : isSm ? 'text-[8.5px]' : 'text-[10px]';
  const textNameClass = isXs ? 'text-[8px]' : isSm ? 'text-[9.5px]' : 'text-[11px]';
  const textNipClass = isXs ? 'text-[7px]' : isSm ? 'text-[8.5px]' : 'text-[10px]';
  const spacerClass = isXs ? 'h-4' : isSm ? 'h-5' : 'h-8';

  return (
    <div className={`pt-0 no-page-break-inside mt-1 font-['Tahoma',Geneva,sans-serif] ${className}`}>
      {/* Date Header */}
      <div className={`text-right ${isXs ? 'text-[7.5px]' : isSm ? 'text-[9px]' : 'text-[10.5px]'} font-bold text-slate-900 mb-0 pr-2`}>
        <span>
          {city}, ............................................ {year}
        </span>
      </div>

      {/* 3-Column Signature Grid */}
      <div
        className={`grid grid-cols-3 text-center ${textHeaderClass} font-bold text-slate-900 border-t border-black pt-1 gap-2`}
      >
        {/* Col 1: Panitia / Koordinator Lapangan */}
        <div>
          <p className={`font-black ${textHeaderClass} uppercase tracking-tight leading-tight`}>
            Panitia / Koordinator Lapangan
          </p>
          <p className={`${textSubClass} text-slate-600 font-medium leading-tight mt-0.5`}>
            Panitia Darmawisata {schoolName}
          </p>
          <div className={spacerClass}></div>
          <p className={`font-extrabold ${textNameClass} leading-tight`}>
            ( ................................................... )
          </p>
          <span className={`${textNipClass} text-slate-600 font-normal mt-0.5 block leading-tight`}>
            NIP/NIPY: ....................................
          </span>
        </div>

        {/* Col 2: Guru Pendamping 1 */}
        <div>
          <p className={`font-black ${textHeaderClass} uppercase tracking-tight leading-tight`}>
            Guru Pendamping 1
          </p>
          <p className={`${textSubClass} text-slate-600 font-medium leading-tight mt-0.5`}>
            Koordinator {busLabel}
          </p>
          <div className={spacerClass}></div>
          <p className={`font-extrabold ${textNameClass} leading-tight truncate px-1`}>
            ({guide1Name ? ` ${guide1Name} ` : ' ................................................... '})
          </p>
          <span className={`${textNipClass} text-slate-600 font-normal mt-0.5 block leading-tight`}>
            NIP/NIPY: ....................................
          </span>
        </div>

        {/* Col 3: Guru Pendamping 2 / 3 */}
        <div>
          <p className={`font-black ${textHeaderClass} uppercase tracking-tight leading-tight`}>
            {secondaryGuideLabel}
          </p>
          <p className={`${textSubClass} text-slate-600 font-medium leading-tight mt-0.5`}>
            Pendamping {busLabel}
          </p>
          <div className={spacerClass}></div>
          <p className={`font-extrabold ${textNameClass} leading-tight truncate px-1`}>
            ({secondaryGuideName ? ` ${secondaryGuideName} ` : ' ................................................... '})
          </p>
          <span className={`${textNipClass} text-slate-600 font-normal mt-0.5 block leading-tight`}>
            NIP/NIPY: ....................................
          </span>
        </div>
      </div>
    </div>
  );
};
