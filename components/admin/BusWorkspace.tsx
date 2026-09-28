'use client';

import React, { useState } from 'react';
import { SchoolClass, Student, Bus, AppSettings } from '@/types';
import { BusManager } from './BusManager';
import { ChaperoneManager } from './ChaperoneManager';
import { BusSeatMap } from '@/components/bus/BusSeatMap';
import { Bus as BusIcon, Users, UserCheck, SlidersHorizontal, Check, Save } from 'lucide-react';

interface BusWorkspaceProps {
  activeSubTab?: string;
  onSelectSubTab?: (subTab: string) => void;
  buses: Bus[];
  students: Student[];
  classes: SchoolClass[];
  settings: AppSettings;
  onUpdateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
  onUpdateStudentSeat?: (studentId: string, busNumber: number, seatNumber: number) => Promise<void> | void;
  onBatchUpdateStudentSeats?: (updates: { studentId: string; busNumber: number; seatNumber: number }[], customMessage?: string) => Promise<void> | void;
  onBulkImportStudents: (data: any[], targetClass: string) => Promise<void>;
  onSaveSettings: (updates: Partial<AppSettings>) => Promise<void>;
  onAutoAllocateBuses: () => Promise<void>;
}

export const BusWorkspace: React.FC<BusWorkspaceProps> = (props) => {
  const currentTab = props.activeSubTab || 'BUS_SEATMAP';

  // State for in-context bus configuration
  const [busCapacity, setBusCapacity] = useState<number>(props.settings.defaultBusCapacity || 50);
  const [vacantSeats, setVacantSeats] = useState<'none' | '1-2' | '1-4'>(props.settings.busVacantSeats || '1-2');
  const [reserveFront, setReserveFront] = useState<boolean>(props.settings.busReserveFront ?? true);
  const [genderPriority, setGenderPriority] = useState<'none' | 'female-front' | 'male-front'>(
    props.settings.busGenderPriority || 'female-front'
  );
  const [seatSort, setSeatSort] = useState<'name' | 'nis'>(props.settings.busSeatSort || 'name');
  const [numberingMode, setNumberingMode] = useState<'per-wave' | 'global'>(props.settings.busNumberingMode || 'per-wave');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Sync state when props.settings changes from outside (e.g. BusQuickSettingsModal)
  React.useEffect(() => {
    setBusCapacity(props.settings.defaultBusCapacity || 50);
    setVacantSeats(props.settings.busVacantSeats || (props.settings.busReserveFront !== false ? '1-2' : 'none'));
    setReserveFront(props.settings.busReserveFront ?? true);
    setGenderPriority(props.settings.busGenderPriority || 'female-front');
    setSeatSort(props.settings.busSeatSort || 'name');
    setNumberingMode(props.settings.busNumberingMode || 'per-wave');
  }, [props.settings]);

  // Adapter for BusSeatMap
  const handleUpdateStudentSeat = (studentId: string, busNumber: number, seatNumber: number) => {
    if (props.onUpdateStudentSeat) {
      props.onUpdateStudentSeat(studentId, busNumber, seatNumber);
    } else {
      props.onUpdateStudent(studentId, { busNumber, seatNumber });
    }
  };

  const handleBatchUpdateStudentSeats = async (
    updates: { studentId: string; busNumber: number; seatNumber: number }[],
    customMessage?: string
  ) => {
    if (props.onBatchUpdateStudentSeats) {
      await props.onBatchUpdateStudentSeats(updates, customMessage);
    } else {
      for (const up of updates) {
        await props.onUpdateStudent(up.studentId, { busNumber: up.busNumber, seatNumber: up.seatNumber });
      }
    }
  };

  const handleSaveBusConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await props.onSaveSettings({
      ...props.settings,
      defaultBusCapacity: busCapacity,
      busVacantSeats: vacantSeats,
      busReserveFront: reserveFront,
      busGenderPriority: genderPriority,
      busSeatSort: seatSort,
      busNumberingMode: numberingMode,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Horizontal Sub-Tab Switcher */}
      {props.onSelectSubTab && (
        <div className="hidden sm:flex items-center gap-2 border-b border-slate-200/90 pb-3">
          <button
            onClick={() => props.onSelectSubTab?.('BUS_SEATMAP')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'BUS_SEATMAP'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <BusIcon className={`w-4 h-4 ${currentTab === 'BUS_SEATMAP' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>1. Denah Kursi Visual</span>
          </button>

          <button
            onClick={() => props.onSelectSubTab?.('BUS_STUDENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'BUS_STUDENTS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Users className={`w-4 h-4 ${currentTab === 'BUS_STUDENTS' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>2. Manifest Penumpang</span>
          </button>

          <button
            onClick={() => props.onSelectSubTab?.('BUS_CHAPERONES')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'BUS_CHAPERONES'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <UserCheck className={`w-4 h-4 ${currentTab === 'BUS_CHAPERONES' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>3. Distribusi Pendamping</span>
          </button>

          <button
            onClick={() => props.onSelectSubTab?.('BUS_CONFIG')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'BUS_CONFIG'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <SlidersHorizontal className={`w-4 h-4 ${currentTab === 'BUS_CONFIG' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>4. ⚙️ Pengaturan Aturan Bus</span>
          </button>
        </div>
      )}

      {/* 1. SEATMAP TAB */}
      {currentTab === 'BUS_SEATMAP' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-xs">
          <BusSeatMap
            students={props.students}
            buses={props.buses}
            classes={props.classes}
            defaultBusCapacity={props.settings.defaultBusCapacity}
            onUpdateStudentSeat={handleUpdateStudentSeat}
            onBatchUpdateStudentSeats={handleBatchUpdateStudentSeats}
            onOpenBusConfig={() => props.onSelectSubTab?.('BUS_CONFIG')}
            settings={props.settings}
            onUpdateSettings={props.onSaveSettings as any}
            onAutoAllocateBuses={props.onAutoAllocateBuses}
          />
        </div>
      )}

      {/* 2. MANIFEST TAB */}
      {currentTab === 'BUS_STUDENTS' && (
        <BusManager
          buses={props.buses}
          students={props.students}
          classes={props.classes}
          onUpdateStudent={(s) => props.onUpdateStudent(s.id, s)}
          onBulkImportStudents={props.onBulkImportStudents as any}
          settings={props.settings}
          onSaveSettings={props.onSaveSettings}
          onAutoAllocateBuses={props.onAutoAllocateBuses}
        />
      )}

      {/* 3. CHAPERONES TAB */}
      {currentTab === 'BUS_CHAPERONES' && (
        <ChaperoneManager
          students={props.students}
          classes={props.classes}
          buses={props.buses}
          settings={props.settings}
          onSaveSettings={props.onSaveSettings}
        />
      )}

      {/* 4. IN-CONTEXT CONFIGURATION TAB */}
      {currentTab === 'BUS_CONFIG' && (
        <form onSubmit={handleSaveBusConfig} className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6 max-w-4xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Konfigurasi Parameter Armada & Kursi Bus
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Atur kapasitas bawaan, formasi bangku depan, dan algoritma alokasi penumpang otomatis.
              </p>
            </div>
            {isSaved && (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black flex items-center gap-1.5 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                Tersimpan!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Kapasitas Standar */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                Kapasitas Kursi per Bus (Default)
              </label>
              <input
                type="number"
                min={20}
                max={65}
                value={busCapacity}
                onChange={(e) => setBusCapacity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-emerald-500 bg-slate-50/50"
              />
              <p className="text-[11px] text-slate-400">Standar bus pariwisata: 50 atau 48 kursi.</p>
            </div>

            {/* Kursi Kosong Baris Depan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                Kursi Kosong Baris Depan (Pemandu/Tour Leader)
              </label>
              <select
                value={vacantSeats}
                onChange={(e) => setVacantSeats(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-emerald-500 bg-slate-50/50"
              >
                <option value="none">Tidak Ada (Semua Kursi untuk Siswa)</option>
                <option value="1-2">Kosongkan Kursi No. 1 & 2 (Rekomendasi)</option>
                <option value="1-4">Kosongkan Kursi No. 1 s/d 4 (Baris 1 Full Kosong)</option>
              </select>
            </div>

            {/* Prioritas Gender */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                Pengaturan Posisi Gender
              </label>
              <select
                value={genderPriority}
                onChange={(e) => setGenderPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-emerald-500 bg-slate-50/50"
              >
                <option value="female-front">Siswi Perempuan di Bagian Depan, Putra di Belakang</option>
                <option value="male-front">Siswa Laki-laki di Bagian Depan</option>
                <option value="none">Sesuai Urutan Absen (Tanpa Pisah Depan/Belakang)</option>
              </select>
            </div>

            {/* Urutan Pengisian */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                Urutan Pengisian Kursi
              </label>
              <select
                value={seatSort}
                onChange={(e) => setSeatSort(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-emerald-500 bg-slate-50/50"
              >
                <option value="name">Berdasarkan Abjad Nama Siswa (A - Z)</option>
                <option value="nis">Berdasarkan Nomor Induk Siswa (NIS)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-xs transition-all"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Simpan Aturan Bus</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
