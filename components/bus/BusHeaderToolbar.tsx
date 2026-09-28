'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bus, WaveType } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';
import {
  Bus as BusIcon,
  Sparkles,
  Printer,
  ChevronDown,
  FileDown,
  FileSpreadsheet,
  Layers,
  SlidersHorizontal,
  MousePointerClick,
  ArrowRightLeft,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface BusHeaderToolbarProps {
  selectedWave: WaveType;
  onSelectWave: (wave: WaveType) => void;
  waveMetrics: {
    totalStudents: number;
    seatedCount: number;
    unseatedCount: number;
    occupancyPercentage: number;
    totalBuses: number;
  };
  sortedBusNumbers: number[];
  selectedBusNumber: number;
  onSelectBusNumber: (num: number) => void;
  getBusOccupancy: (busNum: number) => { seated: number; capacity: number; isFull: boolean };
  // Mode toggles
  isRapidMode: boolean;
  onToggleRapidMode: () => void;
  isDualBusView: boolean;
  onToggleDualBusView: () => void;
  isBulkMode: boolean;
  selectedStudentCount: number;
  onToggleBulkMode: () => void;
  // Quick Settings toggle
  isQuickPanelOpen: boolean;
  onToggleQuickPanel: () => void;
  // Actions
  onAutoAllocate?: () => void;
  onAutoAllocateWithScope?: (scope: 'ALL' | 'WAVE' | 'BUS' | 'COMPACT') => void;
  isAllocating?: boolean;
  onPrintCurrentBus: () => void;
  onPrintAllBuses: () => void;
  onExportExcel: () => void;
  onOpenBatchModal: () => void;
}

export const BusHeaderToolbar: React.FC<BusHeaderToolbarProps> = ({
  selectedWave,
  onSelectWave,
  waveMetrics,
  sortedBusNumbers,
  selectedBusNumber,
  onSelectBusNumber,
  getBusOccupancy,
  isRapidMode,
  onToggleRapidMode,
  isDualBusView,
  onToggleDualBusView,
  isBulkMode,
  selectedStudentCount,
  onToggleBulkMode,
  isQuickPanelOpen,
  onToggleQuickPanel,
  onAutoAllocate,
  onAutoAllocateWithScope,
  isAllocating = false,
  onPrintCurrentBus,
  onPrintAllBuses,
  onExportExcel,
  onOpenBatchModal,
}) => {
  const [isPrintDropdownOpen, setIsPrintDropdownOpen] = useState<boolean>(false);
  const [isAutoPlotDropdownOpen, setIsAutoPlotDropdownOpen] = useState<boolean>(false);
  const busScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#bus-print-dropdown-container')) {
        setIsPrintDropdownOpen(false);
      }
      if (!target.closest('#bus-autoplot-dropdown-container')) {
        setIsAutoPlotDropdownOpen(false);
      }
    };
    if (isPrintDropdownOpen || isAutoPlotDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isPrintDropdownOpen, isAutoPlotDropdownOpen]);

  const checkBusScroll = () => {
    if (busScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = busScrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkBusScroll();
    window.addEventListener('resize', checkBusScroll);
    return () => window.removeEventListener('resize', checkBusScroll);
  }, [sortedBusNumbers]);

  const handleScrollBusLeft = () => {
    if (busScrollRef.current) busScrollRef.current.scrollBy({ left: -140, behavior: 'smooth' });
  };

  const handleScrollBusRight = () => {
    if (busScrollRef.current) busScrollRef.current.scrollBy({ left: 140, behavior: 'smooth' });
  };

  return (
    <div className="space-y-3 no-print">
      {/* 1. TOP HEADER & GLOBAL ACTIONS */}
      <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
              <BusIcon className="w-5 h-5" />
            </div>
            <div>
              <select
                value={selectedWave}
                onChange={(e) => onSelectWave(e.target.value as WaveType)}
                aria-label="Pilih Gelombang Tour"
                className="bg-slate-800 hover:bg-slate-750 text-white font-extrabold text-xs sm:text-sm px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-hidden cursor-pointer"
              >
                {schoolMetadata.waves.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Metrics Badges in sleek strip */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700/80">
              Total: <strong className="text-white">{waveMetrics.totalStudents}</strong> Siswa
            </span>
            <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-300 rounded-lg border border-emerald-500/30">
              Dapat Kursi: <strong className="text-emerald-200">{waveMetrics.seatedCount}</strong> ({waveMetrics.occupancyPercentage}%)
            </span>
            {waveMetrics.unseatedCount > 0 && (
              <span className="px-2.5 py-1 bg-amber-500/15 text-amber-300 rounded-lg border border-amber-500/30 animate-pulse">
                Belum: <strong className="text-amber-200">{waveMetrics.unseatedCount}</strong>
              </span>
            )}
            <span className="px-2.5 py-1 bg-indigo-500/15 text-indigo-300 rounded-lg border border-indigo-500/30 hidden sm:inline-block">
              {waveMetrics.totalBuses} Bus
            </span>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {(onAutoAllocate || onAutoAllocateWithScope) && (
            <div id="bus-autoplot-dropdown-container" className="relative inline-flex rounded-xl shadow-xs">
              <button
                type="button"
                onClick={() => {
                  if (onAutoAllocateWithScope) onAutoAllocateWithScope('BUS');
                  else if (onAutoAllocate) onAutoAllocate();
                }}
                disabled={isAllocating}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-l-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
                title={`Jalankan Auto-Plot untuk Bus ${selectedBusNumber}`}
              >
                {isAllocating ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isAllocating ? 'Memproses...' : `⚡ Auto-Plot Bus ${selectedBusNumber}`}</span>
              </button>
              <button
                type="button"
                disabled={isAllocating}
                onClick={() => setIsAutoPlotDropdownOpen(!isAutoPlotDropdownOpen)}
                className="px-2 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-r-xl border-l border-emerald-500/40 text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                title="Pilihan Cakupan Auto-Plot (Bus / Gelombang / Seluruh / Rapatkan)"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Options */}
              {isAutoPlotDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-white space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Opsi Auto-Plot & Penataan:
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoPlotDropdownOpen(false);
                      if (onAutoAllocateWithScope) onAutoAllocateWithScope('BUS');
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800 transition-colors flex items-start gap-2.5 group cursor-pointer"
                  >
                    <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg font-black text-xs group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      🚌
                    </span>
                    <div>
                      <div className="text-xs font-black text-white">Auto-Plot Bus {selectedBusNumber} Saja</div>
                      <div className="text-[10px] text-slate-400 font-normal">Isi kursi kosong Bus {selectedBusNumber} dari siswa gelombang ini</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoPlotDropdownOpen(false);
                      if (onAutoAllocateWithScope) onAutoAllocateWithScope('WAVE');
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800 transition-colors flex items-start gap-2.5 group cursor-pointer"
                  >
                    <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg font-black text-xs group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                      🌊
                    </span>
                    <div>
                      <div className="text-xs font-black text-white">Auto-Plot Gelombang Ini</div>
                      <div className="text-[10px] text-slate-400 font-normal">Tata ulang seluruh bus pada gelombang ini</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoPlotDropdownOpen(false);
                      if (onAutoAllocateWithScope) onAutoAllocateWithScope('ALL');
                      else if (onAutoAllocate) onAutoAllocate();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800 transition-colors flex items-start gap-2.5 group cursor-pointer"
                  >
                    <span className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg font-black text-xs group-hover:bg-purple-500 group-hover:text-white transition-colors">
                      🌐
                    </span>
                    <div>
                      <div className="text-xs font-black text-white">Auto-Plot Seluruh Gelombang</div>
                      <div className="text-[10px] text-slate-400 font-normal">Tata ulang semua siswa & bus di seluruh gelombang</div>
                    </div>
                  </button>

                  <div className="border-t border-slate-800 my-1"></div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoPlotDropdownOpen(false);
                      if (onAutoAllocateWithScope) onAutoAllocateWithScope('COMPACT');
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-amber-950/40 border border-amber-800/40 hover:border-amber-700 transition-colors flex items-start gap-2.5 group cursor-pointer"
                  >
                    <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg font-black text-xs group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      ⚡
                    </span>
                    <div>
                      <div className="text-xs font-black text-amber-300">Rapatkan Kursi Bus {selectedBusNumber}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Hapus celah kosong & rapatkan urutan siswa ke depan</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 1-Click Print Split Button with Dropdown */}
          <div id="bus-print-dropdown-container" className="relative inline-flex rounded-xl shadow-xs">
            <button
              onClick={onPrintCurrentBus}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-l-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
              title={`Cetak Langsung Denah Bus ${selectedBusNumber} (1-Klik)`}
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>Cetak Bus {selectedBusNumber}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPrintDropdownOpen(!isPrintDropdownOpen)}
              className="px-2 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-r-xl border-l border-indigo-500/40 text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
              title="Pilihan Cetak & Ekspor"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Print Dropdown Menu */}
            {isPrintDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setIsPrintDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Opsi Cetak Langsung (1-Klik)
                </div>
                <button
                  onClick={onPrintCurrentBus}
                  className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-extrabold text-slate-900">Cetak Bus {selectedBusNumber} (A4)</div>
                    <div className="text-[10px] text-slate-500">Denah & manifest bus aktif</div>
                  </div>
                </button>
                <button
                  onClick={onPrintAllBuses}
                  className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-extrabold text-slate-900">Cetak Seluruh Bus ({waveMetrics.totalBuses} Bus)</div>
                    <div className="text-[10px] text-slate-500">Langsung cetak batch A4 tanpa popup</div>
                  </div>
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={onExportExcel}
                  className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-sky-600 shrink-0" />
                  <div>
                    <div className="font-extrabold text-slate-900">Ekspor Manifest ke Excel</div>
                    <div className="text-[10px] text-slate-500">File spreadsheet .xlsx lengkap</div>
                  </div>
                </button>
                <button
                  onClick={onOpenBatchModal}
                  className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <div className="font-extrabold text-slate-900">Buka Pratinjau Massal</div>
                    <div className="text-[10px] text-slate-500">Lihat lembar denah satu per satu</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleQuickPanel}
            className={`p-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap ${
              isQuickPanelOpen ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Pengaturan Parameter Jurusan & Gelombang"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. BUS SELECTOR BAR & MODE TOGGLES */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Bus Tabs Slider */}
        <div className="flex items-center gap-2 w-full md:w-auto min-w-0">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider whitespace-nowrap hidden sm:inline">
            Armada:
          </span>

          <div className="relative flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:max-w-xl shadow-2xs">
            <button
              type="button"
              onClick={handleScrollBusLeft}
              className={`p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-all shrink-0 cursor-pointer ${
                canScrollLeft ? 'opacity-100' : 'opacity-30 cursor-default'
              }`}
              disabled={!canScrollLeft}
              aria-label="Gulir bus ke kiri"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={busScrollRef}
              onScroll={checkBusScroll}
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 px-1 scroll-smooth"
            >
              {sortedBusNumbers.map((num) => {
                const isSelected = selectedBusNumber === num;
                const occ = getBusOccupancy(num);

                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onSelectBusNumber(num)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 active:scale-95 shadow-2xs ${
                      isSelected
                        ? 'bg-slate-900 text-white ring-2 ring-slate-800'
                        : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                    }`}
                  >
                    <span>Bus {num}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-black leading-none ${
                        isSelected
                          ? occ.isFull
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-indigo-500 text-white'
                          : occ.isFull
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {occ.seated}/{occ.capacity}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleScrollBusRight}
              className={`p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-all shrink-0 cursor-pointer ${
                canScrollRight ? 'opacity-100' : 'opacity-30 cursor-default'
              }`}
              disabled={!canScrollRight}
              aria-label="Gulir bus ke kanan"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action & Mode Toggles */}
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={onToggleRapidMode}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              isRapidMode
                ? 'bg-emerald-600 text-white shadow-xs animate-pulse'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200'
            }`}
            title="Mode Cepat: Klik siswa lalu klik kursi di denah secara berurutan"
          >
            <MousePointerClick className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{isRapidMode ? 'Cepat ON' : 'Mode Cepat'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleDualBusView}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              isDualBusView
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200'
            }`}
            title="Bandingkan & Tata 2 Bus Berdampingan"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">2 Bus</span>
          </button>

          <button
            type="button"
            onClick={onToggleBulkMode}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              isBulkMode
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200'
            }`}
            title="Pilih banyak siswa untuk dipindahkan bersamaan"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">
              {isBulkMode ? `Massal (${selectedStudentCount})` : 'Massal'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
