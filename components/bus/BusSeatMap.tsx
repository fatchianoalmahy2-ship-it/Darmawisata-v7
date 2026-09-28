'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Student, Bus, WaveType, AppSettings, SchoolClass } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';
import { getAllDerivedChaperones, calculateRequiredBusesForWave } from '@/lib/utils';
import { BusIcon, RefreshCw, Layers, SlidersHorizontal, Printer, FileDown } from 'lucide-react';

// Modular Sub-components & Helpers
import { SeatAllocatorEngine } from '@/services/seatAllocator';
import { calculateWaveMetrics, calculateBusMetrics, resolveSeatChaperoneName } from './busUtils';
import { exportBusSeatingToExcel } from './busExportHelper';
import { printSingleBusPlan } from './busPrintHelper';
import { BusHeaderToolbar } from './BusHeaderToolbar';
import { BusQuickSettingsModal } from './BusQuickSettingsModal';
import { BusUnassignedDrawer } from './BusUnassignedDrawer';
import { BusPrintLayout } from './BusPrintLayout';
import { BusSeatGrid } from './BusSeatGrid';
import { BusSeatManageModal } from './BusSeatManageModal';
import { BusMassMoveModal } from './BusMassMoveModal';
import { BatchBusPrintModal } from './BatchBusPrintModal';

interface BusSeatMapProps {
  students: Student[];
  buses: Bus[];
  classes?: SchoolClass[];
  defaultBusCapacity?: number;
  onUpdateStudentSeat: (studentId: string, busNumber: number, seatNumber: number) => void;
  onBatchUpdateStudentSeats?: (updates: { studentId: string; busNumber: number; seatNumber: number }[], customMessage?: string) => Promise<void> | void;
  onOpenBusConfig: () => void;
  settings?: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
  onAutoAllocateBuses?: () => void;
}

export const BusSeatMap: React.FC<BusSeatMapProps> = ({
  students,
  buses,
  classes = [],
  defaultBusCapacity = 50,
  onUpdateStudentSeat,
  onBatchUpdateStudentSeats,
  onOpenBusConfig,
  settings,
  onUpdateSettings,
  onAutoAllocateBuses,
}) => {
  // 1. Exclude students marked as MAGANG or not registered
  const tourStudents = useMemo(() => {
    return students.filter((s) => s.isRegistered && s.destination !== 'MAGANG');
  }, [students]);

  const [selectedWave, setSelectedWave] = useState<WaveType>('BALI_GEL_2');
  const [selectedBusNumber, setSelectedBusNumber] = useState<number>(1);
  const [secondBusNumber, setSecondBusNumber] = useState<number>(2);
  const [isDualBusView, setIsDualBusView] = useState<boolean>(false);
  const [isRapidMode, setIsRapidMode] = useState<boolean>(false);

  const [selectedSeatForAssign, setSelectedSeatForAssign] = useState<number | null>(null);
  const [isQuickPanelOpen, setIsQuickPanelOpen] = useState<boolean>(false);
  const [isAllocatingLocal, setIsAllocatingLocal] = useState<boolean>(false);

  // Preview scale: 100% on desktop, 50% on mobile
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 1024;
      setZoomScale(isMobile ? 50 : 100);
    }
  }, []);

  const handleZoomIn = () => setZoomScale((prev) => Math.min(150, prev + 10));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(30, prev - 10));
  const handleZoomSet = (scale: number) => setZoomScale(scale);

  // Bulk / Multi-select state
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isMassMoveModalOpen, setIsMassMoveModalOpen] = useState<boolean>(false);

  // Single Student Click-to-Move / Click-to-Swap state
  const [activeSourceSeat, setActiveSourceSeat] = useState<number | null>(null);
  const [activeSourceBus, setActiveSourceBus] = useState<number | null>(null);
  const [selectedUnassignedStudentId, setSelectedUnassignedStudentId] = useState<string | null>(null);

  // Drag & Drop seat state
  const [dragOverSeatNum, setDragOverSeatNum] = useState<number | null>(null);
  const [dragOverBusNum, setDragOverBusNum] = useState<number | null>(null);

  // Derived Wave & Buses with Smart Auto-Pruning
  const waveBuses = useMemo(() => {
    const raw = buses.filter((b) => b.wave === selectedWave);
    const waveTourStudents = tourStudents.filter((s) => s.wave === selectedWave);
    const unassignedCount = waveTourStudents.filter(
      (s) => !s.seatNumber || s.seatNumber === 0 || !s.busNumber
    ).length;
    const highestOccupiedBusNum = Math.max(
      0,
      ...waveTourStudents.filter((s) => s.seatNumber && s.seatNumber > 0).map((s) => s.busNumber || 0)
    );

    const waveCapacity = SeatAllocatorEngine.getSetting(settings, selectedWave, 'defaultBusCapacity', defaultBusCapacity);
    const reqBuses = calculateRequiredBusesForWave(
      selectedWave,
      tourStudents,
      settings,
      waveCapacity
    );

    // Smart Auto-Pruning: Only keep buses that have seated students,
    // or if empty, only if there are still unassigned students needing seats
    const active = raw.filter((b) => {
      const studentCount = waveTourStudents.filter(
        (s) => s.busNumber === b.busNumber && s.seatNumber && s.seatNumber > 0
      ).length;
      if (studentCount > 0) return true;
      if (waveTourStudents.length === 0) return b.busNumber === 1;

      if (unassignedCount === 0) {
        return b.busNumber <= Math.max(1, highestOccupiedBusNum);
      }

      return b.busNumber <= Math.max(1, highestOccupiedBusNum, reqBuses);
    });

    return active.length > 0 ? active : (raw.length > 0 ? [raw[0]] : []);
  }, [buses, selectedWave, tourStudents, settings, defaultBusCapacity]);

  const sortedBusNumbers = useMemo(() => {
    return waveBuses.map((b) => b.busNumber).sort((a, b) => a - b);
  }, [waveBuses]);

  // Keep selectedBusNumber strictly valid within active buses
  useEffect(() => {
    if (sortedBusNumbers.length > 0 && !sortedBusNumbers.includes(selectedBusNumber)) {
      setSelectedBusNumber(sortedBusNumbers[0]);
    }
  }, [sortedBusNumbers, selectedBusNumber]);

  // Active Bus Object
  const activeBus = useMemo(() => {
    return (
      waveBuses.find((b) => b.busNumber === selectedBusNumber) ||
      waveBuses[0] || {
        id: 'default',
        busNumber: selectedBusNumber,
        wave: selectedWave,
        name: `Bus ${selectedBusNumber}`,
        capacity: defaultBusCapacity,
      }
    );
  }, [waveBuses, selectedBusNumber, selectedWave, defaultBusCapacity]);

  // Derived Chaperones
  const allChaperones = useMemo(() => {
    return getAllDerivedChaperones(settings?.masterChaperones || [], classes || []);
  }, [classes, settings]);

  // Chaperone name resolver
  const getSeatChaperoneNameForBus = useCallback(
    (seatNum: number, busNum: number) => {
      const busObj = waveBuses.find((b) => b.busNumber === busNum);
      return resolveSeatChaperoneName(seatNum, busObj, allChaperones, settings);
    },
    [waveBuses, allChaperones, settings]
  );

  const getSeatChaperoneName = useCallback(
    (seatNum: number) => {
      return getSeatChaperoneNameForBus(seatNum, activeBus.busNumber);
    },
    [getSeatChaperoneNameForBus, activeBus.busNumber]
  );

  // Wave Metrics
  const waveMetrics = useMemo(() => {
    return calculateWaveMetrics(tourStudents, waveBuses, selectedWave);
  }, [tourStudents, waveBuses, selectedWave]);

  // Bus Metrics for Active Bus
  const busMetrics = useMemo(() => {
    return calculateBusMetrics(tourStudents, activeBus, selectedWave);
  }, [tourStudents, activeBus, selectedWave]);

  // Students in this wave without seat
  const unassignedWaveStudents = useMemo(() => {
    return tourStudents.filter(
      (s) => s.wave === selectedWave && (!s.seatNumber || s.seatNumber === 0)
    );
  }, [tourStudents, selectedWave]);

  // Helper map for students in a specific bus
  const getBusSeatStudentMap = useCallback(
    (busNum: number) => {
      const map = new Map<number, Student>();
      tourStudents
        .filter((s) => s.wave === selectedWave && s.busNumber === busNum)
        .forEach((s) => {
          if (s.seatNumber && s.seatNumber > 0) {
            map.set(s.seatNumber, s);
          }
        });
      return map;
    },
    [tourStudents, selectedWave]
  );

  // Seat Click Handler (Placing, swapping, selecting)
  const handleSeatClickForBus = async (seatNum: number, busNum: number) => {
    const seatMap = getBusSeatStudentMap(busNum);
    const studentAtSeat = seatMap.get(seatNum);

    // 1. Rapid Mode / Place Unassigned Student
    if (selectedUnassignedStudentId) {
      await onUpdateStudentSeat(selectedUnassignedStudentId, busNum, seatNum);

      if (isRapidMode) {
        const remaining = unassignedWaveStudents.filter((s) => s.id !== selectedUnassignedStudentId);
        setSelectedUnassignedStudentId(remaining.length > 0 ? remaining[0].id : null);
      } else {
        setSelectedUnassignedStudentId(null);
      }
      return;
    }

    // 2. Swapping / Moving existing seated student
    if (activeSourceSeat !== null) {
      const sourceBusNum = activeSourceBus || selectedBusNumber;
      const sourceMap = getBusSeatStudentMap(sourceBusNum);
      const sourceStudent = sourceMap.get(activeSourceSeat);

      if (sourceStudent) {
        if (sourceBusNum === busNum && activeSourceSeat === seatNum) {
          // Cancel selection
          setActiveSourceSeat(null);
          setActiveSourceBus(null);
          return;
        }

        if (studentAtSeat) {
          // Swap positions
          if (onBatchUpdateStudentSeats) {
            await onBatchUpdateStudentSeats([
              { studentId: sourceStudent.id, busNumber: busNum, seatNumber: seatNum },
              { studentId: studentAtSeat.id, busNumber: sourceBusNum, seatNumber: activeSourceSeat },
            ]);
          } else {
            await onUpdateStudentSeat(sourceStudent.id, busNum, seatNum);
            await onUpdateStudentSeat(studentAtSeat.id, sourceBusNum, activeSourceSeat);
          }
        } else {
          // Move to empty seat
          await onUpdateStudentSeat(sourceStudent.id, busNum, seatNum);
        }
      }

      setActiveSourceSeat(null);
      setActiveSourceBus(null);
      return;
    }

    // 3. Select occupied seat as source, or open seat modal
    if (studentAtSeat) {
      setActiveSourceSeat(seatNum);
      setActiveSourceBus(busNum);
    } else {
      // Empty seat clicked -> open assign modal
      setSelectedSeatForAssign(seatNum);
      setSelectedBusNumber(busNum);
    }
  };

  const handleSeatClick = (seatNum: number) => {
    handleSeatClickForBus(seatNum, activeBus.busNumber);
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    e.dataTransfer.setData('text/plain', studentId);
  };

  const handleDropCross = async (e: React.DragEvent, targetSeatNum: number, targetBusNum: number) => {
    e.preventDefault();
    setDragOverSeatNum(null);
    setDragOverBusNum(null);

    const draggedStudentId = e.dataTransfer.getData('text/plain');
    if (!draggedStudentId) return;

    const draggedStudent = tourStudents.find((s) => s.id === draggedStudentId);
    if (!draggedStudent) return;

    const targetMap = getBusSeatStudentMap(targetBusNum);
    const occupantAtTarget = targetMap.get(targetSeatNum);

    if (occupantAtTarget) {
      // Swap
      if (draggedStudent.seatNumber && onBatchUpdateStudentSeats) {
        await onBatchUpdateStudentSeats([
          { studentId: draggedStudent.id, busNumber: targetBusNum, seatNumber: targetSeatNum },
          {
            studentId: occupantAtTarget.id,
            busNumber: draggedStudent.busNumber || targetBusNum,
            seatNumber: draggedStudent.seatNumber,
          },
        ]);
      } else {
        await onUpdateStudentSeat(draggedStudent.id, targetBusNum, targetSeatNum);
      }
    } else {
      // Move to empty seat
      await onUpdateStudentSeat(draggedStudent.id, targetBusNum, targetSeatNum);
    }
  };

  // Auto-allocate handler
  const handleRunAutoAllocate = async () => {
    if (!onAutoAllocateBuses) return;
    try {
      setIsAllocatingLocal(true);
      await onAutoAllocateBuses();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAllocatingLocal(false);
    }
  };

  // Auto-fill current bus from unassigned students
  const handleAutoFillCurrentBus = async () => {
    const seatMap = getBusSeatStudentMap(activeBus.busNumber);
    const capacity = activeBus.capacity || defaultBusCapacity || 50;
    const emptySeats: number[] = [];

    for (let i = 1; i <= capacity; i++) {
      if (!getSeatChaperoneName(i) && !seatMap.has(i)) {
        emptySeats.push(i);
      }
    }

    const unassigned = [...unassignedWaveStudents];
    const updates: { studentId: string; busNumber: number; seatNumber: number }[] = [];

    emptySeats.forEach((seatNum) => {
      if (unassigned.length > 0) {
        const student = unassigned.shift()!;
        updates.push({
          studentId: student.id,
          busNumber: activeBus.busNumber,
          seatNumber: seatNum,
        });
      }
    });

    if (updates.length > 0) {
      if (onBatchUpdateStudentSeats) {
        await onBatchUpdateStudentSeats(updates);
      } else {
        for (const u of updates) {
          await onUpdateStudentSeat(u.studentId, u.busNumber, u.seatNumber);
        }
      }
    }
  };

  // Mass Actions
  const toggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleMassUnassignSeats = async () => {
    if (selectedStudentIds.length === 0) return;
    const updates = selectedStudentIds.map((id) => ({
      studentId: id,
      busNumber: 0,
      seatNumber: 0,
    }));

    if (onBatchUpdateStudentSeats) {
      await onBatchUpdateStudentSeats(updates);
    } else {
      for (const u of updates) {
        await onUpdateStudentSeat(u.studentId, u.busNumber, u.seatNumber);
      }
    }
    setSelectedStudentIds([]);
  };

  const handleMassMoveToBus = async (targetBusNum: number, strategy: 'AUTO_FILL' | 'TRANSIT') => {
    if (selectedStudentIds.length === 0) return;

    if (strategy === 'TRANSIT') {
      const updates = selectedStudentIds.map((id) => ({
        studentId: id,
        busNumber: targetBusNum,
        seatNumber: 0,
      }));
      if (onBatchUpdateStudentSeats) {
        await onBatchUpdateStudentSeats(updates);
      } else {
        for (const u of updates) {
          await onUpdateStudentSeat(u.studentId, u.busNumber, u.seatNumber);
        }
      }
    } else {
      // AUTO_FILL
      const targetMap = getBusSeatStudentMap(targetBusNum);
      const targetBusObj = waveBuses.find((b) => b.busNumber === targetBusNum);
      const cap = targetBusObj?.capacity || defaultBusCapacity || 50;

      const availableSeats: number[] = [];
      for (let s = 1; s <= cap; s++) {
        if (!getSeatChaperoneNameForBus(s, targetBusNum) && !targetMap.has(s)) {
          availableSeats.push(s);
        }
      }

      const updates = selectedStudentIds.map((id, idx) => ({
        studentId: id,
        busNumber: targetBusNum,
        seatNumber: availableSeats[idx] || 0,
      }));

      if (onBatchUpdateStudentSeats) {
        await onBatchUpdateStudentSeats(updates);
      } else {
        for (const u of updates) {
          await onUpdateStudentSeat(u.studentId, u.busNumber, u.seatNumber);
        }
      }
    }

    setSelectedStudentIds([]);
  };

  // Clear single seat
  const handleClearSeat = async (seatNum: number, busNum: number) => {
    const seatMap = getBusSeatStudentMap(busNum);
    const student = seatMap.get(seatNum);
    if (student) {
      await onUpdateStudentSeat(student.id, 0, 0);
    }
    if (onUpdateSettings && settings?.customChaperoneSeats) {
      const updatedCustom = { ...settings.customChaperoneSeats };
      const keysToDelete = [
        `${selectedWave}_bus-${busNum}_seat-${seatNum}`,
        `${selectedWave}-bus-${busNum}-seat-${seatNum}`,
        `bus-${selectedWave}-${busNum}_seat-${seatNum}`,
        `bus-${busNum}_seat-${seatNum}`,
        `seat-${seatNum}`,
      ];
      keysToDelete.forEach((k) => {
        delete updatedCustom[k];
      });
      onUpdateSettings({
        ...settings,
        customChaperoneSeats: updatedCustom,
      });
    }
    setActiveSourceSeat(null);
    setActiveSourceBus(null);
    setSelectedSeatForAssign(null);
  };

  const handleConvertToStudentSeat = async (seatNum: number, busNum: number) => {
    if (!onUpdateSettings || !settings) return;
    const key = `${selectedWave}_bus-${busNum}_seat-${seatNum}`;
    const updatedCustom = {
      ...(settings.customChaperoneSeats || {}),
      [key]: '__STUDENT__',
    };
    onUpdateSettings({
      ...settings,
      customChaperoneSeats: updatedCustom,
    });
  };

  const handleAssignChaperoneToSeat = async (chaperoneId: string, seatNum: number, busNum: number) => {
    if (!onUpdateSettings || !settings) return;
    const key = `${selectedWave}_bus-${busNum}_seat-${seatNum}`;
    const updatedCustom = {
      ...(settings.customChaperoneSeats || {}),
      [key]: chaperoneId,
    };
    // Clean old room assignment so the chaperone immediately auto-binds to this bus's room
    const updatedRooms = { ...(settings.customChaperoneRooms || {}) };
    delete updatedRooms[chaperoneId];

    onUpdateSettings({
      ...settings,
      customChaperoneSeats: updatedCustom,
      customChaperoneRooms: updatedRooms,
    });
  };

  const handleSaveCustomChaperone = async (name: string, seatNum: number, busNum: number) => {
    if (!onUpdateSettings || !settings) return;
    const key = `${selectedWave}_bus-${busNum}_seat-${seatNum}`;
    const updatedCustom = {
      ...(settings.customChaperoneSeats || {}),
      [key]: name,
    };
    const updatedRooms = { ...(settings.customChaperoneRooms || {}) };
    delete updatedRooms[name];

    onUpdateSettings({
      ...settings,
      customChaperoneSeats: updatedCustom,
      customChaperoneRooms: updatedRooms,
    });
  };

  const isSeatConvertedToStudent = (seatNum: number, busNum: number): boolean => {
    const keys = [
      `${selectedWave}_bus-${busNum}_seat-${seatNum}`,
      `${selectedWave}-bus-${busNum}-seat-${seatNum}`,
      `bus-${selectedWave}-${busNum}_seat-${seatNum}`,
      `bus-${busNum}_seat-${seatNum}`,
      `seat-${seatNum}`,
    ];
    for (const k of keys) {
      const val = settings?.customChaperoneSeats?.[k];
      if (val === '__STUDENT__' || val === 'STUDENT' || val === '__NONE__') return true;
    }
    return false;
  };

  // Effective Bus Capacity
  const activeBusStudents = useMemo(() => {
    return tourStudents.filter(
      (s) => s.wave === selectedWave && s.busNumber === activeBus.busNumber
    );
  }, [tourStudents, selectedWave, activeBus.busNumber]);

  const baseCapacity = activeBus.capacity || defaultBusCapacity || 50;
  const highestAssignedSeat = Math.max(0, ...activeBusStudents.map((s) => s.seatNumber || 0));
  const capacity = Math.min(50, Math.max(baseCapacity, highestAssignedSeat));

  return (
    <div className="space-y-5">
      {/* 1. GELOMBANG & WAVE METRICS DASHBOARD */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <BusIcon className="w-3.5 h-3.5" />
              <span>Sistem Denah & Penataan Kursi Armada</span>
              <span className="px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 rounded-md text-[10px] font-extrabold">
                Bebas Magang (PKL)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {schoolMetadata.waves.find((w) => w.id === selectedWave)?.name || 'Gelombang Tour'}
            </h1>
            <p className="text-xs text-slate-400">
              Menampilkan statistik riil seluruh siswa peserta aktif kunjungan industri.
            </p>
          </div>

          {/* Wave Selector */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pilih Gelombang:
              </div>
              <div className="text-xs font-black text-indigo-300">
                {waveMetrics.totalBuses} Armada Bus Tersedia
              </div>
            </div>
            <select
              aria-label="Pilih Gelombang Tour"
              value={selectedWave}
              onChange={(e) => {
                const newWave = e.target.value as WaveType;
                setSelectedWave(newWave);
                const matchingBuses = buses.filter((b) => b.wave === newWave);
                if (matchingBuses.length > 0) {
                  const minBusNum = Math.min(...matchingBuses.map((b) => b.busNumber));
                  setSelectedBusNumber(minBusNum);
                } else {
                  setSelectedBusNumber(1);
                }
                setActiveSourceSeat(null);
                setSelectedUnassignedStudentId(null);
              }}
              className="h-11 px-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-2xl border border-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-md transition-colors"
            >
              {schoolMetadata.waves.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time Wave Metrics Stat Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-5">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total Siswa Gelombang</div>
            <div className="text-xl font-black text-white mt-1">
              {waveMetrics.totalStudents} <span className="text-xs font-bold text-slate-400">Siswa</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Peserta Aktif</div>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-3.5">
            <div className="text-[10px] font-bold text-emerald-300 uppercase">Sudah Dapat Kursi</div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              {waveMetrics.seatedCount} <span className="text-xs font-bold text-emerald-300/80">Siswa</span>
            </div>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">{waveMetrics.occupancyPercentage}% Keterisian</div>
          </div>

          <div className="bg-amber-950/40 border border-amber-800/40 rounded-2xl p-3.5">
            <div className="text-[10px] font-bold text-amber-300 uppercase">Belum Dapat Kursi</div>
            <div className="text-xl font-black text-amber-400 mt-1">
              {waveMetrics.unseatedCount} <span className="text-xs font-bold text-amber-300/80">Siswa</span>
            </div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">Perlu Penataan</div>
          </div>

          <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-3.5">
            <div className="text-[10px] font-bold text-indigo-300 uppercase">Total Armada Bus</div>
            <div className="text-xl font-black text-indigo-400 mt-1">
              {waveMetrics.totalBuses} <span className="text-xs font-bold text-indigo-300/80">Unit Bus</span>
            </div>
            <div className="text-[10px] text-indigo-400/80 mt-0.5">Kapasitas ~{waveMetrics.totalBuses * 50}</div>
          </div>

          <div className="bg-sky-950/40 border border-sky-800/40 rounded-2xl p-3.5">
            <div className="text-[10px] font-bold text-sky-300 uppercase">Siswa Laki-Laki</div>
            <div className="text-xl font-black text-sky-400 mt-1">
              {waveMetrics.maleCount} <span className="text-xs font-bold text-sky-300/80">Siswa</span>
            </div>
            <div className="text-[10px] text-sky-400/80 mt-0.5">Gelombang Ini</div>
          </div>

          <div className="bg-rose-950/40 border border-rose-800/40 rounded-2xl p-3.5">
            <div className="text-[10px] font-bold text-rose-300 uppercase">Siswa Perempuan</div>
            <div className="text-xl font-black text-rose-400 mt-1">
              {waveMetrics.femaleCount} <span className="text-xs font-bold text-rose-300/80">Siswa</span>
            </div>
            <div className="text-[10px] text-rose-400/80 mt-0.5">Gelombang Ini</div>
          </div>
        </div>
      </div>

      {/* 2. MODULAR HEADER & ACTION TOOLBAR */}
      <BusHeaderToolbar
        selectedWave={selectedWave}
        onSelectWave={(newWave) => {
          setSelectedWave(newWave);
          const matchingBuses = buses.filter((b) => b.wave === newWave);
          if (matchingBuses.length > 0) {
            const minBusNum = Math.min(...matchingBuses.map((b) => b.busNumber));
            setSelectedBusNumber(minBusNum);
          } else {
            setSelectedBusNumber(1);
          }
          setActiveSourceSeat(null);
          setSelectedUnassignedStudentId(null);
        }}
        waveMetrics={waveMetrics}
        sortedBusNumbers={sortedBusNumbers}
        selectedBusNumber={selectedBusNumber}
        onSelectBusNumber={(busNum) => {
          setSelectedBusNumber(busNum);
          setActiveSourceSeat(null);
        }}
        getBusOccupancy={(busNum) => {
          const seated = tourStudents.filter(
            (s) => s.wave === selectedWave && s.busNumber === busNum && s.seatNumber && s.seatNumber > 0
          ).length;
          const targetBusObj = waveBuses.find((b) => b.busNumber === busNum);
          const cap = targetBusObj?.capacity || defaultBusCapacity || 50;
          return { seated, capacity: cap, isFull: seated >= cap };
        }}
        isRapidMode={isRapidMode}
        onToggleRapidMode={() => {
          setIsRapidMode(!isRapidMode);
          if (!isRapidMode && unassignedWaveStudents.length > 0) {
            setSelectedUnassignedStudentId(unassignedWaveStudents[0].id);
          } else {
            setSelectedUnassignedStudentId(null);
          }
        }}
        isDualBusView={isDualBusView}
        onToggleDualBusView={() => {
          setIsDualBusView(!isDualBusView);
          if (!isDualBusView) {
            const otherBus =
              sortedBusNumbers.find((n) => n !== selectedBusNumber) ||
              (selectedBusNumber === 1 ? 2 : 1);
            setSecondBusNumber(otherBus);
          }
        }}
        isBulkMode={isBulkMode}
        selectedStudentCount={selectedStudentIds.length}
        onToggleBulkMode={() => {
          setIsBulkMode(!isBulkMode);
          if (isBulkMode) setSelectedStudentIds([]);
        }}
        isQuickPanelOpen={isQuickPanelOpen}
        onToggleQuickPanel={() => setIsQuickPanelOpen(!isQuickPanelOpen)}
        onAutoAllocate={handleRunAutoAllocate}
        onAutoAllocateWithScope={async (scope) => {
          setIsAllocatingLocal(true);
          try {
            if (scope === 'ALL') {
              if (onAutoAllocateBuses) {
                await onAutoAllocateBuses();
              } else {
                const res = SeatAllocatorEngine.autoAllocateBuses(
                  students,
                  defaultBusCapacity,
                  classes,
                  settings?.customBusGuides,
                  settings
                );
                if (onBatchUpdateStudentSeats) {
                  const changedStudents = res.updatedStudents.filter((updated) => {
                    const original = students.find((s) => s.id === updated.id);
                    return !original ||
                      original.busNumber !== updated.busNumber ||
                      original.seatNumber !== updated.seatNumber;
                  });
                  const updates = changedStudents.map((s) => ({
                    studentId: s.id,
                    busNumber: s.busNumber || 0,
                    seatNumber: s.seatNumber || 0,
                  }));
                  await onBatchUpdateStudentSeats(updates, `Alokasi otomatis seluruh bus selesai (${changedStudents.length} siswa diperbarui)!`);
                }
              }
            } else if (scope === 'WAVE') {
              const res = SeatAllocatorEngine.autoAllocateWave(
                students,
                selectedWave,
                settings,
                classes,
                settings?.customBusGuides
              );
              if (onBatchUpdateStudentSeats) {
                const waveName = selectedWave === 'BALI_GEL_1' ? 'Bali Gelombang 1' : selectedWave === 'BALI_GEL_2' ? 'Bali Gelombang 2' : 'Yogyakarta';
                const changedStudents = res.updatedStudents.filter((updated) => {
                  const original = students.find((s) => s.id === updated.id);
                  return !original ||
                    original.busNumber !== updated.busNumber ||
                    original.seatNumber !== updated.seatNumber;
                });
                const updates = changedStudents.map((s) => ({
                  studentId: s.id,
                  busNumber: s.busNumber || 0,
                  seatNumber: s.seatNumber || 0,
                }));
                await onBatchUpdateStudentSeats(updates, `Alokasi otomatis kursi ${waveName} selesai (${changedStudents.length} siswa diperbarui)!`);
              }
            } else if (scope === 'BUS') {
              const res = SeatAllocatorEngine.autoAllocateSingleBus(
                students,
                selectedWave,
                selectedBusNumber,
                settings,
                classes,
                settings?.customBusGuides
              );
              if (onBatchUpdateStudentSeats) {
                const changedStudents = res.updatedStudents.filter((updated) => {
                  const original = students.find((s) => s.id === updated.id);
                  return !original ||
                    original.busNumber !== updated.busNumber ||
                    original.seatNumber !== updated.seatNumber;
                });
                const updates = changedStudents.map((s) => ({
                  studentId: s.id,
                  busNumber: s.busNumber || 0,
                  seatNumber: s.seatNumber || 0,
                }));
                await onBatchUpdateStudentSeats(updates, `Alokasi otomatis kursi Bus ${selectedBusNumber} selesai (${changedStudents.length} siswa diperbarui)!`);
              }
            } else if (scope === 'COMPACT') {
              const res = SeatAllocatorEngine.compactBusSeats(
                students,
                selectedWave,
                selectedBusNumber,
                settings,
                classes,
                settings?.customBusGuides
              );
              if (onBatchUpdateStudentSeats) {
                const changedStudents = res.updatedStudents.filter((updated) => {
                  const original = students.find((s) => s.id === updated.id);
                  return !original ||
                    original.busNumber !== updated.busNumber ||
                    original.seatNumber !== updated.seatNumber;
                });
                const updates = changedStudents.map((s) => ({
                  studentId: s.id,
                  busNumber: s.busNumber || 0,
                  seatNumber: s.seatNumber || 0,
                }));
                await onBatchUpdateStudentSeats(updates, `Susunan kursi Bus ${selectedBusNumber} berhasil dirapatkan (${changedStudents.length} siswa disesuaikan)!`);
              }
            }
          } finally {
            setIsAllocatingLocal(false);
          }
        }}
        isAllocating={isAllocatingLocal}
        onPrintCurrentBus={() => printSingleBusPlan(activeBus.busNumber, selectedWave, tourStudents, waveBuses, settings, allChaperones)}
        onPrintAllBuses={() => setIsBatchModalOpen(true)}
        onExportExcel={() =>
          exportBusSeatingToExcel(
            tourStudents,
            waveBuses,
            selectedWave,
            activeBus.busNumber,
            (seatNum) => getSeatChaperoneName(seatNum)
          )
        }
        onOpenBatchModal={() => setIsBatchModalOpen(true)}
      />

      {/* 3. QUICK SETTINGS PARAMETER MODAL */}
      <BusQuickSettingsModal
        isOpen={isQuickPanelOpen}
        onClose={() => setIsQuickPanelOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        selectedWave={selectedWave}
      />

      {/* 4. DUAL BUS WORKSPACE VIEW OR STANDARD A4 PRINT VIEW */}
      {isDualBusView ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 no-print">
          {/* Primary Bus */}
          <div className="bg-white rounded-3xl p-5 border-2 border-indigo-500 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black">
                BUS UTAMA ({selectedBusNumber})
              </span>
              <select
                aria-label="Pilih Bus Utama"
                value={selectedBusNumber}
                onChange={(e) => setSelectedBusNumber(Number(e.target.value))}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 cursor-pointer"
              >
                {sortedBusNumbers.map((num) => (
                  <option key={num} value={num}>
                    Bus {num}
                  </option>
                ))}
              </select>
            </div>
            <BusSeatGrid
              busNumber={selectedBusNumber}
              capacity={activeBus.capacity || defaultBusCapacity}
              seatStudentMap={getBusSeatStudentMap(selectedBusNumber)}
              getSeatChaperoneName={(seatNum) => getSeatChaperoneNameForBus(seatNum, selectedBusNumber)}
              onSeatClick={(seatNum) => handleSeatClickForBus(seatNum, selectedBusNumber)}
              onDragStart={handleDragStart}
              onDropCross={handleDropCross}
              dragOverSeatNum={dragOverSeatNum}
              dragOverBusNum={dragOverBusNum}
              setDragOverSeatNum={setDragOverSeatNum}
              setDragOverBusNum={setDragOverBusNum}
              activeSourceSeat={activeSourceSeat}
              activeSourceBus={activeSourceBus}
              selectedUnassignedStudentId={selectedUnassignedStudentId}
              isBulkMode={isBulkMode}
              selectedStudentIds={selectedStudentIds}
              onToggleSelectStudent={toggleSelectStudent}
            />
          </div>

          {/* Secondary Bus */}
          <div className="bg-white rounded-3xl p-5 border-2 border-purple-500 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-black">
                BUS PEMBANDING ({secondBusNumber})
              </span>
              <select
                aria-label="Pilih Bus Pembanding"
                value={secondBusNumber}
                onChange={(e) => setSecondBusNumber(Number(e.target.value))}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 cursor-pointer"
              >
                {sortedBusNumbers.map((num) => (
                  <option key={num} value={num}>
                    Bus {num}
                  </option>
                ))}
              </select>
            </div>
            <BusSeatGrid
              busNumber={secondBusNumber}
              capacity={
                waveBuses.find((b) => b.busNumber === secondBusNumber)?.capacity || defaultBusCapacity
              }
              seatStudentMap={getBusSeatStudentMap(secondBusNumber)}
              getSeatChaperoneName={(seatNum) => getSeatChaperoneNameForBus(seatNum, secondBusNumber)}
              onSeatClick={(seatNum) => handleSeatClickForBus(seatNum, secondBusNumber)}
              onDragStart={handleDragStart}
              onDropCross={handleDropCross}
              dragOverSeatNum={dragOverSeatNum}
              dragOverBusNum={dragOverBusNum}
              setDragOverSeatNum={setDragOverSeatNum}
              setDragOverBusNum={setDragOverBusNum}
              activeSourceSeat={activeSourceSeat}
              activeSourceBus={activeSourceBus}
              selectedUnassignedStudentId={selectedUnassignedStudentId}
              isBulkMode={isBulkMode}
              selectedStudentIds={selectedStudentIds}
              onToggleSelectStudent={toggleSelectStudent}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Zoom & Print Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs no-print">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700">Zoom Pratinjau Cetak:</span>
              <button
                type="button"
                onClick={handleZoomOut}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-black text-xs cursor-pointer"
                title="Perkecil Pratinjau"
              >
                -
              </button>
              <span className="text-xs font-extrabold text-slate-900 w-10 text-center">
                {zoomScale}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-black text-xs cursor-pointer"
                title="Perbesar Pratinjau"
              >
                +
              </button>
              <div className="hidden sm:flex gap-1">
                {[50, 75, 100].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleZoomSet(s)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      zoomScale === s
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  exportBusSeatingToExcel(
                    tourStudents,
                    waveBuses,
                    selectedWave,
                    activeBus.busNumber,
                    (seatNum) => getSeatChaperoneName(seatNum)
                  )
                }
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={() => printSingleBusPlan(activeBus.busNumber, selectedWave)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak A4 Bus {activeBus.busNumber}</span>
              </button>
            </div>
          </div>

          {/* Exact Pixel-Perfect A4 Sheet */}
          <BusPrintLayout
            bus={activeBus}
            selectedWave={selectedWave}
            students={tourStudents}
            capacity={capacity}
            zoomScale={zoomScale}
            getSeatChaperoneName={getSeatChaperoneName}
            onSeatClick={handleSeatClick}
            activeSourceSeat={activeSourceSeat}
            selectedStudentIds={selectedStudentIds}
            isBulkMode={isBulkMode}
            onToggleSelectStudent={toggleSelectStudent}
            onDragStart={handleDragStart}
            onDropCross={handleDropCross}
            dragOverSeatNum={dragOverSeatNum}
            dragOverBusNum={dragOverBusNum}
            setDragOverSeatNum={setDragOverSeatNum}
            setDragOverBusNum={setDragOverBusNum}
            selectedUnassignedStudentId={selectedUnassignedStudentId}
          />
        </div>
      )}

      {/* 5. UNASSIGNED STUDENTS DRAWER */}
      <BusUnassignedDrawer
        unassignedStudents={unassignedWaveStudents}
        selectedStudentId={selectedUnassignedStudentId}
        onSelectStudent={(studentId) => {
          setSelectedUnassignedStudentId(studentId);
          setActiveSourceSeat(null);
        }}
        onDragStart={handleDragStart}
        onAutoFillCurrentBus={handleAutoFillCurrentBus}
        isRapidMode={isRapidMode}
        activeBusNumber={activeBus.busNumber}
        remainingSeatsCount={capacity - activeBusStudents.length}
      />

      {/* 6. FLOATING BAR: SINGLE ACTIVE SEAT SELECTION */}
      {activeSourceSeat !== null && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 shadow-2xl rounded-2xl p-3.5 px-5 border-2 border-amber-300 flex items-center justify-between gap-4 max-w-xl w-[92vw] sm:w-auto animate-in slide-in-from-bottom-5 duration-200 no-print">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-slate-950 text-amber-400 rounded-lg text-xs font-black">
              Kursi #{activeSourceSeat}
            </span>
            <div className="text-xs font-black">
              <span>
                {getBusSeatStudentMap(activeSourceBus || selectedBusNumber).get(activeSourceSeat)?.name}
              </span>
              <span className="text-[11px] font-bold opacity-80 block">
                Klik kursi lain untuk memindahkan/menukar posisi.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSelectedSeatForAssign(activeSourceSeat);
                setSelectedBusNumber(activeSourceBus || selectedBusNumber);
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs"
            >
              Kelola Kursi
            </button>
            <button
              type="button"
              onClick={() => handleClearSeat(activeSourceSeat, activeSourceBus || selectedBusNumber)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs"
            >
              Kosongkan
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSourceSeat(null);
                setActiveSourceBus(null);
              }}
              className="px-3 py-1.5 bg-slate-950/20 text-slate-950 rounded-xl text-xs font-black hover:bg-slate-950/30 cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* 7. FLOATING BAR: MULTI-SELECT MASS ACTION */}
      {selectedStudentIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white shadow-2xl rounded-2xl p-3.5 px-5 border border-slate-700 flex flex-wrap items-center justify-between gap-3 min-w-[320px] max-w-2xl w-[92vw] sm:w-auto animate-in slide-in-from-bottom-5 duration-200 no-print">
          <span className="px-2.5 py-1 bg-blue-500 text-white font-black text-xs rounded-xl shadow-xs">
            {selectedStudentIds.length} Siswa Terpilih
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMassMoveModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Pindah ke Bus...</span>
            </button>

            <button
              type="button"
              onClick={handleMassUnassignSeats}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Lepas Kursi</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
              title="Batal Pilihan"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* 8. MODAL: MASS MOVE TO ANOTHER BUS */}
      <BusMassMoveModal
        isOpen={isMassMoveModalOpen}
        onClose={() => setIsMassMoveModalOpen(false)}
        selectedStudentCount={selectedStudentIds.length}
        availableBuses={sortedBusNumbers}
        onConfirmMove={handleMassMoveToBus}
      />

      {/* 9. MODAL: MANUAL SEAT ASSIGNMENT */}
      <BusSeatManageModal
        seatNumber={selectedSeatForAssign}
        busNumber={selectedBusNumber || activeBus.busNumber}
        onClose={() => setSelectedSeatForAssign(null)}
        studentAtSeat={
          selectedSeatForAssign
            ? getBusSeatStudentMap(selectedBusNumber || activeBus.busNumber).get(selectedSeatForAssign)
            : undefined
        }
        chaperoneName={
          selectedSeatForAssign
            ? getSeatChaperoneNameForBus(selectedSeatForAssign, selectedBusNumber || activeBus.busNumber)
            : undefined
        }
        isStudentSeat={
          selectedSeatForAssign
            ? isSeatConvertedToStudent(selectedSeatForAssign, selectedBusNumber || activeBus.busNumber)
            : false
        }
        allChaperones={allChaperones}
        unassignedStudents={unassignedWaveStudents}
        onAssignStudent={async (studentId) => {
          if (selectedSeatForAssign) {
            await onUpdateStudentSeat(
              studentId,
              selectedBusNumber || activeBus.busNumber,
              selectedSeatForAssign
            );
          }
        }}
        onConvertToStudentSeat={async () => {
          if (selectedSeatForAssign) {
            await handleConvertToStudentSeat(selectedSeatForAssign, selectedBusNumber || activeBus.busNumber);
          }
        }}
        onAssignChaperone={async (chaperoneId) => {
          if (selectedSeatForAssign) {
            await handleAssignChaperoneToSeat(chaperoneId, selectedSeatForAssign, selectedBusNumber || activeBus.busNumber);
          }
        }}
        onSaveCustomChaperone={async (name) => {
          if (selectedSeatForAssign) {
            await handleSaveCustomChaperone(name, selectedSeatForAssign, selectedBusNumber || activeBus.busNumber);
          }
        }}
        onClearSeat={async () => {
          if (selectedSeatForAssign) {
            await handleClearSeat(selectedSeatForAssign, selectedBusNumber || activeBus.busNumber);
          }
        }}
      />

      {/* 10. BATCH PRINT MODAL */}
      <BatchBusPrintModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        students={tourStudents}
        buses={buses}
        classes={classes}
        selectedWave={selectedWave}
        settings={settings}
      />
    </div>
  );
};
