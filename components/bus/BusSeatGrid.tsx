'use client';

import React from 'react';
import { Student } from '@/types';
import { UserCheck, Sparkles, Check, CheckSquare, Square, ArrowRightLeft } from 'lucide-react';

interface BusSeatGridProps {
  busNumber: number;
  capacity: number;
  seatStudentMap: Map<number, Student>;
  getSeatChaperoneName: (seatNum: number) => string;
  onSeatClick: (seatNum: number) => void;
  // Drag & drop
  onDragStart?: (e: React.DragEvent, studentId: string) => void;
  onDropCross?: (e: React.DragEvent, seatNum: number, busNum: number) => void;
  dragOverSeatNum?: number | null;
  dragOverBusNum?: number | null;
  setDragOverSeatNum?: (seatNum: number | null) => void;
  setDragOverBusNum?: (busNum: number | null) => void;
  // Selection states
  activeSourceSeat?: number | null;
  activeSourceBus?: number | null;
  selectedUnassignedStudentId?: string | null;
  // Bulk mode
  isBulkMode?: boolean;
  selectedStudentIds?: string[];
  onToggleSelectStudent?: (studentId: string) => void;
}

export const BusSeatGrid: React.FC<BusSeatGridProps> = ({
  busNumber,
  capacity,
  seatStudentMap,
  getSeatChaperoneName,
  onSeatClick,
  onDragStart,
  onDropCross,
  dragOverSeatNum,
  dragOverBusNum,
  setDragOverSeatNum,
  setDragOverBusNum,
  activeSourceSeat,
  activeSourceBus,
  selectedUnassignedStudentId,
  isBulkMode = false,
  selectedStudentIds = [],
  onToggleSelectStudent,
}) => {
  const isSeatSource = (seatNum: number) =>
    activeSourceSeat === seatNum && (activeSourceBus === busNumber || activeSourceBus === null);

  const renderSeatBox = (seatNum: number) => {
    const student = seatStudentMap.get(seatNum);
    const chaperoneName = getSeatChaperoneName(seatNum);
    const isSource = isSeatSource(seatNum);
    const isDragTarget = dragOverSeatNum === seatNum && dragOverBusNum === busNumber;
    const isSelectedInBulk = student && selectedStudentIds.includes(student.id);

    // 1. Chaperone Reserved Seat
    if (chaperoneName) {
      return (
        <div
          key={seatNum}
          onClick={() => onSeatClick(seatNum)}
          className="relative flex-1 min-h-[62px] p-1.5 rounded-xl border-2 border-indigo-700 bg-indigo-950/90 text-white flex flex-col justify-between cursor-pointer transition-all shadow-xs hover:border-indigo-400 group"
          title={`Kursi #${seatNum}: Pendamping (${chaperoneName})`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-indigo-300 bg-indigo-900/90 px-1.5 py-0.5 rounded-md border border-indigo-700">
              #{seatNum.toString().padStart(2, '0')}
            </span>
            <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded-md border border-amber-800/80">
              Pendamping
            </span>
          </div>
          <div className="text-[10px] font-black text-white truncate group-hover:text-indigo-200 mt-1 leading-tight">
            {chaperoneName}
          </div>
          <div className="text-[8px] text-indigo-400 truncate">Petugas Resmi</div>
        </div>
      );
    }

    // 2. Seated Student
    if (student) {
      const isMale = student.gender === 'LAKI-LAKI';
      return (
        <div
          key={seatNum}
          draggable={!isBulkMode}
          onDragStart={(e) => onDragStart && onDragStart(e, student.id)}
          onDragOver={(e) => {
            e.preventDefault();
            if (setDragOverSeatNum) setDragOverSeatNum(seatNum);
            if (setDragOverBusNum) setDragOverBusNum(busNumber);
          }}
          onDragLeave={() => {
            if (setDragOverSeatNum) setDragOverSeatNum(null);
            if (setDragOverBusNum) setDragOverBusNum(null);
          }}
          onDrop={(e) => onDropCross && onDropCross(e, seatNum, busNumber)}
          onClick={(e) => {
            if (isBulkMode && onToggleSelectStudent) {
              e.stopPropagation();
              onToggleSelectStudent(student.id);
            } else {
              onSeatClick(seatNum);
            }
          }}
          className={`relative flex-1 min-h-[62px] p-1.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between shadow-2xs select-none ${
            isSource
              ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400 animate-pulse'
              : isDragTarget
              ? 'border-indigo-500 bg-indigo-100 scale-105'
              : isSelectedInBulk
              ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-400'
              : isMale
              ? 'border-sky-300 bg-sky-50/90 hover:border-sky-500 hover:bg-sky-100'
              : 'border-rose-300 bg-rose-50/90 hover:border-rose-500 hover:bg-rose-100'
          }`}
          title={`Kursi #${seatNum}: ${student.name} (${student.className || '-'})`}
        >
          {/* Top Label */}
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                isMale ? 'bg-sky-200/80 text-sky-950' : 'bg-rose-200/80 text-rose-950'
              }`}
            >
              #{seatNum.toString().padStart(2, '0')}
            </span>

            {isBulkMode ? (
              <span className="text-blue-600">
                {isSelectedInBulk ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              </span>
            ) : (
              <span
                className={`text-[8.5px] font-black px-1 py-0.5 rounded-sm ${
                  isMale ? 'bg-sky-600 text-white' : 'bg-rose-600 text-white'
                }`}
              >
                {isMale ? 'L' : 'P'}
              </span>
            )}
          </div>

          {/* Student Name */}
          <div
            className={`text-[10.5px] font-black truncate leading-tight mt-0.5 ${
              isMale ? 'text-sky-950' : 'text-rose-950'
            }`}
          >
            {student.name}
          </div>

          {/* Class Subtitle */}
          <div className="flex items-center justify-between text-[8.5px] font-bold text-slate-500 truncate">
            <span className="truncate">{student.className || '-'}</span>
            {isSource && <ArrowRightLeft className="w-2.5 h-2.5 text-amber-600 shrink-0" />}
          </div>
        </div>
      );
    }

    // 3. Empty Seat
    const isTargetForPlace = selectedUnassignedStudentId !== null || activeSourceSeat !== null;
    return (
      <div
        key={seatNum}
        onDragOver={(e) => {
          e.preventDefault();
          if (setDragOverSeatNum) setDragOverSeatNum(seatNum);
          if (setDragOverBusNum) setDragOverBusNum(busNumber);
        }}
        onDragLeave={() => {
          if (setDragOverSeatNum) setDragOverSeatNum(null);
          if (setDragOverBusNum) setDragOverBusNum(null);
        }}
        onDrop={(e) => onDropCross && onDropCross(e, seatNum, busNumber)}
        onClick={() => onSeatClick(seatNum)}
        className={`relative flex-1 min-h-[62px] p-1.5 rounded-xl border border-dashed transition-all cursor-pointer flex flex-col items-center justify-center select-none ${
          isDragTarget
            ? 'border-indigo-600 bg-indigo-100 scale-105'
            : isTargetForPlace
            ? 'border-emerald-500 bg-emerald-50/80 hover:bg-emerald-100 hover:scale-102 hover:border-solid hover:border-emerald-600 shadow-xs'
            : 'border-slate-300 bg-white/70 hover:border-indigo-400 hover:bg-slate-50'
        }`}
        title={`Kursi #${seatNum} Kosong (Klik untuk menempatkan)`}
      >
        <span className="text-xs font-black text-slate-400">#{seatNum.toString().padStart(2, '0')}</span>
        <span className="text-[9px] font-bold text-slate-400 mt-0.5">
          {isTargetForPlace ? 'Klik Isi' : 'Kosong'}
        </span>
      </div>
    );
  };

  // Build rows of 2-2 seats (Seats 1 to 44)
  const maxRegularRows = Math.min(11, Math.ceil(Math.min(capacity, 44) / 4));
  const rows = [];
  for (let i = 0; i < maxRegularRows; i++) {
    const start = i * 4 + 1;
    rows.push({
      rowNum: i + 1,
      l1: start,
      l2: start + 1,
      r1: start + 2,
      r2: start + 3,
    });
  }

  // Back row seats (45 up to capacity, max 50)
  const backRowSeats = [45, 46, 47, 48, 49, 50].filter((sn) => sn <= capacity);

  return (
    <div className="bg-slate-100/90 rounded-2xl border-2 border-slate-800 p-3 sm:p-4 space-y-2.5 max-w-lg mx-auto shadow-sm">
      {/* Front Area: Door and Driver */}
      <div className="flex items-center justify-between bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>◄ Pintu Depan</span>
        </div>
        <div className="flex items-center gap-1 text-rose-300">
          <span>Kemudi Supir ☸ ►</span>
        </div>
      </div>

      {/* Main 2-2 Grid */}
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.rowNum} className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Left Pair (2 Seats) */}
            <div className="flex-1 flex gap-1.5">
              {renderSeatBox(row.l1)}
              {renderSeatBox(row.l2)}
            </div>

            {/* Aisle Spacer */}
            <div className="w-4 sm:w-6 text-center text-[10px] font-black text-slate-300 select-none">
              |
            </div>

            {/* Right Pair (2 Seats) */}
            <div className="flex-1 flex gap-1.5">
              {renderSeatBox(row.r1)}
              {renderSeatBox(row.r2)}
            </div>
          </div>
        ))}
      </div>

      {/* Back Row Divider & Seats (45-50) */}
      {backRowSeats.length > 0 && (
        <div className="pt-2 border-t-2 border-dashed border-slate-300 space-y-1.5">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">
            Baris Belakang ({backRowSeats.length} Kursi)
          </div>
          <div className="flex gap-1.5">
            {backRowSeats.map((sn) => renderSeatBox(sn))}
          </div>
        </div>
      )}

      {/* Rear Area: Rear Door & Toilet */}
      <div className="flex items-center justify-between bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider">
        <div className="text-emerald-400">◄ Pintu Belakang</div>
        <div className="text-slate-400">Toilet / Bagasi ►</div>
      </div>
    </div>
  );
};
