'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  RefreshCw, 
  Trash2, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Layers, 
  Wifi, 
  WifiOff 
} from 'lucide-react';
import { dbService, SyncTask } from '@/services/dbService';

export const QueryQueueMonitor: React.FC = () => {
  const [tasks, setTasks] = useState<SyncTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const fetchQueue = useCallback(async () => {
    try {
      const q = await dbService.getSyncQueue();
      setTasks(q);
    } catch (e) {
      console.error('Failed to load sync queue:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      dbService.triggerSync().then(fetchQueue);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [fetchQueue]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await dbService.triggerSync();
      await fetchQueue();
    } catch (e) {
      console.error('Error triggering sync:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    await dbService.removeTask(id);
    await fetchQueue();
  };

  const handleClearAll = async () => {
    for (const t of tasks) {
      await dbService.removeTask(t.id);
    }
    await fetchQueue();
  };

  const formatTimestamp = (ts: number) => {
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'save_student':
      case 'save_students':
        return { label: 'Simpan Siswa', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'delete_student':
      case 'delete_students':
        return { label: 'Hapus Siswa', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'clear_students':
        return { label: 'Kosongkan Siswa', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'save_classes':
        return { label: 'Simpan Kelas', color: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'delete_class':
        return { label: 'Hapus Kelas', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'save_settings':
        return { label: 'Simpan Pengaturan', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'save_rundown':
      case 'delete_rundown':
        return { label: 'Jadwal Rundown', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: action, color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getPayloadSummary = (task: SyncTask) => {
    if (!task.payload) return 'Tidak ada data muatan';
    if (Array.isArray(task.payload)) {
      return `${task.payload.length} item data massal`;
    }
    if (typeof task.payload === 'object') {
      if (task.payload.nama) return `Siswa: ${task.payload.nama} (${task.payload.kelas || '-'})`;
      if (task.payload.name) return `Kelas: ${task.payload.name}`;
      if (task.payload.title) return `Rundown: ${task.payload.title}`;
      return JSON.stringify(task.payload).slice(0, 80) + '...';
    }
    return String(task.payload);
  };

  return (
    <div className="space-y-4" id="query-queue-monitor-container">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Antrian Sinkronisasi Offline & Cache
            </h2>
            <div className="flex items-center gap-1.5 ml-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                isOnline 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Data perubahan yang tersimpan di IndexedDB browser saat offline akan otomatis disinkronkan ke Supabase ketika koneksi kembali normal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchQueue}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Perbarui
          </button>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing || tasks.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
          </button>

          {tasks.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Bersihkan
            </button>
          )}
        </div>
      </div>

      {/* Queue List Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="text-xs text-slate-500 font-bold">Memeriksa antrian sinkronisasi...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-slate-50/50">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">Semua Data Telah Tersinkronisasi</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tidak ada perubahan lokal yang tertunda. Database lokal IndexedDB dan cloud Supabase sinkron.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <AnimatePresence initial={false}>
              {tasks.map((task, idx) => {
                const badge = getActionBadge(task.action);
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4 text-slate-800"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">
                            #{idx + 1}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md border ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {task.action}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {getPayloadSummary(task)}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>Masuk antrian: {formatTimestamp(task.timestamp)}</span>
                          <span className="font-mono text-[9px] text-slate-300">({task.id})</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
                      title="Hapus tugas dari antrian"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between px-2 text-[10px] text-slate-400 font-bold">
        <span>{tasks.length} tugas dalam antrian offline</span>
        <span>IndexedDB Cache Storage (Version 2)</span>
      </div>
    </div>
  );
};
