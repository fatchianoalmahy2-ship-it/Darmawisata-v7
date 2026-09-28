import React, { useState } from 'react';
import { QueryQueueMonitor } from './QueryQueueMonitor';
import { ActivityLogManager } from './ActivityLogManager';
import { Database, History } from 'lucide-react';

export const SystemMonitorManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'QUERIES' | 'LOGS'>('QUERIES');

  return (
    <div className="space-y-4">
      <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-max max-w-full overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('QUERIES')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 min-w-max sm:min-w-0 flex-1 sm:flex-none ${
            activeTab === 'QUERIES' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5 shrink-0" /> Antrian Sinkronisasi
        </button>
        <button
          onClick={() => setActiveTab('LOGS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 min-w-max sm:min-w-0 flex-1 sm:flex-none ${
            activeTab === 'LOGS' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5 shrink-0" /> Log Aktivitas Sistem
        </button>
      </div>

      {activeTab === 'QUERIES' && <QueryQueueMonitor />}
      {activeTab === 'LOGS' && <ActivityLogManager />}
    </div>
  );
};
