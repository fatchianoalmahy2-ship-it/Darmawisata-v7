'use client';

import React, { useState, useMemo } from 'react';
import { Student, Room, WaveType, GenderType } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { ArrowRightLeft, MoveRight, UserMinus, UserPlus, Search, BedDouble, AlertCircle, Check } from 'lucide-react';

interface ManualRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'STUDENT_ACTION' | 'FILL_EMPTY_SLOT';
  activeStudent?: Student | null;
  targetRoom?: Room | null;
  students: Student[];
  rooms: Room[];
  selectedWave: WaveType;
  defaultRoomCapacity: number;
  onUpdateStudentRoom: (studentId: string, targetRoomNumber: number | null, targetBedNumber: number | null) => Promise<void> | void;
  onSwapStudentRooms: (studentAId: string, studentBId: string) => Promise<void> | void;
}

export const ManualRoomModal: React.FC<ManualRoomModalProps> = ({
  isOpen,
  onClose,
  mode,
  activeStudent,
  targetRoom,
  students,
  rooms,
  selectedWave,
  defaultRoomCapacity,
  onUpdateStudentRoom,
  onSwapStudentRooms,
}) => {
  const [subAction, setSubAction] = useState<'CHOOSE_ACTION' | 'MOVE_ROOM' | 'SWAP_STUDENT'>('CHOOSE_ACTION');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTargetRoomNumber, setSelectedTargetRoomNumber] = useState<number | null>(null);
  const [selectedSwapStudentId, setSelectedSwapStudentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when opening
  React.useEffect(() => {
    if (isOpen) {
      setSubAction(mode === 'FILL_EMPTY_SLOT' ? 'MOVE_ROOM' : 'CHOOSE_ACTION');
      setSearchQuery('');
      setSelectedTargetRoomNumber(targetRoom?.roomNumber || null);
      setSelectedSwapStudentId(null);
      setIsProcessing(false);
    }
  }, [isOpen, mode, targetRoom]);

  // Determine current student gender constraint
  const targetGender: GenderType = (activeStudent?.gender || targetRoom?.gender || 'LAKI-LAKI') as GenderType;

  // Filter students in the same wave & gender
  const waveGenderStudents = useMemo(() => {
    return students.filter(
      (s) => s.isRegistered && s.wave === selectedWave && s.gender === targetGender && s.destination !== 'MAGANG'
    );
  }, [students, selectedWave, targetGender]);

  // Derive rooms with current occupancy
  const roomsWithOccupancy = useMemo(() => {
    const roomOccMap = new Map<number, { room: Room; occupants: Student[] }>();
    rooms.forEach((r) => {
      if (r.wave === selectedWave && r.gender === targetGender) {
        roomOccMap.set(r.roomNumber, { room: r, occupants: [] });
      }
    });

    waveGenderStudents.forEach((s) => {
      if (s.roomNumber) {
        if (!roomOccMap.has(s.roomNumber)) {
          roomOccMap.set(s.roomNumber, {
            room: {
              id: `room-${selectedWave}-${s.roomNumber}`,
              roomNumber: s.roomNumber,
              gender: targetGender,
              capacity: defaultRoomCapacity,
              wave: selectedWave,
              assignedStudentIds: [],
            },
            occupants: [],
          });
        }
        roomOccMap.get(s.roomNumber)!.occupants.push(s);
      }
    });

    return Array.from(roomOccMap.values()).sort((a, b) => a.room.roomNumber - b.room.roomNumber);
  }, [rooms, waveGenderStudents, selectedWave, targetGender, defaultRoomCapacity]);

  // Rooms that have at least 1 empty bed slot
  const roomsWithAvailableSlots = useMemo(() => {
    return roomsWithOccupancy.filter((item) => {
      if (activeStudent && item.room.roomNumber === activeStudent.roomNumber) return false;
      return item.occupants.length < defaultRoomCapacity;
    });
  }, [roomsWithOccupancy, activeStudent, defaultRoomCapacity]);

  // Candidates for swap (students in different rooms of same gender and wave)
  const swapCandidateStudents = useMemo(() => {
    if (!activeStudent) return [];
    return waveGenderStudents
      .filter((s) => s.id !== activeStudent.id && s.roomNumber && s.roomNumber !== activeStudent.roomNumber)
      .filter((s) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q) ||
          (s.nis && s.nis.toLowerCase().includes(q))
        );
      });
  }, [waveGenderStudents, activeStudent, searchQuery]);

  // Candidate students for filling empty bed slot
  const fillSlotCandidates = useMemo(() => {
    if (!targetRoom) return [];
    return waveGenderStudents
      .filter((s) => s.roomNumber !== targetRoom.roomNumber)
      .filter((s) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q) ||
          (s.nis && s.nis.toLowerCase().includes(q))
        );
      });
  }, [waveGenderStudents, targetRoom, searchQuery]);

  const handleExecuteMove = async (targetRoomNum: number) => {
    const studentToMove = activeStudent || (selectedSwapStudentId ? students.find((s) => s.id === selectedSwapStudentId) : null);
    if (!studentToMove) return;

    setIsProcessing(true);
    try {
      const targetOcc = roomsWithOccupancy.find((r) => r.room.roomNumber === targetRoomNum)?.occupants.length || 0;
      await onUpdateStudentRoom(studentToMove.id, targetRoomNum, targetOcc + 1);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteSwap = async () => {
    if (!activeStudent || !selectedSwapStudentId) return;
    setIsProcessing(true);
    try {
      await onSwapStudentRooms(activeStudent.id, selectedSwapStudentId);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteUnassign = async () => {
    if (!activeStudent) return;
    setIsProcessing(true);
    try {
      await onUpdateStudentRoom(activeStudent.id, null, null);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === 'FILL_EMPTY_SLOT'
          ? `Tambah Penghuni: Kamar #${targetRoom?.roomNumber}`
          : `Atur Kamar: ${activeStudent?.name || 'Siswa'}`
      }
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Info Header Banner */}
        {activeStudent && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <p className="font-extrabold text-slate-900">{activeStudent.name}</p>
              <p className="text-[11px] text-slate-500">
                {activeStudent.className} • NIS: {activeStudent.nis} • {activeStudent.gender}
              </p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg font-black text-xs">
                {activeStudent.roomNumber ? `Kamar #${activeStudent.roomNumber}` : 'Belum Ada Kamar'}
              </span>
            </div>
          </div>
        )}

        {targetRoom && mode === 'FILL_EMPTY_SLOT' && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <p className="font-extrabold text-emerald-900">Kamar #{targetRoom.roomNumber}</p>
              <p className="text-[11px] text-emerald-700">
                {targetRoom.gender} • Gelombang {targetRoom.wave}
              </p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-black text-xs">
              Tersedia Slot Bed
            </span>
          </div>
        )}

        {/* 1. STUDENT ACTION MENU */}
        {mode === 'STUDENT_ACTION' && subAction === 'CHOOSE_ACTION' && (
          <div className="space-y-2.5 pt-1">
            <button
              onClick={() => setSubAction('MOVE_ROOM')}
              className="w-full p-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl flex items-center justify-between group transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <MoveRight className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Pindah ke Kamar Lain
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pindahkan siswa ke kamar hotel lain yang masih memiliki slot kosong.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSubAction('SWAP_STUDENT')}
              className="w-full p-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl flex items-center justify-between group transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-amber-600 transition-colors">
                    Tukar Kamar dengan Siswa Lain (Swap)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Tukar posisi kamar langsung dengan siswa lain yang berjenis kelamin sama.
                  </p>
                </div>
              </div>
            </button>

            {activeStudent?.roomNumber && (
              <button
                onClick={handleExecuteUnassign}
                disabled={isProcessing}
                className="w-full p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl flex items-center justify-center gap-2 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <UserMinus className="w-4 h-4" />
                Keluarkan dari Kamar #{activeStudent.roomNumber}
              </button>
            )}
          </div>
        )}

        {/* 2. MOVE TO ANOTHER ROOM LIST */}
        {subAction === 'MOVE_ROOM' && mode === 'STUDENT_ACTION' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Pilih Kamar Tujuan (Slot Tersedia):</span>
              <button
                onClick={() => setSubAction('CHOOSE_ACTION')}
                className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                ← Kembali
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {roomsWithAvailableSlots.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-600">Tidak ada kamar lain dengan slot kosong.</p>
                  <p className="text-[10px] text-slate-400">Gunakan opsi &quot;Tukar Kamar (Swap)&quot; untuk menukar posisi dengan siswa lain.</p>
                </div>
              ) : (
                roomsWithAvailableSlots.map((item) => (
                  <button
                    key={item.room.id}
                    onClick={() => handleExecuteMove(item.room.roomNumber)}
                    disabled={isProcessing}
                    className="w-full p-3 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-black text-[10px] flex items-center justify-center">
                          K{item.room.roomNumber}
                        </span>
                        <span className="font-extrabold text-xs text-slate-900 group-hover:text-indigo-600">
                          KAMAR #{item.room.roomNumber}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Penghuni saat ini ({item.occupants.length}/{defaultRoomCapacity}):{' '}
                        {item.occupants.map((o) => o.name.split(' ')[0]).join(', ') || 'Belum ada'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-lg border border-emerald-200">
                      Tersisa {defaultRoomCapacity - item.occupants.length} Slot
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. SWAP WITH ANOTHER STUDENT */}
        {subAction === 'SWAP_STUDENT' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Pilih Siswa untuk Ditukar:</span>
              <button
                onClick={() => setSubAction('CHOOSE_ACTION')}
                className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                ← Kembali
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama atau kelas siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {swapCandidateStudents.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-600">Tidak ada siswa yang cocok.</p>
                </div>
              ) : (
                swapCandidateStudents.map((st) => {
                  const isSelected = selectedSwapStudentId === st.id;
                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedSwapStudentId(st.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-50 border-amber-400 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="font-extrabold text-xs text-slate-900">{st.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {st.className} • NIS: {st.nis} • Kamar #{st.roomNumber}
                        </p>
                      </div>
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded">
                          Kamar #{st.roomNumber}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {selectedSwapStudentId && (
              <button
                onClick={handleExecuteSwap}
                disabled={isProcessing}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Konfirmasi Tukar Kamar
              </button>
            )}
          </div>
        )}

        {/* 4. FILL EMPTY SLOT IN TARGET ROOM */}
        {mode === 'FILL_EMPTY_SLOT' && targetRoom && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700">Pilih Siswa untuk Dimasukkan:</span>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama atau kelas siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {fillSlotCandidates.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-600">Tidak ada siswa yang cocok.</p>
                </div>
              ) : (
                fillSlotCandidates.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setSelectedSwapStudentId(st.id);
                      handleExecuteMove(targetRoom.roomNumber);
                    }}
                    disabled={isProcessing}
                    className="w-full p-2.5 bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group"
                  >
                    <div>
                      <p className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-700">{st.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {st.className} • NIS: {st.nis}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded group-hover:bg-emerald-100 group-hover:text-emerald-800">
                      {st.roomNumber ? `Kamar #${st.roomNumber}` : 'Belum Ada Kamar'} → Masuk
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
