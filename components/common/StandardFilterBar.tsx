'use client';

import React from 'react';
import { Search, Filter, Layers, Users, Bus as BusIcon, RotateCcw } from 'lucide-react';

export interface StandardFilterBarProps {
  // Wave filter
  wave?: string;
  onWaveChange?: (wave: string) => void;
  showWave?: boolean;
  wavesList?: { value: string; label: string }[];

  // Gender filter
  gender?: string;
  onGenderChange?: (gender: string) => void;
  showGender?: boolean;

  // Bus filter
  busNumber?: number | 'ALL';
  onBusChange?: (busNum: number | 'ALL') => void;
  showBus?: boolean;
  busOptions?: number[];

  // Class filter
  selectedClass?: string;
  onClassChange?: (className: string) => void;
  showClass?: boolean;
  classList?: string[];

  // Search filter
  search?: string;
  onSearchChange?: (search: string) => void;
  showSearch?: boolean;
  searchPlaceholder?: string;

  // Actions slot
  actions?: React.ReactNode;
  onReset?: () => void;
  className?: string;
}

export const StandardFilterBar: React.FC<StandardFilterBarProps> = ({
  wave = 'ALL',
  onWaveChange,
  showWave = true,
  wavesList = [
    { value: 'ALL', label: 'Semua Gelombang' },
    { value: 'GELOMBANG_1', label: 'Gel 1 (Bali)' },
    { value: 'GELOMBANG_2', label: 'Gel 2 (Bali)' },
    { value: 'GELOMBANG_YOGYA', label: 'Gelombang Yogya' },
  ],

  gender = 'ALL',
  onGenderChange,
  showGender = false,

  busNumber = 'ALL',
  onBusChange,
  showBus = false,
  busOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],

  selectedClass = 'ALL',
  onClassChange,
  showClass = false,
  classList = [],

  search = '',
  onSearchChange,
  showSearch = true,
  searchPlaceholder = 'Cari nama, NIS, atau kelas...',

  actions,
  onReset,
  className = '',
}) => {
  return (
    <div
      className={`bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      {/* Left Filter Elements */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
        {/* Search Input */}
        {showSearch && onSearchChange && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            />
          </div>
        )}

        {/* Wave Selector */}
        {showWave && onWaveChange && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={wave}
              onChange={(e) => onWaveChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              {wavesList.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Gender Selector */}
        {showGender && onGenderChange && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={gender}
              onChange={(e) => onGenderChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Gender</option>
              <option value="LAKI_LAKI">Laki-Laki</option>
              <option value="PEREMPUAN">Perempuan</option>
            </select>
          </div>
        )}

        {/* Bus Selector */}
        {showBus && onBusChange && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <BusIcon className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={busNumber}
              onChange={(e) =>
                onBusChange(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Bus</option>
              {busOptions.map((num) => (
                <option key={num} value={num}>
                  Bus #{num}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Class Selector */}
        {showClass && onClassChange && classList.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedClass}
              onChange={(e) => onClassChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="ALL">Semua Kelas</option>
              {classList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reset Button */}
        {onReset && (
          <button
            onClick={onReset}
            title="Reset Filter"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Right Actions Slot */}
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
