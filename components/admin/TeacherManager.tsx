'use client';

import React, { useState, useMemo } from 'react';
import { MasterTeacher, Chaperone, AppSettings, SchoolClass, GenderType, ChaperoneRole } from '@/types';
import { teacherIndukSchema } from '@/config/schemas/masterSchemas';
import { DataViewWrapper } from '@/components/core/templates/DataViewWrapper';
import { UserCheck, Plus, Sparkles, UserPlus } from 'lucide-react';

interface TeacherManagerProps {
  classes: SchoolClass[];
  settings: AppSettings;
  onSaveSettings?: (settings: AppSettings) => Promise<void> | void;
}

export const TeacherManager: React.FC<TeacherManagerProps> = ({
  classes,
  settings,
  onSaveSettings,
}) => {
  // Synthesize master teacher list from masterChaperones + class homeroom teachers
  const teachersList: MasterTeacher[] = useMemo(() => {
    const list: MasterTeacher[] = [];
    const seenNames = new Set<string>();

    // 1. From masterChaperones in settings
    (settings.masterChaperones || []).forEach((c) => {
      if (!c.name || seenNames.has(c.name.trim().toLowerCase())) return;
      seenNames.add(c.name.trim().toLowerCase());
      list.push({
        id: c.id,
        name: c.name,
        gender: c.gender || 'LAKI-LAKI',
        defaultRole: c.role || 'PANITIA',
        phone: c.phone || '',
        notes: c.notes || '',
      });
    });

    // 2. From Class Homeroom Teachers (Wali Kelas)
    classes.forEach((cls) => {
      if (!cls.homeroomTeacher || seenNames.has(cls.homeroomTeacher.trim().toLowerCase())) return;
      seenNames.add(cls.homeroomTeacher.trim().toLowerCase());
      list.push({
        id: `teacher-${cls.id}`,
        name: cls.homeroomTeacher,
        gender: 'LAKI-LAKI',
        defaultRole: 'WALI_KELAS',
        phone: cls.teacherPhone || '',
        notes: `Wali Kelas ${cls.name}`,
      });
    });

    return list;
  }, [settings.masterChaperones, classes]);

  const handleSaveTeacher = async (teacher: MasterTeacher) => {
    const currentChaperones: Chaperone[] = [...(settings.masterChaperones || [])];
    const existingIndex = currentChaperones.findIndex(
      (c) => c.id === teacher.id || c.name.trim().toLowerCase() === teacher.name.trim().toLowerCase()
    );

    const updatedChaperone: Chaperone = {
      id: teacher.id || `chap-${Date.now()}`,
      name: teacher.name,
      role: (teacher.defaultRole as ChaperoneRole) || 'PANITIA',
      phone: teacher.phone || '',
      gender: (teacher.gender as GenderType) || 'LAKI-LAKI',
      notes: teacher.notes || '',
      assignedWave: 'ALL',
    };

    if (existingIndex >= 0) {
      currentChaperones[existingIndex] = updatedChaperone;
    } else {
      currentChaperones.push(updatedChaperone);
    }

    if (onSaveSettings) {
      await onSaveSettings({
        ...settings,
        masterChaperones: currentChaperones,
      });
    }
  };

  const handleDeleteTeacher = async (teacher: MasterTeacher) => {
    const currentChaperones = (settings.masterChaperones || []).filter(
      (c) => c.id !== teacher.id && c.name.trim().toLowerCase() !== teacher.name.trim().toLowerCase()
    );

    if (onSaveSettings) {
      await onSaveSettings({
        ...settings,
        masterChaperones: currentChaperones,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Master Data Guru & Tenaga Pendidik
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Kelola data wali kelas, guru pendamping, tim medis, dan penanggung jawab rombel.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
            Total: <strong className="text-slate-900">{teachersList.length}</strong> Guru & Staf
          </span>
        </div>
      </div>

      {/* Main Table via Master Table Schema */}
      <DataViewWrapper<MasterTeacher>
        schema={teacherIndukSchema}
        data={teachersList}
        currentUserRole="ADMIN"
        onSave={handleSaveTeacher}
        onDelete={handleDeleteTeacher}
      />
    </div>
  );
};
