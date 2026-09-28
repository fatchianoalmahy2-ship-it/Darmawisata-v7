'use client';

import React, { useState, useMemo } from 'react';
import { Student, Room, WaveType, GenderType, AppSettings, SchoolClass, Bus, Chaperone } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';
import { RoomAllocatorEngine } from '@/services/roomAllocator';
import { getWaveChaperones, WaveChaperoneItem, deriveAutoChaperoneRooms } from '@/lib/utils';
import { 
  BedDouble, Users, Sparkles, Filter, SlidersHorizontal, CheckCircle2, 
  Printer, Building2, UserPlus, ArrowRightLeft, Trash2, ShieldAlert,
  ChevronRight, RefreshCw, Check, Undo2, HelpCircle
} from 'lucide-react';
import { BatchRoomPrintModal } from './BatchRoomPrintModal';
import { ManualRoomModal } from './ManualRoomModal';
import { RoomSelectionHUD } from './RoomSelectionHUD';
import { VisualRoomingService } from '@/services/visualRoomingService';
import { CheckSquare, Square, Search, GripVertical, AlertTriangle } from 'lucide-react';

interface RoomGridProps {
  students: Student[];
  rooms: Room[];
  defaultRoomCapacity?: number;
  onAutoAllocateRooms: () => void;
  onOpenRoomConfig: () => void;
  settings?: AppSettings;
  classes: SchoolClass[];
  buses: Bus[];
  onUpdateStudentRoom: (studentId: string, targetRoomNumber: number | null, targetBedNumber: number | null) => Promise<void> | void;
  onSwapStudentRooms: (studentAId: string, studentBId: string) => Promise<void> | void;
  onSaveSettings: (settings: AppSettings) => Promise<void> | void;
}

export const RoomGrid: React.FC<RoomGridProps> = ({
  students,
  rooms,
  defaultRoomCapacity = 4,
  onAutoAllocateRooms,
  onOpenRoomConfig,
  settings,
  classes,
  buses,
  onUpdateStudentRoom,
  onSwapStudentRooms,
  onSaveSettings,
}) => {
  const [selectedWave, setSelectedWave] = useState<WaveType>('BALI_GEL_2');
  const [selectedGender, setSelectedGender] = useState<string>('ALL');
  const [selectedBus, setSelectedBus] = useState<string>('ALL');
  const [roomType, setRoomType] = useState<'STUDENT' | 'CHAPERONE'>('STUDENT');
  
  // Modal states
  const [isBatchRoomModalOpen, setIsBatchRoomModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualMode, setManualMode] = useState<'STUDENT_ACTION' | 'FILL_EMPTY_SLOT'>('STUDENT_ACTION');
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [targetRoom, setTargetRoom] = useState<Room | null>(null);

  // Derive rooms dynamically from students
  const effectiveCapacity = RoomAllocatorEngine.getSetting(
    settings,
    selectedWave,
    'defaultRoomCapacity',
    defaultRoomCapacity || 4
  );

  const derivedRooms = useMemo(() => {
    return RoomAllocatorEngine.deriveRoomsFromStudents(
      students.filter((s) => s.wave === selectedWave),
      effectiveCapacity,
      settings
    );
  }, [students, selectedWave, effectiveCapacity, settings]);

  // Collect available buses in this wave
  const waveBuses = useMemo(() => {
    const busSet = new Set<number>();
    students.forEach((s) => {
      if (s.isRegistered && s.wave === selectedWave && s.busNumber && s.busNumber > 0) {
        busSet.add(s.busNumber);
      }
    });
    return Array.from(busSet).sort((a, b) => a - b);
  }, [students, selectedWave]);

  const filteredRooms = derivedRooms.filter((r) => {
    if (selectedGender !== 'ALL' && r.gender !== selectedGender) return false;
    if (selectedBus !== 'ALL') {
      const busNum = Number(selectedBus);
      const roomStudents = students.filter(
        (s) => s.wave === selectedWave && s.roomNumber === r.roomNumber
      );
      if (!roomStudents.some((s) => s.busNumber === busNum)) return false;
    }
    return true;
  });

  // Visual Rooming Multi-Select & Drag-and-Drop state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [draggedStudentIds, setDraggedStudentIds] = useState<string[]>([]);
  const [dragOverRoomNumber, setDragOverRoomNumber] = useState<number | null>(null);
  const [isUnassignedTrayOpen, setIsUnassignedTrayOpen] = useState<boolean>(false);
  const [unassignedSearch, setUnassignedSearch] = useState<string>('');

  // Selected students objects
  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedStudentIds.includes(s.id));
  }, [students, selectedStudentIds]);

  // Unassigned students list for selected wave
  const unassignedStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.isRegistered &&
        s.wave === selectedWave &&
        !s.roomNumber &&
        (unassignedSearch
          ? s.name.toLowerCase().includes(unassignedSearch.toLowerCase()) ||
            s.className.toLowerCase().includes(unassignedSearch.toLowerCase()) ||
            (s.nis && s.nis.includes(unassignedSearch))
          : true)
    );
  }, [students, selectedWave, unassignedSearch]);

  // Multi-Select Handlers
  const handleToggleSelectStudent = (studentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    // If student is not in selected list, select it
    const activeDragIds = selectedStudentIds.includes(studentId)
      ? selectedStudentIds
      : [studentId];
    
    setDraggedStudentIds(activeDragIds);
    e.dataTransfer.setData('text/plain', JSON.stringify(activeDragIds));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedStudentIds([]);
    setDragOverRoomNumber(null);
  };

  const handleDragOverRoom = (e: React.DragEvent, roomNumber: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverRoomNumber !== roomNumber) {
      setDragOverRoomNumber(roomNumber);
    }
  };

  const handleDragLeaveRoom = (roomNumber: number) => {
    if (dragOverRoomNumber === roomNumber) {
      setDragOverRoomNumber(null);
    }
  };

  const handleDropOnRoom = async (e: React.DragEvent, targetRoom: Room) => {
    e.preventDefault();
    setDragOverRoomNumber(null);

    let idsToMove = draggedStudentIds;
    if (idsToMove.length === 0) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) idsToMove = JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse dropped data:', err);
      }
    }

    if (!idsToMove || idsToMove.length === 0) return;

    const movingStudents = students.filter((s) => idsToMove.includes(s.id));
    const roomOccupants = students.filter(
      (s) => s.wave === selectedWave && s.roomNumber === targetRoom.roomNumber && !idsToMove.includes(s.id)
    );

    const validation = VisualRoomingService.validateRoomAssignment(
      movingStudents,
      targetRoom,
      roomOccupants,
      effectiveCapacity
    );

    if (!validation.isValid) {
      alert(validation.message || 'Tidak dapat memindahkan siswa ke kamar ini.');
      return;
    }

    try {
      await VisualRoomingService.executeBatchRoomAssignment(
        idsToMove,
        targetRoom.roomNumber,
        onUpdateStudentRoom
      );
      setSelectedStudentIds([]);
    } catch (err) {
      console.error('Error dropping students to room:', err);
    }
  };

  const handleBatchMoveToRoom = async (targetRoomNumber: number) => {
    if (selectedStudentIds.length === 0) return;
    const targetRoom = derivedRooms.find((r) => r.roomNumber === targetRoomNumber);
    if (!targetRoom) return;

    const movingStudents = students.filter((s) => selectedStudentIds.includes(s.id));
    const roomOccupants = students.filter(
      (s) => s.wave === selectedWave && s.roomNumber === targetRoomNumber && !selectedStudentIds.includes(s.id)
    );

    const validation = VisualRoomingService.validateRoomAssignment(
      movingStudents,
      targetRoom,
      roomOccupants,
      effectiveCapacity
    );

    if (!validation.isValid) {
      alert(validation.message || 'Tidak dapat memindahkan siswa ke kamar ini.');
      return;
    }

    try {
      await VisualRoomingService.executeBatchRoomAssignment(
        selectedStudentIds,
        targetRoomNumber,
        onUpdateStudentRoom
      );
      setSelectedStudentIds([]);
    } catch (err) {
      console.error('Error batch moving students to room:', err);
    }
  };

  const handleBatchUnassign = async () => {
    if (selectedStudentIds.length === 0) return;
    if (
      !confirm(
        `Keluarkan ${selectedStudentIds.length} siswa terpilih dari kamar mereka?`
      )
    )
      return;

    try {
      await VisualRoomingService.executeBatchRoomAssignment(
        selectedStudentIds,
        null,
        onUpdateStudentRoom
      );
      setSelectedStudentIds([]);
    } catch (err) {
      console.error('Error batch unassigning students:', err);
    }
  };

  // ==========================================
  // CHAPERONE ROOM MANAGEMENT LOGIC
  // ==========================================

  const waveChaperones = useMemo(() => {
    return getWaveChaperones({
      settings,
      buses,
      classes,
      students,
      selectedWave,
    });
  }, [settings, buses, classes, students, selectedWave]);

  // Derived chaperone rooms with Bus-First Affinity
  const { rooms: derivedChaperoneRooms, effectiveCustomRooms } = useMemo(() => {
    return deriveAutoChaperoneRooms({
      waveChaperones,
      customRooms: settings?.customChaperoneRooms,
      capacity: 2,
    });
  }, [waveChaperones, settings?.customChaperoneRooms]);

  const filteredChaperoneRooms = useMemo(() => {
    return derivedChaperoneRooms.filter((r) => {
      if (selectedGender !== 'ALL' && r.gender !== selectedGender) return false;
      if (selectedBus !== 'ALL') {
        const busNum = Number(selectedBus);
        if (r.busNumber !== busNum && !r.chaperones.some((c) => c.busNumber === busNum)) return false;
      }
      return true;
    });
  }, [derivedChaperoneRooms, selectedGender, selectedBus]);

  const unassignedChaperones = useMemo(() => {
    const assignedIds = new Set<string>();
    derivedChaperoneRooms.forEach((r) => r.chaperones.forEach((c) => assignedIds.add(c.id)));
    return waveChaperones.filter((c) => !assignedIds.has(c.id));
  }, [waveChaperones, derivedChaperoneRooms]);

  const handleAutoAllocateChaperoneRooms = () => {
    const customRooms = { ...(settings?.customChaperoneRooms || {}) };
    
    // Clean old assignments for this wave's chaperones
    waveChaperones.forEach((c) => {
      delete customRooms[c.id];
      delete customRooms[c.name];
    });

    const res = deriveAutoChaperoneRooms({
      waveChaperones,
      customRooms: {},
      capacity: 2,
    });

    onSaveSettings({
      ...settings!,
      customChaperoneRooms: {
        ...customRooms,
        ...res.effectiveCustomRooms,
      },
    });
  };

  const handleClearChaperoneRooms = () => {
    if (!confirm('Kosongkan seluruh pembagian kamar pendamping untuk gelombang ini?')) return;
    const customRooms = { ...(settings?.customChaperoneRooms || {}) };
    waveChaperones.forEach((c) => {
      delete customRooms[c.id];
      delete customRooms[c.name];
    });

    onSaveSettings({
      ...settings!,
      customChaperoneRooms: customRooms,
    });
  };

  const handleUnassignChaperone = (chaperoneId: string) => {
    const customRooms = { ...(settings?.customChaperoneRooms || {}) };
    delete customRooms[chaperoneId];
    const found = waveChaperones.find((c) => c.id === chaperoneId);
    if (found) delete customRooms[found.name];
    onSaveSettings({
      ...settings!,
      customChaperoneRooms: customRooms,
    });
  };

  const handleAssignChaperoneToRoom = (chaperoneId: string, roomNumber: number) => {
    const customRooms = { ...(settings?.customChaperoneRooms || {}) };
    customRooms[chaperoneId] = roomNumber;
    onSaveSettings({
      ...settings!,
      customChaperoneRooms: customRooms,
    });
  };

  const handleToggleChaperoneGender = (chaperoneId: string) => {
    const masterChaperones = settings?.masterChaperones || [];
    const isMaster = masterChaperones.some((c) => c.id === chaperoneId);

    if (isMaster) {
      const updated = masterChaperones.map((c) => {
        if (c.id === chaperoneId) {
          return {
            ...c,
            gender: (c.gender === 'PEREMPUAN' ? 'LAKI-LAKI' : 'PEREMPUAN') as GenderType,
          };
        }
        return c;
      });
      onSaveSettings({
        ...settings!,
        masterChaperones: updated,
      });
    } else {
      // Auto Wali Kelas gender update: store in notes or master data as a new master chaperone
      const updatedList = [...masterChaperones];
      const found = waveChaperones.find((c) => c.id === chaperoneId);
      if (found) {
        const newGender = found.gender === 'PEREMPUAN' ? 'LAKI-LAKI' : 'PEREMPUAN';
        updatedList.push({
          id: found.id,
          name: found.name,
          role: found.role as any,
          department: found.department,
          gender: newGender as GenderType,
          notes: 'Auto-saved gender override',
        });
        onSaveSettings({
          ...settings!,
          masterChaperones: updatedList,
        });
      }
    }
  };

  const handleCreateNewChaperoneRoom = () => {
    const usedNumbers = derivedChaperoneRooms.map((r) => r.roomNumber);
    let nextNum = 101;
    while (usedNumbers.includes(nextNum)) {
      nextNum++;
    }
    // To provision, we can temporarily assign an unassigned chaperone to this new room number
    if (unassignedChaperones.length > 0) {
      handleAssignChaperoneToRoom(unassignedChaperones[0].id, nextNum);
    } else {
      alert('Tidak ada pendamping yang tersedia untuk membuat kamar baru. Silakan tambahkan pendamping terlebih dahulu.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Control Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 mb-1">
            <BedDouble className="w-3.5 h-3.5" /> Pembagian Kamar Hotel Otomatis &amp; Manual
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Kamar Hotel {roomType === 'STUDENT' ? `Siswa` : `Pendamping`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {roomType === 'STUDENT' 
              ? `Kamar terkelompok otomatis per Armada Bus &amp; Jenis Kelamin untuk memudahkan pengawasan Guru Pendamping.`
              : `Kelola akomodasi kamar hotel bagi Wali Kelas, Kakomli, dan Panitia per gelombang keberangkatan.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full md:w-auto">
          {roomType === 'STUDENT' ? (
            <>
              <button
                onClick={onAutoAllocateRooms}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                title="Sinkronkan alokasi kamar siswa dan pendamping 100% mengikuti denah bus saat ini"
              >
                <RefreshCw className="w-4 h-4" />
                Sinkronkan dengan Denah Bus
              </button>

              <button
                onClick={onOpenRoomConfig}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Atur Kapasitas Kamar
              </button>

              <button
                type="button"
                onClick={() => setIsBatchRoomModalOpen(true)}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Cetak Rooming List &amp; Absensi per Bus (1 Lembar A4 per Bus)"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                Cetak Kamar per Bus (A4)
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleAutoAllocateChaperoneRooms}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Alokasi Kamar Pendamping
              </button>

              <button
                onClick={handleCreateNewChaperoneRoom}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Buat Kamar Baru
              </button>

              <button
                type="button"
                onClick={() => setIsBatchRoomModalOpen(true)}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Cetak Rooming List Kamar Pendamping (A4)"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-400" />
                Cetak Kamar Pendamping (A4)
              </button>

              <button
                onClick={handleClearChaperoneRooms}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-rose-200 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Kosongkan Kamar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Primary Category Selector Tab (Student Rooms vs Chaperone Rooms) */}
      <div className="flex border-b border-slate-200 gap-1 no-print">
        <button
          onClick={() => setRoomType('STUDENT')}
          className={`px-5 py-3 text-xs font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            roomType === 'STUDENT'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Kamar Hotel Siswa
        </button>
        <button
          onClick={() => setRoomType('CHAPERONE')}
          className={`px-5 py-3 text-xs font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            roomType === 'CHAPERONE'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Kamar Pendamping / Guru per Gelombang
        </button>
      </div>

      {/* Filter Bar & Unassigned Warning */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Gelombang:</span>
            <select
              value={selectedWave || ''}
              onChange={(e) => setSelectedWave(e.target.value as WaveType)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 font-bold text-xs rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-fuchsia-500"
            >
              {schoolMetadata.waves.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Pilih Bus:</span>
            <select
              value={selectedBus}
              onChange={(e) => setSelectedBus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 font-bold text-xs rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-fuchsia-500"
            >
              <option value="ALL">Semua Bus</option>
              {waveBuses.map((b) => (
                <option key={b} value={String(b)}>
                  Bus {b}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Gender:</span>
            <select
              value={selectedGender || 'ALL'}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 font-bold text-xs rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-fuchsia-500"
            >
              <option value="ALL">Semua Gender</option>
              <option value="LAKI-LAKI">Laki-Laki</option>
              <option value="PEREMPUAN">Perempuan</option>
            </select>
          </div>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-3 text-xs">
          {roomType === 'STUDENT' ? (
            <>
              <span className="bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200">
                Total {derivedRooms.length} Kamar Terbentuk
              </span>
              {unassignedStudents.length > 0 && (
                <span className="bg-amber-50 text-amber-800 font-bold px-3 py-1 rounded-full border border-amber-200 animate-pulse">
                  ⚠️ {unassignedStudents.length} Siswa Belum Dapat Kamar
                </span>
              )}
            </>
          ) : (
            <>
              <span className="bg-indigo-50 text-indigo-800 font-bold px-3 py-1 rounded-full border border-indigo-200">
                Total {derivedChaperoneRooms.length} Kamar Aktif
              </span>
              {unassignedChaperones.length > 0 && (
                <span className="bg-amber-50 text-amber-800 font-bold px-3 py-1 rounded-full border border-amber-200">
                  ⚠️ {unassignedChaperones.length} Pendamping Belum Dapat Kamar
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ==========================================
          VIEW 1: STUDENT ROOMS GRID
          ========================================== */}
      {roomType === 'STUDENT' && (
        <div className="space-y-4">
          {/* Unassigned Students Tray / Accordion (Collapsible & Draggable) */}
          {unassignedStudents.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 shadow-xs transition-all no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    {unassignedStudents.length}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                      Siswa Belum Dapat Kamar ({unassignedStudents.length})
                    </h3>
                    <p className="text-[11px] text-amber-700 font-medium">
                      Pilih siswa lalu tarik (Drag) ke kartu kamar hotel atau gunakan tombol batch di bawah.
                    </p>
                  </div>
                </div>

                {/* Quick Search & Select All in Tray */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-amber-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari siswa/kelas..."
                      value={unassignedSearch}
                      onChange={(e) => setUnassignedSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50 w-36 sm:w-48"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const allIds = unassignedStudents.map((s) => s.id);
                      const isAllSelected = allIds.every((id) => selectedStudentIds.includes(id));
                      if (isAllSelected) {
                        setSelectedStudentIds((prev) => prev.filter((id) => !allIds.includes(id)));
                      } else {
                        setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...allIds])));
                      }
                    }}
                    className="px-2.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    {unassignedStudents.every((s) => selectedStudentIds.includes(s.id))
                      ? 'Batalkan Pilih Semua'
                      : 'Pilih Semua'}
                  </button>
                </div>
              </div>

              {/* Unassigned Students Chips Grid (Draggable & Selectable) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-3 max-h-48 overflow-y-auto">
                {unassignedStudents.map((st) => {
                  const isSelected = selectedStudentIds.includes(st.id);
                  const isMale = st.gender === 'LAKI-LAKI';

                  return (
                    <div
                      key={st.id}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, st.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => handleToggleSelectStudent(st.id, e)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-1.5 select-none ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-900/20'
                          : 'bg-white hover:bg-amber-100/50 border-amber-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <GripVertical className={`w-3 h-3 shrink-0 ${isSelected ? 'text-slate-400' : 'text-amber-400'}`} />
                        <div className="min-w-0 truncate">
                          <p className="truncate leading-tight">{st.name}</p>
                          <span className={`text-[10px] font-medium block truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {st.className} • {isMale ? 'L' : 'P'}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer w-3.5 h-3.5 shrink-0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Room Cards Grid */}
          <div id="printable-room" className="printable-area grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRooms.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
                <BedDouble className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-700">Belum Ada Kamar Terbentuk</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Klik tombol &quot;Alokasi Kamar Siswa&quot; di atas untuk membagikan siswa ke dalam kamar hotel yang selaras dengan armada bus.
                </p>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const roomStudents = students.filter(
                  (s) => s.wave === selectedWave && s.roomNumber === room.roomNumber
                );
                const isMale = room.gender === 'LAKI-LAKI';
                const isDragTarget = dragOverRoomNumber === room.roomNumber;
                const isFull = roomStudents.length >= effectiveCapacity;
                const distinctBuses = Array.from(
                  new Set(roomStudents.map((s) => s.busNumber).filter((b): b is number => !!b && b > 0))
                ).sort((a, b) => a - b);

                return (
                  <div
                    key={room.id}
                    onDragOver={(e) => handleDragOverRoom(e, room.roomNumber)}
                    onDragLeave={() => handleDragLeaveRoom(room.roomNumber)}
                    onDrop={(e) => handleDropOnRoom(e, room)}
                    className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between space-y-3 relative ${
                      isDragTarget
                        ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-50/20 scale-[1.01]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Room Card Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                          K{room.roomNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-sm text-slate-900">
                              KAMAR #{room.roomNumber}
                            </h4>
                            {distinctBuses.length > 0 && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 font-extrabold rounded text-[9px] border border-amber-300">
                                {distinctBuses.length === 1 ? `Bus ${distinctBuses[0]}` : `Bus ${distinctBuses.join(', ')}`}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">{room.wave}</p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isMale
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isMale ? '👨 Laki-Laki' : '👩 Perempuan'}
                      </span>
                    </div>

                    {/* Student Occupants List */}
                    <div className="space-y-1.5 flex-1">
                      {roomStudents.map((st, idx) => {
                        const isSelected = selectedStudentIds.includes(st.id);

                        return (
                          <div
                            key={st.id}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, st.id)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => handleToggleSelectStudent(st.id, e)}
                            className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-grab active:cursor-grabbing group transition-all select-none border ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-slate-50 hover:bg-indigo-50/50 border-slate-100 hover:border-indigo-200 text-slate-900'
                            }`}
                            title="Tarik (drag) untuk memindahkan kamar atau klik untuk memilih"
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <GripVertical className={`w-3 h-3 shrink-0 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`} />
                              <div className="truncate">
                                <p className={`font-extrabold truncate ${isSelected ? 'text-white' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                                  {st.name}
                                </p>
                                <p className={`text-[10px] font-medium ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                  {st.className} • NIS: {st.nis}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                              />
                            </div>
                          </div>
                        );
                      })}

                      {/* Empty Bed Slots (Drop Targets) */}
                      {Array.from({ length: Math.max(0, effectiveCapacity - roomStudents.length) }).map(
                        (_, idx) => {
                          const bedNumberLabel = roomStudents.length + idx + 1;
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setActiveStudent(null);
                                setTargetRoom(room);
                                setManualMode('FILL_EMPTY_SLOT');
                                setIsManualModalOpen(true);
                              }}
                              className={`p-2 border border-dashed rounded-xl text-[10px] text-center font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                                isDragTarget
                                  ? 'border-emerald-400 bg-emerald-100/40 text-emerald-800 font-black'
                                  : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 text-slate-400'
                              }`}
                              title="Klik untuk memasukkan siswa atau lepas (drop) siswa ke slot ini"
                            >
                              <UserPlus className="w-3 h-3" />
                              Kasur #{bedNumberLabel} (Kosong)
                            </div>
                          );
                        }
                      )}
                    </div>

                    {/* Footer Count */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>Kapasitas: {roomStudents.length}/{effectiveCapacity} Bed</span>
                      {roomStudents.length === 1 && (
                        <span className="text-amber-600 font-extrabold animate-pulse">
                          ⚠️ Sendirian
                        </span>
                      )}
                      {roomStudents.length > 1 && (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terisi
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Floating Action HUD when students are selected */}
          <RoomSelectionHUD
            selectedStudents={selectedStudents}
            availableRooms={filteredRooms}
            onClearSelection={handleClearSelection}
            onMoveToRoom={handleBatchMoveToRoom}
            onUnassignSelected={handleBatchUnassign}
            roomCapacity={effectiveCapacity}
          />
        </div>
      )}

      {/* ==========================================
          VIEW 2: CHAPERONE ROOMS GRID
          ========================================== */}
      {roomType === 'CHAPERONE' && (
        <div className="space-y-6">
          {/* Unassigned Chaperones Box (Drag/Drop or Click-to-Assign source) */}
          {unassignedChaperones.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-2xs space-y-3 no-print">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-700" />
                <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                  Daftar Pendamping Belum Dapat Kamar ({unassignedChaperones.length})
                </h3>
              </div>
              <p className="text-[11px] text-amber-700">
                Berikut adalah bapak/ibu pendamping, wali kelas, atau panitia yang belum mendapatkan penempatan kamar hotel. Klik tombol kamar tujuan atau gunakan alokasi otomatis.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1.5">
                {unassignedChaperones.map((chap) => (
                  <div
                    key={chap.id}
                    className="p-2.5 bg-white border border-amber-300 rounded-xl flex items-center gap-3 shadow-3xs hover:border-amber-500 transition-all text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-extrabold text-slate-900">{chap.name}</p>
                        <button
                          onClick={() => handleToggleChaperoneGender(chap.id)}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-extrabold"
                          title="Klik untuk mengubah jenis kelamin pendamping ini"
                        >
                          {chap.gender === 'PEREMPUAN' ? '👩 P' : '👨 L'}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-500 font-bold">
                          {chap.role} {chap.department ? `• ${chap.department}` : ''}
                        </span>
                        {chap.busNumber && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-extrabold border border-amber-300">
                            🚌 Bus {chap.busNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Assign Dropdown */}
                    <select
                      onChange={(e) => {
                        const targetVal = e.target.value;
                        if (targetVal) {
                          handleAssignChaperoneToRoom(chap.id, Number(targetVal));
                        }
                      }}
                      className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-[10px] font-black cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>+ Kamar</option>
                      {Array.from({ length: 20 }).map((_, idx) => {
                        const roomNum = 101 + idx;
                        return (
                          <option key={roomNum} value={roomNum}>
                            Kamar #{roomNum}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chaperone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredChaperoneRooms.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
                <Building2 className="w-10 h-10 text-indigo-300 mx-auto" />
                <h4 className="font-bold text-slate-700">Belum Ada Kamar Pendamping</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {selectedBus !== 'ALL' || selectedGender !== 'ALL'
                    ? 'Tidak ada kamar pendamping yang sesuai dengan filter yang dipilih.'
                    : 'Klik tombol "Alokasi Kamar Pendamping" atau "Sinkronkan dengan Denah Bus" untuk mengelompokkan pendamping secara otomatis per bus & jenis kelamin.'}
                </p>
              </div>
            ) : (
              filteredChaperoneRooms.map((room) => {
                const isMale = room.gender === 'LAKI-LAKI';
                const cap = 2; // Default chaperone room capacity is 2

                return (
                  <div
                    key={room.roomNumber}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-indigo-500 transition-all"
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-900 text-white font-black text-xs flex items-center justify-center">
                          P{room.roomNumber}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">
                            KAMAR #{room.roomNumber}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                            {room.busNumber ? (
                              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-1.5 py-0.5 rounded">
                                Bus {room.busNumber}
                              </span>
                            ) : null}
                            <span>Kamar Pendamping</span>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          isMale
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isMale ? '👨 Laki-Laki' : '👩 Perempuan'}
                      </span>
                    </div>

                    {/* Room Occupants */}
                    <div className="space-y-1.5 flex-1">
                      {room.chaperones.map((chap, idx) => (
                        <div
                          key={chap.id}
                          className="p-2.5 bg-indigo-50/40 border border-indigo-100 rounded-xl text-xs flex items-center justify-between"
                        >
                          <div>
                            <p className="font-black text-slate-900">{chap.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold">
                              {chap.role} {chap.department ? `• ${chap.department}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => handleUnassignChaperone(chap.id)}
                            className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-400 transition-colors"
                            title="Keluarkan dari kamar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Empty slots */}
                      {Array.from({ length: Math.max(0, cap - room.chaperones.length) }).map(
                        (_, idx) => (
                          <div
                            key={idx}
                            className="relative group border border-dashed border-slate-200 rounded-xl p-2 flex items-center justify-center text-center text-[10px] text-slate-400 font-bold bg-slate-50/20"
                          >
                            <span className="group-hover:hidden">Bed Slot Guru #{room.chaperones.length + idx + 1}</span>
                            
                            {/* Assign from unassigned list */}
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  handleAssignChaperoneToRoom(val, room.roomNumber);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              defaultValue=""
                            >
                              <option value="" disabled>Pilih Pendamping...</option>
                              {unassignedChaperones
                                .filter((uc) => uc.gender === room.gender)
                                .map((uc) => (
                                  <option key={uc.id} value={uc.id}>
                                    {uc.name} ({uc.role})
                                  </option>
                                ))}
                            </select>
                            <span className="hidden group-hover:flex items-center gap-1 text-indigo-600 cursor-pointer">
                              <UserPlus className="w-3.5 h-3.5" /> + Isi Bed Guru
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>Kapasitas: {room.chaperones.length}/{cap} Bed</span>
                      <span className="text-indigo-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Terisi
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Manual Room Modal (Students only) */}
      <ManualRoomModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setActiveStudent(null);
          setTargetRoom(null);
        }}
        mode={manualMode}
        activeStudent={activeStudent}
        targetRoom={targetRoom}
        students={students}
        rooms={rooms}
        selectedWave={selectedWave}
        defaultRoomCapacity={effectiveCapacity}
        onUpdateStudentRoom={onUpdateStudentRoom}
        onSwapStudentRooms={onSwapStudentRooms}
      />

      {/* Batch Room Print Modal */}
      <BatchRoomPrintModal
        isOpen={isBatchRoomModalOpen}
        onClose={() => setIsBatchRoomModalOpen(false)}
        students={students}
        rooms={rooms}
        defaultRoomCapacity={defaultRoomCapacity}
        settings={settings}
        classes={classes}
        buses={buses}
        initialWave={selectedWave}
        initialRoomType={roomType}
      />
    </div>
  );
};
