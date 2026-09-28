'use client';

import React, { useMemo, useState } from 'react';
import { X, Users, AlertTriangle, Trash2, Edit3, CheckCircle2, Search, Filter } from 'lucide-react';
import { Student } from '@/types';

interface DuplicateGroup {
  id: string;
  type: 'NIS' | 'NAME';
  key: string;
  label: string;
  students: Student[];
}

interface DuplicateStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onDeleteStudent: (studentId: string) => void;
  onEditStudent?: (student: Student) => void;
}

export const DuplicateStudentsModal: React.FC<DuplicateStudentsModalProps> = ({
  isOpen,
  onClose,
  students,
  onDeleteStudent,
  onEditStudent,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'NIS' | 'NAME'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Find all duplicate groups
  const duplicateGroups = useMemo(() => {
    const groups: DuplicateGroup[] = [];
    if (!students || students.length === 0) return groups;

    // 1. Group by NIS
    const nisMap = new Map<string, Student[]>();
    students.forEach((s) => {
      const cleanNis = (s.nis || '').trim().toLowerCase();
      if (cleanNis) {
        if (!nisMap.has(cleanNis)) nisMap.set(cleanNis, []);
        nisMap.get(cleanNis)!.push(s);
      }
    });

    nisMap.forEach((list, nisKey) => {
      if (list.length > 1) {
        const displayNis = list[0].nis || nisKey;
        groups.push({
          id: `nis_${nisKey}`,
          type: 'NIS',
          key: nisKey,
          label: `NIS: ${displayNis}`,
          students: list,
        });
      }
    });

    // 2. Group by Name
    const nameMap = new Map<string, Student[]>();
    students.forEach((s) => {
      const cleanName = (s.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (cleanName && cleanName.length > 2) {
        if (!nameMap.has(cleanName)) nameMap.set(cleanName, []);
        nameMap.get(cleanName)!.push(s);
      }
    });

    nameMap.forEach((list, nameKey) => {
      if (list.length > 1) {
        const displayName = list[0].name || nameKey;
        // Avoid adding group if it's identical to NIS group
        const existingNisGroup = groups.find(
          (g) => g.type === 'NIS' && g.students.every((st) => list.some((l) => l.id === st.id))
        );
        if (!existingNisGroup) {
          groups.push({
            id: `name_${nameKey}`,
            type: 'NAME',
            key: nameKey,
            label: `Nama: ${displayName}`,
            students: list,
          });
        }
      }
    });

    return groups;
  }, [students]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return duplicateGroups.filter((group) => {
      if (filterType !== 'ALL' && group.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesKey = group.label.toLowerCase().includes(q);
        const matchesStudent = group.students.some(
          (s) =>
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.nis && s.nis.toLowerCase().includes(q)) ||
            (s.className && s.className.toLowerCase().includes(q))
        );
        return matchesKey || matchesStudent;
      }
      return true;
    });
  }, [duplicateGroups, filterType, searchQuery]);

  const totalDuplicateStudents = useMemo(() => {
    const ids = new Set<string>();
    duplicateGroups.forEach((g) => g.students.forEach((s) => ids.add(s.id)));
    return ids.size;
  }, [duplicateGroups]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide">
                  Pemeriksaan Duplikat Data Siswa
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                    duplicateGroups.length > 0
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {duplicateGroups.length > 0
                    ? `${duplicateGroups.length} Kelompok Duplikat (${totalDuplicateStudents} Siswa)`
                    : 'Tidak Ada Duplikat'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Deteksi otomatis NIS atau Nama siswa yang sama untuk menjaga integritas data registrasi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua ({duplicateGroups.length})
            </button>
            <button
              onClick={() => setFilterType('NIS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'NIS'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Duplikat NIS ({duplicateGroups.filter((g) => g.type === 'NIS').length})
            </button>
            <button
              onClick={() => setFilterType('NAME')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'NAME'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Duplikat Nama ({duplicateGroups.filter((g) => g.type === 'NAME').length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari NIS, Nama, atau Kelas..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-400 outline-none"
            />
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {duplicateGroups.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                Semua Data Siswa Unik & Valid!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Sistem tidak menemukan adanya data NIS atau Nama siswa yang duplikat dalam database.
              </p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium">
              Tidak ada hasil duplikat yang sesuai dengan pencarian &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredGroups.map((group, groupIdx) => (
              <div
                key={group.id}
                className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs transition-all hover:border-slate-300"
              >
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        group.type === 'NIS'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      Duplikat {group.type}
                    </span>
                    <span className="text-xs font-black text-slate-900">{group.label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {group.students.length} Data Terdeteksi
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.students.map((st, idx) => (
                    <div
                      key={st.id}
                      className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-xs sm:text-sm">
                              {st.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                              {st.className}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                st.isRegistered
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {st.isRegistered ? 'Sudah Mengisi' : 'Belum Mengisi'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-3 flex-wrap">
                            <span>NIS: <strong>{st.nis || '-'}</strong></span>
                            <span>L/P: <strong>{st.gender || '-'}</strong></span>
                            {st.busNumber && <span>Bus: <strong>Bus {st.busNumber}</strong></span>}
                            {st.roomNumber && <span>Kamar: <strong>Kmr {st.roomNumber}</strong></span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {onEditStudent && (
                          <button
                            onClick={() => onEditStudent(st)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Edit NIS/Data</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Apakah Anda yakin ingin menghapus data siswa duplikat ${st.name} (${st.nis}) dari kelas ${st.className}?`
                              )
                            ) {
                              onDeleteStudent(st.id);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Hapus baris duplikat ini"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Hapus Duplikat</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 font-medium">
            Tips: Pertahankan 1 data siswa yang paling lengkap dan hapus baris duplikat sisanya.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
