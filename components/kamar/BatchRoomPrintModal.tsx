'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, Room, WaveType, AppSettings, SchoolClass, Bus, GenderType } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';
import { SchoolLogo } from '../ui/SchoolLogo';
import { RoomAllocatorEngine } from '@/services/roomAllocator';
import { getWaveChaperones, WaveChaperoneItem, deriveAutoChaperoneRooms } from '@/lib/utils';
import { ExcelService } from '@/services/excelService';
import { DestinationRulesService } from '@/services/destinationRules';
import { PrintEngineService } from '@/services/printEngine';
import { RoomPrintSignatureMatrix } from './RoomPrintSignatureMatrix';
import { generateRoomPrintDocumentHtml } from './roomPrintHelper';
import {
  Printer,
  X,
  BedDouble,
  CheckCircle2,
  Building2,
  Bus as BusIcon,
  Download,
  FileSpreadsheet,
  ZoomIn,
  ZoomOut,
  Filter,
  AlertCircle,
  Users,
  UserCheck,
} from 'lucide-react';

interface BatchRoomPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  rooms: Room[];
  defaultRoomCapacity?: number;
  settings?: AppSettings;
  classes?: SchoolClass[];
  buses?: Bus[];
  initialWave?: WaveType;
  initialRoomType?: 'STUDENT' | 'CHAPERONE';
}

export const BatchRoomPrintModal: React.FC<BatchRoomPrintModalProps> = ({
  isOpen,
  onClose,
  students,
  rooms,
  defaultRoomCapacity = 4,
  settings,
  classes = [],
  buses = [],
  initialWave,
  initialRoomType = 'STUDENT',
}) => {
  const [selectedWave, setSelectedWave] = useState<string>(initialWave || 'BALI_GEL_2');
  const [roomType, setRoomType] = useState<'STUDENT' | 'CHAPERONE'>(initialRoomType);
  const [selectedGender, setSelectedGender] = useState<string>('ALL');
  const [selectedBus, setSelectedBus] = useState<string>('ALL');
  const [zoomScale, setZoomScale] = useState<number>(0.5); // Default 50% scale for preview
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const docContainerRef = useRef<HTMLDivElement>(null);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (initialWave) setSelectedWave(initialWave);
      if (initialRoomType) setRoomType(initialRoomType);
    }
  }, [isOpen, initialWave, initialRoomType]);

  // Filter registered active students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (!s.isRegistered) return false;
      if (selectedWave !== 'ALL' && s.wave !== selectedWave) return false;
      if (selectedGender !== 'ALL' && s.gender !== selectedGender) return false;
      if (selectedBus !== 'ALL') {
        if (selectedBus === 'UNASSIGNED') {
          if (s.busNumber && s.busNumber > 0) return false;
        } else {
          if (s.busNumber !== Number(selectedBus)) return false;
        }
      }
      return true;
    });
  }, [students, selectedWave, selectedGender, selectedBus]);

  // Derive student rooms dynamically from ALL registered students to match database source of truth
  interface DerivedRoomWithOccupants extends Room {
    occupants: Student[];
  }

  const derivedRooms = useMemo<DerivedRoomWithOccupants[]>(() => {
    const studentsForRoomDerivation = (students || []).filter((s) => {
      if (!s.isRegistered) return false;
      if (selectedWave !== 'ALL' && s.wave !== selectedWave) return false;
      return true;
    });

    const roomMap = new Map<string, DerivedRoomWithOccupants>();

    studentsForRoomDerivation.forEach((s) => {
      if (!s.roomNumber || !s.wave || s.destination === 'MAGANG') return;
      const roomNum = s.roomNumber;
      const key = `${s.wave}-${roomNum}`;
      const waveCapacity = RoomAllocatorEngine.getSetting(settings, s.wave, 'defaultRoomCapacity', defaultRoomCapacity || 4);

      if (!roomMap.has(key)) {
        roomMap.set(key, {
          id: `room-${s.wave}-${roomNum}`,
          roomNumber: roomNum,
          gender: s.gender || 'LAKI-LAKI',
          capacity: waveCapacity,
          wave: s.wave,
          assignedStudentIds: [],
          occupants: [],
        });
      }
      const rObj = roomMap.get(key)!;
      rObj.assignedStudentIds.push(s.id);
      rObj.occupants.push(s);
    });

    // Group rooms by wave, sort by original roomNumber, and re-index displayRoomNumber starting from 1 for each wave
    const waveRoomsGrouped = new Map<string, DerivedRoomWithOccupants[]>();
    Array.from(roomMap.values()).forEach((r) => {
      if (!waveRoomsGrouped.has(r.wave)) {
        waveRoomsGrouped.set(r.wave, []);
      }
      waveRoomsGrouped.get(r.wave)!.push({
        ...r,
        occupants: r.occupants.sort((a, b) => (a.bedNumber || 0) - (b.bedNumber || 0)),
      });
    });

    const result: DerivedRoomWithOccupants[] = [];
    waveRoomsGrouped.forEach((waveRooms) => {
      waveRooms.sort((a, b) => a.roomNumber - b.roomNumber);
      waveRooms.forEach((r, idx) => {
        r.displayRoomNumber = idx + 1;
        result.push(r);
      });
    });

    return result.sort((a, b) => {
      if (a.wave !== b.wave) return a.wave.localeCompare(b.wave);
      return (a.displayRoomNumber || a.roomNumber) - (b.displayRoomNumber || b.roomNumber);
    });
  }, [students, selectedWave, defaultRoomCapacity, settings]);

  // Derive Chaperone List & Rooms
  const waveChaperones = useMemo(() => {
    return getWaveChaperones({
      settings,
      buses,
      classes,
      students,
      selectedWave,
    });
  }, [settings, buses, classes, students, selectedWave]);

  const derivedChaperoneRooms = useMemo(() => {
    const { rooms } = deriveAutoChaperoneRooms({
      waveChaperones,
      customRooms: settings?.customChaperoneRooms,
      capacity: 2,
    });
    return rooms;
  }, [waveChaperones, settings]);

  // Extract distinct bus numbers present from buses config and registered students
  const availableBuses = useMemo(() => {
    const busSet = new Set<number>();
    buses.forEach((b) => {
      if (selectedWave === 'ALL' || b.wave === selectedWave) {
        busSet.add(b.busNumber);
      }
    });
    students.forEach((s) => {
      if (s.isRegistered && s.busNumber && s.busNumber > 0) {
        if (selectedWave === 'ALL' || s.wave === selectedWave) {
          busSet.add(s.busNumber);
        }
      }
    });
    return Array.from(busSet).sort((a, b) => a - b);
  }, [students, buses, selectedWave]);

  // Group student rooms with Fair Load Balancing across buses so rooms are NEVER duplicated across sheets
  // and each chaperone/bus coordinator team has an evenly balanced and exact set of rooms to check (1 bus = exact 1 A4 sheet).
  const busSheets = useMemo(() => {
    const targetBuses = availableBuses;
    if (targetBuses.length === 0 && derivedRooms.length === 0) return [];

    const totalRooms = derivedRooms.length;
    // Ideal room quota per bus, hard-capped at 12 to guarantee 1 single A4 page per bus!
    const idealQuota = targetBuses.length > 0 ? Math.ceil(totalRooms / targetBuses.length) : 12;
    const maxRoomsPerSheet = Math.min(12, Math.max(10, idealQuota));

    const roomPrimaryBusMap = new Map<number, string>();
    const busRoomCountMap = new Map<string, number>();
    targetBuses.forEach((bNum) => busRoomCountMap.set(String(bNum), 0));

    // Sort rooms by purity (highest single-bus concentration first)
    const sortedRooms = [...derivedRooms].sort((a, b) => {
      const aCounts = new Map<string, number>();
      a.occupants.forEach((st) => {
        const k = st.busNumber && st.busNumber > 0 ? String(st.busNumber) : 'UNASSIGNED';
        aCounts.set(k, (aCounts.get(k) || 0) + 1);
      });
      const bCounts = new Map<string, number>();
      b.occupants.forEach((st) => {
        const k = st.busNumber && st.busNumber > 0 ? String(st.busNumber) : 'UNASSIGNED';
        bCounts.set(k, (bCounts.get(k) || 0) + 1);
      });
      const aMax = Math.max(...Array.from(aCounts.values()), 0);
      const bMax = Math.max(...Array.from(bCounts.values()), 0);
      return bMax - aMax;
    });

    // Pass 1: Assign each room to its best candidate bus that has space (< maxRoomsPerSheet)
    sortedRooms.forEach((room) => {
      const busCounts = new Map<string, number>();
      room.occupants.forEach((st) => {
        const bKey = st.busNumber && st.busNumber > 0 ? String(st.busNumber) : 'UNASSIGNED';
        busCounts.set(bKey, (busCounts.get(bKey) || 0) + 1);
      });

      const candidates: { busKey: string; count: number; currentLoad: number }[] = [];
      busCounts.forEach((count, bKey) => {
        if (bKey !== 'UNASSIGNED' && targetBuses.includes(Number(bKey))) {
          candidates.push({
            busKey: bKey,
            count,
            currentLoad: busRoomCountMap.get(bKey) || 0,
          });
        }
      });

      if (candidates.length === 0) {
        if (targetBuses.length > 0) {
          const leastLoaded = [...targetBuses].sort(
            (a, b) => (busRoomCountMap.get(String(a)) || 0) - (busRoomCountMap.get(String(b)) || 0)
          )[0];
          const bKey = String(leastLoaded);
          roomPrimaryBusMap.set(room.roomNumber, bKey);
          busRoomCountMap.set(bKey, (busRoomCountMap.get(bKey) || 0) + 1);
        } else {
          roomPrimaryBusMap.set(room.roomNumber, 'UNASSIGNED');
        }
        return;
      }

      // Sort candidate buses:
      // 1. Candidate has not reached maxRoomsPerSheet (12)
      // 2. Highest student count from this bus in the room
      // 3. Lowest current load (fair load balancing)
      // 4. Lowest bus number
      candidates.sort((a, b) => {
        const aUnderCap = a.currentLoad < maxRoomsPerSheet;
        const bUnderCap = b.currentLoad < maxRoomsPerSheet;
        if (aUnderCap !== bUnderCap) return aUnderCap ? -1 : 1;
        if (a.count !== b.count) return b.count - a.count;
        if (a.currentLoad !== b.currentLoad) return a.currentLoad - b.currentLoad;
        return Number(a.busKey) - Number(b.busKey);
      });

      const chosen = candidates[0].busKey;
      roomPrimaryBusMap.set(room.roomNumber, chosen);
      busRoomCountMap.set(chosen, (busRoomCountMap.get(chosen) || 0) + 1);
    });

    // Pass 2: Rebalance if any bus load difference > 1 and can be smoothed
    if (targetBuses.length > 1) {
      let rebalanceAttempts = 0;
      while (rebalanceAttempts < 50) {
        rebalanceAttempts++;
        let maxBus = '';
        let maxLoad = -1;
        let minBus = '';
        let minLoad = Infinity;

        targetBuses.forEach((bNum) => {
          const bKey = String(bNum);
          const load = busRoomCountMap.get(bKey) || 0;
          if (load > maxLoad) {
            maxLoad = load;
            maxBus = bKey;
          }
          if (load < minLoad) {
            minLoad = load;
            minBus = bKey;
          }
        });

        // If difference is 1 or less, or within fair threshold (<= 2 and max <= 12), balance achieved
        if (maxLoad - minLoad <= 1 && maxLoad <= 12) break;
        if (maxLoad <= 12 && minLoad >= 8 && maxLoad - minLoad <= 2) break;

        const eligibleRooms = derivedRooms.filter(
          (r) => roomPrimaryBusMap.get(r.roomNumber) === maxBus
        );
        if (eligibleRooms.length === 0) break;

        // Pick room with lowest occupants from maxBus to move to minBus
        eligibleRooms.sort((a, b) => {
          const aFromMax = a.occupants.filter((st) => String(st.busNumber) === maxBus).length;
          const bFromMax = b.occupants.filter((st) => String(st.busNumber) === maxBus).length;
          return aFromMax - bFromMax;
        });

        const roomToMove = eligibleRooms[0];
        roomPrimaryBusMap.set(roomToMove.roomNumber, minBus);
        busRoomCountMap.set(maxBus, (busRoomCountMap.get(maxBus) || 0) - 1);
        busRoomCountMap.set(minBus, (busRoomCountMap.get(minBus) || 0) + 1);
      }
    }

    const sortedBusKeys = (targetBuses.length > 0 ? targetBuses.map(String) : ['UNASSIGNED'])
      .filter((bKey) => selectedBus === 'ALL' || selectedBus === bKey);

    const sheets: {
      sheetKey: string;
      busKey: string;
      busNum: number;
      isUnassigned: boolean;
      busRooms: typeof derivedRooms;
      femaleRooms: typeof derivedRooms;
      maleRooms: typeof derivedRooms;
      totalOccupants: number;
      pageIndex: number;
      totalPages: number;
    }[] = [];

    sortedBusKeys.forEach((busKey) => {
      const isUnassigned = busKey === 'UNASSIGNED';
      const busNum = isUnassigned ? 0 : Number(busKey);

      // Rooms uniquely assigned to this bus as primary supervisor
      const busRooms = derivedRooms.filter((r) => roomPrimaryBusMap.get(r.roomNumber) === busKey);
      const femaleRooms = busRooms.filter((r) => r.gender === 'PEREMPUAN');
      const maleRooms = busRooms.filter((r) => r.gender === 'LAKI-LAKI');

      // Total students staying in these rooms
      const totalOccupants = busRooms.reduce((acc, r) => acc + r.occupants.length, 0);

      // EXACTLY 1 PAGE PER BUS (Standardized to 12 rooms per A4 sheet)
      sheets.push({
        sheetKey: `${busKey}-page-1`,
        busKey,
        busNum,
        isUnassigned,
        busRooms: busRooms.slice(0, 12),
        femaleRooms,
        maleRooms,
        totalOccupants,
        pageIndex: 1,
        totalPages: 1,
      });
    });

    return sheets;
  }, [availableBuses, derivedRooms, selectedBus]);

  const schoolInfo = useMemo(() => {
    return {
      name: settings?.schoolName || schoolMetadata.school.name,
      address: settings?.schoolAddress || schoolMetadata.school.address,
      headmaster: settings?.headmasterName || schoolMetadata.school.headmaster,
      travelAgency: settings?.travelAgency || schoolMetadata.school.travelAgency,
    };
  }, [settings]);

  if (!isOpen) return null;

  // Zoom handlers
  const handleZoomIn = () => setZoomScale((prev) => Math.min(Number((prev + 0.1).toFixed(2)), 1.5));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(Number((prev - 0.1).toFixed(2)), 0.3));
  const handleSetScale = (scale: number) => setZoomScale(scale);

  // Print Window handler using popup window with full styles for exact A4 layout
  const handlePrint = () => {
    if (typeof window === 'undefined') return;

    const html = generateRoomPrintDocumentHtml({
      roomType,
      selectedWave,
      busSheets,
      chaperoneRooms: derivedChaperoneRooms,
      buses,
      settings,
      defaultRoomCapacity,
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

  // Download PDF using html2pdf via PrintEngineService
  const handleDownloadPdf = async () => {
    const element = document.getElementById('batch-room-print-container');
    if (!element) return;

    try {
      setIsGeneratingPdf(true);
      const busLabel = selectedBus === 'ALL' ? 'Semua_Bus' : `Bus_${selectedBus}`;
      const modeLabel = roomType === 'CHAPERONE' ? 'Pendamping' : 'Siswa';
      const fileName = `Manifest_Kamar_${modeLabel}_${busLabel}_${schoolInfo.name.replace(/\s+/g, '_')}.pdf`;

      await PrintEngineService.exportToPdf({
        element,
        filename: fileName,
        orientation: 'portrait',
        format: 'a4',
        scale: 2,
        quality: 0.95,
      });
    } catch (error) {
      console.error('Failed to generate PDF for rooms:', error);
      alert('Gagal menghasilkan file PDF. Silakan gunakan tombol Cetak A4.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Download Excel
  const handleDownloadExcel = async () => {
    try {
      setIsExportingExcel(true);
      const busLabel = selectedBus === 'ALL' ? 'Semua_Bus' : `Bus_${selectedBus}`;
      const fileName = `Rooming_List_Absensi_${busLabel}`;

      await ExcelService.exportRoomsToExcel(
        derivedRooms,
        filteredStudents,
        defaultRoomCapacity,
        fileName
      );
    } catch (error) {
      console.error('Failed to export rooms to Excel:', error);
      alert('Gagal mengunduh file Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Helper to format wave label
  const getWaveLabel = (waveStr: string) => {
    if (waveStr === 'BALI_GEL_1') return 'Darmawisata Bali Gelombang 1';
    if (waveStr === 'BALI_GEL_2') return 'Darmawisata Bali Gelombang 2';
    if (waveStr === 'YOGYA_GEL_1') return 'Darmawisata Yogyakarta Gelombang 1';
    return 'Darmawisata';
  };

  // Standard fixed room count per A4 sheet (Standardized to exactly 12 rooms = 48 rows)
  const FIXED_ROOMS_PER_SHEET = 12;

  // Render a single Student Bus Sheet
  const renderSingleBusSheet = (sheet: (typeof busSheets)[0]) => {
    const { sheetKey, busKey, busNum, isUnassigned, busRooms, femaleRooms, maleRooms, totalOccupants, pageIndex, totalPages } = sheet;
    const waveLabel = getWaveLabel(selectedWave);

    // Look up assigned bus guides for the signature line
    const busObj = buses.find(
      (b) => b.busNumber === busNum && (selectedWave === 'ALL' || b.wave === selectedWave)
    );

    // Determine destination wave (Bali vs Jogja)
    const isYogya = selectedWave.includes('YOGYA') || (busObj?.wave && busObj.wave.includes('YOGYA'));
    const isBali = !isYogya; // Bali is default if not Jogja

    const {
      guide1Name: pendamping1Name,
      secondaryGuideLabel,
      secondaryGuideName,
    } = DestinationRulesService.resolveChaperones(selectedWave, busObj, settings);

    // 50:50 Fair internal room division between Guru Pendamping 1 (P1) and Guru Pendamping 2 (P2)
    const picAssignmentMap = new Map<number, 'P1' | 'P2'>();
    const g1Gender = settings?.masterChaperones?.find((c) => c.name === pendamping1Name || c.id === pendamping1Name)?.gender;
    const g2Gender = settings?.masterChaperones?.find((c) => c.name === secondaryGuideName || c.id === secondaryGuideName)?.gender;

    const actualRooms = busRooms;
    const totalBusRooms = actualRooms.length;
    const half = Math.ceil(totalBusRooms / 2);

    if (g1Gender && g2Gender && g1Gender !== g2Gender) {
      actualRooms.forEach((r) => {
        if (r.gender === g1Gender) {
          picAssignmentMap.set(r.roomNumber, 'P1');
        } else if (r.gender === g2Gender) {
          picAssignmentMap.set(r.roomNumber, 'P2');
        } else {
          picAssignmentMap.set(r.roomNumber, 'P1');
        }
      });
      const p1C = Array.from(picAssignmentMap.values()).filter((v) => v === 'P1').length;
      const p2C = Array.from(picAssignmentMap.values()).filter((v) => v === 'P2').length;
      if (Math.abs(p1C - p2C) > 2) {
        actualRooms.forEach((r, idx) => {
          picAssignmentMap.set(r.roomNumber, idx < half ? 'P1' : 'P2');
        });
      }
    } else {
      actualRooms.forEach((r, idx) => {
        picAssignmentMap.set(r.roomNumber, idx < half ? 'P1' : 'P2');
      });
    }

    const p1Count = Array.from(picAssignmentMap.values()).filter((v) => v === 'P1').length;
    const p2Count = Array.from(picAssignmentMap.values()).filter((v) => v === 'P2').length;

    // Standardize to exactly 12 room blocks per sheet for uniform 1-page fit across all buses
    const FIXED_ROOM_BLOCKS = 12;
    const emptyRoomCount = Math.max(0, FIXED_ROOM_BLOCKS - busRooms.length);
    const allRoomBlocks: {
      isPlaceholder: boolean;
      placeholderIdx?: number;
      room?: (typeof busRooms)[0];
    }[] = [];

    busRooms.forEach((r) => {
      allRoomBlocks.push({ isPlaceholder: false, room: r });
    });

    for (let p = 0; p < emptyRoomCount; p++) {
      allRoomBlocks.push({
        isPlaceholder: true,
        placeholderIdx: busRooms.length + p + 1,
      });
    }

    const isDenseBus = true; // Standardized for exact 1-page fit across all pages

    return (
      <div
        key={sheetKey}
        className="bus-a4-page w-[200mm] min-w-[200mm] max-w-[200mm] mx-auto bg-white pt-0 px-1 pb-0.5 text-slate-900 mb-6 block font-['Tahoma',Geneva,sans-serif] text-[9px] leading-none"
      >
        {/* TOP SECTION: Header + Table */}
        <div className="space-y-0.5">
          {/* Header Kop Surat Bus - Clean Bar Layout */}
          <div className="border-b-2 border-black pb-0.5 mb-0.5 font-['Tahoma',Geneva,sans-serif] flex items-center justify-between gap-2">
            {/* Left: School Logo & Name */}
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                <SchoolLogo
                  src={settings?.appLogoUrl}
                  className="w-4 h-4 object-contain"
                  alt="Logo Sekolah"
                />
              </div>
              <div className="min-w-0">
                <h4 className="text-[9px] font-black tracking-wider text-slate-900 uppercase leading-none font-['Tahoma',sans-serif] truncate">
                  {schoolInfo.name}
                </h4>
                <p className="text-[7.5px] text-slate-600 font-bold leading-none mt-0.5 font-['Tahoma',sans-serif]">
                  {waveLabel} • TA 2025/2026
                </p>
              </div>
            </div>

            {/* Center: Document Title & Bus Badge */}
            <div className="flex items-center justify-center gap-1 shrink-0">
              <span className="text-[9.5px] font-black text-slate-950 uppercase tracking-tight leading-none font-['Tahoma',sans-serif]">
                MANIFEST KAMAR & ABSENSI
              </span>
              <span className="px-1 py-0.2 bg-slate-900 text-amber-400 rounded-xs text-[8px] font-black shrink-0 leading-none">
                {isUnassigned ? 'TANPA BUS' : `BUS #${busNum}`}
              </span>
            </div>

            {/* Right: Summary Badge */}
            <div className="text-right shrink-0">
              <div className="border border-black px-1 py-0.2 bg-slate-50 text-[8px] font-black text-slate-900 inline-block rounded-xs leading-none">
                {totalOccupants} SISWA • {busRooms.length} KAMAR
              </div>
              <div className="text-[7px] text-slate-600 font-semibold leading-none mt-0.5">
                Putri: {femaleRooms.length} | Putra: {maleRooms.length} • PIC: P1 ({p1Count}) • P2 ({p2Count})
              </div>
            </div>
          </div>

          {/* Table Container */}
          <table className="w-full text-left border-collapse border border-black table-fixed font-['Tahoma',sans-serif]">
            <thead>
              <tr className="bg-slate-100 text-[8.5px] font-black text-slate-900 leading-[10px] h-[10px] max-h-[10px]">
                <th rowSpan={2} className="w-[6.5%] text-center py-0 px-0.5 border border-black font-['Tahoma',sans-serif]">
                  NO. KMR
                </th>
                <th rowSpan={2} className="w-[11.5%] text-center py-0 px-0.5 border border-black font-['Tahoma',sans-serif]">
                  KELAS
                </th>
                <th rowSpan={2} className="w-[39%] py-0 px-1 border border-black text-left font-['Tahoma',sans-serif]">
                  NAMA SISWA
                </th>
                <th rowSpan={2} className="w-[4%] text-center py-0 border border-black font-['Tahoma',sans-serif]">
                  L/P
                </th>
                <th rowSpan={2} className="w-[7%] text-center py-0 border border-black font-['Tahoma',sans-serif]">
                  STATUS
                </th>
                <th rowSpan={2} className="w-[7%] text-center py-0 border border-black font-['Tahoma',sans-serif]">
                  NO. BUS
                </th>
                <th rowSpan={2} className="w-[6.5%] text-center py-0 border border-black font-['Tahoma',sans-serif]">
                  BERANGKAT
                </th>
                <th colSpan={3} className="w-[12%] text-center py-0 border border-black bg-slate-200 font-['Tahoma',sans-serif]">
                  ABSENSI HOTEL
                </th>
                <th rowSpan={2} className="w-[7%] text-center py-0 border border-black font-['Tahoma',sans-serif]">
                  PULANG
                </th>
              </tr>
              <tr className="bg-slate-100 text-[8px] font-black text-slate-900 leading-[10px] h-[10px] max-h-[10px]">
                <th className="w-[4%] text-center py-0 border border-black font-['Tahoma',sans-serif]">H1</th>
                <th className="w-[4%] text-center py-0 border border-black font-['Tahoma',sans-serif]">H2</th>
                <th className="w-[4%] text-center py-0 border border-black font-['Tahoma',sans-serif]">H3</th>
              </tr>
            </thead>
            <tbody>
              {allRoomBlocks.map((block, blockIdx) => {
                if (!block.isPlaceholder && block.room) {
                  const room = block.room;
                  const roomStudents = room.occupants || [];
                  const emptySlots = Math.max(0, defaultRoomCapacity - roomStudents.length);

                  const allSlots: {
                    key: string;
                    isStudent: boolean;
                    student?: Student;
                  }[] = [];

                  roomStudents.forEach((st) => {
                    allSlots.push({ key: `st-${st.id}`, isStudent: true, student: st });
                  });

                  for (let i = 0; i < emptySlots; i++) {
                    allSlots.push({ key: `empty-${room.id}-${i}`, isStudent: false });
                  }

                  const totalRows = allSlots.length || 1;

                  return allSlots.map((slot, slotIdx) => {
                    const isFirstRowOfRoom = slotIdx === 0;

                    return (
                      <tr
                        key={slot.key}
                        className={`text-[8.5px] leading-[10px] font-['Tahoma',sans-serif] h-[10px] max-h-[10px] ${
                          !slot.isStudent ? 'bg-amber-50/20' : 'bg-white'
                        }`}
                      >
                        {/* No. Kamar (Urut 1, 2, 3, dst.) */}
                        {isFirstRowOfRoom && (
                          <td
                            rowSpan={totalRows}
                            className="text-center font-black text-slate-900 align-middle py-0 px-0.5 border border-black bg-slate-50"
                          >
                            <div className="text-[8.5px] font-black tracking-tight leading-none">{blockIdx + 1}</div>
                            <div className="text-[6.5px] text-slate-500 font-bold uppercase leading-none mt-0.5">
                              {room.gender === 'PEREMPUAN' ? 'Putri' : 'Putra'} • <span className="text-indigo-900 font-black">{picAssignmentMap.get(room.roomNumber) || 'P1'}</span>
                            </div>
                          </td>
                        )}

                        {/* Kelas */}
                        <td className="text-center font-bold text-slate-800 py-0 px-0.5 border border-black truncate text-[8.5px] leading-[10px]">
                          {slot.isStudent ? slot.student?.className || '-' : '-'}
                        </td>

                        {/* Nama Siswa */}
                        <td className="py-0 px-0.5 font-bold text-slate-900 border border-black truncate text-[8.5px] leading-[10px]">
                          {slot.isStudent ? (
                            <span className="truncate block w-full whitespace-nowrap">{slot.student?.name}</span>
                          ) : (
                            <span className="text-amber-800/60 italic font-normal text-[7.5px] whitespace-nowrap">
                              [ Slot Bed Kosong ]
                            </span>
                          )}
                        </td>

                        {/* L/P */}
                        <td className="text-center font-bold text-slate-700 py-0 px-0 border border-black text-[8.5px] leading-[10px]">
                          {slot.isStudent
                            ? slot.student?.gender === 'PEREMPUAN'
                              ? 'P'
                              : 'L'
                            : '-'}
                        </td>

                        {/* Status */}
                        <td className="text-center font-extrabold py-0 px-0 border border-black text-[8.5px] leading-[10px]">
                          {slot.isStudent ? (
                            <span className="text-emerald-700">Terisi</span>
                          ) : (
                            <span className="text-amber-600 font-medium">Kosong</span>
                          )}
                        </td>

                        {/* No. Bus */}
                        <td className="text-center font-bold text-slate-800 py-0 px-0 border border-black truncate text-[8.5px] leading-[10px]">
                          {slot.isStudent
                            ? slot.student?.busNumber
                              ? `Bus ${slot.student.busNumber}`
                              : 'Tanpa Bus'
                            : '-'}
                        </td>

                        {/* Absensi Keberangkatan */}
                        <td className="text-center py-0 border border-black bg-slate-50/50">
                          <div className="w-1.5 h-1.5 mx-auto border border-slate-400 rounded-[1px]"></div>
                        </td>

                        {/* Absensi Hotel H1 */}
                        <td className="text-center py-0 border border-black bg-slate-50/30">
                          <div className="w-1.5 h-1.5 mx-auto border border-slate-300 rounded-[1px]"></div>
                        </td>

                        {/* Absensi Hotel H2 */}
                        <td className="text-center py-0 border border-black bg-slate-50/30">
                          <div className="w-1.5 h-1.5 mx-auto border border-slate-300 rounded-[1px]"></div>
                        </td>

                        {/* Absensi Hotel H3 */}
                        <td className="text-center py-0 border border-black bg-slate-50/30">
                          <div className="w-1.5 h-1.5 mx-auto border border-slate-300 rounded-[1px]"></div>
                        </td>

                        {/* Absensi Pulang */}
                        <td className="text-center py-0 border border-black bg-slate-50/50">
                          <div className="w-1.5 h-1.5 mx-auto border border-slate-400 rounded-[1px]"></div>
                        </td>
                      </tr>
                    );
                  });
                } else {
                  // Placeholder Room Block (4 empty slots for manual field notes/cadangan)
                  const placeholderRows = Array.from({ length: defaultRoomCapacity || 4 });
                  return placeholderRows.map((_, pIdx) => {
                    const isFirst = pIdx === 0;
                    return (
                      <tr
                        key={`ph-room-${block.placeholderIdx}-${pIdx}`}
                        className="text-[8px] leading-[10px] bg-slate-50/20 h-[10px] max-h-[10px]"
                      >
                        {isFirst && (
                          <td
                            rowSpan={defaultRoomCapacity || 4}
                            className="text-center font-bold text-slate-400 align-middle py-0 px-0.5 border border-black bg-slate-50/40"
                          >
                            <div className="text-[8.5px] font-bold text-slate-500 leading-none">{blockIdx + 1}</div>
                            <div className="text-[6px] text-slate-400 font-medium uppercase leading-none mt-0.5">Cadangan</div>
                          </td>
                        )}
                        <td className="text-center font-normal text-slate-400 py-0 px-0.5 border border-black text-[7.5px] leading-[10px]">-</td>
                        <td className="py-0 px-1 font-normal text-slate-400/80 italic border border-black text-[7.5px] leading-[10px]">
                          [ Slot Kamar Cadangan / Catatan Lapangan ]
                        </td>
                        <td className="text-center font-normal text-slate-400 py-0 border border-black text-[7.5px] leading-[10px]">-</td>
                        <td className="text-center font-normal text-slate-400 py-0 border border-black text-[7.5px] leading-[10px]">-</td>
                        <td className="text-center font-normal text-slate-400 py-0 border border-black text-[7.5px] leading-[10px]">-</td>
                        <td className="text-center py-0 border border-black bg-slate-50/20">
                          <div className="w-1.5 h-1.5 mx-auto border border-slate-300 rounded-[1px]"></div>
                        </td>
                        <td className="text-center py-0 border border-black bg-slate-50/10">
                          <div className="w-1.5 h-1.5 mx-auto border border-slate-200 rounded-[1px]"></div>
                        </td>
                        <td className="text-center py-0 border border-black bg-slate-50/10">
                          <div className="w-1.5 h-1.5 mx-auto border border-slate-200 rounded-[1px]"></div>
                        </td>
                        <td className="text-center py-0 border border-black bg-slate-50/10">
                          <div className="w-1.5 h-1.5 mx-auto border border-slate-200 rounded-[1px]"></div>
                        </td>
                        <td className="text-center py-0 border border-black bg-slate-50/20">
                          <div className="w-1.5 h-1.5 mx-auto border border-slate-300 rounded-[1px]"></div>
                        </td>
                      </tr>
                    );
                  });
                }
              })}
            </tbody>
          </table>

          {/* Operational Notes - Ultra Compact Single Line */}
          <div className="border border-black px-1 py-0.5 bg-slate-50/50 text-[7px] text-slate-900 rounded-xs no-page-break-inside font-['Tahoma',sans-serif]">
            <div className="grid grid-cols-12 gap-1 items-center">
              <div className="col-span-6 border-r border-slate-300 pr-1">
                <div className="flex items-center gap-1 text-[6.5px] font-medium text-slate-800 flex-nowrap">
                  <span className="font-black text-[7px] uppercase tracking-tight text-slate-950">📌 SIMBOL:</span>
                  <span><strong className="border border-slate-400 px-0.5 rounded-xs bg-white text-[6.5px]">✓</strong> Hadir</span>
                  <span><strong className="border border-slate-400 px-0.5 rounded-xs bg-white text-[6.5px]">S</strong> Sakit</span>
                  <span><strong className="border border-slate-400 px-0.5 rounded-xs bg-white text-[6.5px]">I</strong> Izin</span>
                  <span><strong className="border border-slate-400 px-0.5 rounded-xs bg-white text-[6.5px]">P</strong> Pindah</span>
                </div>
              </div>

              <div className="col-span-6">
                <div className="flex items-center gap-1 text-[6.5px]">
                  <span className="font-black text-[7px] uppercase tracking-tight text-slate-950 whitespace-nowrap">📝 CATATAN:</span>
                  <div className="border-b border-dashed border-slate-400 flex-1 h-1"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Signatures Area */}
        <RoomPrintSignatureMatrix
          waveOrDestination={selectedWave}
          bus={busObj}
          busNumber={busNum}
          isUnassigned={isUnassigned}
          schoolName={schoolInfo.name}
          settings={settings}
        />
      </div>
    );
  };

  // Render Chaperone Rooms Sheet
  const renderChaperoneSheet = () => {
    const waveLabel = getWaveLabel(selectedWave);
    const totalChaperonesAssigned = derivedChaperoneRooms.reduce((acc, r) => acc + r.chaperones.length, 0);

    return (
      <div
        className="bus-a4-page chaperone-sheet w-[210mm] min-w-[210mm] bg-white p-2.5 text-slate-900 mb-4 block"
      >
        <div className="space-y-0.5">
          {/* Header Kop Surat */}
          <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <SchoolLogo
                  src={settings?.appLogoUrl}
                  className="w-8 h-8 object-contain"
                  alt="Logo Sekolah"
                />
              </div>
              <div>
                <h4 className="text-[12px] font-black tracking-wider text-slate-900 uppercase leading-tight">
                  {schoolInfo.name}
                </h4>
                <p className="text-[11px] text-slate-600 font-bold leading-none mt-0.5">
                  {waveLabel} • TA 2025/2026
                </p>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-[13px] font-black text-slate-950 uppercase tracking-tight flex items-center justify-center gap-1.5 leading-tight">
                <span>MANIFEST KAMAR GURU PENDAMPING & WALI KELAS</span>
              </h2>
            </div>

            <div className="text-right">
              <div className="border border-black px-2 py-0.5 bg-slate-50 text-[11px] font-black text-slate-900 inline-block rounded-xs">
                {totalChaperonesAssigned} GURU • {derivedChaperoneRooms.length} KAMAR
              </div>
            </div>
          </div>

          {/* Chaperone Room Table */}
          <table className="chaperone-table w-full text-left border-collapse border border-black table-fixed">
            <thead>
              <tr className="bg-slate-100 text-[12px] font-black text-slate-900 leading-tight">
                <th className="w-[11%] text-center py-1 border border-black">
                  NO. KAMAR
                </th>
                <th className="w-[49%] py-1 px-2 border border-black text-left">
                  NAMA GURU / WALI KELAS
                </th>
                <th className="w-[14%] text-center py-1 border border-black">
                  ARMADA BUS
                </th>
                <th className="w-[13%] text-center py-1 border border-black bg-slate-200">
                  TTD BERANGKAT
                </th>
                <th className="w-[13%] text-center py-1 border border-black bg-slate-200">
                  TTD PULANG
                </th>
              </tr>
            </thead>
            <tbody>
              {derivedChaperoneRooms.map((room) => {
                const chaps = room.chaperones;
                const totalRows = chaps.length || 1;

                return chaps.map((chap, idx) => {
                  const isFirstRow = idx === 0;
                  
                  // Clean chaperone name to only display name & degree (removes trailing parentheses like (tkr) or (panitia))
                  const parenIdx = chap.name.indexOf('(');
                  const cleanedName = parenIdx !== -1 ? chap.name.substring(0, parenIdx).trim() : chap.name;

                  return (
                    <tr key={`${room.roomNumber}-${chap.id}`} className="text-[12px] leading-tight bg-white">
                      {isFirstRow && (
                        <td
                          rowSpan={totalRows}
                          className="text-center font-black text-slate-900 align-middle py-1 border border-black bg-slate-50"
                        >
                          <div className="text-[13px] font-black">{room.displayRoomNumber ?? room.roomNumber}</div>
                          <div className="text-[10px] text-slate-600 font-bold uppercase mt-0.5">
                            {room.gender === 'PEREMPUAN' ? 'Putri' : 'Putra'}
                          </div>
                        </td>
                      )}

                      <td className="py-1 px-2 font-black text-slate-900 border border-black truncate">
                        <span className="truncate block max-w-[320px] whitespace-nowrap text-[12px]">{cleanedName}</span>
                        {chap.role && (
                          <span className="text-[10.5px] font-semibold text-slate-500 block truncate">
                            {chap.role === 'WALI_KELAS' ? `Wali Kelas ${chap.department || ''}` : chap.role}
                          </span>
                        )}
                      </td>

                      <td className="text-center font-bold text-slate-800 py-1 border border-black text-[12px]">
                        {chap.busNumber ? `Bus #${chap.busNumber}` : 'Panitia'}
                      </td>

                      <td className="text-center py-1 border border-black bg-slate-50/20">
                        <div className="w-full h-5 flex items-end justify-center">
                          <span className="text-[9px] text-slate-300 print:text-transparent">paraf</span>
                        </div>
                      </td>
                      <td className="text-center py-1 border border-black bg-slate-50/20">
                        <div className="w-full h-5 flex items-end justify-center">
                          <span className="text-[9px] text-slate-300 print:text-transparent">paraf</span>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="pt-2 no-page-break-inside mt-2">
          <div className="text-right text-[11px] font-bold text-slate-900 mb-0.5 pr-6">
            <span>Ponorogo, ............................................ 2025</span>
          </div>

          <div className="flex justify-end text-center text-[12px] font-bold text-slate-900 border-t border-black pt-1 pr-6">
            <div className="w-[220px]">
              <p className="font-black uppercase tracking-tight">Ketua Panitia</p>
              <p className="text-[10.5px] text-slate-600 font-medium">{schoolInfo.name}</p>
              <div className="h-8"></div>
              <p className="font-extrabold text-[12px]">( ............................................................ )</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible print:z-auto print:block print:w-full print:h-auto">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: Tahoma, 'Segoe UI', Geneva, Verdana, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide non-print elements */
          header, footer, nav, .no-print, button, select {
            display: none !important;
          }
          .fixed.inset-0 {
            position: static !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
            max-height: none !important;
            border: none !important;
            box-shadow: none !important;
          }
          .max-w-6xl {
            max-width: none !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .overflow-x-auto, .overflow-y-auto {
            overflow: visible !important;
          }
          #batch-room-print-container {
            display: block !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .bus-a4-page {
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 287mm !important;
            max-height: 287mm !important;
            margin: 0 auto !important;
            padding: 3mm 4mm !important;
            box-shadow: none !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            font-family: Tahoma, 'Segoe UI', Geneva, Verdana, sans-serif !important;
            overflow: hidden !important;
            background: white !important;
          }
          .bus-a4-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .no-page-break-inside {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          table {
            width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Tahoma, 'Segoe UI', Geneva, Verdana, sans-serif !important;
          }
          tr {
            height: 10px !important;
            max-height: 10px !important;
          }
          th, td {
            border: 1px solid #000000 !important;
            padding: 0 !important;
            font-size: 8.5px !important;
            height: 10px !important;
            line-height: 10px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            font-family: Tahoma, 'Segoe UI', Geneva, Verdana, sans-serif !important;
          }
          .dense-a4-page tr {
            height: 10px !important;
            max-height: 10px !important;
          }
          .dense-a4-page th, .dense-a4-page td {
            padding: 0 !important;
            font-size: 8.5px !important;
            height: 10px !important;
            line-height: 10px !important;
          }
          .chaperone-table {
            font-size: 11px !important;
          }
          .chaperone-table th, .chaperone-table td {
            font-size: 11px !important;
            padding: 3px 5px !important;
            line-height: 1.2 !important;
            white-space: normal !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: 800 !important;
            text-align: center !important;
          }
          .room-signature-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            text-align: center !important;
          }
          .room-signature-col {
            text-align: center !important;
          }
        }
      `}</style>
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:block print:w-full print:p-0 print:m-0">
        {/* MODAL HEADER: Control Bar */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 shrink-0 no-print print:hidden border-b border-slate-800 space-y-3">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                <BusIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                    Manifest Kamar & Absensi {roomType === 'CHAPERONE' ? 'Guru Pendamping' : 'Siswa'} (A4)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    {roomType === 'CHAPERONE' ? `${derivedChaperoneRooms.length} Kamar Guru` : `${busSheets.length} Lembar Bus`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Dokumen manifest resmi kamar per armada bus siap cetak untuk absensi & tanggung jawab guru pendamping.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Control Bar: Mode Toggle, Filters, Zoom & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80">
            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Toggle: Siswa vs Guru */}
              <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setRoomType('STUDENT')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    roomType === 'STUDENT'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Siswa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoomType('CHAPERONE')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    roomType === 'CHAPERONE'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Guru Pendamping</span>
                </button>
              </div>

              {/* Wave Selector */}
              <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-300 font-bold text-[11px]">Gelombang:</span>
                <select
                  value={selectedWave}
                  onChange={(e) => setSelectedWave(e.target.value)}
                  className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-lg border border-slate-600 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Semua Gelombang</option>
                  {schoolMetadata.waves.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bus Selector (For Student Mode) */}
              {roomType === 'STUDENT' && (
                <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700 text-xs">
                  <BusIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-300 font-bold text-[11px]">Pilih Bus:</span>
                  <select
                    value={selectedBus}
                    onChange={(e) => setSelectedBus(e.target.value)}
                    className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-lg border border-slate-600 focus:outline-hidden cursor-pointer"
                  >
                    <option value="ALL">Semua Bus (1 Lembar per Bus)</option>
                    {availableBuses.map((b) => (
                      <option key={b} value={String(b)}>
                        Bus {b}
                      </option>
                    ))}
                    <option value="UNASSIGNED">Siswa Tanpa Bus</option>
                  </select>
                </div>
              )}

              {/* Gender Selector (For Student Mode) */}
              {roomType === 'STUDENT' && (
                <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700 text-xs">
                  <span className="text-slate-300 font-bold text-[11px]">Gender:</span>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-lg border border-slate-600 focus:outline-hidden cursor-pointer"
                  >
                    <option value="ALL">Semua Gender</option>
                    <option value="PEREMPUAN">Putri Saja</option>
                    <option value="LAKI-LAKI">Putra Saja</option>
                  </select>
                </div>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                  title="Perkecil Tampilan"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleSetScale(0.5)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      zoomScale === 0.5
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetScale(0.75)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      zoomScale === 0.75
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetScale(1)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      zoomScale === 1
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    100%
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                  title="Perbesar Tampilan"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Action Buttons: PDF, Excel, Print */}
            <div className="flex flex-wrap items-center gap-2">
              {roomType === 'STUDENT' && (
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  disabled={isExportingExcel || derivedRooms.length === 0}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Unduh format spreadsheet Excel dengan kolom absensi"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{isExportingExcel ? 'Mengekspor...' : 'Unduh Excel'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Unduh dokumen PDF A4 siap cetak per bus"
              >
                {isGeneratingPdf ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-slate-300" />
                )}
                <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Unduh PDF (A4)'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                title="Cetak Dokumen langsung via printer A4"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>
                  Cetak A4 ({roomType === 'CHAPERONE' ? '1 Lembar Guru' : `${busSheets.length} Lembar Bus`})
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Preview Canvas Container */}
        <div className="p-3 sm:p-6 overflow-x-auto overflow-y-auto bg-slate-200/90 flex-1 flex flex-col items-center print:p-0 print:m-0 print:overflow-visible print:bg-white print:block">
          {/* Notice Banner */}
          <div className="w-full max-w-[210mm] bg-white border border-slate-300 rounded-xl p-3 mb-3 text-xs text-slate-800 flex items-center justify-between no-print print:hidden shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {roomType === 'CHAPERONE'
                  ? 'Manifest kamar khusus Guru Pendamping, Wali Kelas, dan Panitia Darmawisata.'
                  : 'Setiap armada bus dicetak tepat 1 lembar A4 untuk pegangan Guru Pendamping Bus.'}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold text-slate-600">
              {roomType === 'STUDENT' ? (
                <>
                  <span>Total Lembar: <strong className="text-slate-900">{busSheets.length} Bus</strong></span>
                  <span>•</span>
                  <span>Total Siswa: <strong className="text-emerald-700">{filteredStudents.length}</strong></span>
                </>
              ) : (
                <span>Total Kamar Guru: <strong className="text-amber-700">{derivedChaperoneRooms.length} Kamar</strong></span>
              )}
            </div>
          </div>

          {/* Scalable A4 Document Sheet */}
          <div
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
          >
            <div id="batch-room-print-container" ref={docContainerRef}>
              {roomType === 'CHAPERONE' ? (
                derivedChaperoneRooms.length > 0 ? (
                  renderChaperoneSheet()
                ) : (
                  <div className="w-[210mm] min-w-[210mm] bg-white p-12 text-center border border-dashed border-slate-300 rounded-xl space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-600 font-bold">
                      Belum ada alokasi kamar pendamping untuk gelombang yang dipilih.
                    </p>
                  </div>
                )
              ) : busSheets.length > 0 ? (
                busSheets.map((sheet) => renderSingleBusSheet(sheet))
              ) : (
                <div className="w-[210mm] min-w-[210mm] bg-white p-12 text-center border border-dashed border-slate-300 rounded-xl space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 font-bold">
                    Belum ada alokasi kamar terbentuk untuk filter yang dipilih.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
