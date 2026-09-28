'use client';

import React, { useState } from 'react';
import { Bus, Student, WaveType, AppSettings, SchoolClass } from '@/types';
import { motion } from 'motion/react';
import { WaveBadge } from '@/components/ui/Badge';
import { getAllDerivedChaperones } from '@/lib/utils';
import { 
  Bus as BusIcon, 
  User, 
  Trash2, 
  Plus, 
  Check,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  Edit2,
  Settings,
  HelpCircle,
  Download,
  Loader2
} from 'lucide-react';
import { generateBusManifestPDF } from '@/lib/pdf/entityReportGenerator';
import { useTableQuery } from '@/hooks/useTableQuery';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { Modal } from '@/components/ui/Modal';

interface BusManagerProps {
  buses: Bus[];
  students: Student[];
  classes?: SchoolClass[];
  onUpdateStudent: (student: Student) => void;
  onBulkImportStudents?: (importedStudents: Student[]) => void;
  settings?: AppSettings;
  onSaveSettings?: (settings: AppSettings) => void;
  onAutoAllocateBuses?: () => void;
}

export const BusManager: React.FC<BusManagerProps> = ({
  buses,
  students,
  classes = [],
  onUpdateStudent,
  onBulkImportStudents,
  settings,
  onSaveSettings,
  onAutoAllocateBuses,
}) => {
  const allChaperones = React.useMemo(() => getAllDerivedChaperones(settings?.masterChaperones || [], classes), [settings?.masterChaperones, classes]);
  
  const getChaperoneName = (chaperoneIdOrName?: string) => {
    if (!chaperoneIdOrName) return null;
    const found = allChaperones.find(c => c.id === chaperoneIdOrName);
    return found ? found.name : chaperoneIdOrName;
  };

  const [assigningStudentId, setAssigningStudentId] = useState('');
  const [assigningBusNum, setAssigningBusNum] = useState<number | null>(null);
  const [assigningSeatNum, setAssigningSeatNum] = useState<number>(3);

  // Bus Settings Modal State
  const [isLocalSettingsOpen, setIsLocalSettingsOpen] = useState(false);
  const [localSettingsTab, setLocalSettingsTab] = useState<'default' | 'BALI_GEL_1' | 'BALI_GEL_2' | 'YOGYA_GEL_1'>('default');

  // Form states initialized from settings or defaults
  const [defaultBusCapacity, setDefaultBusCapacity] = useState(settings?.defaultBusCapacity || 50);
  const [busVacantSeats, setBusVacantSeats] = useState(settings?.busVacantSeats || '1-2');
  const [busFemaleArrangement, setBusFemaleArrangement] = useState(settings?.busFemaleArrangement || 'class');
  const [busStrictOddPairing, setBusStrictOddPairing] = useState(settings?.busStrictOddPairing || false);
  const [busNumberingMode, setBusNumberingMode] = useState(settings?.busNumberingMode || 'per-wave');
  const [seatPackingStrategy, setSeatPackingStrategy] = useState(settings?.seatPackingStrategy || 'compact');

  // Wave specific overrides states for Bus
  const [useWave1BusOverride, setUseWave1BusOverride] = useState(!!settings?.waveBusSettings?.BALI_GEL_1);
  const [wave1BusCapacity, setWave1BusCapacity] = useState(settings?.waveBusSettings?.BALI_GEL_1?.defaultBusCapacity || 50);
  const [wave1BusVacantSeats, setWave1BusVacantSeats] = useState(settings?.waveBusSettings?.BALI_GEL_1?.busVacantSeats || '1-2');
  const [wave1BusFemaleArr, setWave1BusFemaleArr] = useState(settings?.waveBusSettings?.BALI_GEL_1?.busFemaleArrangement || 'class');
  const [wave1BusGenderPriority, setWave1BusGenderPriority] = useState(settings?.waveBusSettings?.BALI_GEL_1?.busGenderPriority || 'female-front');

  const [useWave2BusOverride, setUseWave2BusOverride] = useState(!!settings?.waveBusSettings?.BALI_GEL_2);
  const [wave2BusCapacity, setWave2BusCapacity] = useState(settings?.waveBusSettings?.BALI_GEL_2?.defaultBusCapacity || 50);
  const [wave2BusVacantSeats, setWave2BusVacantSeats] = useState(settings?.waveBusSettings?.BALI_GEL_2?.busVacantSeats || '1-2');
  const [wave2BusFemaleArr, setWave2BusFemaleArr] = useState(settings?.waveBusSettings?.BALI_GEL_2?.busFemaleArrangement || 'class');
  const [wave2BusGenderPriority, setWave2BusGenderPriority] = useState(settings?.waveBusSettings?.BALI_GEL_2?.busGenderPriority || 'female-front');

  const [useYogyaBusOverride, setUseYogyaBusOverride] = useState(!!settings?.waveBusSettings?.YOGYA_GEL_1);
  const [yogyaBusCapacity, setYogyaBusCapacity] = useState(settings?.waveBusSettings?.YOGYA_GEL_1?.defaultBusCapacity || 50);
  const [yogyaBusVacantSeats, setYogyaBusVacantSeats] = useState(settings?.waveBusSettings?.YOGYA_GEL_1?.busVacantSeats || '1-2');
  const [yogyaBusFemaleArr, setYogyaBusFemaleArr] = useState(settings?.waveBusSettings?.YOGYA_GEL_1?.busFemaleArrangement || 'class');
  const [yogyaBusGenderPriority, setYogyaBusGenderPriority] = useState(settings?.waveBusSettings?.YOGYA_GEL_1?.busGenderPriority || 'female-front');

  // Sync state if settings changed externally
  React.useEffect(() => {
    if (settings) {
      setDefaultBusCapacity(settings.defaultBusCapacity || 50);
      setBusVacantSeats(settings.busVacantSeats || '1-2');
      setBusFemaleArrangement(settings.busFemaleArrangement || 'class');
      setBusStrictOddPairing(settings.busStrictOddPairing || false);
      setBusNumberingMode(settings.busNumberingMode || 'per-wave');
      setSeatPackingStrategy(settings.seatPackingStrategy || 'compact');

      setUseWave1BusOverride(!!settings.waveBusSettings?.BALI_GEL_1);
      setWave1BusCapacity(settings.waveBusSettings?.BALI_GEL_1?.defaultBusCapacity || 50);
      setWave1BusVacantSeats(settings.waveBusSettings?.BALI_GEL_1?.busVacantSeats || '1-2');
      setWave1BusFemaleArr(settings.waveBusSettings?.BALI_GEL_1?.busFemaleArrangement || 'class');
      setWave1BusGenderPriority(settings.waveBusSettings?.BALI_GEL_1?.busGenderPriority || 'female-front');

      setUseWave2BusOverride(!!settings.waveBusSettings?.BALI_GEL_2);
      setWave2BusCapacity(settings.waveBusSettings?.BALI_GEL_2?.defaultBusCapacity || 50);
      setWave2BusVacantSeats(settings.waveBusSettings?.BALI_GEL_2?.busVacantSeats || '1-2');
      setWave2BusFemaleArr(settings.waveBusSettings?.BALI_GEL_2?.busFemaleArrangement || 'class');
      setWave2BusGenderPriority(settings.waveBusSettings?.BALI_GEL_2?.busGenderPriority || 'female-front');

      setUseYogyaBusOverride(!!settings.waveBusSettings?.YOGYA_GEL_1);
      setYogyaBusCapacity(settings.waveBusSettings?.YOGYA_GEL_1?.defaultBusCapacity || 50);
      setYogyaBusVacantSeats(settings.waveBusSettings?.YOGYA_GEL_1?.busVacantSeats || '1-2');
      setYogyaBusFemaleArr(settings.waveBusSettings?.YOGYA_GEL_1?.busFemaleArrangement || 'class');
      setYogyaBusGenderPriority(settings.waveBusSettings?.YOGYA_GEL_1?.busGenderPriority || 'female-front');
    }
  }, [settings]);

  const handleSaveBusSettingsLocal = () => {
    if (!onSaveSettings || !settings) return;

    const updatedWaveSettings = { ...(settings.waveBusSettings || {}) };

    if (useWave1BusOverride) {
      updatedWaveSettings.BALI_GEL_1 = {
        ...updatedWaveSettings.BALI_GEL_1,
        defaultBusCapacity: wave1BusCapacity,
        busVacantSeats: wave1BusVacantSeats,
        busFemaleArrangement: wave1BusFemaleArr,
        busGenderPriority: wave1BusGenderPriority,
      };
    } else {
      delete updatedWaveSettings.BALI_GEL_1;
    }

    if (useWave2BusOverride) {
      updatedWaveSettings.BALI_GEL_2 = {
        ...updatedWaveSettings.BALI_GEL_2,
        defaultBusCapacity: wave2BusCapacity,
        busVacantSeats: wave2BusVacantSeats,
        busFemaleArrangement: wave2BusFemaleArr,
        busGenderPriority: wave2BusGenderPriority,
      };
    } else {
      delete updatedWaveSettings.BALI_GEL_2;
    }

    if (useYogyaBusOverride) {
      updatedWaveSettings.YOGYA_GEL_1 = {
        ...updatedWaveSettings.YOGYA_GEL_1,
        defaultBusCapacity: yogyaBusCapacity,
        busVacantSeats: yogyaBusVacantSeats,
        busFemaleArrangement: yogyaBusFemaleArr,
        busGenderPriority: yogyaBusGenderPriority,
      };
    } else {
      delete updatedWaveSettings.YOGYA_GEL_1;
    }

    const newSettings: AppSettings = {
      ...settings,
      defaultBusCapacity,
      busVacantSeats,
      busFemaleArrangement,
      busStrictOddPairing,
      busNumberingMode,
      seatPackingStrategy,
      waveBusSettings: updatedWaveSettings,
    };

    onSaveSettings(newSettings);
    setIsLocalSettingsOpen(false);
  };

  // Custom bus guide editing state
  const [editingBusId, setEditingBusId] = useState<string | null>(null);
  const [editGuide1, setEditGuide1] = useState('');
  const [editGuide2, setEditGuide2] = useState('');
  const [editGuide3, setEditGuide3] = useState('');
  const [editGuide4, setEditGuide4] = useState('');

  const handleStartEditingGuides = (
    busId: string, 
    current1: string, 
    current2: string,
    current3?: string,
    current4?: string
  ) => {
    setEditingBusId(busId);
    setEditGuide1(current1);
    setEditGuide2(current2);
    setEditGuide3(current3 || '');
    setEditGuide4(current4 || '');
  };

  const handleSaveBusGuides = (busId: string) => {
    if (!onSaveSettings || !settings) return;

    const updatedCustomGuides = {
      ...(settings.customBusGuides || {}),
      [busId]: {
        guide1: editGuide1,
        guide2: editGuide2,
        guide3: editGuide3,
        guide4: editGuide4,
      },
    };

    onSaveSettings({
      ...settings,
      customBusGuides: updatedCustomGuides,
    });

    setEditingBusId(null);
  };

  // Import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importStatus, setImportStatus] = useState({ type: '', msg: '' });

  const getStudentDept = (clsName: string) => {
    const parts = clsName.split(' ');
    if (parts.length >= 2) return parts[1];
    return clsName;
  };

  const compareStudentsDefault = (a: Student, b: Student) => {
    const deptA = getStudentDept(a.className);
    const deptB = getStudentDept(b.className);
    const deptCompare = deptA.localeCompare(deptB, undefined, { numeric: true, sensitivity: 'base' });
    if (deptCompare !== 0) return deptCompare;

    const classCompare = a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: 'base' });
    if (classCompare !== 0) return classCompare;

    return a.nis.localeCompare(b.nis, undefined, { numeric: true, sensitivity: 'base' });
  };

  // Find students who are registered and eligible for assignment
  const unassignedStudents = students.filter(
    (s) => s.isRegistered && !s.busNumber
  );

  // Unified Table Query for buses list
  const {
    search,
    setSearch,
    filters,
    setFilters,
    handleClearFilters,
    pagination,
    processedData: filteredBuses,
    paginatedData,
    totalPages,
    handlePageChange,
  } = useTableQuery<Bus>(buses, {
    searchFields: ['busNumber'],
    initialPageSize: 4,
    filterFn: (bus, activeFilters) => {
      const { wave } = activeFilters;
      if (wave && bus.wave !== wave) return false;
      return true;
    },
    initialSort: { field: 'busNumber', direction: 'asc' },
  });

  const handleAssignStudent = (busNum: number, wave: WaveType) => {
    if (!assigningStudentId) return;
    const student = students.find((s) => s.id === assigningStudentId);
    if (!student) return;

    // Perform check: Is seat already taken in this bus?
    const seatTaken = students.some(
      (s) => s.wave === wave && s.busNumber === busNum && s.seatNumber === assigningSeatNum
    );

    if (seatTaken) {
      alert(`Kursi nomor ${assigningSeatNum} sudah ditempati siswa lain di Bus ${busNum}. Silakan pilih nomor kursi lain.`);
      return;
    }

    onUpdateStudent({
      ...student,
      busNumber: busNum,
      seatNumber: assigningSeatNum,
      wave: wave, // Ensure they are on the correct wave
    });

    // Reset Form
    setAssigningStudentId('');
    setAssigningBusNum(null);
    setAssigningSeatNum(3);
  };

  const handleRemoveStudent = (student: Student) => {
    onUpdateStudent({
      ...student,
      busNumber: undefined,
      seatNumber: undefined,
    });
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportExcel = () => {
    import('@/services/excelService').then(({ ExcelService }) => {
      ExcelService.exportBusesToExcel(filteredBuses, students, settings, 'Data_Manifes_Daftar_Kursi_Bus_Per_Armada');
    });
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await generateBusManifestPDF({
        buses: filteredBuses.length > 0 ? filteredBuses : buses,
        students,
        settings,
        academicYear: settings?.academicYear || '2026/2027',
      });
    } catch (err: any) {
      alert(`Gagal mengekspor PDF Bus: ${err?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus({ type: 'info', msg: 'Membaca file...' });

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

          if (jsonData.length === 0) {
            setImportStatus({ type: 'error', msg: 'File Excel kosong atau tidak valid.' });
            return;
          }

          let assignedCount = 0;
          const updatedStudents = [...students];

          jsonData.forEach((row: any) => {
            const keys = Object.keys(row);
            const findKeyVal = (searchTerms: string[]) => {
              const matchedKey = keys.find(k => searchTerms.some(term => k.toLowerCase().includes(term)));
              return matchedKey ? String(row[matchedKey]).trim() : '';
            };

            const studentName = findKeyVal(['nama', 'siswa', 'peserta']);
            const busNumberRaw = findKeyVal(['bus', 'no bus', 'nomor bus']);
            const busNumber = parseInt(busNumberRaw) || null;
            const seatNumberRaw = findKeyVal(['kursi', 'no kursi', 'nomor kursi', 'seat']);
            const seatNumber = parseInt(seatNumberRaw) || null;

            if (!studentName || !busNumber || !seatNumber) return;

            // Find matching student
            const studentIdx = updatedStudents.findIndex(
              (s) => s.name.toLowerCase() === studentName.toLowerCase() || (s.nis && s.nis === studentName)
            );

            if (studentIdx !== -1) {
              updatedStudents[studentIdx] = {
                ...updatedStudents[studentIdx],
                busNumber,
                seatNumber,
              };
              assignedCount++;
            }
          });

          if (assignedCount > 0 && onBulkImportStudents) {
            onBulkImportStudents(updatedStudents);
            setImportStatus({
              type: 'success',
              msg: `Berhasil mencocokkan dan menempatkan kursi untuk ${assignedCount} siswa di armada Bus!`
            });
          } else {
            setImportStatus({
              type: 'error',
              msg: 'Gagal mengimpor. Pastikan nama siswa di Excel cocok dengan nama terdaftar di database.'
            });
          }
        } catch (err: any) {
          setImportStatus({ type: 'error', msg: `Gagal membaca Excel: ${err.message}` });
        }
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      setImportStatus({ type: 'error', msg: `Gagal memuat modul excel: ${err.message}` });
    }
  };

  return (
    <div className="space-y-6" id="bus-manager-section">
      {/* Upper Information Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-1">
            <BusIcon className="w-3.5 h-3.5 text-indigo-600" /> Fleet & Seat Allocator
          </div>
          <h2 className="text-sm sm:text-lg font-black text-slate-900">Kelola Kursi & Rombongan Bus</h2>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Daftar bus terbit secara otomatis berdasarkan data siswa terdaftar. Anda dapat memantau keterisian kursi, mengimpor manifes Excel, atau mengunduh lembar PDF cetak.
          </p>
        </div>
      </div>

      {/* Print only Header */}
      <div className="p-4 border-b border-slate-100 hidden print:block">
        <h3 className="font-extrabold text-lg text-slate-900">MANIFES DAN DAFTAR KURSI ARMADA BUS</h3>
        <p className="text-xs text-slate-600">TOTAL DATA: {filteredBuses.length} BUS</p>
      </div>

      {/* Standardized Search & Filter Bar */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nomor bus armada..."
        activeFilters={filters}
        onFilterChange={setFilters}
        onClearFilters={handleClearFilters}
        onPrint={handlePrint}
        onExportExcel={handleExportExcel}
        filters={[
          {
            key: 'wave',
            label: 'Gelombang Wisata',
            placeholder: 'Semua Gelombang',
            options: [
              { value: 'BALI_GEL_1', label: 'Bali Gelombang 1' },
              { value: 'BALI_GEL_2', label: 'Bali Gelombang 2' },
              { value: 'YOGYA_GEL_1', label: 'Yogyakarta Gelombang 1' },
            ],
          },
        ]}
        extraActions={
          <>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0 active:scale-[0.98]"
              title="Download PDF Manifes Resmi (1 Bus 1 Halaman, Font ≥11pt)"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Download className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{isExportingPdf ? 'Exporting...' : 'PDF Manifes (≥11pt)'}</span>
            </button>
            {onSaveSettings && settings && (
              <button
                type="button"
                onClick={() => setIsLocalSettingsOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0 active:scale-[0.98]"
                title="Atur parameter dan aturan bus"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Aturan Bus</span>
              </button>
            )}
            {onAutoAllocateBuses && (
              <button
                type="button"
                onClick={onAutoAllocateBuses}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0 active:scale-[0.98]"
                title="Alokasi otomatis seluruh kursi bus"
              >
                <BusIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Alokasi Otomatis</span>
              </button>
            )}
            {onBulkImportStudents && (
              <button
                type="button"
                onClick={() => {
                  setImportStatus({ type: '', msg: '' });
                  setIsImportOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0 active:scale-[0.98]"
                title="Import Alokasi Kursi Bus dari File Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Import Excel</span>
              </button>
            )}
          </>
        }
      />

      {/* Grid of Buses */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" id="bus-grid-list">
        {buses.length === 0 ? (
          <div className="col-span-full py-16 px-6 text-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-4 border border-indigo-100">
              <BusIcon className="w-8 h-8" />
            </div>
            <h4 className="text-base font-black text-slate-900">Armada Bus Belum Dialokasikan</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
              Belum ada rombongan bus yang terbentuk. Silakan klik tombol di bawah untuk menyusun bus dan alokasi tempat duduk siswa secara otomatis dan cerdas sesuai kriteria gelombang (jurusan) yang aktif di pengaturan.
            </p>
            {onAutoAllocateBuses && (
              <button
                onClick={onAutoAllocateBuses}
                className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl inline-flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <BusIcon className="w-4 h-4" />
                Mulai Alokasi & Simulasi Bus
              </button>
            )}
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <BusIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">Tidak ada bus yang cocok</p>
            <p className="text-xs text-slate-400">Cobalah menyesuaikan nomor bus pencarian atau filter gelombang Anda.</p>
          </div>
        ) : (
          paginatedData.map((bus) => {
            const busPassengers = students
              .filter((s) => s.busNumber === bus.busNumber && s.wave === bus.wave)
              .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

            const isAssigningThisBus = assigningBusNum === bus.busNumber;

            return (
              <motion.div
                key={`${bus.wave}-${bus.busNumber}`}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                      <BusIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                        Bus Nomor {bus.busNumber}
                        <WaveBadge wave={bus.wave} />
                      </h3>
                      {editingBusId === bus.id ? (
                        <div className="flex flex-col gap-1.5 mt-1.5 max-w-md bg-white p-2.5 rounded-xl border border-emerald-300 shadow-xs">
                          <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider">Atur Pendamping Bus {bus.busNumber}:</span>
                          
                          {/* Pendamping 1 Selector */}
                          <div className="space-y-0.5">
                            <label className="text-[9px] font-extrabold text-slate-500">Pendamping 1:</label>
                            <div className="flex items-center gap-1">
                              {(settings?.masterChaperones || []).length > 0 && (
                                <select
                                  onChange={(e) => { if (e.target.value) setEditGuide1(e.target.value); }}
                                  className="text-[10px] font-bold px-1.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 w-1/2"
                                >
                                  <option value="">-- Pilih Master ({settings?.masterChaperones?.length}) --</option>
                                  {settings?.masterChaperones?.map((chap) => {
                                    const labelVal = `${chap.name}${chap.department ? ` (${chap.department})` : ''}`;
                                    return (
                                      <option key={chap.id} value={labelVal}>
                                        {chap.name} [{chap.role.replace('_', ' ')}] {chap.department ? `(${chap.department})` : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              )}
                              <input
                                type="text"
                                value={editGuide1}
                                onChange={(e) => setEditGuide1(e.target.value)}
                                placeholder="Nama Pendamping 1..."
                                className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 w-full"
                              />
                            </div>
                          </div>

                          {/* Pendamping 2 Selector */}
                          <div className="space-y-0.5">
                            <label className="text-[9px] font-extrabold text-slate-500">Pendamping 2:</label>
                            <div className="flex items-center gap-1">
                              {(settings?.masterChaperones || []).length > 0 && (
                                <select
                                  onChange={(e) => { if (e.target.value) setEditGuide2(e.target.value); }}
                                  className="text-[10px] font-bold px-1.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 w-1/2"
                                >
                                  <option value="">-- Pilih Master ({settings?.masterChaperones?.length}) --</option>
                                  {settings?.masterChaperones?.map((chap) => {
                                    const labelVal = `${chap.name}${chap.department ? ` (${chap.department})` : ''}`;
                                    return (
                                      <option key={chap.id} value={labelVal}>
                                        {chap.name} [{chap.role.replace('_', ' ')}] {chap.department ? `(${chap.department})` : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              )}
                              <input
                                type="text"
                                value={editGuide2}
                                onChange={(e) => setEditGuide2(e.target.value)}
                                placeholder="Nama Pendamping 2..."
                                className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 w-full"
                              />
                            </div>
                          </div>

                          {/* Show 3 and 4 only if settings?.busVacantSeats === '1-4' */}
                          {settings?.busVacantSeats === '1-4' && (
                            <>
                              {/* Pendamping 3 Selector */}
                              <div className="space-y-0.5">
                                <label className="text-[9px] font-extrabold text-slate-500">Pendamping 3:</label>
                                <div className="flex items-center gap-1">
                                  {(settings?.masterChaperones || []).length > 0 && (
                                    <select
                                      onChange={(e) => { if (e.target.value) setEditGuide3(e.target.value); }}
                                      className="text-[10px] font-bold px-1.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 w-1/2"
                                    >
                                      <option value="">-- Pilih Master ({settings?.masterChaperones?.length}) --</option>
                                      {settings?.masterChaperones?.map((chap) => {
                                        const labelVal = `${chap.name}${chap.department ? ` (${chap.department})` : ''}`;
                                        return (
                                          <option key={chap.id} value={labelVal}>
                                            {chap.name} [{chap.role.replace('_', ' ')}] {chap.department ? `(${chap.department})` : ''}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  )}
                                  <input
                                    type="text"
                                    value={editGuide3}
                                    onChange={(e) => setEditGuide3(e.target.value)}
                                    placeholder="Nama Pendamping 3..."
                                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 w-full"
                                  />
                                </div>
                              </div>

                              {/* Pendamping 4 Selector */}
                              <div className="space-y-0.5">
                                <label className="text-[9px] font-extrabold text-slate-500">Pendamping 4:</label>
                                <div className="flex items-center gap-1">
                                  {(settings?.masterChaperones || []).length > 0 && (
                                    <select
                                      onChange={(e) => { if (e.target.value) setEditGuide4(e.target.value); }}
                                      className="text-[10px] font-bold px-1.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 w-1/2"
                                    >
                                      <option value="">-- Pilih Master ({settings?.masterChaperones?.length}) --</option>
                                      {settings?.masterChaperones?.map((chap) => {
                                        const labelVal = `${chap.name}${chap.department ? ` (${chap.department})` : ''}`;
                                        return (
                                          <option key={chap.id} value={labelVal}>
                                            {chap.name} [{chap.role.replace('_', ' ')}] {chap.department ? `(${chap.department})` : ''}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  )}
                                  <input
                                    type="text"
                                    value={editGuide4}
                                    onChange={(e) => setEditGuide4(e.target.value)}
                                    placeholder="Nama Pendamping 4..."
                                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 w-full"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              onClick={() => setEditingBusId(null)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => handleSaveBusGuides(bus.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <Check className="w-3 h-3" />
                              <span>Simpan</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {(() => {
                            const customGuides = settings?.customBusGuides?.[bus.id] || {};
                            const g1 = getChaperoneName(customGuides.guide1) || getChaperoneName(bus.guide1);
                            const g2 = getChaperoneName(customGuides.guide2) || getChaperoneName(bus.guide2);
                            const g3 = getChaperoneName(customGuides.guide3) || getChaperoneName(bus.guide3);
                            const g4 = getChaperoneName(customGuides.guide4) || getChaperoneName(bus.guide4);
                            
                            const guides = settings?.busVacantSeats === '1-4' 
                              ? [{n:1, v:g1}, {n:2, v:g2}, {n:3, v:g3}, {n:4, v:g4}]
                              : [{n:1, v:g1}, {n:2, v:g2}];

                            return guides.map((g, idx) => (
                              <div key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md">
                                <span className="text-[9px] font-black text-indigo-400">K{g.n}</span>
                                <span className="text-[10px] font-bold text-indigo-900">{g.v || 'KOSONG'}</span>
                              </div>
                            ));
                          })()}
                          <button
                            onClick={() => {
                              const customGuides = settings?.customBusGuides?.[bus.id] || {};
                              handleStartEditingGuides(
                                bus.id, 
                                customGuides.guide1 || bus.guide1, 
                                customGuides.guide2 || bus.guide2, 
                                customGuides.guide3 || bus.guide3, 
                                customGuides.guide4 || bus.guide4
                              );
                            }}
                            className="p-1 ml-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer bg-slate-50 border border-slate-200 rounded-md"
                            title="Edit Guru Pendamping"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900">
                      {busPassengers.length} / {bus.capacity}
                    </span>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Siswa Terisi</p>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  
                  {/* Quick Passenger Table */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Daftar Kursi Penumpang</p>
                    
                    {busPassengers.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs italic">
                        Bus ini masih kosong. Klik Tambah Siswa di bawah untuk mengalokasikan kursi.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {busPassengers.map((psg) => (
                          <div
                            key={psg.id}
                            className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black flex items-center justify-center shrink-0" title="Nomor Kursi">
                                #{psg.seatNumber || '-'}
                              </span>
                              <div className="truncate text-left">
                                <p className="font-extrabold text-slate-800 text-[11px] truncate leading-tight">
                                  {psg.name}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold leading-none">
                                  {psg.className}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleRemoveStudent(psg)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors shrink-0 cursor-pointer no-print"
                              title="Hapus Penempatan Kursi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Manual Assignment Form */}
                  <div className="border-t border-slate-100 pt-4 mt-auto no-print">
                    {isAssigningThisBus ? (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <p className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                          Alokasikan Kursi Baru di Bus {bus.busNumber}
                        </p>
                        
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Pilih Siswa (Belum Ada Bus):</label>
                            <select
                              value={assigningStudentId || ''}
                              onChange={(e) => setAssigningStudentId(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                            >
                              <option value="">-- Pilih Siswa ({unassignedStudents.length}) --</option>
                              {unassignedStudents
                                .filter((s) => s.wave === bus.wave)
                                .sort(compareStudentsDefault)
                                .map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} ({s.className})
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] text-slate-500 font-bold mb-0.5">No. Kursi:</label>
                              <input
                                type="number"
                                min={3}
                                max={bus.capacity}
                                value={assigningSeatNum}
                                onChange={(e) => setAssigningSeatNum(parseInt(e.target.value) || 3)}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                              />
                            </div>
                            
                            <div className="flex items-end gap-1 pt-4">
                              <button
                                onClick={() => handleAssignStudent(bus.busNumber, bus.wave)}
                                disabled={!assigningStudentId}
                                className="px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" /> Simpan
                              </button>
                              <button
                                onClick={() => setAssigningBusNum(null)}
                                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAssigningBusNum(bus.busNumber);
                          setAssigningStudentId('');
                          // Set seat number automatically to next free seat
                          const occupiedSeats = busPassengers.map((s) => s.seatNumber || 0);
                          let nextFree = 3;
                          while (occupiedSeats.includes(nextFree) && nextFree <= bus.capacity) {
                            nextFree++;
                          }
                          setAssigningSeatNum(nextFree);
                        }}
                        className="w-full py-2 border border-dashed border-slate-300 hover:border-indigo-400 text-slate-600 hover:text-indigo-600 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Siswa ke Bus Ini
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pt-2">
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={totalPages}
            totalItems={filteredBuses.length}
            pageSize={pagination.pageSize}
            onPageChange={handlePageChange}
            itemName="bus"
          />
        </div>
      )}

      {/* Modal Import Excel */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Alokasi Kursi Bus"
        subtitle="Unduh/unggah spreadsheet penempatan nomor bus dan kursi siswa secara cepat"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-extrabold">Petunjuk Kolom Import:</p>
              <p className="font-medium leading-relaxed font-sans">
                Spreadsheet Anda wajib memiliki kolom header berupa:
                <strong> Nama Siswa </strong> (atau NIS), 
                <strong> No Bus </strong> (atau Bus), dan 
                <strong> No Kursi </strong> (atau Kursi).
                <br />
                Sistem akan memproses kecocokan identitas siswa dan memperbarui data penempatan kursi bus mereka secara real-time.
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl p-6 transition-colors relative flex flex-col items-center justify-center text-center cursor-pointer">
            <input
              type="file"
              accept=".xlsx,.xls,.ods"
              onChange={handleImportExcel}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-xs font-extrabold text-slate-800">Seret file Excel penempatan kursi di sini</p>
            <p className="text-[10px] text-slate-400 mt-1">XLSX, XLS, ODS up to 10MB</p>
          </div>

          {importStatus.type && (
            <div className={`p-3.5 rounded-xl text-xs font-bold border ${
              importStatus.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
              importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              {importStatus.msg}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsImportOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* Bus Local Settings Modal */}
      <Modal
        isOpen={isLocalSettingsOpen}
        onClose={() => setIsLocalSettingsOpen(false)}
        title="⚙️ Aturan & Parameter Alokasi Kursi Bus"
        id="bus-local-settings-modal"
      >
        <div className="space-y-6">
          {/* Settings Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-full overflow-x-auto scrollbar-none">
            <button
              onClick={() => setLocalSettingsTab('default')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex-1 text-center ${
                localSettingsTab === 'default' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aturan Default
            </button>
            <button
              onClick={() => setLocalSettingsTab('BALI_GEL_1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex-1 text-center ${
                localSettingsTab === 'BALI_GEL_1' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bali Gel 1 {useWave1BusOverride && '✨'}
            </button>
            <button
              onClick={() => setLocalSettingsTab('BALI_GEL_2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex-1 text-center ${
                localSettingsTab === 'BALI_GEL_2' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bali Gel 2 {useWave2BusOverride && '✨'}
            </button>
            <button
              onClick={() => setLocalSettingsTab('YOGYA_GEL_1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex-1 text-center ${
                localSettingsTab === 'YOGYA_GEL_1' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yogya Gel 1 {useYogyaBusOverride && '✨'}
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            {/* DEFAULT TAB */}
            {localSettingsTab === 'default' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 block">Kapasitas Default per Bus</label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={defaultBusCapacity}
                      onChange={(e) => setDefaultBusCapacity(parseInt(e.target.value) || 50)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-500">Jumlah maksimum kursi penumpang dalam armada bus.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 block">Kursi Kosong Pendamping</label>
                    <select
                      value={busVacantSeats}
                      onChange={(e) => setBusVacantSeats(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="none">Siswa Semua (0 Kosong)</option>
                      <option value="1-2">Baris Pertama (2 Kursi Kosong)</option>
                      <option value="1-4">Dua Baris Pertama (4 Kursi Kosong)</option>
                    </select>
                    <p className="text-[10px] text-slate-500">Pencadangan kursi depan untuk panitia/pendamping medis/tour guide.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">Penataan Siswi Putri</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBusFemaleArrangement('class')}
                      className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                        busFemaleArrangement === 'class'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Tetap Satu Kelas
                    </button>
                    <button
                      type="button"
                      onClick={() => setBusFemaleArrangement('segregated')}
                      className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                        busFemaleArrangement === 'segregated'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Kumpul 1 Bus Putri
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {busFemaleArrangement === 'class'
                      ? 'Siswi ditempatkan di barisan kursi belakang berurutan sekelas.'
                      : 'Menyatukan semua siswi putri ke bus-bus urutan awal terlebih dahulu untuk keamanan optimal.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700 block">Penyandingan Ganjil Ketat</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBusStrictOddPairing(true)}
                        className={`px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black border transition-all cursor-pointer text-center ${
                          busStrictOddPairing === true
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Wajib 1 Jurusan
                      </button>
                      <button
                        type="button"
                        onClick={() => setBusStrictOddPairing(false)}
                        className={`px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black border transition-all cursor-pointer text-center ${
                          busStrictOddPairing === false
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Boleh Lintas
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700 block">Mode Kerapatan Kursi</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSeatPackingStrategy('compact')}
                        className={`px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black border transition-all cursor-pointer text-center ${
                          seatPackingStrategy === 'compact'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Rapat (Compact)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeatPackingStrategy('standard')}
                        className={`px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black border transition-all cursor-pointer text-center ${
                          seatPackingStrategy === 'standard'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Standar (1 Blok = 2)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">Mode Penomoran Bus</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBusNumberingMode('per-wave')}
                      className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                        busNumberingMode === 'per-wave'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Ulang Tiap Gelombang
                    </button>
                    <button
                      type="button"
                      onClick={() => setBusNumberingMode('global')}
                      className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                        busNumberingMode === 'global'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Global Berlanjut
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* BALI GEL 1 TAB */}
            {localSettingsTab === 'BALI_GEL_1' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <input
                    type="checkbox"
                    id="wave1BusOverride"
                    checked={useWave1BusOverride}
                    onChange={(e) => setUseWave1BusOverride(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <label htmlFor="wave1BusOverride" className="text-xs font-extrabold text-slate-800 cursor-pointer">
                    Gunakan Aturan Khusus Bali Gelombang 1
                  </label>
                </div>

                {useWave1BusOverride && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-700 block">Kapasitas Bus Bali Gel 1</label>
                        <input
                          type="number"
                          min="10"
                          max="100"
                          value={wave1BusCapacity}
                          onChange={(e) => setWave1BusCapacity(parseInt(e.target.value) || 50)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-700 block">Kursi Pendamping (Depan)</label>
                        <select
                          value={wave1BusVacantSeats}
                          onChange={(e) => setWave1BusVacantSeats(e.target.value as any)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="none">Siswa Semua (0 Kosong)</option>
                          <option value="1-2">Baris Pertama (2 Kursi Kosong)</option>
                          <option value="1-4">Dua Baris Pertama (4 Kursi Kosong)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-xs font-bold text-indigo-900 flex justify-between items-center">
                      <span>Kapasitas Efektif Siswa Bali Gel 1:</span>
                      <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-xs font-black">
                        {Math.max(0, wave1BusCapacity - (wave1BusVacantSeats === '1-4' ? 4 : wave1BusVacantSeats === '1-2' ? 2 : 0))} Siswa/Bus
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700 block">Penataan Siswi Putri Bali Gel 1</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setWave1BusFemaleArr('class')}
                          className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                            wave1BusFemaleArr === 'class'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Tetap Satu Kelas
                        </button>
                        <button
                          type="button"
                          onClick={() => setWave1BusFemaleArr('segregated')}
                          className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                            wave1BusFemaleArr === 'segregated'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Kumpul 1 Bus Putri
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {!useWave1BusOverride && (
                  <p className="text-[11px] text-slate-500 italic">Mewarisi parameter default di tab pertama.</p>
                )}
              </div>
            )}

            {/* BALI GEL 2 TAB */}
            {localSettingsTab === 'BALI_GEL_2' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <input
                    type="checkbox"
                    id="wave2BusOverride"
                    checked={useWave2BusOverride}
                    onChange={(e) => setUseWave2BusOverride(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <label htmlFor="wave2BusOverride" className="text-xs font-extrabold text-slate-800 cursor-pointer">
                    Gunakan Aturan Khusus Bali Gelombang 2
                  </label>
                </div>

                {useWave2BusOverride && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-700 block">Kapasitas Bus Bali Gel 2</label>
                        <input
                          type="number"
                          min="10"
                          max="100"
                          value={wave2BusCapacity}
                          onChange={(e) => setWave2BusCapacity(parseInt(e.target.value) || 50)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-700 block">Kursi Pendamping (Depan)</label>
                        <select
                          value={wave2BusVacantSeats}
                          onChange={(e) => setWave2BusVacantSeats(e.target.value as any)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="none">Siswa Semua (0 Kosong)</option>
                          <option value="1-2">Baris Pertama (2 Kursi Kosong)</option>
                          <option value="1-4">Dua Baris Pertama (4 Kursi Kosong)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-xs font-bold text-indigo-900 flex justify-between items-center">
                      <span>Kapasitas Efektif Siswa Bali Gel 2:</span>
                      <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-xs font-black">
                        {Math.max(0, wave2BusCapacity - (wave2BusVacantSeats === '1-4' ? 4 : wave2BusVacantSeats === '1-2' ? 2 : 0))} Siswa/Bus
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700 block">Penataan Siswi Putri Bali Gel 2</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setWave2BusFemaleArr('class')}
                          className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                            wave2BusFemaleArr === 'class'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Tetap Satu Kelas
                        </button>
                        <button
                          type="button"
                          onClick={() => setWave2BusFemaleArr('segregated')}
                          className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                            wave2BusFemaleArr === 'segregated'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Kumpul 1 Bus Putri
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {!useWave2BusOverride && (
                  <p className="text-[11px] text-slate-500 italic">Mewarisi parameter default di tab pertama.</p>
                )}
              </div>
            )}

            {/* YOGYA GEL 1 TAB */}
            {localSettingsTab === 'YOGYA_GEL_1' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <input
                    type="checkbox"
                    id="yogyaBusOverride"
                    checked={useYogyaBusOverride}
                    onChange={(e) => setUseYogyaBusOverride(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <label htmlFor="yogyaBusOverride" className="text-xs font-extrabold text-slate-800 cursor-pointer">
                    Gunakan Aturan Khusus Yogyakarta Gelombang 1
                  </label>
                </div>

                {useYogyaBusOverride && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-700 block">Kapasitas Bus Yogya Gel 1</label>
                        <input
                          type="number"
                          min="10"
                          max="100"
                          value={yogyaBusCapacity}
                          onChange={(e) => setYogyaBusCapacity(parseInt(e.target.value) || 50)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-700 block">Kursi Pendamping (Depan)</label>
                        <select
                          value={yogyaBusVacantSeats}
                          onChange={(e) => setYogyaBusVacantSeats(e.target.value as any)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="none">Siswa Semua (0 Kosong)</option>
                          <option value="1-2">Baris Pertama (2 Kursi Kosong)</option>
                          <option value="1-4">Dua Baris Pertama (4 Kursi Kosong)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-xs font-bold text-indigo-900 flex justify-between items-center">
                      <span>Kapasitas Efektif Siswa Yogya Gel 1:</span>
                      <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-xs font-black">
                        {Math.max(0, yogyaBusCapacity - (yogyaBusVacantSeats === '1-4' ? 4 : yogyaBusVacantSeats === '1-2' ? 2 : 0))} Siswa/Bus
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700 block">Penataan Siswi Putri Yogya Gel 1</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setYogyaBusFemaleArr('class')}
                          className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                            yogyaBusFemaleArr === 'class'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Tetap Satu Kelas
                        </button>
                        <button
                          type="button"
                          onClick={() => setYogyaBusFemaleArr('segregated')}
                          className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                            yogyaBusFemaleArr === 'segregated'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Kumpul 1 Bus Putri
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {!useYogyaBusOverride && (
                  <p className="text-[11px] text-slate-500 italic">Mewarisi parameter default di tab pertama.</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              onClick={() => setIsLocalSettingsOpen(false)}
              className="py-2.5 px-4 rounded-xl text-xs font-extrabold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-3xs"
            >
              Batal
            </button>
            <button
              onClick={handleSaveBusSettingsLocal}
              className="py-2.5 px-5 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simpan Aturan</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
