'use client';

import React from 'react';
import { Bus, Student, WaveType, AppSettings } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';
import { SchoolLogo } from '@/components/ui/SchoolLogo';

interface BusPrintLayoutProps {
  bus: Bus;
  selectedWave: WaveType;
  students: Student[];
  capacity: number;
  zoomScale: number;
  getSeatChaperoneName: (seatNum: number) => string;
  onSeatClick?: (seatNum: number) => void;
  activeSourceSeat?: number | null;
  selectedStudentIds?: string[];
  isBulkMode?: boolean;
  onToggleSelectStudent?: (studentId: string) => void;
  // Drag & drop
  onDragStart?: (e: React.DragEvent, studentId: string) => void;
  onDropCross?: (e: React.DragEvent, seatNum: number, busNum: number) => void;
  dragOverSeatNum?: number | null;
  dragOverBusNum?: number | null;
  setDragOverSeatNum?: (seatNum: number | null) => void;
  setDragOverBusNum?: (busNum: number | null) => void;
  selectedUnassignedStudentId?: string | null;
}

export const BusPrintLayout: React.FC<BusPrintLayoutProps> = ({
  bus,
  selectedWave,
  students,
  capacity,
  zoomScale,
  getSeatChaperoneName,
  onSeatClick,
  activeSourceSeat,
  selectedStudentIds = [],
  isBulkMode = false,
  onToggleSelectStudent,
  onDragStart,
  onDropCross,
  dragOverSeatNum,
  dragOverBusNum,
  setDragOverSeatNum,
  setDragOverBusNum,
  selectedUnassignedStudentId,
}) => {
  const seatStudentMap = new Map<number, Student>();
  const busStudents = students.filter(
    (s) => s.wave === selectedWave && s.busNumber === bus.busNumber
  );

  busStudents.forEach((s) => {
    if (s.seatNumber) {
      seatStudentMap.set(s.seatNumber, s);
    }
  });

  const effectiveCapacity = Math.min(50, bus.capacity || capacity || 50);
  const allSeatsList = Array.from({ length: effectiveCapacity }, (_, i) => i + 1);

  // Rows 1-11
  const maxRegularRows = Math.min(11, Math.ceil(Math.min(effectiveCapacity, 44) / 4));
  const rows = Array.from({ length: maxRegularRows }, (_, i) => {
    const rowNum = i + 1;
    const start = (rowNum - 1) * 4 + 1;
    return {
      row: rowNum,
      left: [start, start + 1],
      right: [start + 2, start + 3],
    };
  });
  const backRow = [45, 46, 47, 48, 49, 50].filter((s) => s <= effectiveCapacity);

  const renderSeatBox = (seatNum: number) => {
    const student = seatStudentMap.get(seatNum);
    const chaperoneName = getSeatChaperoneName(seatNum);
    const isOccupiedByChaperone = !!chaperoneName;
    const isOccupied = !!student || isOccupiedByChaperone;
    const isMale = student?.gender === 'LAKI-LAKI';

    const isBeyondBaseCapacity = seatNum > (bus.capacity || 50);
    const displayLabel = seatNum.toString().padStart(2, '0');

    const isDragOver = dragOverSeatNum === seatNum && dragOverBusNum === bus.busNumber;
    const isActiveSource = activeSourceSeat === seatNum;
    const isSelectedInBulk = student ? selectedStudentIds.includes(student.id) : false;
    const isUnassignedTarget = selectedUnassignedStudentId !== null && !isOccupied;

    return (
      <div
        key={seatNum}
        role="button"
        tabIndex={0}
        draggable={!!student && !isBulkMode}
        onDragStart={(e) => student && onDragStart && onDragStart(e, student.id)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (setDragOverSeatNum) setDragOverSeatNum(seatNum);
          if (setDragOverBusNum) setDragOverBusNum(bus.busNumber);
        }}
        onDragLeave={() => {
          if (setDragOverSeatNum) setDragOverSeatNum(null);
          if (setDragOverBusNum) setDragOverBusNum(null);
        }}
        onDrop={(e) => onDropCross && onDropCross(e, seatNum, bus.busNumber)}
        onClick={() => {
          if (isBulkMode && student && onToggleSelectStudent) {
            onToggleSelectStudent(student.id);
          } else if (onSeatClick) {
            onSeatClick(seatNum);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isBulkMode && student && onToggleSelectStudent) {
              onToggleSelectStudent(student.id);
            } else if (onSeatClick) {
              onSeatClick(seatNum);
            }
          }
        }}
        className={`flex-1 min-h-[38px] sm:min-h-[42px] py-0.5 rounded-lg border flex items-center justify-center transition-all relative group/seat select-none seat-item cursor-pointer shadow-2xs ${
          isActiveSource
            ? 'border-amber-500 ring-2 ring-amber-500 bg-amber-100 scale-105 z-30 animate-pulse'
            : isSelectedInBulk
            ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-100/90 z-20 font-bold'
            : isUnassignedTarget
            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400 animate-pulse scale-105'
            : isDragOver
            ? 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-100 scale-105 z-10'
            : isOccupiedByChaperone
            ? 'bg-purple-100 border-purple-300 text-purple-950 hover:bg-purple-200'
            : isOccupied
            ? isMale
              ? 'bg-sky-100/80 border-sky-300 text-sky-950 hover:bg-sky-200'
              : 'bg-rose-100/80 border-rose-300 text-rose-950 hover:bg-rose-200'
            : isBeyondBaseCapacity
            ? 'bg-amber-50/60 border-dashed border-amber-300 text-amber-800 hover:bg-amber-100 hover:border-amber-500'
            : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600'
        }`}
        style={{
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {isBulkMode && student && (
          <span
            className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black z-20 no-print ${
              isSelectedInBulk ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-300 text-slate-700'
            }`}
          >
            {isSelectedInBulk ? '✓' : ''}
          </span>
        )}
        <div className="flex flex-col items-center justify-center text-center w-full h-full px-0.5 leading-tight">
          <span className="font-black text-xs sm:text-[13px] tracking-tight block select-none">
            {displayLabel}
          </span>
          {isOccupiedByChaperone ? (
            <span className="text-[7.5px] font-black uppercase tracking-tight text-purple-900 truncate max-w-full block">
              GURU
            </span>
          ) : student ? (
            <span className="text-[8px] font-bold uppercase tracking-tight truncate max-w-full block print:hidden">
              {student.name.trim().split(/\s+/)[0]}
            </span>
          ) : null}
          {isBeyondBaseCapacity && isOccupied && (
            <span className="text-[5.5px] font-black text-amber-700 leading-none no-print">★</span>
          )}
        </div>

        {/* Hover Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/seat:block z-50 bg-slate-900 text-white text-[9.5px] rounded-lg p-2 shadow-xl pointer-events-none min-w-[130px] text-center border border-slate-700">
          <div className="font-black text-indigo-300 text-[10px] pb-0.5 border-b border-slate-800 mb-1">
            KURSI #{displayLabel} • BUS {bus.busNumber}
          </div>
          {isOccupiedByChaperone ? (
            <div>
              <div className="font-extrabold text-emerald-300 truncate">{chaperoneName}</div>
              <div className="text-[8px] text-emerald-400 font-bold tracking-wider mt-0.5">GURU PENDAMPING</div>
            </div>
          ) : student ? (
            <div>
              <div className="font-black text-white truncate text-[10.5px]">{student.name}</div>
              <div className="text-slate-300 font-semibold text-[9px] mt-0.5">
                {student.className} {student.nis ? `• NIS: ${student.nis}` : ''}
              </div>
              <div className="inline-block mt-1 px-1.5 py-0.2 rounded text-[7.5px] font-black uppercase tracking-wider bg-slate-800 text-slate-300">
                {student.gender === 'LAKI-LAKI' ? 'Laki-Laki' : 'Perempuan'}
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-[8.5px] py-0.5">Kursi Kosong — Klik untuk isi</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      id="printable-bus-area-wrapper"
      className="w-full bg-slate-100/90 py-4 sm:py-6 px-1 sm:px-4 rounded-3xl border border-slate-200 overflow-x-auto flex justify-center items-start print:bg-white print:p-0 print:border-none print:m-0 print:overflow-visible print:w-full print:block"
    >
      <div
        className="transition-all duration-150 shrink-0 relative flex justify-center print:w-full print:h-auto print:static"
        style={{
          width: `${210 * (zoomScale / 100)}mm`,
          height: `${297 * (zoomScale / 100)}mm`,
        }}
      >
        <div
          id="printable-bus-area"
          className="bg-white rounded-xl shadow-2xl border border-slate-300 p-4 sm:p-5 print:shadow-none print:border-none print:rounded-none print:p-2 text-slate-900 absolute top-0 left-0 flex flex-col justify-between print:static print:transform-none"
          style={{
            width: '210mm',
            height: '285mm',
            maxHeight: '287mm',
            boxSizing: 'border-box',
            transform: `scale(${zoomScale / 100})`,
            transformOrigin: 'top left',
          }}
        >
          {/* Header Kop */}
          <div className="flex items-center justify-between pb-1.5 border-b-2 border-slate-900 mb-1.5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 relative flex items-center justify-center">
                <SchoolLogo className="w-9 h-9 object-contain" />
              </div>
              <div>
                <h3 className="text-[10.5px] sm:text-xs font-black tracking-tight uppercase leading-tight">
                  DENAH TEMPAT DUDUK TOUR {selectedWave.includes('YOGYA') ? 'YOGYAKARTA' : 'BALI'} 2025
                </h3>
                <p className="text-xs font-black text-slate-800 uppercase leading-tight">
                  {schoolMetadata.school.name}
                </p>
                <p className="text-[8px] text-slate-500 font-semibold">
                  Tahun Pelajaran 2025/2026 • Gelombang:{' '}
                  {schoolMetadata.waves.find((w) => w.id === selectedWave)?.name || selectedWave}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="px-3 py-0.5 bg-slate-950 text-white rounded-lg text-xs font-black tracking-wider shadow-2xs">
                BUS {bus.busNumber}
              </div>
              <div className="text-[8px] text-slate-500 font-bold mt-0.5">Format Resmi 2-2</div>
            </div>
          </div>

          {/* Chaperone 2x2 Bar */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 mb-1.5 text-[8.5px] font-extrabold text-slate-800 shrink-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-indigo-900 shrink-0 font-black text-[8px]">PENDAMPING (KURSI 1) :</span>
              <span className="underline text-slate-900 font-bold truncate">
                {getSeatChaperoneName(1) || 'Pendamping 1'}
              </span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-indigo-900 shrink-0 font-black text-[8px]">PENDAMPING (KURSI 2) :</span>
              <span className="underline text-slate-900 font-bold truncate">
                {getSeatChaperoneName(2) || 'Pendamping 2'}
              </span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-indigo-900 shrink-0 font-black text-[8px]">PENDAMPING (KURSI 3) :</span>
              <span className="underline text-slate-900 font-bold truncate">
                {getSeatChaperoneName(3) || 'Pendamping 3'}
              </span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-indigo-900 shrink-0 font-black text-[8px]">PENDAMPING (KURSI 4) :</span>
              <span className="underline text-slate-900 font-bold truncate">
                {getSeatChaperoneName(4) || 'Pendamping 4'}
              </span>
            </div>
          </div>

          {/* Main Grid: Student Table (Left 7 cols) & Seating Chart (Right 5 cols) */}
          <div className="grid grid-cols-12 gap-3 items-stretch flex-1 min-h-0 my-0.5">
            {/* Student Table (Left 7 Cols - 50 Rows) */}
            <div className="col-span-7 flex flex-col h-full border border-slate-300 rounded-xl overflow-hidden bg-white">
              <div className="bg-slate-100 text-slate-800 font-black text-[8.5px] uppercase px-2 py-0.5 border-b border-slate-300 flex justify-between items-center shrink-0">
                <span>DAFTAR KURSI & PENUMPANG (01 - {effectiveCapacity.toString().padStart(2, '0')})</span>
                <span className="text-slate-500 font-semibold text-[8px]">
                  {busStudents.length} / {effectiveCapacity} Terisi
                </span>
              </div>
              <div className="flex-1 min-h-0 flex flex-col h-full justify-between overflow-hidden">
                <table className="bus-manifest-table w-full text-left text-[8.5px] border-collapse h-full">
                  <thead className="bg-slate-100 text-slate-900 font-black uppercase border-b border-slate-300 shrink-0">
                    <tr>
                      <th className="py-[1px] px-1 w-8 text-center border-r border-slate-300 font-black text-[8px]">KURSI</th>
                      <th className="py-[1px] px-1.5 border-r border-slate-300 font-black text-[8px]">NAMA LENGKAP</th>
                      <th className="py-[1px] px-0.5 w-5 text-center border-r border-slate-300 font-black text-[8px]">JK</th>
                      <th className="py-[1px] px-1.5 w-14 font-black text-[8px]">KELAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allSeatsList.map((seatNum) => {
                      const student = seatStudentMap.get(seatNum);
                      const chaperoneName = getSeatChaperoneName(seatNum);
                      const isChap = !!chaperoneName;

                      const isSelectedInBulk = student ? selectedStudentIds.includes(student.id) : false;
                      const isActiveSource = activeSourceSeat === seatNum;

                      return (
                        <tr
                          key={seatNum}
                          onClick={() => {
                            if (isBulkMode && student && onToggleSelectStudent) {
                              onToggleSelectStudent(student.id);
                            } else if (onSeatClick) {
                              onSeatClick(seatNum);
                            }
                          }}
                          className={`cursor-pointer transition-colors print-row-compact ${
                            isActiveSource
                              ? 'bg-amber-100 font-bold'
                              : isSelectedInBulk
                              ? 'bg-blue-100/70 font-bold border-l-2 border-l-blue-600'
                              : isChap
                              ? 'bg-emerald-50/50 text-emerald-950 font-bold'
                              : student
                              ? student.gender === 'LAKI-LAKI'
                                ? 'bg-sky-50/20'
                                : 'bg-rose-50/20'
                              : 'text-slate-400'
                          }`}
                        >
                          <td className="py-[1px] px-1 text-center font-black bg-slate-50/50 border-r border-slate-200 text-[8px] leading-tight">
                            {seatNum.toString().padStart(2, '0')}
                          </td>
                          <td className="py-[1px] px-1.5 font-bold text-slate-900 truncate max-w-[155px] border-r border-slate-200 leading-tight text-[8.5px]">
                            {isChap ? (
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate text-emerald-950 font-black">{chaperoneName}</span>
                                <span className="text-[6.5px] font-black text-emerald-800 uppercase px-1 py-0.2 bg-emerald-100 rounded-xs">
                                  GURU
                                </span>
                              </div>
                            ) : student ? (
                              student.name
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-[1px] px-0.5 text-center font-extrabold border-r border-slate-200 text-[8px] leading-tight">
                            {isChap ? '-' : student ? (student.gender === 'LAKI-LAKI' ? 'L' : 'P') : '-'}
                          </td>
                          <td className="py-[1px] px-1.5 text-slate-600 truncate max-w-[65px] font-bold leading-tight text-[8px]">
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

            {/* Seating Plan (Right 5 Cols) */}
            <div className="col-span-5 flex flex-col h-full">
              <div className="bg-slate-50/70 border-2 border-slate-900 rounded-[18px] p-2 flex flex-col justify-between h-full">
                {/* Windshield & Driver Area */}
                <div className="flex items-center justify-between pb-0.5 border-b border-slate-300 mb-1 shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-700 text-[9px] font-black">◄</span>
                    <span className="text-[7.5px] font-black text-slate-800 uppercase tracking-wider">
                      PINTU DEPAN
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[7.5px] font-black text-slate-600 uppercase tracking-wide">
                      KEMUDI
                    </span>
                    <span className="text-[10px]">☸️</span>
                    <span className="text-rose-700 text-[9px] font-black">►</span>
                  </div>
                </div>

                {/* Seating Grid (Evenly Distributed with Larger Height Boxes) */}
                <div className="flex flex-col justify-between flex-1 my-0.5 gap-y-0.5">
                  {rows.map((rowItem, rowIndex) => {
                    const l1 = rowItem.left[0];
                    const l2 = rowItem.left[1];
                    const r1 = rowItem.right[0];
                    const r2 = rowItem.right[1];

                    return (
                      <div key={rowIndex} className="flex items-center justify-between gap-1 flex-1 py-0.5">
                        <div className="flex-1 flex gap-1.5 h-full items-center">
                          {renderSeatBox(l1)}
                          {renderSeatBox(l2)}
                        </div>
                        <div className="w-2 text-center text-[7px] font-bold text-slate-300 select-none">
                          |
                        </div>
                        <div className="flex-1 flex gap-1.5 h-full items-center">
                          {renderSeatBox(r1)}
                          {renderSeatBox(r2)}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex gap-1 pt-1 border-t border-dashed border-slate-300 mt-0.5 flex-1 items-center py-0.5">
                    {backRow.map((seatNum) => renderSeatBox(seatNum))}
                  </div>
                </div>

                {/* Rear Area */}
                <div className="flex items-center justify-between mt-auto pt-1 border-t border-slate-300 shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-700 text-[9px] font-black">◄</span>
                    <span className="text-[7.5px] font-black text-slate-800 uppercase tracking-wider">
                      PINTU BELAKANG
                    </span>
                  </div>
                  <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                    TOILET / BELAKANG
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Signature Block */}
          <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-300 text-[8px] text-slate-500 font-bold shrink-0">
            <div>Sistem Informasi Darmawisata — {schoolMetadata.school.name}</div>
            <div>
              Ponorogo,{' '}
              {new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
