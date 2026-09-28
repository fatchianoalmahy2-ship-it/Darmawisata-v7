'use client';

import React, { useState, useMemo } from 'react';
import { Student, Bus, WaveType, AppSettings, SchoolClass } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';
import { SchoolLogo } from '../ui/SchoolLogo';
import { Printer, X, Bus as BusIcon, Users, CheckCircle2, ShieldCheck, Filter } from 'lucide-react';
import { getAllDerivedChaperones } from '@/lib/utils';
import { generateBusPrintDocumentHtml } from './busPrintHelper';

interface BatchBusPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  buses: Bus[];
  classes?: SchoolClass[];
  defaultBusCapacity?: number;
  selectedWave?: string;
  settings?: AppSettings;
}

export const BatchBusPrintModal: React.FC<BatchBusPrintModalProps> = ({
  isOpen,
  onClose,
  students,
  buses,
  classes = [],
  defaultBusCapacity = 50,
  selectedWave: initialWave,
  settings,
}) => {
  const [selectedWave, setSelectedWave] = useState<string>(initialWave || 'ALL');
  const [hideEmptyBuses, setHideEmptyBuses] = useState<boolean>(true);

  // Define the exact seating template layout (50 seats)
  // Rows 1 to 11 are left pair and right pair (44 seats). Row 12 is back row with 6 seats (45-50).
  const rows = Array.from({ length: 11 }, (_, i) => {
    const start = i * 4 + 1;
    return {
      left: [start, start + 1],
      right: [start + 2, start + 3],
    };
  });
  const backRow = [45, 46, 47, 48, 49, 50]; // Row 12 (Back Row - 6 seats)

  // Filter buses based on wave selection and occupancy
  const busListToPrint = useMemo(() => {
    const waveFiltered = buses.filter(
      (b) => selectedWave === 'ALL' || b.wave === selectedWave
    );

    if (!hideEmptyBuses) {
      return [...waveFiltered].sort((a, b) => {
        if (a.wave !== b.wave) return a.wave.localeCompare(b.wave);
        return a.busNumber - b.busNumber;
      });
    }

    // Filter out buses that have 0 students AND no custom chaperones
    const activeBuses = waveFiltered.filter((b) => {
      const hasStudents = students.some(
        (s) => s.wave === b.wave && s.busNumber === b.busNumber && !!s.seatNumber
      );
      if (hasStudents) return true;

      // Check for any chaperone assignments
      const customGuides = settings?.customBusGuides?.[b.id];
      if (customGuides && (
        (customGuides.guide1 && customGuides.guide1 !== 'Belum Ditentukan') ||
        (customGuides.guide2 && customGuides.guide2 !== 'Belum Ditentukan') ||
        (customGuides.guide3 && customGuides.guide3 !== 'Belum Ditentukan') ||
        (customGuides.guide4 && customGuides.guide4 !== 'Belum Ditentukan')
      )) {
        return true;
      }
      if (
        (b.guide1 && b.guide1 !== 'Belum Ditentukan' && b.guide1 !== 'Pendamping Umum') ||
        (b.guide2 && b.guide2 !== 'Belum Ditentukan' && b.guide2 !== 'Pendamping Umum')
      ) {
        return true;
      }

      // Check if custom chaperone seats are explicitly allocated on this bus
      const customSeats = settings?.customChaperoneSeats || {};
      const hasChaperoneSeat = Object.keys(customSeats).some(
        (k) => k.startsWith(`${b.wave}_bus-${b.busNumber}_`) && customSeats[k] && customSeats[k] !== '__STUDENT__' && customSeats[k] !== '__NONE__'
      );

      return hasChaperoneSeat;
    });

    // If all are filtered out (e.g. fresh wave with no seats assigned yet), show the wave buses as fallback
    const result = activeBuses.length > 0 ? activeBuses : waveFiltered;

    return [...result].sort((a, b) => {
      if (a.wave !== b.wave) return a.wave.localeCompare(b.wave);
      return a.busNumber - b.busNumber;
    });
  }, [buses, selectedWave, hideEmptyBuses, students, settings]);

  if (!isOpen) return null;

  const formattedDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    if (typeof window === 'undefined') return;

    const allChaperones = getAllDerivedChaperones(settings?.masterChaperones || [], classes || []);
    const html = generateBusPrintDocumentHtml({
      buses: busListToPrint,
      waveToPrint: selectedWave,
      tourStudents: students,
      defaultBusCapacity,
      settings,
      allChaperones,
    });

    if (!html) {
      window.print();
      return;
    }

    let printWindow: Window | null = null;
    try {
      printWindow = window.open('', '_blank');
    } catch {
      printWindow = null;
    }

    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      return;
    }

    // Direct window print fallback for blocked popups / iFrames
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible print:z-auto print:block print:w-full print:h-auto">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:block print:w-full print:p-0 print:m-0">
        {/* Modal Header */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-3 no-print">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
              <BusIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>Cetak Massal Denah Armada Bus</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  {busListToPrint.length} Bus Siap Cetak
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Setiap bus dioptimalkan pas 1 halaman A4 Portrait tanpa tabel terpotong.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Wave Selector Filter */}
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-300 font-bold">Gelombang:</span>
              <select
                value={selectedWave}
                onChange={(e) => setSelectedWave(e.target.value)}
                className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-600 focus:outline-hidden"
              >
                <option value="ALL">Semua Gelombang</option>
                {schoolMetadata.waves.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Empty Buses Checkbox */}
            <label className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={hideEmptyBuses}
                onChange={(e) => setHideEmptyBuses(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-500 rounded border-slate-600 focus:ring-0 focus:outline-hidden cursor-pointer"
              />
              <span>Hanya Bus Aktif</span>
            </label>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Sekarang ({busListToPrint.length} Halaman)
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="p-4 md:p-6 overflow-y-auto bg-slate-100 flex-1 space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-center justify-between no-print font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Menampilkan <strong>{busListToPrint.length} lembar denah bus</strong>. Layout, jarak antar kursi, dan tabel siswa telah disesuaikan agar pas 1 halaman A4 per bus.
              </span>
            </div>
          </div>

          <div id="batch-bus-print-container" className="space-y-10 print:space-y-0">
            {busListToPrint.map((bus, busIdx) => {
              const baseCapacity = bus.capacity || defaultBusCapacity || 46;
              const busStudents = students.filter(
                (s) => s.wave === bus.wave && s.busNumber === bus.busNumber
              );

              const highestAssignedSeatNumber = Math.max(
                0,
                ...busStudents.map((s) => s.seatNumber || 0)
              );
              const effectiveCapacity = Math.min(50, Math.max(baseCapacity, highestAssignedSeatNumber));
              const capacity = effectiveCapacity;

              const seatStudentMap = new Map<number, Student>();
              busStudents.forEach((s) => {
                if (s.seatNumber) seatStudentMap.set(s.seatNumber, s);
              });

              const femaleCount = busStudents.filter((s) => s.gender === 'PEREMPUAN').length;
              const maleCount = busStudents.filter((s) => s.gender === 'LAKI-LAKI').length;

              const waveName =
                schoolMetadata.waves.find((w) => w.id === bus.wave)?.name || bus.wave;
              const destinationStr = bus.wave.toUpperCase().includes('YOGYA') ? 'YOGYAKARTA' : 'BALI';

              const vacantOption = settings?.busVacantSeats || (settings?.busReserveFront !== false ? '1-2' : 'none');

              const isSeatVacated = (seatNum: number): boolean => {
                if (vacantOption === 'none') return false;
                if (vacantOption === '1-4') return seatNum <= 4;
                return seatNum <= 2; // '1-2'
              };

              const getSeatChaperoneName = (seatNum: number): string => {
                const allChaperones = getAllDerivedChaperones(settings?.masterChaperones || [], classes || []);
                const getChaperoneName = (chaperoneIdOrName?: string, defaultName?: string) => {
                  if (!chaperoneIdOrName) return defaultName || '';
                  const found = allChaperones.find((c) => c.id === chaperoneIdOrName);
                  if (found) return found.name;
                  return chaperoneIdOrName;
                };

                const chaperoneKey = `${bus.wave}_bus-${bus.busNumber}_seat-${seatNum}`;
                const customVal = settings?.customChaperoneSeats?.[chaperoneKey];
                if (customVal !== undefined) {
                  if (customVal === '__STUDENT__' || customVal === '__NONE__' || customVal === '') {
                    return '';
                  }
                  return getChaperoneName(customVal);
                }
                if (seatStudentMap.has(seatNum)) {
                  return '';
                }

                const customGuideForBus = settings?.customBusGuides?.[bus.id];

                const localGuide1 = getChaperoneName(customGuideForBus?.guide1) || getChaperoneName(bus.guide1) || 'Pendamping 1';
                const localGuide2 = getChaperoneName(customGuideForBus?.guide2) || getChaperoneName(bus.guide2) || 'Pendamping 2';
                const localGuide3 = getChaperoneName(customGuideForBus?.guide3) || getChaperoneName(bus.guide3) || 'Pendamping 3';
                const localGuide4 = getChaperoneName(customGuideForBus?.guide4) || getChaperoneName(bus.guide4) || 'Pendamping 4';

                if (isSeatVacated(seatNum)) {
                  if (seatNum === 1) return localGuide1;
                  if (seatNum === 2) return localGuide2;
                  if (seatNum === 3) return localGuide3;
                  if (seatNum === 4) return localGuide4;
                  return 'Pendamping';
                }
                return '';
              };

              const allFiftySeatsList = Array.from({ length: 50 }, (_, i) => i + 1);
              const minStudentSeat = 1;

              const activeChaperones = [1, 2, 3, 4]
                .map((num) => ({ num, name: getSeatChaperoneName(num) }))
                .filter((c) => !!c.name);

              return (
                <div
                  key={`${bus.wave}-${bus.busNumber}-${busIdx}`}
                  className="flex justify-center w-full no-print-scroll print:p-0 print:m-0 print:block"
                >
                  <div className="printable-bus-area bg-white shadow-md border border-slate-300 page-break no-page-break-inside">
                    {/* 1. KOP Header (Compact) */}
                    <div className="flex items-center justify-between pb-1.5 border-b-2 border-slate-900 gap-3 print:border-black shrink-0">
                      <div className="flex items-center gap-2.5">
                        <SchoolLogo
                          src={settings?.appLogoUrl}
                          className="w-9 h-9 object-contain"
                          alt="Logo Sekolah"
                        />
                        <div>
                          <h2 className="text-[10.5px] font-black text-slate-900 tracking-wide uppercase leading-tight">
                            DENAH TEMPAT DUDUK TOUR {destinationStr} 2025
                          </h2>
                          <h3 className="text-xs md:text-sm font-black text-indigo-950 leading-tight">
                            {schoolMetadata.school.name}
                          </h3>
                          <p className="text-[8px] font-semibold text-slate-500">
                            Tahun Pelajaran 2025/2026 • Gelombang: {waveName}
                          </p>
                        </div>
                      </div>
                      <div className="bg-slate-900 text-white rounded-lg border border-slate-800 px-3 py-0.5 font-black text-sm text-center min-w-[75px] shadow-2xs print:text-black print:bg-white print:border-black">
                        BUS {bus.busNumber}
                      </div>
                    </div>

                    {/* 2. Guides Info Bar (Compact) */}
                    {activeChaperones.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 my-1 text-[8.5px] font-bold text-slate-800 print:bg-white print:border-black print:text-black shrink-0">
                        {activeChaperones.map((chap) => (
                          <div key={chap.num} className="flex items-center gap-1.5 min-w-0">
                            <span className="text-indigo-900 print:text-black shrink-0 font-black text-[8px]">
                              PENDAMPING (KURSI {chap.num}) :
                            </span>
                            <span className="underline text-slate-950 font-bold truncate">{chap.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 3. Main Layout Content (Tabel & Visual Denah Bus) */}
                    <div className="grid grid-cols-12 gap-3 items-stretch flex-1 min-h-0 my-0.5">
                      {/* LEFT COLUMN: Passenger List Table (50 Rows) */}
                      <div className="col-span-7 bg-white rounded-xl border border-slate-300 overflow-hidden print:border-black print:rounded-none flex flex-col h-full">
                        <div className="bg-slate-100 px-2 py-0.5 border-b border-slate-300 flex justify-between items-center print:hidden shrink-0">
                          <span className="text-[8.5px] font-black text-slate-800 uppercase tracking-wider">
                            Daftar Kursi & Penumpang (01 - 50)
                          </span>
                          <span className="text-[8px] font-bold text-slate-500">
                            Total: {busStudents.length} Terisi ({maleCount} L / {femaleCount} P)
                          </span>
                        </div>
                        <div className="flex-1 min-h-0 flex flex-col h-full justify-between overflow-hidden">
                          <table className="bus-manifest-table w-full text-left text-[8.5px] border-collapse h-full">
                            <thead className="bg-slate-100 text-slate-900 font-black uppercase border-b border-slate-300 print:bg-white print:text-black print:border-black shrink-0">
                              <tr className="print-row-compact">
                                <th className="py-[1px] px-1 w-8 text-center border-r border-slate-300 print:border-black font-black text-[8px]">
                                  KURSI
                                </th>
                                <th className="py-[1px] px-1.5 border-r border-slate-300 print:border-black font-black text-[8px]">
                                  NAMA LENGKAP
                                </th>
                                <th className="py-[1px] px-0.5 w-5 text-center border-r border-slate-300 print:border-black font-black text-[8px]">
                                  JK
                                </th>
                                <th className="py-[1px] px-1.5 w-14 text-left font-black text-[8px]">KELAS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 print:divide-black">
                              {allFiftySeatsList.map((seatNum) => {
                                const student = seatStudentMap.get(seatNum);
                                const chapName = getSeatChaperoneName(seatNum);
                                const isChap = !!chapName;
                                const isMale = student?.gender === 'LAKI-LAKI';

                                return (
                                  <tr
                                    key={seatNum}
                                    className={`print-row-compact ${
                                      isChap
                                        ? 'bg-emerald-50/50 text-emerald-950 font-bold print:bg-white'
                                        : student
                                        ? isMale
                                          ? 'bg-sky-50/30 print:bg-white'
                                          : 'bg-rose-50/30 print:bg-white'
                                        : 'text-slate-400 print:text-black'
                                    }`}
                                  >
                                    <td className="py-[1px] px-1 text-center font-black text-slate-900 border-r border-slate-200 print:border-black bg-slate-50/50 print:bg-white text-[8px] leading-tight">
                                      {seatNum.toString().padStart(2, '0')}
                                    </td>
                                    <td className="py-[1px] px-1.5 font-bold text-slate-900 truncate max-w-[160px] border-r border-slate-200 print:border-black leading-tight text-[8.5px]">
                                      {isChap ? (
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="truncate text-emerald-950 font-black">{chapName}</span>
                                          <span className="text-[6.5px] font-black text-emerald-800 uppercase px-1 py-0.2 bg-emerald-100 rounded-xs">
                                            GURU
                                          </span>
                                        </div>
                                      ) : student ? (
                                        <span className="truncate">{student.name}</span>
                                      ) : (
                                        <span className="text-slate-400 print:text-black font-normal">-</span>
                                      )}
                                    </td>
                                    <td className="py-[1px] px-0.5 text-center font-bold border-r border-slate-200 print:border-black text-[8px] leading-tight">
                                      {isChap ? '-' : student ? (isMale ? 'L' : 'P') : '-'}
                                    </td>
                                    <td className="py-[1px] px-1.5 text-slate-700 font-semibold truncate max-w-[65px] leading-tight text-[8px]">
                                      {isChap ? (
                                        <span className="text-emerald-900 font-bold text-[7.5px]">PENDAMPING</span>
                                      ) : student ? (
                                        student.className
                                      ) : (
                                        '-'
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* RIGHT COLUMN: Visual Bus Seat Layout */}
                      <div className="col-span-5 bg-white rounded-xl border border-slate-300 p-1.5 shadow-2xs print:border-none print:p-0 flex flex-col h-full">
                        <div className="flex-1 bg-slate-50/70 border-2 border-slate-900 rounded-[18px] p-2 relative print:bg-white print:border-black flex flex-col justify-between h-full">
                          {/* Front Windshield & Steering Area */}
                          <div className="flex items-center justify-between pb-0.5 border-b border-slate-300 mb-1 print:border-black shrink-0">
                            <div className="flex items-center gap-1">
                              <span className="text-emerald-700 text-[9px] font-black">◀</span>
                              <span className="text-[7.5px] font-black text-slate-800 uppercase tracking-wider">
                                PINTU DEPAN
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[7.5px] font-black text-slate-600 uppercase tracking-wide">
                                KEMUDI
                              </span>
                              <span className="text-[10px]">☸️</span>
                              <span className="text-rose-700 text-[9px] font-black">▶</span>
                            </div>
                          </div>

                          {/* Seating Grid (Evenly Distributed with Larger Height Boxes) */}
                          <div className="flex flex-col justify-between flex-1 my-0.5 gap-y-0.5">
                            {(() => {
                              const renderSeat = (seatNum: number) => {
                                if (seatNum === 0) return <div key={`empty-${Math.random()}`} className="flex-1 h-full min-h-[30px]"></div>;
                                const student = seatStudentMap.get(seatNum);
                                const chaperoneName = getSeatChaperoneName(seatNum);
                                const isOccupiedByChaperone = !!chaperoneName;
                                const isOccupied = !!student || isOccupiedByChaperone;
                                const isMale = student?.gender === 'LAKI-LAKI';
                                const isOutOfCapacity = seatNum > capacity;
                                const isBeyondBaseCapacity = seatNum > baseCapacity;
                                const displayLabel = seatNum.toString().padStart(2, '0');

                                return (
                                  <div
                                    key={seatNum}
                                    className={`flex-1 h-full min-h-[28px] max-h-[36px] font-black rounded-md border flex items-center justify-center transition-all relative seat-item ${
                                      isOutOfCapacity
                                        ? 'bg-slate-200/50 border-slate-300 text-slate-400 opacity-40 print:hidden grayscale'
                                        : isOccupiedByChaperone
                                        ? 'bg-emerald-100 border-emerald-500 text-emerald-950 print:bg-emerald-50 print:border-black print:text-black font-black'
                                        : isOccupied
                                        ? isMale
                                          ? isBeyondBaseCapacity
                                            ? 'bg-sky-100 border-amber-400 text-sky-950 print:bg-sky-50 print:border-black print:text-black'
                                            : 'bg-sky-100 border-sky-400 text-sky-950 print:bg-sky-50 print:border-black print:text-black'
                                          : isBeyondBaseCapacity
                                          ? 'bg-rose-100 border-amber-400 text-rose-950 print:bg-rose-50 print:border-black print:text-black'
                                          : 'bg-rose-100 border-rose-400 text-rose-950 print:bg-rose-50 print:border-black print:text-black'
                                        : isBeyondBaseCapacity
                                        ? 'bg-amber-50/50 border-dashed border-amber-300 text-amber-700 print:bg-white print:border-slate-300 print:text-slate-400'
                                        : 'bg-white border-slate-300 text-slate-400 print:bg-white print:border-slate-800 print:text-slate-900'
                                    }`}
                                    style={{
                                      WebkitPrintColorAdjust: 'exact',
                                      printColorAdjust: 'exact',
                                    }}
                                  >
                                    <div className="flex items-center justify-center gap-1 text-center w-full h-full px-0.5 leading-none">
                                      <span className="font-black text-xs sm:text-[13px] tracking-tight block select-none">
                                        {displayLabel}
                                      </span>
                                      {isOccupiedByChaperone && (
                                        <span className="text-[7px] font-black uppercase tracking-tight text-emerald-900 ml-0.5 block">
                                          GURU
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              };

                              return (
                                <>
                                  {rows.map((rowItem, rowIndex) => {
                                    const l1 = rowItem.left[0];
                                    const l2 = rowItem.left[1];
                                    const r1 = rowItem.right[0];
                                    const r2 = rowItem.right[1];

                                    return (
                                      <div key={rowIndex} className="flex items-center justify-between gap-1 flex-1 py-0.5">
                                        <div className="flex-1 flex gap-1.5 h-full items-center">
                                          {renderSeat(l1)}
                                          {renderSeat(l2)}
                                        </div>
                                        <div className="w-2 text-center text-[7px] font-bold text-slate-300 select-none print:text-slate-400">
                                          |
                                        </div>
                                        <div className="flex-1 flex gap-1.5 h-full items-center">
                                          {renderSeat(r1)}
                                          {renderSeat(r2)}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  <div className="flex gap-1 pt-1 border-t border-dashed border-slate-300 print:border-black mt-0.5 flex-1 items-center py-0.5">
                                    {backRow.map((seatNum) => renderSeat(seatNum))}
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          {/* Back Door / Rear label */}
                          <div className="flex items-center justify-between mt-auto pt-1 border-t border-slate-300 print:border-black shrink-0">
                            <div className="flex items-center gap-1">
                              <span className="text-emerald-700 text-[9px] font-black">◀</span>
                              <span className="text-[7.5px] font-black text-slate-800 uppercase tracking-wider">
                                PINTU BELAKANG
                              </span>
                            </div>
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                              TOILET / BELAKANG
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Footer Date & Signatures (Compact) */}
                    <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-300 text-[8px] text-slate-500 font-medium print:border-black print:text-black shrink-0">
                      <div>Sistem Informasi Darmawisata — {schoolMetadata.school.name}</div>
                      <div>Ponorogo, {formattedDate}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
