'use client';
import React, { useState } from 'react';
import { RundownItem } from '@/types';
import { rundownSchema } from '@/config/schemas/rundownSchema';
import { DataViewWrapper } from '@/components/core/templates/DataViewWrapper';
import { RotateCcw } from 'lucide-react';

interface RundownManagerProps {
  rundowns: RundownItem[];
  onSaveRundown: (item: RundownItem) => Promise<void>;
  onDeleteRundown: (id: string) => Promise<void>;
  onResetRundowns: () => Promise<void>;
}

export const RundownManager: React.FC<RundownManagerProps> = ({
  rundowns,
  onSaveRundown,
  onDeleteRundown,
  onResetRundowns,
}) => {
  const [selectedTour, setSelectedTour] = useState<'BALI' | 'YOGYAKARTA'>('BALI');

  const filteredItems = rundowns
    .filter((r) => {
      if (selectedTour === 'BALI') return r.id?.startsWith('bali') || r.location.toLowerCase().includes('bali') || r.day <= 5;
      return r.id?.startsWith('yogya') || r.location.toLowerCase().includes('yogya') || r.location.toLowerCase().includes('merapi');
    })
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));

  const handleSave = (item: Partial<RundownItem>) => {
    const newItem = {
      ...item,
      id: item.id || `${selectedTour.toLowerCase()}-${Date.now()}`
    } as RundownItem;
    onSaveRundown(newItem);
  };

  const customActions = (
    <button
      onClick={() => {
        if(window.confirm('Yakin ingin mereset jadwal ke default bawaan sistem? Semua perubahan Anda akan hilang.')) {
          onResetRundowns();
        }
      }}
      className="px-4 py-2 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
    >
      <RotateCcw className="w-4 h-4" />
      <span className="hidden sm:inline">Reset Default</span>
    </button>
  );

  return (
    <div className="h-full flex flex-col min-h-[500px] animate-fade-in">
      <div className="flex bg-slate-100 p-1 rounded-xl w-max mb-4">
        <button
          onClick={() => setSelectedTour('BALI')}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
            selectedTour === 'BALI' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Destinasi BALI
        </button>
        <button
          onClick={() => setSelectedTour('YOGYAKARTA')}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
            selectedTour === 'YOGYAKARTA' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Destinasi YOGYAKARTA
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <DataViewWrapper<RundownItem>
          schema={rundownSchema}
          data={filteredItems}
          currentUserRole="ADMIN"
          onSave={handleSave}
          onDelete={onDeleteRundown}
          customActions={customActions}
        />
      </div>
    </div>
  );
};
