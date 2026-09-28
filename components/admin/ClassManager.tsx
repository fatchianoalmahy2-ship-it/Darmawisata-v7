'use client';

import React from 'react';
import { SchoolClass, Student } from '@/types';
import { classSchema } from '@/config/schemas/classSchema';
import { DataViewWrapper } from '@/components/core/templates/DataViewWrapper';
import { ImportExcelButton } from './ImportExcelButton';

interface ClassManagerProps {
  classes: SchoolClass[];
  students: Student[];
  onAddClass: (newClass: SchoolClass) => Promise<void> | void;
  onUpdateClass: (id: string, updates: Partial<SchoolClass>) => Promise<void>;
  onDeleteClass: (classId: string) => Promise<void> | void;
  onImportClasses?: (importedClasses: SchoolClass[]) => Promise<void>;
}

export const ClassManager: React.FC<ClassManagerProps> = ({
  classes,
  students,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onImportClasses
}) => {
  const handleSave = (item: Partial<SchoolClass>) => {
    if (item.id && (classes || []).some(c => c.id === item.id)) {
      const currentClass = classes.find(c => c.id === item.id);
      if (currentClass) {
        onUpdateClass(item.id!, { ...currentClass, ...item });
      }
    } else {
      const newClass: SchoolClass = {
        id: item.id || `class-${Date.now()}`,
        name: item.name || '',
        department: item.department || '',
        totalStudents: 0,
        homeroomTeacher: item.homeroomTeacher || '',
        teacherPhone: item.teacherPhone,
        teacherPassword: item.teacherPassword,
      };
      onAddClass(newClass);
    }
  };

  const handleImportClasses = (data: any[]) => {
    // Map Excel data to SchoolClass objects
    const importedClasses: SchoolClass[] = data.map((row: any, index: number) => ({
      id: `class-imp-${Date.now()}-${index}`,
      name: String(row.name || row.Kelas || row.Class || ''),
      department: String(row.department || row.Jurusan || ''),
      totalStudents: 0,
      homeroomTeacher: String(row.homeroomTeacher || row.WaliKelas || ''),
      teacherPhone: String(row.teacherPhone || row.NoHP || ''),
      teacherPassword: String(row.teacherPassword || row.Password || ''),
    })).filter(c => c.name);
    
    if (onImportClasses) {
      onImportClasses(importedClasses);
    } else {
      // Fallback: add one by one if bulk import not provided by parent
      importedClasses.forEach(c => onAddClass(c));
    }
  };

  return (
    <div className="h-full">
      <DataViewWrapper<SchoolClass>
        schema={classSchema}
        data={classes}
        currentUserRole="ADMIN"
        onSave={handleSave}
        onDelete={onDeleteClass}
        customActions={
          <ImportExcelButton<any> 
            onDataImported={handleImportClasses} 
            label="Import Excel"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
          />
        }
      />
    </div>
  );
};
