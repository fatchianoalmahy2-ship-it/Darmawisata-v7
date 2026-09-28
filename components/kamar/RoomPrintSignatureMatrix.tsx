'use client';

import React from 'react';
import { DestinationRulesService } from '@/services/destinationRules';
import { Bus, AppSettings } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';

export interface RoomPrintSignatureMatrixProps {
  waveOrDestination: string;
  bus?: Bus;
  busNumber?: number;
  isUnassigned?: boolean;
  schoolName?: string;
  city?: string;
  year?: string;
  className?: string;
  settings?: AppSettings;
  allChaperones?: any[];
}

export const RoomPrintSignatureMatrix: React.FC<RoomPrintSignatureMatrixProps> = ({
  waveOrDestination,
  bus,
  busNumber,
  isUnassigned = false,
  schoolName = schoolMetadata.school.name,
  city = 'Ponorogo',
  year = '2025',
  className = '',
  settings,
  allChaperones = [],
}) => {
  const { guide1Name, secondaryGuideLabel, secondaryGuideName } =
    DestinationRulesService.resolveChaperones(waveOrDestination, bus, settings, allChaperones);

  const busLabel = isUnassigned ? 'Armada Bus' : `Armada Bus #${busNumber || '-'}`;

  return (
    <div className={`pt-0 no-page-break-inside mt-0.5 font-['Tahoma',Geneva,sans-serif] room-signature-block ${className}`}>
      {/* 3-Column Signature Grid with Date Header Integrated */}
      <div className="border-t border-black pt-0.5 room-signature-container">
        {/* Date Row */}
        <div className="text-right text-[8px] font-bold text-slate-900 mb-0.5 pr-2 leading-none">
          <span>
            {city}, ............................................ {year}
          </span>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 text-center text-[8.5px] font-bold text-slate-900 room-signature-grid gap-1">
          {/* Col 1: Panitia / Koordinator Lapangan */}
          <div className="room-signature-col">
            <p className="font-black text-[8px] uppercase tracking-tight leading-none">
              Panitia / Koordinator Lapangan
            </p>
            <p className="text-[7px] text-slate-600 font-medium leading-none mt-0.5">
              Panitia Darmawisata {schoolName}
            </p>
            <div className="h-3 room-signature-spacer"></div>
            <p className="font-extrabold text-[8px] leading-none">
              ( ................................................... )
            </p>
            <span className="text-[6.5px] text-slate-600 font-normal mt-0.5 block leading-none">
              NIP/NIPY: ....................................
            </span>
          </div>

          {/* Col 2: Guru Pendamping 1 */}
          <div className="room-signature-col min-w-0">
            <p className="font-black text-[8px] uppercase tracking-tight leading-none whitespace-nowrap">
              Guru Pendamping 1
            </p>
            <p className="text-[7px] text-slate-600 font-medium leading-none mt-0.5 whitespace-nowrap">
              Koordinator {busLabel} • PIC P1
            </p>
            <div className="h-3 room-signature-spacer"></div>
            <p className="font-extrabold text-[8px] leading-none truncate px-0.5 block max-w-full" title={guide1Name}>
              ({guide1Name ? ` ${guide1Name} ` : ' ................................................... '})
            </p>
            <span className="text-[6.5px] text-slate-600 font-normal mt-0.5 block leading-none whitespace-nowrap">
              NIP/NIPY: ....................................
            </span>
          </div>

          {/* Col 3: Guru Pendamping 2 / 3 */}
          <div className="room-signature-col min-w-0">
            <p className="font-black text-[8px] uppercase tracking-tight leading-none whitespace-nowrap">
              {secondaryGuideLabel}
            </p>
            <p className="text-[7px] text-slate-600 font-medium leading-none mt-0.5 whitespace-nowrap">
              Pendamping {busLabel} • PIC P2
            </p>
            <div className="h-3 room-signature-spacer"></div>
            <p className="font-extrabold text-[8px] leading-none truncate px-0.5 block max-w-full" title={secondaryGuideName}>
              ({secondaryGuideName ? ` ${secondaryGuideName} ` : ' ................................................... '})
            </p>
            <span className="text-[6.5px] text-slate-600 font-normal mt-0.5 block leading-none whitespace-nowrap">
              NIP/NIPY: ....................................
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
