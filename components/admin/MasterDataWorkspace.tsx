'use client';

import React from 'react';
import { Student, SchoolClass, AppSettings, Bus, Room } from '@/types';
import { StudentManager } from './StudentManager';
import { TeacherManager } from './TeacherManager';
import { ClassManager } from './ClassManager';
import { WaliAllocationManager } from './WaliAllocationManager';
import { Users, UserCheck, Building, Award } from 'lucide-react';

interface MasterDataWorkspaceProps {
  activeSubTab?: string;
  onSelectSubTab?: (subTab: any) => void;
  students: Student[];
  classes: SchoolClass[];
  buses?: Bus[];
  rooms?: Room[];
  settings: AppSettings;
  isAngketClosed?: boolean;
  onAddStudent: (newStudent: Student) => void;
  onUpdateStudent: (id: string, updates: Partial<Student>) => Promise<void> | void;
  onDeleteStudent: (studentId: string) => void;
  onDeleteMultipleStudents?: (studentIds: string[]) => void;
  onBulkImportStudents: (importedStudents: Student[], importedClasses?: SchoolClass[]) => void;
  onClearAllStudents: () => void;
  onAutoAllocateRooms: () => void;
  onAutoAllocateBuses: () => void;
  onAddClass: (newClass: SchoolClass) => void;
  onUpdateClass: (id: string, updates: Partial<SchoolClass>) => Promise<void> | void;
  onDeleteClass: (classId: string) => void;
  onSaveSettings?: (settings: AppSettings) => Promise<void> | void;
  onAuditAndRealignWaves?: () => Promise<void> | void;
}

export const MasterDataWorkspace: React.FC<MasterDataWorkspaceProps> = ({
  activeSubTab = 'STUDENTS',
  onSelectSubTab,
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
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onSaveSettings,
  onAuditAndRealignWaves,
}) => {
  // Normalize legacy tab names
  const normalizedTab = activeSubTab === 'ACADEMIC' ? 'STUDENTS' : activeSubTab;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Tab Switcher Horizontal Bar */}
      {onSelectSubTab && (
        <div className="hidden sm:flex items-center gap-2 border-b border-slate-200/90 pb-3">
          <button
            onClick={() => onSelectSubTab('STUDENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              normalizedTab === 'STUDENTS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Users className={`w-4 h-4 ${normalizedTab === 'STUDENTS' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>1. Master Data Siswa ({students.length})</span>
          </button>

          <button
            onClick={() => onSelectSubTab('TEACHERS')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              normalizedTab === 'TEACHERS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <UserCheck className={`w-4 h-4 ${normalizedTab === 'TEACHERS' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>2. Master Guru & Pendamping</span>
          </button>

          <button
            onClick={() => onSelectSubTab('CLASSES')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              normalizedTab === 'CLASSES'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Building className={`w-4 h-4 ${normalizedTab === 'CLASSES' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>3. Master Jurusan & Rombel ({classes.length})</span>
          </button>

          <button
            onClick={() => onSelectSubTab('WALI_ALLOCATION')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              normalizedTab === 'WALI_ALLOCATION'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Award className={`w-4 h-4 ${normalizedTab === 'WALI_ALLOCATION' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>4. Alokasi & Pindah Wali ({classes.length})</span>
          </button>
        </div>
      )}

      {/* Tab Content Display */}
      {normalizedTab === 'STUDENTS' && (
        <StudentManager
          students={students}
          classes={classes}
          buses={buses}
          rooms={rooms}
          settings={settings}
          isAngketClosed={isAngketClosed}
          onAddStudent={onAddStudent}
          onUpdateStudent={(s) => onUpdateStudent(s.id, s)}
          onDeleteStudent={onDeleteStudent}
          onDeleteMultipleStudents={onDeleteMultipleStudents}
          onBulkImportStudents={onBulkImportStudents}
          onClearAllStudents={onClearAllStudents}
          onAutoAllocateRooms={onAutoAllocateRooms}
          onAutoAllocateBuses={onAutoAllocateBuses}
          onAuditAndRealignWaves={onAuditAndRealignWaves}
        />
      )}

      {normalizedTab === 'TEACHERS' && (
        <TeacherManager
          classes={classes}
          settings={settings}
          onSaveSettings={onSaveSettings}
        />
      )}

      {normalizedTab === 'CLASSES' && (
        <ClassManager
          classes={classes}
          students={students}
          onAddClass={onAddClass}
          onUpdateClass={onUpdateClass}
          onDeleteClass={onDeleteClass}
        />
      )}

      {normalizedTab === 'WALI_ALLOCATION' && (
        <WaliAllocationManager
          classes={classes}
          students={students}
          buses={buses}
          settings={settings}
          onUpdateClass={async (updatedCls) => {
            if (onUpdateClass) {
              await onUpdateClass(updatedCls.id, updatedCls);
            }
          }}
          onUpdateSettings={onSaveSettings}
        />
      )}
    </div>
  );
};
