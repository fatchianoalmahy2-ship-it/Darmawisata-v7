'use client';

import React, { useState, useEffect } from 'react';
import { AppSettings, WaveType } from '@/types';
import { X, Check, SlidersHorizontal, Sparkles, Layers, Bus as BusIcon, RefreshCw, Undo2 } from 'lucide-react';
import { SeatAllocatorEngine } from '@/services/seatAllocator';

interface BusQuickSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
  selectedWave: WaveType;
}

export const BusQuickSettingsModal: React.FC<BusQuickSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  selectedWave,
}) => {
  const [activeTab, setActiveTab] = useState<WaveType | 'GLOBAL'>(selectedWave || 'BALI_GEL_2');

  useEffect(() => {
    if (selectedWave) {
      setActiveTab(selectedWave);
    }
  }, [selectedWave]);

  if (!isOpen) return null;

  const waveSettings = activeTab !== 'GLOBAL' ? settings?.waveBusSettings?.[activeTab] : undefined;
  const isCustomWaveOverrideActive = activeTab !== 'GLOBAL' && !!settings?.waveBusSettings?.[activeTab];

  // Resolve values (wave override || global fallback)
  const currentCapacity = SeatAllocatorEngine.getSetting(
    settings,
    activeTab === 'GLOBAL' ? 'BALI_GEL_1' : activeTab,
    'defaultBusCapacity',
    settings?.defaultBusCapacity ?? 50
  );

  const currentVacantSeats = SeatAllocatorEngine.getSetting(
    settings,
    activeTab === 'GLOBAL' ? 'BALI_GEL_1' : activeTab,
    'busVacantSeats',
    settings?.busVacantSeats ?? (settings?.busReserveFront !== false ? '1-2' : 'none')
  );

  const currentFemaleArr = SeatAllocatorEngine.getSetting(
    settings,
    activeTab === 'GLOBAL' ? 'BALI_GEL_1' : activeTab,
    'busFemaleArrangement',
    settings?.busFemaleArrangement ?? 'class'
  );

  const currentGenderPriority = SeatAllocatorEngine.getSetting(
    settings,
    activeTab === 'GLOBAL' ? 'BALI_GEL_1' : activeTab,
    'busGenderPriority',
    settings?.busGenderPriority ?? 'female-front'
  );

  const chaperoneSeatsCount = currentVacantSeats === '1-4' ? 4 : currentVacantSeats === '1-2' ? 2 : 0;
  const effectiveStudentCap = Math.max(0, currentCapacity - chaperoneSeatsCount);

  const availableMajors = ['TKJ', 'RPL', 'DKV', 'TBSM', 'TBKR', 'TAB', 'TKR', 'TPM', 'TPL'];
  const currentG1Majors = settings?.waveBaliGel1Majors || ['TKJ', 'RPL', 'DKV'];

  const updateSettingField = (field: string, value: any) => {
    if (!settings || !onUpdateSettings) return;

    if (activeTab === 'GLOBAL') {
      // Update global setting
      const updatedSettings: AppSettings = {
        ...settings,
        [field]: value,
        ...(field === 'busVacantSeats' ? { busReserveFront: value !== 'none' } : {}),
      };

      // If a wave doesn't have an explicit custom override, it automatically inherits.
      // But if user updates GLOBAL, we also clean up identical wave keys so there are no stale ghosts!
      const currentWaveSettings = { ...(settings.waveBusSettings || {}) };
      let hasWaveChanges = false;

      (Object.keys(currentWaveSettings) as WaveType[]).forEach((wKey) => {
        const wObj = currentWaveSettings[wKey];
        if (wObj && (wObj as any)[field] !== undefined) {
          // Keep wave override if it was explicitly defined, or keep it synced
        }
      });

      onUpdateSettings(updatedSettings);
      return;
    }

    // Updating a specific wave:
    const prevWaveSettings = { ...(settings.waveBusSettings || {}) };
    const existingWave = { ...(prevWaveSettings[activeTab] || {}) };

    const updatedWaveObj = {
      ...existingWave,
      [field]: value,
      ...(field === 'busVacantSeats' ? { busReserveFront: value !== 'none' } : {}),
    };

    onUpdateSettings({
      ...settings,
      waveBusSettings: {
        ...prevWaveSettings,
        [activeTab]: updatedWaveObj,
      },
    });
  };

  const handleToggleWaveOverride = (enableOverride: boolean) => {
    if (!settings || !onUpdateSettings || activeTab === 'GLOBAL') return;

    const prevWaveSettings = { ...(settings.waveBusSettings || {}) };

    if (!enableOverride) {
      // Revert to inheriting from GLOBAL
      delete prevWaveSettings[activeTab];
      onUpdateSettings({
        ...settings,
        waveBusSettings: prevWaveSettings,
      });
    } else {
      // Initialize wave override with current global values as baseline
      prevWaveSettings[activeTab] = {
        defaultBusCapacity: settings.defaultBusCapacity ?? 50,
        busVacantSeats: settings.busVacantSeats ?? (settings.busReserveFront !== false ? '1-2' : 'none'),
        busFemaleArrangement: settings.busFemaleArrangement ?? 'class',
        busGenderPriority: settings.busGenderPriority ?? 'female-front',
      };
      onUpdateSettings({
        ...settings,
        waveBusSettings: prevWaveSettings,
      });
    }
  };

  const handleApplyGlobalToAllWaves = () => {
    if (!settings || !onUpdateSettings) return;
    // Clears all custom wave overrides so every wave cleanly inherits the Global default
    onUpdateSettings({
      ...settings,
      waveBusSettings: {},
    });
  };

  const toggleMajorForGel1 = (major: string) => {
    if (!settings || !onUpdateSettings) return;
    const isIncluded = currentG1Majors.includes(major);
    const updated = isIncluded
      ? currentG1Majors.filter((m) => m !== major)
      : [...currentG1Majors, major];

    onUpdateSettings({
      ...settings,
      waveBaliGel1Majors: updated,
    });
  };

  const tabs: { id: WaveType | 'GLOBAL'; label: string }[] = [
    { id: 'BALI_GEL_1', label: 'Bali Gel 1' },
    { id: 'BALI_GEL_2', label: 'Bali Gel 2' },
    { id: 'YOGYA_GEL_1', label: 'Yogyakarta' },
    { id: 'GLOBAL', label: 'Default Global' },
  ];

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4 no-print animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4.5 h-4.5 text-amber-400" />
          <div>
            <h4 className="text-sm font-black text-white">Parameter Pengaturan Bus & Penataan Kursi</h4>
            <p className="text-[11px] text-slate-400">Konfigurasi dinamis per gelombang (Kapasitas, Pendamping, & Gender)</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Tutup Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Wave Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800/80">
        <span className="text-[11px] font-extrabold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
          <Layers className="w-3.5 h-3.5 text-indigo-400" /> Target Gelombang:
        </span>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isSelectedWave = selectedWave === tab.id;
          const isOverridden = tab.id !== 'GLOBAL' && !!settings?.waveBusSettings?.[tab.id];

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs border border-indigo-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              <span>{tab.label}</span>
              {isSelectedWave && (
                <span className="px-1.5 py-0.2 text-[9px] bg-amber-400 text-slate-950 font-black rounded-full">
                  AKTIF
                </span>
              )}
              {isOverridden && !isSelectedWave && (
                <span className="w-2 h-2 rounded-full bg-indigo-400" title="Memiliki Aturan Khusus" />
              )}
            </button>
          );
        })}
      </div>

      {/* Override / Inheritance Control Banner */}
      {activeTab !== 'GLOBAL' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-800/90 rounded-xl border border-slate-700/80 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isCustomWaveOverrideActive ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className="font-bold text-slate-200">
              Status Aturan Gelombang {activeTab}:
            </span>
            <span className={`px-2 py-0.5 rounded-md font-black text-[11px] ${
              isCustomWaveOverrideActive 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {isCustomWaveOverrideActive ? '⭐ Aturan Khusus Gelombang' : '🔗 Mengikuti Standar Default Global'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleToggleWaveOverride(!isCustomWaveOverrideActive)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isCustomWaveOverrideActive
                ? 'bg-slate-700 text-slate-200 hover:bg-rose-900/40 hover:text-rose-200 border border-slate-600'
                : 'bg-indigo-600/80 text-white hover:bg-indigo-600 border border-indigo-400'
            }`}
          >
            {isCustomWaveOverrideActive ? (
              <>
                <Undo2 className="w-3.5 h-3.5" />
                <span>Reset ke Default Global</span>
              </>
            ) : (
              <>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Aktifkan Aturan Khusus</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-indigo-950/60 rounded-xl border border-indigo-800/60 text-xs">
          <div className="flex items-center gap-2 text-indigo-200 font-medium">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Pengaturan di tab ini adalah acuan standar (Global) untuk seluruh gelombang perjalanan.</span>
          </div>
          <button
            type="button"
            onClick={handleApplyGlobalToAllWaves}
            className="px-2.5 py-1 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg font-bold border border-indigo-400 text-[11px] transition-all cursor-pointer whitespace-nowrap flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Terapkan Global ke Semua Gelombang</span>
          </button>
        </div>
      )}

      {/* Dynamic Wave Status Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-700/60 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-indigo-300 font-extrabold flex items-center gap-1">
            <BusIcon className="w-3.5 h-3.5" />
            <span>Target: <strong>{activeTab === 'GLOBAL' ? 'Standar Default Global' : activeTab}</strong></span>
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300 font-medium">Fisik Bus: <strong>{currentCapacity} Kursi</strong></span>
          <span className="text-slate-500">•</span>
          <span className="text-amber-300 font-medium">
            Guru/Pendamping: <strong>{chaperoneSeatsCount} Kursi ({currentVacantSeats === 'none' ? '0' : currentVacantSeats === '1-4' ? 'Kursi 1-4' : 'Kursi 1-2'})</strong>
          </span>
        </div>
        <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/40 text-[11px] font-black">
          Kapasitas Efektif Siswa: {effectiveStudentCap} Siswa/Bus
        </div>
      </div>

      {/* Main Form Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* 1. Capacity & Front Seats Reservation */}
        <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/70 space-y-3">
          <div className="font-extrabold text-indigo-300 flex items-center justify-between">
            <span>1. Kapasitas & Reservasi Kursi Depan</span>
            {activeTab !== 'GLOBAL' && !isCustomWaveOverrideActive && (
              <span className="text-[10px] text-slate-400 font-normal italic">(Mewarisi Global)</span>
            )}
          </div>
          
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">Kapasitas Total Armada Bus</label>
            <input
              type="number"
              min="10"
              max="100"
              value={currentCapacity}
              onChange={(e) => updateSettingField('defaultBusCapacity', parseInt(e.target.value) || 50)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 block">Kursi Depan Pendamping (Guru/Medis)</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => updateSettingField('busVacantSeats', 'none')}
                className={`px-2.5 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                  currentVacantSeats === 'none'
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Tidak Ada (0)
              </button>
              <button
                type="button"
                onClick={() => updateSettingField('busVacantSeats', '1-2')}
                className={`px-2.5 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                  currentVacantSeats === '1-2'
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Kursi 1-2 (2 Pendamping)
              </button>
              <button
                type="button"
                onClick={() => updateSettingField('busVacantSeats', '1-4')}
                className={`px-2.5 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                  currentVacantSeats === '1-4'
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Kursi 1-4 (4 Pendamping)
              </button>
            </div>
          </div>
        </div>

        {/* 2. Gender & Seating Strategy */}
        <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/70 space-y-3">
          <div className="font-extrabold text-amber-300 flex items-center justify-between">
            <span>2. Metode Penataan Gender & Bangku</span>
            {activeTab !== 'GLOBAL' && !isCustomWaveOverrideActive && (
              <span className="text-[10px] text-slate-400 font-normal italic">(Mewarisi Global)</span>
            )}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 block">Prioritas Baris Gender</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => updateSettingField('busGenderPriority', 'female-front')}
                className={`px-2 py-1.5 rounded-lg font-bold border transition-all text-center cursor-pointer ${
                  currentGenderPriority === 'female-front'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Siswi Depan
              </button>
              <button
                type="button"
                onClick={() => updateSettingField('busGenderPriority', 'male-front')}
                className={`px-2 py-1.5 rounded-lg font-bold border transition-all text-center cursor-pointer ${
                  currentGenderPriority === 'male-front'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Siswa Depan
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 block">Penataan Siswi Putri</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => updateSettingField('busFemaleArrangement', 'class')}
                className={`px-2 py-1.5 rounded-lg font-bold border transition-all text-center cursor-pointer ${
                  currentFemaleArr === 'class'
                    ? 'bg-indigo-600 text-white border-indigo-400 font-black'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Tetap Sekelas
              </button>
              <button
                type="button"
                onClick={() => updateSettingField('busFemaleArrangement', 'segregated')}
                className={`px-2 py-1.5 rounded-lg font-bold border transition-all text-center cursor-pointer ${
                  currentFemaleArr === 'segregated'
                    ? 'bg-indigo-600 text-white border-indigo-400 font-black'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Kumpul 1 Bus Putri
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Major to Wave Allocation (Only relevant for Bali) */}
      {activeTab.includes('BALI') && (
        <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/70 space-y-1.5">
          <div className="font-extrabold text-emerald-400 text-xs">Alokasi Jurusan Gelombang 1 (Bali)</div>
          <p className="text-[10px] text-slate-400">
            Pilih jurusan yang dimasukkan di Gelombang 1. Jurusan lainnya otomatis di Gelombang 2.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {availableMajors.map((major) => {
              const isIncluded = currentG1Majors.includes(major);
              return (
                <button
                  key={major}
                  type="button"
                  onClick={() => toggleMajorForGel1(major)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    isIncluded
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {isIncluded && <Check className="w-3 h-3" />}
                  <span>{major}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
