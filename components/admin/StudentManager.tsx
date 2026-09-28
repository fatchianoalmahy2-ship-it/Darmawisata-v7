'use client';
import React, { useState } from 'react';
import type { Student, SchoolClass, Bus, Room, AppSettings } from '@/types';
import { DataViewWrapper } from '@/components/core/templates/DataViewWrapper';
import { studentSchema } from '@/config/schemas/studentSchema';
import { UnifiedStudentModal } from '@/components/modals/UnifiedStudentModal';
import { BulkImportModal } from './BulkImportModal';
import { BulkClearModal } from './BulkClearModal';
import { BulkUpdateModal } from './BulkUpdateModal';
import { DuplicateStudentsModal } from './DuplicateStudentsModal';
import { Trash2, FileSpreadsheet, Edit3, RefreshCw, Sparkles, CheckCircle2, Users, AlertTriangle } from 'lucide-react';
import { getStudentWave } from '@/lib/utils';

interface StudentManagerProps {
  students: Student[];
  classes: SchoolClass[];
  buses?: Bus[];
  rooms?: Room[];
  settings?: AppSettings;
  isAngketClosed?: boolean;
  onAddStudent: (newStudent: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onDeleteMultipleStudents?: (studentIds: string[]) => void;
  onBulkImportStudents: (importedStudents: Student[], importedClasses?: SchoolClass[]) => void;
  onClearAllStudents: () => void;
  onAutoAllocateRooms: () => void;
  onAutoAllocateBuses: () => void;
  onAuditAndRealignWaves?: () => Promise<void> | void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  classes,
  buses = [],
  rooms = [],
  settings,
  isAngketClosed = false,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onDeleteMultipleStudents,
  onBulkImportStudents,
  onClearAllStudents,
  onAutoAllocateRooms,
  onAutoAllocateBuses,
  onAuditAndRealignWaves,
}) => {
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkClearOpen, setIsBulkClearOpen] = useState(false);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [editingDuplicateStudent, setEditingDuplicateStudent] = useState<Student | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const duplicateCount = React.useMemo(() => {
    if (!students || students.length === 0) return 0;
    const nisMap = new Map<string, number>();
    students.forEach((s) => {
      const n = (s.nis || '').trim().toLowerCase();
      if (n) nisMap.set(n, (nisMap.get(n) || 0) + 1);
    });
    const nameMap = new Map<string, number>();
    students.forEach((s) => {
      const n = (s.name || '').trim().toLowerCase();
      if (n && n.length > 2) nameMap.set(n, (nameMap.get(n) || 0) + 1);
    });
    let count = 0;
    nisMap.forEach((cnt) => { if (cnt > 1) count++; });
    nameMap.forEach((cnt) => { if (cnt > 1) count++; });
    return count;
  }, [students]);

  const mismatchedStudents = React.useMemo(() => {
    return (students || []).filter(
      (s) => s.isRegistered && s.destination !== 'MAGANG' && s.wave !== getStudentWave(s, settings || {}, classes)
    );
  }, [students, settings, classes]);

  const handleRunAudit = async () => {
    if (!onAuditAndRealignWaves) return;
    setIsAuditing(true);
    try {
      await onAuditAndRealignWaves();
    } finally {
      setIsAuditing(false);
    }
  };

  const customActions = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => setIsDuplicateModalOpen(true)}
        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all border ${
          duplicateCount > 0
            ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
        title="Cek data NIS atau Nama siswa yang terduplikasi"
      >
        <Users className={`w-3.5 h-3.5 ${duplicateCount > 0 ? 'text-rose-600' : 'text-slate-500'}`} />
        <span>Cek Duplikat</span>
        {duplicateCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
            {duplicateCount}
          </span>
        )}
      </button>

      {onAuditAndRealignWaves && (
        <button
          onClick={handleRunAudit}
          disabled={isAuditing}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all ${
            mismatchedStudents.length > 0
              ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
          title="Audit dan selaraskan gelombang seluruh siswa sesuai jurusan dan pengaturan sistem"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {mismatchedStudents.length > 0 ? `Audit & Sinkron (${mismatchedStudents.length})` : 'Audit Gelombang'}
          </span>
        </button>
      )}
      <button
        onClick={() => setIsBulkUpdateOpen(true)}
        className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-2 cursor-pointer shadow-xs transition-all"
      >
        <Edit3 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Bulk Update</span>
      </button>
      <button
        onClick={() => setIsBulkImportOpen(true)}
        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Import Excel</span>
      </button>
      <button
        onClick={() => setIsBulkClearOpen(true)}
        className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Kosongkan Data</span>
      </button>
    </div>
  );

  const classNames = React.useMemo(() => {
    if (classes && classes.length > 0) {
      return classes.map((c) => c.name);
    }
    return Array.from(new Set((students || []).map((s) => s.className).filter(Boolean)));
  }, [classes, students]);

  return (
    <div className="h-full flex flex-col min-h-[500px]">
      {mismatchedStudents.length > 0 && (
        <div className="mb-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-amber-100 text-amber-800 rounded-xl font-bold">⚠️ Audit Gelombang</span>
            <p className="text-xs font-semibold text-amber-950">
              Ditemukan <span className="font-extrabold text-rose-600 underline">{mismatchedStudents.length} siswa</span> yang gelombangnya belum selaras dengan konfigurasi jurusan.
            </p>
          </div>
          {onAuditAndRealignWaves && (
            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap self-end sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>{isAuditing ? 'Menyelaraskan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          )}
        </div>
      )}

      <DataViewWrapper<Student>
        schema={studentSchema}
        data={students || []}
        currentUserRole="ADMIN"
        onSave={(item) => {
          if (item.id && (students || []).some((s) => s.id === item.id)) {
            onUpdateStudent(item as Student);
          } else {
            onAddStudent({
              ...item,
              id: item.id || crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            } as Student);
          }
        }}
        onDelete={(id) => onDeleteStudent(id)}
        customActions={customActions}
        customFormModal={({ isOpen, onClose, initialData, onSave }) => (
          <UnifiedStudentModal
            isOpen={isOpen}
            onClose={onClose}
            student={initialData ? (initialData as Student) : null}
            students={students || []}
            classes={classes || []}
            buses={buses || []}
            rooms={rooms || []}
            settings={settings || ({} as AppSettings)}
            onSave={async (finalStudent) => {
              onSave(finalStudent);
            }}
          />
        )}
      />

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImport={(importedStudents, importedClasses) => {
          onBulkImportStudents(importedStudents, importedClasses);
          setIsBulkImportOpen(false);
        }}
        classes={classes || []}
        students={students || []}
      />

      <BulkClearModal
        isOpen={isBulkClearOpen}
        onClose={() => setIsBulkClearOpen(false)}
        students={students || []}
        classList={classNames}
        onApplyClear={(updatedStudents) => {
          onBulkImportStudents(updatedStudents, classes);
        }}
      />

      <BulkUpdateModal
        isOpen={isBulkUpdateOpen}
        onClose={() => setIsBulkUpdateOpen(false)}
        selectedStudents={students || []}
        onApplyUpdate={(updatedStudents) => {
          onBulkImportStudents(updatedStudents, classes);
        }}
      />

      <DuplicateStudentsModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        students={students || []}
        onDeleteStudent={(id) => {
          onDeleteStudent(id);
        }}
        onEditStudent={(st) => {
          setEditingDuplicateStudent(st);
        }}
      />

      {editingDuplicateStudent && (
        <UnifiedStudentModal
          isOpen={!!editingDuplicateStudent}
          onClose={() => setEditingDuplicateStudent(null)}
          student={editingDuplicateStudent}
          students={students || []}
          classes={classes || []}
          buses={buses || []}
          rooms={rooms || []}
          settings={settings || ({} as AppSettings)}
          onSave={async (finalStudent) => {
            onUpdateStudent(finalStudent);
            setEditingDuplicateStudent(null);
          }}
        />
      )}
    </div>
  );
};
