'use client';

import React, { useState } from 'react';
import { Student, Room } from '@/types';
import { Users, X, ArrowRightLeft, Trash2, CheckCircle2, BedDouble, AlertCircle } from 'lucide-react';

interface RoomSelectionHUDProps {
  selectedStudents: Student[];
  availableRooms: Room[];
  onClearSelection: () => void;
  onMoveToRoom: (roomNumber: number) => void;
  onUnassignSelected: () => void;
  roomCapacity: number;
}

export const RoomSelectionHUD: React.FC<RoomSelectionHUDProps> = ({
  selectedStudents,
  availableRooms,
  onClearSelection,
  onMoveToRoom,
  onUnassignSelected,
  roomCapacity,
}) => {
  const [targetRoomNum, setTargetRoomNum] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (selectedStudents.length === 0) return null;

  // Determine common gender or mixed
  const genders = Array.from(new Set(selectedStudents.map((s) => s.gender)));
  const isSingleGender = genders.length === 1;
  const commonGender = isSingleGender ? genders[0] : null;

  // Filter valid candidate rooms by gender and capacity
  const candidateRooms = availableRooms.filter((r) => {
    if (commonGender && r.gender !== commonGender) return false;
    return true;
  });

  const handleApplyMove = () => {
    if (!targetRoomNum) return;
    const num = Number(targetRoomNum);
    setErrorMsg(null);
    onMoveToRoom(num);
    setTargetRoomNum('');
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl bg-slate-900/95 backdrop-blur-md text-white rounded-3xl p-3.5 sm:p-4 shadow-2xl border border-slate-700/60 animate-in slide-in-from-bottom-5 duration-200">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Selected count & preview */}
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-xs">
            <span className="text-sm">{selectedStudents.length}</span>
          </div>
          <div className="min-w-0 flex-1 sm:flex-initial">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black truncate">
                {selectedStudents.length === 1
                  ? selectedStudents[0].name
                  : `${selectedStudents.length} Siswa Terpilih`}
              </h4>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-800 text-emerald-400 border border-slate-700">
                {isSingleGender ? (commonGender === 'LAKI-LAKI' ? '👨 Laki-Laki' : '👩 Perempuan') : '⚠️ Campuran'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              Tarik (Drag) ke kamar tujuan atau pilih opsi di bawah
            </p>
          </div>
        </div>

        {/* Right: Quick Batch Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Quick Room Dropdown */}
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <select
              value={targetRoomNum}
              onChange={(e) => setTargetRoomNum(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer min-w-[130px]"
            >
              <option value="">Pilih Kamar...</option>
              {candidateRooms.map((r) => (
                <option key={r.id} value={r.roomNumber}>
                  Kamar #{r.roomNumber} ({r.gender === 'LAKI-LAKI' ? 'L' : 'P'})
                </option>
              ))}
            </select>

            <button
              onClick={handleApplyMove}
              disabled={!targetRoomNum}
              className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shadow-xs"
            >
              Pindah
            </button>
          </div>

          {/* Unassign button */}
          <button
            onClick={onUnassignSelected}
            title="Keluarkan siswa terpilih dari kamar"
            className="p-2 text-rose-400 hover:text-white hover:bg-rose-500/30 rounded-xl transition-all border border-rose-500/30"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Clear selection */}
          <button
            onClick={onClearSelection}
            title="Batalkan pilihan"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-2 text-[11px] text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
