'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Trash2, RefreshCw, FileSpreadsheet, UserPlus, 
  UserMinus, Edit3, AlertTriangle, CheckCircle2, Calendar, 
  Clock, User, Database, Eye, X, Filter
} from 'lucide-react';
import { ActivityLog } from '@/types';
import { getInitialActivityLogs, logActivity, subscribeActivityLogs } from '@/services/firebaseService';

interface ActivityLogManagerProps {
  onRefreshStats?: () => void;
}

export const ActivityLogManager: React.FC<ActivityLogManagerProps> = ({ onRefreshStats }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);
  const isRealtimeActiveRef = useRef<boolean>(true);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState<boolean>(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState<ActivityLog | null>(null);

  // Fetch initial logs
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await getInitialActivityLogs();
      setLogs(data);
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const logsRef = useRef<ActivityLog[]>(logs);
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  // Real-time Supabase Subscription
  // Real-time Firestore Subscription
  useEffect(() => {
    const unsubscribe = subscribeActivityLogs((newLogs) => {
      setLogs(newLogs);
      setIsRealtimeActive(true);
      if (onRefreshStats) onRefreshStats();
    });

    return () => {
      unsubscribe();
    };
  }, [onRefreshStats]);

  // Handle Clear Logs
  const handleClearLogs = async () => {
    setIsLoading(true);
    try {
      // Clear logs state and log the action
      setLogs([]);
      await logActivity({
        action: 'CLEAR',
        operator: 'Admin',
        details: 'Seluruh riwayat Log Aktivitas telah dikosongkan secara permanen.',
      });

      await fetchLogs();
      setIsConfirmClearOpen(false);
    } catch (e) {
      console.error('Error clearing logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to format Indonesian DateTime beautifully
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '-';
      
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();

      const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
      const timeStr = date.toLocaleTimeString('id-ID', timeOptions);

      if (isToday) {
        return `Hari Ini, ${timeStr}`;
      } else if (isYesterday) {
        return `Kemarin, ${timeStr}`;
      } else {
        const dateOptions: Intl.DateTimeFormatOptions = { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        };
        return `${date.toLocaleDateString('id-ID', dateOptions)} - ${timeStr}`;
      }
    } catch {
      return isoString;
    }
  };

  // Filter logs based on search query & action selection
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Action Filter
      if (selectedAction !== 'ALL' && log.action !== selectedAction) {
        return false;
      }

      // Query Filter
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        log.name?.toLowerCase().includes(q) ||
        log.nis?.toLowerCase().includes(q) ||
        log.className?.toLowerCase().includes(q) ||
        log.operator?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q)
      );
    });
  }, [logs, searchQuery, selectedAction]);

  // Style helper for Action Badges
  const getActionStyle = (action: string) => {
    switch (action) {
      case 'ADD':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          iconBg: 'bg-emerald-500 text-white',
          icon: UserPlus,
          label: 'TAMBAH'
        };
      case 'DELETE':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          iconBg: 'bg-rose-500 text-white',
          icon: UserMinus,
          label: 'HAPUS'
        };
      case 'UPDATE':
        return {
          bg: 'bg-sky-50 border-sky-200 text-sky-700',
          iconBg: 'bg-sky-500 text-white',
          icon: Edit3,
          label: 'EDIT'
        };
      case 'BULK_IMPORT':
        return {
          bg: 'bg-purple-50 border-purple-200 text-purple-700',
          iconBg: 'bg-purple-500 text-white',
          icon: FileSpreadsheet,
          label: 'IMPORT'
        };
      case 'CLEAR':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          iconBg: 'bg-amber-500 text-white',
          icon: Trash2,
          label: 'CLEAR'
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-200 text-slate-700',
          iconBg: 'bg-slate-500 text-white',
          icon: Database,
          label: 'LOG'
        };
    }
  };

  return (
    <div className="space-y-4" id="activity-log-manager-container">
      {/* Upper Status Bar & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-600" /> Log Aktivitas Riwayat Siswa
            <div className="flex items-center gap-1.5 ml-2">
              <span className={`relative flex h-2.5 w-2.5`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRealtimeActive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRealtimeActive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase">
                {isRealtimeActive ? 'Realtime Active' : 'Polling Active'}
              </span>
            </div>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Memantau penambahan, penghapusan, impor massal, dan modifikasi data siswa secara live.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            type="button"
            onClick={() => setIsConfirmClearOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Kosongkan Log
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span>Filter & Cari Log</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIS, operator, detail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs font-bold border border-slate-200 focus:border-purple-500 rounded-xl w-full focus:ring-1 focus:ring-purple-500/25 transition-all outline-hidden text-slate-800"
            />
          </div>

          {/* Action Filter Pills */}
          <div className="md:col-span-2 flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'Semua Aktivitas' },
              { id: 'ADD', label: 'Tambah Siswa' },
              { id: 'DELETE', label: 'Hapus Siswa' },
              { id: 'BULK_IMPORT', label: 'Impor Excel' },
              { id: 'UPDATE', label: 'Modifikasi' },
              { id: 'CLEAR', label: 'Kosongkan Data' }
            ].map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => setSelectedAction(act.id)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                  selectedAction === act.id
                    ? 'bg-purple-600 border-purple-600 text-white font-extrabold shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {act.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
            <span className="text-xs text-slate-500 font-bold">Memuat riwayat log secara live...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-slate-50/50">
            <AlertTriangle className="w-8 h-8 text-slate-400" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700">Tidak ada log aktivitas</h4>
              <p className="text-[11px] text-slate-500">
                {searchQuery || selectedAction !== 'ALL' 
                  ? 'Tidak ada aktivitas siswa yang cocok dengan filter pencarian Anda.' 
                  : 'Belum ada riwayat aktivitas penambahan atau penghapusan siswa yang terekam.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <AnimatePresence initial={false}>
              {filteredLogs.map((log) => {
                const actStyle = getActionStyle(log.action);
                const Icon = actStyle.icon;

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 hover:bg-slate-50/50 transition-colors flex items-start gap-3 sm:gap-4 text-slate-800"
                  >
                    {/* Visual Icon Badge */}
                    <div className={`p-2 rounded-xl shrink-0 ${actStyle.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Detailed Content */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border ${actStyle.bg}`}>
                            {actStyle.label}
                          </span>
                          
                          {/* Student Meta Details if they exist */}
                          {log.className && (
                            <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">
                              Kelas {log.className}
                            </span>
                          )}
                          {log.nis && (
                            <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono">
                              NIS: {log.nis}
                            </span>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 shrink-0" title={log.timestamp}>
                          <Clock className="w-3 h-3" />
                          <span>{formatDateTime(log.timestamp)}</span>
                        </div>
                      </div>

                      {/* Main Message details */}
                      <p className="text-xs text-slate-700 font-semibold leading-relaxed break-words">
                        {log.details}
                      </p>

                      {/* Operator Badge */}
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Oleh: <strong className="text-slate-600">{log.operator}</strong></span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <button
                      type="button"
                      onClick={() => setSelectedLogDetail(log)}
                      className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                      title="Lihat Detail Log"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Info Stats Footer */}
      <div className="flex items-center justify-between px-2 text-[10px] text-slate-400 font-bold">
        <span>Menampilkan {filteredLogs.length} dari {logs.length} log riwayat siswa</span>
        <span>Akses khusus Admin Panitia & Wali Kelas</span>
      </div>

      {/* MODAL 1: Log Detail Viewer */}
      <AnimatePresence>
        {selectedLogDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLogDetail(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" 
            />

            {/* Panel */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-10 p-5 text-slate-800"
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-purple-600" /> Rincian Log Aktivitas
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">ID Log: {selectedLogDetail.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedLogDetail(null)}
                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Action Tag & Timestamp */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Aktivitas</span>
                    <div className="mt-0.5">
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-md border uppercase ${getActionStyle(selectedLogDetail.action).bg}`}>
                        {selectedLogDetail.action}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Waktu & Tanggal</span>
                    <p className="font-bold text-slate-700 mt-0.5">{formatDateTime(selectedLogDetail.timestamp)}</p>
                  </div>
                </div>

                {/* Operator Details */}
                <div className="space-y-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Operator / Pelaku</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <User className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="font-extrabold text-slate-800">{selectedLogDetail.operator}</span>
                  </div>
                </div>

                {/* Student Details */}
                {(selectedLogDetail.name || selectedLogDetail.nis || selectedLogDetail.className) && (
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
                    <span className="text-[9px] font-black text-purple-800 uppercase tracking-wider">Meta Target Siswa</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 block uppercase">Nama Siswa</span>
                        <span className="font-bold text-slate-800 break-words">{selectedLogDetail.name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 block uppercase">NIS</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedLogDetail.nis || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 block uppercase">Kelas</span>
                        <span className="font-bold text-slate-800">{selectedLogDetail.className || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Details Log */}
                <div className="space-y-0.5">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Detail Perubahan</span>
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200 mt-0.5 leading-relaxed font-medium">
                    {selectedLogDetail.details}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedLogDetail(null)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Tutup Rincian
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Clear Logs Confirmation */}
      <AnimatePresence>
        {isConfirmClearOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmClearOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" 
            />

            {/* Panel */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-10 p-5 text-slate-800 text-center"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-full">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="font-black text-slate-950 text-sm">Kosongkan Riwayat Log?</h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Tindakan ini akan menghapus semua log riwayat aktivitas siswa secara permanen dari database Supabase dan tidak dapat dibatalkan.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsConfirmClearOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleClearLogs}
                  disabled={isLoading}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md hover:shadow-rose-600/10 transition-all cursor-pointer disabled:opacity-50"
                >
                  Ya, Kosongkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
