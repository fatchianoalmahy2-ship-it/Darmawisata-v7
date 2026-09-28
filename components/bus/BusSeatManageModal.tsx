'use client';

import React, { useState } from 'react';
import { Student, Chaperone } from '@/types';
import { SlidersHorizontal, X, UserX, Check, ShieldCheck, GraduationCap, Sparkles } from 'lucide-react';

interface BusSeatManageModalProps {
  seatNumber: number | null;
  busNumber: number;
  onClose: () => void;
  studentAtSeat?: Student;
  chaperoneName?: string;
  isStudentSeat?: boolean;
  allChaperones: Chaperone[];
  unassignedStudents: Student[];
  onAssignStudent: (studentId: string) => Promise<void>;
  onConvertToStudentSeat?: () => Promise<void>;
  onAssignChaperone: (chaperoneId: string) => Promise<void>;
  onSaveCustomChaperone: (name: string) => Promise<void>;
  onClearSeat: () => Promise<void>;
}

export const BusSeatManageModal: React.FC<BusSeatManageModalProps> = ({
  seatNumber,
  busNumber,
  onClose,
  studentAtSeat,
  chaperoneName,
  isStudentSeat = false,
  allChaperones,
  unassignedStudents,
  onAssignStudent,
  onConvertToStudentSeat,
  onAssignChaperone,
  onSaveCustomChaperone,
  onClearSeat,
}) => {
  const [customChaperoneInput, setCustomChaperoneInput] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (seatNumber === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
            <span>
              Kelola Kursi #{seatNumber.toString().padStart(2, '0')} (Bus {busNumber})
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
            aria-label="Tutup Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Seat Status Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="text-slate-500 font-extrabold text-[11px] uppercase tracking-wide">
            Status Kursi:
          </span>
          {studentAtSeat ? (
            <span className="px-2.5 py-1 bg-sky-100 text-sky-950 border border-sky-300 rounded-xl font-black truncate max-w-[210px] shadow-2xs">
              👤 Siswa: {studentAtSeat.name} ({studentAtSeat.className})
            </span>
          ) : chaperoneName ? (
            <span className="px-2.5 py-1 bg-purple-100 text-purple-950 border border-purple-300 rounded-xl font-black truncate max-w-[210px] shadow-2xs">
              👔 Pendamping: {chaperoneName}
            </span>
          ) : isStudentSeat ? (
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl font-black shadow-2xs flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kursi Siswa (Dapat Diisi Auto-Plot)</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-slate-100 text-slate-900 border border-slate-300 rounded-xl font-black shadow-2xs">
              ✨ Kursi Kosong
            </span>
          )}
        </div>

        {/* 1. Toggle / Ubah Menjadi Kursi Siswa (Auto-Plot Compatible) */}
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
              <span>1. Jadikan Kursi Siswa</span>
            </label>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
              ⚡ Auto-Plot Ready
            </span>
          </div>
          <p className="text-[11px] text-emerald-950 font-medium leading-relaxed">
            Ubah kursi ini menjadi kursi siswa agar otomatis diisi siswa saat menjalankan <strong>Auto-Plot</strong> dari depan ke belakang.
          </p>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              if (onConvertToStudentSeat) {
                setIsSubmitting(true);
                try {
                  await onConvertToStudentSeat();
                  onClose();
                } finally {
                  setIsSubmitting(false);
                }
              }
            }}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Aktifkan Sebagai Kursi Siswa</span>
          </button>
        </div>

        {/* 2. Alokasi Siswa Manual */}
        <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-indigo-900 block">
            2. Tempatkan Siswa Manual
          </label>
          <div className="space-y-2">
            <select
              aria-label="Pilih Siswa untuk Ditempatkan"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
            >
              <option value="">-- Pilih Siswa Belum Duduk ({unassignedStudents.length}) --</option>
              {unassignedStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.className})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedStudentId || isSubmitting}
              onClick={async () => {
                if (!selectedStudentId) return;
                setIsSubmitting(true);
                try {
                  await onAssignStudent(selectedStudentId);
                  onClose();
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="w-full py-2 bg-indigo-600 disabled:bg-slate-300 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
            >
              Tempatkan Siswa ke Kursi #{seatNumber.toString().padStart(2, '0')}
            </button>
          </div>
        </div>

        {/* 3. Alokasi Pendamping / Guru */}
        <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
            <span>3. Tetapkan Sebagai Kursi Pendamping / Guru</span>
          </label>
          <div className="space-y-2">
            <select
              aria-label="Pilih Guru Pendamping"
              onChange={async (e) => {
                if (e.target.value) {
                  setIsSubmitting(true);
                  try {
                    await onAssignChaperone(e.target.value);
                    onClose();
                  } finally {
                    setIsSubmitting(false);
                  }
                }
              }}
              className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-purple-950 focus:ring-2 focus:ring-purple-500 shadow-2xs cursor-pointer"
            >
              <option value="">-- Pilih Guru / Pendamping ({allChaperones.length}) --</option>
              {allChaperones.map((chap) => (
                <option key={chap.id} value={chap.id}>
                  {chap.name} [{chap.role.replace('_', ' ')}] {chap.department ? `(${chap.department})` : ''}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Atau ketik nama pendamping manual..."
                value={customChaperoneInput}
                onChange={(e) => setCustomChaperoneInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                disabled={!customChaperoneInput.trim() || isSubmitting}
                onClick={async () => {
                  if (!customChaperoneInput.trim()) return;
                  setIsSubmitting(true);
                  try {
                    await onSaveCustomChaperone(customChaperoneInput.trim());
                    onClose();
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="px-3 py-1.5 bg-purple-600 disabled:bg-slate-300 hover:bg-purple-700 text-white font-black text-xs rounded-xl transition-colors cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>

        {/* 4. Kosongkan Kursi */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                await onClearSeat();
                onClose();
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black rounded-xl text-xs transition-colors cursor-pointer border border-rose-200 flex items-center justify-center gap-2 shadow-2xs active:scale-95"
          >
            <UserX className="w-4 h-4 text-rose-600" />
            <span>
              Kosongkan Kursi Ini ({studentAtSeat ? 'Lepas Siswa' : chaperoneName ? 'Hapus Pendamping' : 'Reset Status'})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
