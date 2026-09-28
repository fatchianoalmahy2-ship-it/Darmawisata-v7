'use client';

import React, { useState } from 'react';
import { Room, Student, AppSettings, SchoolClass, Bus } from '@/types';
import { roomSchema } from '@/config/schemas/roomSchema';
import { DataViewWrapper } from '@/components/core/templates/DataViewWrapper';
import { RoomGrid } from '@/components/kamar/RoomGrid';
import { BedDouble, FolderOpen, SlidersHorizontal, Sparkles, Trash2, Check, Save } from 'lucide-react';

interface RoomWorkspaceProps {
  activeSubTab?: string;
  onSelectSubTab?: (subTab: string) => void;
  rooms: Room[];
  students: Student[];
  classes: SchoolClass[];
  buses: Bus[];
  settings: AppSettings;
  onUpdateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
  onClearRooms: () => Promise<void> | void;
  onAutoAllocateRooms: () => Promise<void> | void;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
}

export const RoomWorkspace: React.FC<RoomWorkspaceProps> = (props) => {
  const currentTab = props.activeSubTab || 'ROOM_VISUAL';

  // State for in-context room configuration
  const [roomCapacity, setRoomCapacity] = useState<number>(props.settings.defaultRoomCapacity || 4);
  const [groupMethod, setGroupMethod] = useState<'class' | 'department'>(
    props.settings.roomGroupMethod || 'class'
  );
  const [fillMax, setFillMax] = useState<boolean>(props.settings.roomFillMax ?? true);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleUpdateStudentRoom = async (
    studentId: string,
    roomNum: number | null,
    bedNum: number | null
  ) => {
    await props.onUpdateStudent(studentId, {
      roomNumber: roomNum ?? undefined,
      seatNumber: bedNum ?? undefined,
    });
  };

  const handleSwapStudentRooms = async (studentAId: string, studentBId: string) => {
    const sA = props.students.find((s) => s.id === studentAId);
    const sB = props.students.find((s) => s.id === studentBId);
    if (!sA || !sB) return;

    await Promise.all([
      props.onUpdateStudent(sA.id, { roomNumber: sB.roomNumber, seatNumber: sB.seatNumber }),
      props.onUpdateStudent(sB.id, { roomNumber: sA.roomNumber, seatNumber: sA.seatNumber }),
    ]);
  };

  const handleSaveRoomConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await props.onSaveSettings({
      ...props.settings,
      defaultRoomCapacity: roomCapacity,
      roomGroupMethod: groupMethod,
      roomFillMax: fillMax,
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
            onClick={() => props.onSelectSubTab?.('ROOM_VISUAL')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'ROOM_VISUAL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <BedDouble className={`w-4 h-4 ${currentTab === 'ROOM_VISUAL' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>1. Denah Kamar Visual</span>
          </button>

          <button
            onClick={() => props.onSelectSubTab?.('ROOM_LIST')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'ROOM_LIST'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <FolderOpen className={`w-4 h-4 ${currentTab === 'ROOM_LIST' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>2. Data Master Kamar</span>
          </button>

          <button
            onClick={() => props.onSelectSubTab?.('ROOM_CONFIG')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'ROOM_CONFIG'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <SlidersHorizontal className={`w-4 h-4 ${currentTab === 'ROOM_CONFIG' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>3. ⚙️ Pengaturan Aturan Kamar</span>
          </button>
        </div>
      )}

      {/* 1. VISUAL GRID TAB */}
      {currentTab === 'ROOM_VISUAL' && (
        <div className="overflow-y-auto">
          <RoomGrid
            students={props.students}
            rooms={props.rooms}
            classes={props.classes}
            buses={props.buses}
            defaultRoomCapacity={props.settings.defaultRoomCapacity}
            onAutoAllocateRooms={props.onAutoAllocateRooms}
            onOpenRoomConfig={() => props.onSelectSubTab?.('ROOM_CONFIG')}
            settings={props.settings}
            onUpdateStudentRoom={handleUpdateStudentRoom}
            onSwapStudentRooms={handleSwapStudentRooms}
            onSaveSettings={props.onSaveSettings}
          />
        </div>
      )}

      {/* 2. TABLE TAB */}
      {currentTab === 'ROOM_LIST' && (
        <div className="h-full">
          <DataViewWrapper<Room>
            schema={roomSchema}
            data={props.rooms}
            currentUserRole="ADMIN"
            onSave={async (r) => {}}
            onDelete={async () => {}}
            customActions={
              <>
                <button
                  onClick={() => {
                    if (window.confirm('Yakin ingin alokasi kamar secara otomatis?')) {
                      props.onAutoAllocateRooms();
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Auto Allocate Kamar</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Yakin ingin mengosongkan semua data kamar siswa?')) {
                      props.onClearRooms();
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Kosongkan Semua</span>
                </button>
              </>
            }
          />
        </div>
      )}

      {/* 3. IN-CONTEXT CONFIGURATION TAB */}
      {currentTab === 'ROOM_CONFIG' && (
        <form onSubmit={handleSaveRoomConfig} className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6 max-w-4xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Konfigurasi Parameter Kamar Hotel
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Atur kapasitas per kamar, mode pengelompokan teman sekamar, dan batasan gender.
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
            {/* Kapasitas Standar Kamar */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                Kapasitas Standar per Kamar (Tempat Tidur)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={roomCapacity}
                onChange={(e) => setRoomCapacity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-emerald-500 bg-slate-50/50"
              />
              <p className="text-[11px] text-slate-400">Standar kamar hotel Darmawisata: 4 orang per kamar.</p>
            </div>

            {/* Metode Pengelompokan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                Metode Pengelompokan Kamar
              </label>
              <select
                value={groupMethod}
                onChange={(e) => setGroupMethod(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-emerald-500 bg-slate-50/50"
              >
                <option value="class">Kelompokkan Berdasarkan Kelas yang Sama</option>
                <option value="department">Kelompokkan Bebas Berdasarkan Jurusan yang Sama</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-xs transition-all"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Simpan Aturan Kamar</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
