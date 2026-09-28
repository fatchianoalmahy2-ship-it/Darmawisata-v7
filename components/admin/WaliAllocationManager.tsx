'use client';

import React, { useState, useMemo } from 'react';
import { SchoolClass, Student, AppSettings, Bus, WaveType } from '@/types';
import {
  calculateWaliAllocation,
  WaliAllocationItem,
} from '@/lib/waliAllocation';
import {
  Trophy,
  Bus as BusIcon,
  Users,
  Compass,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Search,
  Filter,
  FileSpreadsheet,
  Award,
  Sparkles,
  HelpCircle,
  Send,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginationControls } from '@/components/ui/PaginationControls';

interface WaliAllocationManagerProps {
  classes: SchoolClass[];
  students: Student[];
  buses?: Bus[];
  settings: AppSettings;
  onUpdateClass: (updatedClass: SchoolClass) => void;
  onUpdateSettings?: (updatedSettings: AppSettings) => void;
}

export const WaliAllocationManager: React.FC<WaliAllocationManagerProps> = ({
  classes,
  students,
  buses = [],
  settings,
  onUpdateClass,
  onUpdateSettings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedClassForOverride, setSelectedClassForOverride] = useState<WaliAllocationItem | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'PERCENTAGE' | 'COUNT' | 'CLASS_NAME' | 'DEPARTMENT'>('PERCENTAGE');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isAdjustingQuota, setIsAdjustingQuota] = useState(false);

  // Form override
  const [overrideDest, setOverrideDest] = useState<'AUTO' | 'BALI_GEL_1' | 'BALI_GEL_2' | 'YOGYAKARTA' | 'NOT_PARTICIPATING'>('AUTO');
  const [overrideNotes, setOverrideNotes] = useState('');

  // 1. Calculate Allocation
  const allocationResult = useMemo(() => {
    return calculateWaliAllocation(classes, students, settings, sortBy);
  }, [classes, students, settings, sortBy]);

  const {
    totalBaliStudents,
    totalYogyaStudents,
    busCapacity,
    totalGelombang,
    totalBusesNeeded,
    totalQuotaWaliBali,
    quotaGel1,
    quotaGel2,
    totalYogyaBusesNeeded,
    totalYogyaChaperonesNeeded,
    items,
  } = allocationResult;

  const handleUpdateJogyaQuota = (newQuota: number | undefined) => {
    if (!onUpdateSettings) return;
    const updated = {
      ...settings,
      customQuotaWaliYogya: newQuota,
    };
    if (newQuota === undefined) {
      delete updated.customQuotaWaliYogya;
    }
    onUpdateSettings(updated);
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search
      const matchesSearch =
        searchTerm === '' ||
        item.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.homeroomTeacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.department.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter === 'BALI_GEL_1') return item.finalStatus === 'BALI_GEL_1';
      if (statusFilter === 'BALI_GEL_2') return item.finalStatus === 'BALI_GEL_2';
      if (statusFilter === 'BALI_ALL') return item.finalStatus.startsWith('BALI');
      if (statusFilter === 'YOGYAKARTA') return item.finalStatus === 'YOGYAKARTA';
      if (statusFilter === 'NOT_PARTICIPATING') return item.finalStatus === 'NOT_PARTICIPATING';

      return true;
    });
  }, [items, searchTerm, statusFilter]);

  // Helper to resolve assigned bus and detect wave conflicts
  const getTeacherBusInfo = (teacherName: string, finalStatus: string) => {
    if (!teacherName || !buses || buses.length === 0) return null;
    const cleanTeacher = teacherName.toLowerCase().trim();
    const guides = settings.customBusGuides || {};

    for (const b of buses) {
      const g = guides[b.id] || { guide1: b.guide1, guide2: b.guide2, guide3: b.guide3, guide4: b.guide4 };
      const guideSlots = [
        { key: 'guide1', val: g.guide1, label: 'Guide 1' },
        { key: 'guide2', val: g.guide2, label: 'Guide 2' },
        { key: 'guide3', val: g.guide3, label: 'Guide 3' },
        { key: 'guide4', val: g.guide4, label: 'Guide 4' },
      ];
      for (const slot of guideSlots) {
        if (slot.val && slot.val.toLowerCase().trim() === cleanTeacher) {
          let expectedWave = '';
          if (finalStatus === 'BALI_GEL_1') expectedWave = 'BALI_GEL_1';
          else if (finalStatus === 'BALI_GEL_2') expectedWave = 'BALI_GEL_2';
          else if (finalStatus === 'YOGYAKARTA') expectedWave = 'YOGYA_GEL_1';

          const isConflict = finalStatus === 'NOT_PARTICIPATING' || (expectedWave !== '' && b.wave !== expectedWave);
          return {
            busId: b.id,
            busNumber: b.busNumber,
            wave: b.wave,
            seatLabel: slot.label,
            seatKey: slot.key,
            isConflict,
          };
        }
      }
    }
    return null;
  };

  // Open Override Modal
  const handleOpenOverride = (item: WaliAllocationItem) => {
    setSelectedClassForOverride(item);
    setOverrideDest(
      (item.manualWaliDestination as any) || 'AUTO'
    );
    setOverrideNotes(item.manualWaliNotes || '');
    setIsOverrideModalOpen(true);
  };

  // Save Override with automatic bus conflict resolution & chaperone wave sync
  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForOverride) return;

    const originalCls = classes.find((c) => c.id === selectedClassForOverride.classId);
    if (!originalCls) return;

    const updated: SchoolClass = {
      ...originalCls,
      manualWaliDestination: overrideDest,
      manualWaliNotes: overrideNotes,
    };

    onUpdateClass(updated);

    // Also persist permanently to AppSettings and resolve bus guides & master chaperones
    if (onUpdateSettings && settings) {
      const currentCustoms = { ...(settings.customWaliDestinations || {}) };
      if (overrideDest === 'AUTO') {
        delete currentCustoms[selectedClassForOverride.classId];
      } else {
        currentCustoms[selectedClassForOverride.classId] = {
          destination: overrideDest,
          notes: overrideNotes ? overrideNotes.trim() : undefined,
        };
      }

      // 1. Sync wave to masterChaperones if present
      const cleanTeacherName = (originalCls.homeroomTeacher || '').toLowerCase().trim();
      let derivedWave: WaveType | undefined = undefined;
      if (overrideDest === 'BALI_GEL_1') derivedWave = 'BALI_GEL_1';
      else if (overrideDest === 'BALI_GEL_2') derivedWave = 'BALI_GEL_2';
      else if (overrideDest === 'YOGYAKARTA') derivedWave = 'YOGYA_GEL_1';

      const updatedChaperones = (settings.masterChaperones || []).map((chap) => {
        if (chap.name.toLowerCase().trim() === cleanTeacherName) {
          return {
            ...chap,
            department: originalCls.name,
            phone: originalCls.teacherPhone || chap.phone,
            assignedWave: derivedWave,
          };
        }
        return chap;
      });

      // 2. Resolve conflicting bus assignments if wave changed or set to NOT_PARTICIPATING
      const currentBusGuides = { ...(settings.customBusGuides || {}) };
      let busGuidesChanged = false;

      if (cleanTeacherName) {
        buses.forEach((b) => {
          const g = currentBusGuides[b.id];
          if (!g) return;

          let shouldClear = false;
          if (overrideDest === 'NOT_PARTICIPATING') {
            shouldClear = true;
          } else if (derivedWave && b.wave !== derivedWave) {
            shouldClear = true;
          }

          if (shouldClear) {
            let modified = false;
            const updatedG = { ...g };
            (['guide1', 'guide2', 'guide3', 'guide4'] as const).forEach((key) => {
              if (updatedG[key] && updatedG[key]!.toLowerCase().trim() === cleanTeacherName) {
                updatedG[key] = '';
                modified = true;
              }
            });
            if (modified) {
              currentBusGuides[b.id] = updatedG;
              busGuidesChanged = true;
            }
          }
        });
      }

      onUpdateSettings({
        ...settings,
        customWaliDestinations: currentCustoms,
        masterChaperones: updatedChaperones,
        ...(busGuidesChanged ? { customBusGuides: currentBusGuides } : {}),
      });
    }

    setIsOverrideModalOpen(false);
  };

  // Export Excel
  const handleExportExcel = () => {
    const exportData = filteredItems.map((item) => ({
      'Ranking #': item.rank,
      'Nama Kelas': item.className,
      Kejuruan: item.department,
      'Nama Wali Kelas': item.homeroomTeacher,
      'Kontak HP': item.teacherPhone || '',
      'Total Siswa Kelas': item.totalStudents,
      'Siswa Ke Bali': `${item.baliCount} (${item.baliPercentage}%)`,
      'Siswa Ke Jogja': item.yogyaCount,
      'Status Keikutsertaan Wali': item.statusLabel,
      'Penetapan Status': item.isOverride ? 'Manual Override Admin' : 'Otomatis Formula',
      Catatan: item.manualWaliNotes || '',
    }));

    import('@/services/excelService').then(({ ExcelService }) => {
      ExcelService.exportToExcel(
        exportData,
        'Pembagian_Wali_Kelas_Bali_Jogja',
        'Pembagian Wali'
      );
    });
  };

  // WhatsApp Share All
  const handleShareWhatsAppRecap = () => {
    let msg = `*📊 REKAP PEMBAGIAN WALI KELAS DARMAWISATA*\n`;
    msg += `*${settings.schoolName || 'SMK PGRI 2 PONOROGO'}*\n`;
    msg += `--------------------------------------------------\n`;
    msg += `• Total Siswa Bali: *${totalBaliStudents} Siswa*\n`;
    msg += `• Kapasitas Bus: *${busCapacity} Kursi/Bus*\n`;
    msg += `• Total Bus Bali: *${totalBusesNeeded} Armada*\n`;
    msg += `• Total Kuota Wali Ke Bali: *${totalQuotaWaliBali} Wali Kelas*\n`;
    msg += `  - Gelombang 1: *${quotaGel1} Wali Kelas*\n`;
    msg += `  - Gelombang 2: *${quotaGel2} Wali Kelas*\n\n`;
    msg += `*🏆 DAFTAR RANKING & STATUS KEIKUTSERTAAN WALI KELAS:*\n`;

    items.forEach((it) => {
      msg += `*Rank ${it.rank}. ${it.className}* (${it.homeroomTeacher})\n`;
      msg += `   └ Siswa Bali: ${it.baliCount}/${it.totalStudents} (${it.baliPercentage}%) ➔ *${it.statusLabel}*\n`;
    });

    msg += `--------------------------------------------------\n`;
    msg += `*Catatan:* Penentuan batas keikutsertaan wali kelas berdasarkan perbandingan total bus & ranking kepesertaan siswa per kelas.`;

    const waLink = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waLink, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Summary Stats */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-black tracking-wide uppercase border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" /> Pembagian Dinamis & Otomatis
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
                Pembagian Keikutsertaan Wali Kelas (Bali / Jogja)
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl font-medium">
                Ranking kelas disusun dinamis dari jumlah siswa yang ikut ke Bali. Jumlah kuota Wali Kelas ke Bali disesuaikan secara otomatis dari hasil pembagian total siswa ke Bali dengan kapasitas bus.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareWhatsAppRecap}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" /> Share Rekap WA
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export Excel
              </button>
            </div>
          </div>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
              <div className="text-[11px] font-extrabold text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" /> Total Siswa Bali
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {totalBaliStudents}{' '}
                <span className="text-xs font-bold text-emerald-200 font-normal">Siswa</span>
              </div>
              <div className="text-[10px] text-emerald-200/70 mt-1">
                Kapasitas: {busCapacity} Kursi/Bus
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
              <div className="text-[11px] font-extrabold text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                <BusIcon className="w-4 h-4 text-emerald-400" /> Bus Bali
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {totalBusesNeeded}{' '}
                <span className="text-xs font-bold text-emerald-200 font-normal">Armada</span>
              </div>
              <div className="text-[10px] text-emerald-200/70 mt-1">
                1 Bus = 1 Kuota Wali Bali
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
              <div className="text-[11px] font-extrabold text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" /> Kuota Wali Bali
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {totalQuotaWaliBali}{' '}
                <span className="text-xs font-bold text-emerald-200 font-normal">Wali Kelas</span>
              </div>
              <div className="text-[10px] text-emerald-200/70 mt-1">
                Gel 1: {quotaGel1} | Gel 2: {quotaGel2}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
              <div className="text-[11px] font-extrabold text-amber-200 uppercase tracking-wider flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  <BusIcon className="w-4 h-4 text-amber-400" /> Bus Jogja
                </span>
                {onUpdateSettings && (
                  <button
                    type="button"
                    onClick={() => setIsAdjustingQuota(!isAdjustingQuota)}
                    className="px-2 py-0.5 bg-amber-500/30 hover:bg-amber-500/50 text-amber-100 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer"
                  >
                    {isAdjustingQuota ? 'Tutup' : 'Ubah Kuota'}
                  </button>
                )}
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-amber-200">
                {totalYogyaBusesNeeded}{' '}
                <span className="text-xs font-bold text-amber-200 font-normal">Armada</span>
              </div>
              <div className="text-[10px] text-amber-200/80 mt-1 font-semibold">
                Target Kuota: {totalYogyaChaperonesNeeded} Pendamping {settings?.customQuotaWaliYogya !== undefined ? '(Kustom)' : '(Otomatis)'}
              </div>

              {isAdjustingQuota && onUpdateSettings && (
                <div className="mt-2 pt-2 border-t border-amber-300/20 flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleUpdateJogyaQuota(Math.max(0, totalYogyaChaperonesNeeded - 1))}
                    className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-lg text-xs cursor-pointer shadow-xs"
                    title="Kurangi Kuota 1"
                  >
                    -1
                  </button>
                  <span className="font-black text-amber-100 px-1">
                    {totalYogyaChaperonesNeeded}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateJogyaQuota(totalYogyaChaperonesNeeded + 1)}
                    className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-lg text-xs cursor-pointer shadow-xs"
                    title="Tambah Kuota 1"
                  >
                    +1
                  </button>
                  {settings?.customQuotaWaliYogya !== undefined && (
                    <button
                      type="button"
                      onClick={() => handleUpdateJogyaQuota(undefined)}
                      className="px-2 py-1 bg-white/20 hover:bg-white/30 text-amber-100 font-bold rounded-lg text-[10px] cursor-pointer ml-auto"
                      title="Kembalikan ke Formula Otomatis"
                    >
                      Reset Otomatis
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 col-span-2 lg:col-span-1">
              <div className="text-[11px] font-extrabold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-400" /> Wali Ke Jogja
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-amber-300">
                {items.filter((i) => i.finalStatus === 'YOGYAKARTA').length}{' '}
                <span className="text-xs font-bold text-amber-200 font-normal">Wali Kelas</span>
              </div>
              <div className="text-[10px] text-amber-200/80 mt-1">
                Otomatis: {items.filter(i => i.finalStatus === 'YOGYAKARTA' && !i.isOverride).length} | Ubah Paksa: {items.filter(i => i.finalStatus === 'YOGYAKARTA' && i.isOverride).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kelas, wali kelas, atau jurusan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Sort Selection */}
          <div className="w-full sm:w-60 flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Urutan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="PERCENTAGE">📊 Persentase Bali (Tinggi ➔ Rendah)</option>
              <option value="COUNT">👥 Jumlah Siswa Bali (Tinggi ➔ Rendah)</option>
              <option value="CLASS_NAME">🔤 Nama Kelas (Abjad A-Z)</option>
              <option value="DEPARTMENT">🛠️ Kelompok Jurusan</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Kelas ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('BALI_GEL_1')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'BALI_GEL_1'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Gel 1 ({items.filter((i) => i.finalStatus === 'BALI_GEL_1').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('BALI_GEL_2')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'BALI_GEL_2'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
            }`}
          >
            Gel 2 ({items.filter((i) => i.finalStatus === 'BALI_GEL_2').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('YOGYAKARTA')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'YOGYAKARTA'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Jogja ({items.filter((i) => i.finalStatus === 'YOGYAKARTA').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('NOT_PARTICIPATING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'NOT_PARTICIPATING'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            Tidak Ikut ({items.filter((i) => i.finalStatus === 'NOT_PARTICIPATING').length})
          </button>
        </div>
      </div>

      {/* Bulk Override Action Bar */}
      {selectedClassIds.length > 0 && (
        <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black shadow-xs text-sm">
              {selectedClassIds.length}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Ubah Destinasi Masal Terpilih</h3>
              <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                Setel status atau destinasi sekaligus untuk <strong>{selectedClassIds.length} kelas</strong> terpilih.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <select
              value=""
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer w-full md:w-64"
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                
                selectedClassIds.forEach(id => {
                  const originalCls = classes.find(c => c.id === id);
                  if (originalCls) {
                    onUpdateClass({
                      ...originalCls,
                      manualWaliDestination: val as any,
                    });
                  }
                });
                
                setSelectedClassIds([]);
              }}
              defaultValue=""
            >
              <option value="" disabled>-- Pilih Status Untuk Diterapkan --</option>
              <option value="AUTO">🤖 Gunakan Formula Otomatis (AUTO)</option>
              <option value="BALI_GEL_1">🏝️ Lolos Bali - Gelombang 1</option>
              <option value="BALI_GEL_2">🏝️ Lolos Bali - Gelombang 2</option>
              <option value="YOGYAKARTA">🕌 Ke Jogja / Standby</option>
              <option value="NOT_PARTICIPATING">❌ Tidak Ikut / Tidak Berangkat</option>
            </select>
            
            <button
              type="button"
              onClick={() => setSelectedClassIds([])}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Main Ranking Table & Responsive Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600 tracking-wider">
                <th className="py-3 px-4 text-center w-12">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4.5 h-4.5 cursor-pointer"
                    checked={filteredItems.length > 0 && selectedClassIds.length === filteredItems.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedClassIds(filteredItems.map(item => item.classId));
                      } else {
                        setSelectedClassIds([]);
                      }
                    }}
                  />
                </th>
                <th className="py-3 px-4 text-center w-16">Rank</th>
                <th className="py-3 px-4">Nama Kelas & Jurusan</th>
                <th className="py-3 px-4">Nama Wali Kelas</th>
                <th className="py-3 px-4 text-center">Presensi Ke Bali</th>
                <th className="py-3 px-4 text-center">Presensi Ke Jogja</th>
                <th className="py-3 px-4 text-center">Status Keikutsertaan Wali</th>
                <th className="py-3 px-4 text-center">Penugasan Bus</th>
                <th className="py-3 px-4 text-center w-28">Aksi Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-800 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                    Tidak ada data kelas yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  return (
                    <tr
                      key={item.classId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        item.rank <= totalQuotaWaliBali ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4.5 h-4.5 cursor-pointer"
                          checked={selectedClassIds.includes(item.classId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClassIds(prev => [...prev, item.classId]);
                            } else {
                              setSelectedClassIds(prev => prev.filter(id => id !== item.classId));
                            }
                          }}
                        />
                      </td>

                      {/* Rank Column */}
                      <td className="py-3.5 px-4 text-center font-black">
                        {item.rank === 1 && (
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-amber-400 text-amber-950 font-black rounded-full shadow-xs text-xs">
                            🥇 1
                          </span>
                        )}
                        {item.rank === 2 && (
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-300 text-slate-900 font-black rounded-full shadow-xs text-xs">
                            🥈 2
                          </span>
                        )}
                        {item.rank === 3 && (
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-amber-700 text-amber-50 font-black rounded-full shadow-xs text-xs">
                            🥉 3
                          </span>
                        )}
                        {item.rank > 3 && (
                          <span className="text-slate-500 font-extrabold text-xs">
                            #{item.rank}
                          </span>
                        )}
                      </td>

                      {/* Class Name & Dept */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {item.className}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {item.department} • Total {item.totalStudents} Siswa
                        </div>
                      </td>

                      {/* Homeroom Teacher */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{item.homeroomTeacher}</div>
                        <div className="text-[11px] text-slate-500">{item.teacherPhone || 'Tanpa Kontak HP'}</div>
                      </td>

                      {/* Bali Attendance */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-black text-emerald-700 text-sm">
                          {item.baliPercentage}% Kepesertaan
                        </div>
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 mx-auto mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, item.baliPercentage)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                          {item.baliCount} Siswa
                        </div>
                      </td>

                      {/* Jogja Attendance */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-700">
                          {item.yogyaCount} Siswa
                        </div>
                      </td>

                      {/* Status Keikutsertaan Wali */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          {item.finalStatus === 'BALI_GEL_1' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full font-black text-xs shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              Lolos Bali (Gel. 1)
                            </span>
                          )}
                          {item.finalStatus === 'BALI_GEL_2' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-900 border border-teal-300 rounded-full font-black text-xs shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              Lolos Bali (Gel. 2)
                            </span>
                          )}
                          {item.finalStatus === 'YOGYAKARTA' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-extrabold text-xs">
                              <Compass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              Ke Jogja / Standby
                            </span>
                          )}
                          {item.finalStatus === 'NOT_PARTICIPATING' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-full font-extrabold text-xs">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              Tidak Ikut
                            </span>
                          )}

                          {item.isOverride && (
                            <span className="text-[9px] font-extrabold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              ✏️ Override Admin
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Penugasan Bus Column */}
                      <td className="py-3.5 px-4 text-center">
                        {(() => {
                          const busInfo = getTeacherBusInfo(item.homeroomTeacher, item.finalStatus);
                          if (!busInfo) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[11px] font-medium">
                                Belum Ada Bus
                              </span>
                            );
                          }
                          if (busInfo.isConflict) {
                            return (
                              <div className="inline-flex flex-col items-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-black shadow-2xs">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  Bus {busInfo.busNumber}
                                </span>
                                <span className="text-[9px] text-rose-700 font-black mt-0.5 animate-pulse">
                                  ⚠️ Beda Gelombang
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold">
                                <BusIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                Bus {busInfo.busNumber}
                              </span>
                              <span className="text-[9px] text-slate-500 font-semibold mt-0.5">
                                {busInfo.seatLabel} • {busInfo.wave === 'BALI_GEL_1' ? 'Gel. 1' : busInfo.wave === 'BALI_GEL_2' ? 'Gel. 2' : 'Jogja'}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Action Override */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenOverride(item)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Set Status
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden flex flex-col gap-2 p-2.5 bg-slate-50 border-t border-slate-100">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-medium text-xs">
              Tidak ada data kelas yang sesuai dengan filter pencarian.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedClassIds.includes(item.classId);
              return (
                <div
                  key={item.classId}
                  className={`bg-white rounded-xl p-3 border shadow-2xs transition-all ${
                    isSelected ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer shrink-0"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClassIds(prev => [...prev, item.classId]);
                          } else {
                            setSelectedClassIds(prev => prev.filter(id => id !== item.classId));
                          }
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900 text-sm truncate">{item.className}</span>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            Rank #{item.rank}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate">
                          {item.homeroomTeacher} {item.teacherPhone ? `• ${item.teacherPhone}` : ''}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenOverride(item)}
                      className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 border border-slate-200 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
                      title="Set Status Keikutsertaan"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Presensi Bali</div>
                      <div className="font-black text-emerald-700 mt-0.5 text-xs">
                        {item.baliPercentage}% <span className="font-normal text-[10px] text-slate-500">({item.baliCount} Siswa)</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Presensi Jogja</div>
                      <div className="font-black text-amber-700 mt-0.5 text-xs">
                        {item.yogyaCount} Siswa
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-[10px] font-bold text-slate-500">
                      Status Wali:
                    </div>
                    <div>
                      {item.finalStatus === 'BALI_GEL_1' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full font-black text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          Lolos Bali (Gel. 1)
                        </span>
                      )}
                      {item.finalStatus === 'BALI_GEL_2' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-100 text-teal-900 border border-teal-300 rounded-full font-black text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-teal-600 shrink-0" />
                          Lolos Bali (Gel. 2)
                        </span>
                      )}
                      {item.finalStatus === 'YOGYAKARTA' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-extrabold text-[10px]">
                          <Compass className="w-3 h-3 text-amber-600 shrink-0" />
                          Ke Jogja / Standby
                        </span>
                      )}
                      {item.finalStatus === 'NOT_PARTICIPATING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-100 text-rose-900 border border-rose-300 rounded-full font-extrabold text-[10px]">
                          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                          Tidak Ikut
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Penugasan Bus in Mobile Card */}
                  {(() => {
                    const busInfo = getTeacherBusInfo(item.homeroomTeacher, item.finalStatus);
                    return (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-[10px] font-bold text-slate-500">
                          Armada Bus:
                        </div>
                        <div>
                          {!busInfo ? (
                            <span className="text-[10px] text-slate-400 font-medium italic">
                              Belum Ada Bus
                            </span>
                          ) : busInfo.isConflict ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[10px] font-black">
                              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                              Bus {busInfo.busNumber} (⚠️ Beda Gelombang)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-[10px] font-bold">
                              <BusIcon className="w-3 h-3 text-blue-600 shrink-0" />
                              Bus {busInfo.busNumber} ({busInfo.seatLabel})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Override Modal */}
      {isOverrideModalOpen && selectedClassForOverride && (
        <Modal
          isOpen={isOverrideModalOpen}
          onClose={() => setIsOverrideModalOpen(false)}
          title={`Penetapan Keikutsertaan Wali Kelas - ${selectedClassForOverride.className}`}
          subtitle={`Wali Kelas: ${selectedClassForOverride.homeroomTeacher}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveOverride} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-800">
                Data Kepesertaan Kelas:
              </div>
              <div className="text-slate-600">
                • Siswa Bali: <strong>{selectedClassForOverride.baliCount} Siswa ({selectedClassForOverride.baliPercentage}%)</strong><br />
                • Siswa Jogja: <strong>{selectedClassForOverride.yogyaCount} Siswa</strong><br />
                • Ranking Kepesertaan: <strong>Rank #{selectedClassForOverride.rank}</strong><br />
                • Rekomendasi Formula: <strong>{selectedClassForOverride.autoStatus === 'BALI_GEL_1' ? 'Lolos Bali (Gel. 1)' : selectedClassForOverride.autoStatus === 'BALI_GEL_2' ? 'Lolos Bali (Gel. 2)' : 'Ke Jogja'}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Penetapan Destinasi Wali Kelas
              </label>
              <select
                value={overrideDest}
                onChange={(e) => setOverrideDest(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="AUTO">🤖 Gunakan Formula Otomatis (Rekomendasi)</option>
                <option value="BALI_GEL_1">🏝️ Paksa Lolos Bali - Gelombang 1</option>
                <option value="BALI_GEL_2">🏝️ Paksa Lolos Bali - Gelombang 2</option>
                <option value="YOGYAKARTA">🕌 Paksa Ke Jogja / Standby</option>
                <option value="NOT_PARTICIPATING">❌ Paksa Tidak Ikut / Tidak Berangkat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan / Alasan Khusus (Opsional)
              </label>
              <textarea
                rows={3}
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="Misal: Kebijakan Khusus Panitia / Penugasan Khusus"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-extrabold text-xs hover:bg-emerald-700 shadow-xs cursor-pointer"
              >
                Simpan Penetapan
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
