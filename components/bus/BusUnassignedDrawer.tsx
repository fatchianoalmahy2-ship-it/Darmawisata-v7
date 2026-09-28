'use client';

import React, { useState, useMemo } from 'react';
import { Student } from '@/types';
import { Search, Users, Sparkles, Filter, MousePointerClick, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface BusUnassignedDrawerProps {
  unassignedStudents: Student[];
  selectedStudentId: string | null;
  onSelectStudent: (studentId: string | null) => void;
  onDragStart?: (e: React.DragEvent, studentId: string) => void;
  onAutoFillCurrentBus: () => void;
  isRapidMode: boolean;
  activeBusNumber: number;
  remainingSeatsCount: number;
}

export const BusUnassignedDrawer: React.FC<BusUnassignedDrawerProps> = ({
  unassignedStudents,
  selectedStudentId,
  onSelectStudent,
  onDragStart,
  onAutoFillCurrentBus,
  isRapidMode,
  activeBusNumber,
  remainingSeatsCount,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');

  const classList = useMemo(() => {
    const set = new Set<string>();
    unassignedStudents.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [unassignedStudents]);

  const filteredStudents = useMemo(() => {
    return unassignedStudents.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.className && s.className.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchClass = selectedClass === 'ALL' || s.className === selectedClass;
      return matchSearch && matchClass;
    });
  }, [unassignedStudents, searchQuery, selectedClass]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden no-print">
      {/* Header Bar */}
      <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black text-slate-900">
                Siswa Belum Dapat Kursi ({unassignedStudents.length})
              </h4>
              {isRapidMode && (
                <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-md text-[10px] font-black animate-pulse">
                  Mode Cepat ON
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Klik nama siswa lalu klik kursi di denah, atau seret langsung (drag & drop).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {remainingSeatsCount > 0 && unassignedStudents.length > 0 && (
            <button
              type="button"
              onClick={onAutoFillCurrentBus}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
              title={`Isi otomatis ${Math.min(remainingSeatsCount, unassignedStudents.length)} kursi kosong di Bus ${activeBusNumber}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>⚡ Isi Otomatis Bus {activeBusNumber}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label={isOpen ? 'Tutup Daftar' : 'Buka Daftar'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-3.5 sm:p-4 space-y-3">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau kelas..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {classList.length > 0 && (
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                aria-label="Filter Kelas"
                className="px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Semua Kelas ({unassignedStudents.length})</option>
                {classList.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Student Grid / List */}
          {filteredStudents.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              {unassignedStudents.length === 0
                ? '🎉 Luar biasa! Seluruh siswa pada gelombang ini sudah mendapatkan kursi.'
                : 'Tidak ada siswa yang cocok dengan kata kunci pencarian.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredStudents.map((s) => {
                const isSelected = selectedStudentId === s.id;
                const isMale = s.gender === 'LAKI-LAKI';

                return (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={(e) => onDragStart && onDragStart(e, s.id)}
                    onClick={() => onSelectStudent(isSelected ? null : s.id)}
                    className={`p-2 rounded-xl border text-xs cursor-pointer select-none transition-all flex flex-col justify-between shadow-2xs ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs scale-102 ring-2 ring-indigo-300'
                        : isMale
                        ? 'border-sky-200 bg-sky-50/70 hover:border-sky-400 hover:bg-sky-100 text-slate-900'
                        : 'border-rose-200 bg-rose-50/70 hover:border-rose-400 hover:bg-rose-100 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : isMale
                            ? 'bg-sky-200 text-sky-900'
                            : 'bg-rose-200 text-rose-900'
                        }`}
                      >
                        {isMale ? 'L' : 'P'}
                      </span>
                      <span
                        className={`text-[9px] font-bold truncate ${
                          isSelected ? 'text-indigo-100' : 'text-slate-500'
                        }`}
                      >
                        {s.className || '-'}
                      </span>
                    </div>
                    <div className="font-extrabold text-[11px] truncate mt-1 leading-tight">{s.name}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
