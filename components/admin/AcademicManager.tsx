import React, { useState } from 'react';
import { SchoolClass, Student, AppSettings } from '@/types';
import { StudentManager } from './StudentManager';
import { ClassManager } from './ClassManager';
import { Users, Building } from 'lucide-react';

interface AcademicManagerProps {
  students: Student[];
  classes: SchoolClass[];
  settings: AppSettings;
  isAngketClosed: boolean;
  onAddStudent: (student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onDeleteMultipleStudents: (ids: string[]) => Promise<void>;
  onBulkImportStudents: (data: any[], targetClass: string) => Promise<void>;
  onClearAllStudents: () => Promise<void>;
  onAutoAllocateRooms: () => Promise<void>;
  onAutoAllocateBuses: () => Promise<void>;
  onAddClass: (newClass: Omit<SchoolClass, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateClass: (id: string, updates: Partial<SchoolClass>) => Promise<void>;
  onDeleteClass: (id: string) => Promise<void>;
  onSaveSettings: (settings: AppSettings) => Promise<void> | void;
}

export const AcademicManager: React.FC<AcademicManagerProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'CLASSES'>('STUDENTS');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-max max-w-full overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 min-w-max sm:min-w-0 flex-1 sm:flex-none ${
            activeTab === 'STUDENTS' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Siswa</span>
        </button>
        <button
          onClick={() => setActiveTab('CLASSES')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 min-w-max sm:min-w-0 flex-1 sm:flex-none ${
            activeTab === 'CLASSES' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span><span className="hidden sm:inline">Manajemen </span>Kelas<span className="hidden sm:inline"> & Wali</span></span>
        </button>
      </div>

      {activeTab === 'STUDENTS' && (
        <StudentManager
          students={props.students}
          classes={props.classes}
          settings={props.settings}
          isAngketClosed={props.isAngketClosed}
          onAddStudent={props.onAddStudent}
          onUpdateStudent={props.onUpdateStudent}
          onDeleteStudent={props.onDeleteStudent}
          onDeleteMultipleStudents={props.onDeleteMultipleStudents}
          onBulkImportStudents={props.onBulkImportStudents}
          onClearAllStudents={props.onClearAllStudents}
          onAutoAllocateRooms={props.onAutoAllocateRooms}
          onAutoAllocateBuses={props.onAutoAllocateBuses}
        />
      )}

      {activeTab === 'CLASSES' && (
        <ClassManager
          classes={props.classes}
          students={props.students}
          onAddClass={props.onAddClass}
          onUpdateClass={props.onUpdateClass}
          onDeleteClass={props.onDeleteClass}
        />
      )}
    </div>
  );
};
