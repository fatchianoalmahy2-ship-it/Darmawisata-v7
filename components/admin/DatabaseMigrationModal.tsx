'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  ArrowRight,
  ShieldCheck,
  Check,
  Layers,
  HardDriveUpload,
  Flame,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import {
  FirebaseStudentRepository,
  FirebaseClassRepository,
  FirebaseSettingsRepository,
  FirebaseRundownRepository,
  FirebaseActivityLogRepository,
  clearAllFirebaseData,
} from '@/services/firebaseService';

async function safeFetchJson(url: string, options?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(`Gagal menghubungi server (Network Error): ${netErr.message || 'Periksa koneksi internet.'}`);
  }

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    const isHtml = text.trim().startsWith('<') || text.includes('<!DOCTYPE html>') || text.includes('<html');
    if (isHtml) {
      const titleMatch = text.match(/<title>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';
      const bodyClean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 150);
      throw new Error(`Server mengembalikan halaman HTML. Title: "${title || 'Tanpa Judul'}" | Cuplikan: ${bodyClean}`);
    }
    if (!res.ok) {
      const bodyPreview = text ? text.substring(0, 120).replace(/<[^>]*>/g, '').trim() : '';
      throw new Error(`Server Error (${res.status})${bodyPreview ? `: ${bodyPreview}` : ''}`);
    }
    throw new Error(`Respon bukan JSON valid: ${text.substring(0, 100)}`);
  }
  return json;
}

interface DatabaseMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMigrationComplete?: () => void;
}

interface TableSyncState {
  name: string;
  label: string;
  supabaseCount: number;
  targetCount: number;
  status: 'idle' | 'fetching' | 'migrating' | 'success' | 'error';
  errorMessage?: string;
}

const TARGET_TABLES: { name: string; label: string }[] = [
  { name: 'students', label: 'Data Induk Siswa' },
  { name: 'classes', label: 'Data Kelas & Rombel' },
  { name: 'settings', label: 'Pengaturan Global & Sistem' },
  { name: 'rundowns', label: 'Jadwal Rundown & Itinerary' },
  { name: 'activity_logs', label: 'Log Aktivitas & Audit' },
];

export const DatabaseMigrationModal: React.FC<DatabaseMigrationModalProps> = ({
  isOpen,
  onClose,
  onMigrationComplete,
}) => {
  const [migrationTarget, setMigrationTarget] = useState<'FIREBASE' | 'NEON'>('FIREBASE');
  const [connectionString, setConnectionString] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [isClearingTarget, setIsClearingTarget] = useState<boolean>(false);
  const [clearTargetBeforeMigration, setClearTargetBeforeMigration] = useState<boolean>(true);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [currentActiveDb, setCurrentActiveDb] = useState<'FIREBASE' | 'NEON' | 'SUPABASE'>('FIREBASE');
  const [tablesState, setTablesState] = useState<TableSyncState[]>(
    TARGET_TABLES.map((t) => ({
      name: t.name,
      label: t.label,
      supabaseCount: 0,
      targetCount: 0,
      status: 'idle',
    }))
  );

  const [overallLog, setOverallLog] = useState<string[]>([]);
  const [migrationFinished, setMigrationFinished] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConnStr = localStorage.getItem('sim_neon_connection_string') || '';
      const savedActiveDb = (localStorage.getItem('sim_active_db_provider') as any) || 'FIREBASE';
      setConnectionString(savedConnStr);
      setCurrentActiveDb(savedActiveDb);
    }
  }, []);

  if (!isOpen) return null;

  const logMessage = (msg: string) => {
    setOverallLog((prev) => [`[${new Date().toLocaleTimeString('id-ID')}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const handleClearTargetData = async () => {
    setIsClearingTarget(true);
    logMessage(`🗑️ Mengosongkan seluruh data target di ${migrationTarget}...`);
    try {
      if (migrationTarget === 'FIREBASE') {
        await clearAllFirebaseData();
        logMessage('✅ Seluruh koleksi Firestore (students, classes, rundowns, activity_logs) berhasil dikosongkan.');
      } else {
        // Neon clear
        await safeFetchJson('/api/migration/neon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'clear-tables',
            connectionString: connectionString.trim(),
          }),
        });
        logMessage('✅ Seluruh tabel Neon Postgres berhasil dikosongkan.');
      }
      setTablesState((prev) => prev.map((t) => ({ ...t, targetCount: 0 })));
    } catch (err: any) {
      logMessage(`❌ Gagal mengosongkan data target: ${err.message}`);
    } finally {
      setIsClearingTarget(false);
      setShowClearConfirm(false);
    }
  };

  const handleStartMigration = async () => {
    setIsMigrating(true);
    setMigrationFinished(false);
    setOverallLog([]);
    logMessage(`🚀 Memulai migrasi data Supabase ➔ ${migrationTarget === 'FIREBASE' ? 'Firebase Firestore' : 'Neon Postgres'}...`);

    setTablesState((prev) =>
      prev.map((t) => ({ ...t, status: 'idle', supabaseCount: 0, targetCount: 0, errorMessage: undefined }))
    );

    try {
      if (clearTargetBeforeMigration) {
        logMessage(`🧹 [Otomatis] Mengosongkan data target ${migrationTarget} terlebih dahulu...`);
        if (migrationTarget === 'FIREBASE') {
          await clearAllFirebaseData();
        } else {
          await safeFetchJson('/api/migration/neon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'clear-tables',
              connectionString: connectionString.trim(),
            }),
          });
        }
        logMessage('✅ Data target bersih. Melanjutkan penyalinan data Supabase...');
      }
      if (migrationTarget === 'FIREBASE') {
        const fbStudents = new FirebaseStudentRepository();
        const fbClasses = new FirebaseClassRepository();
        const fbSettings = new FirebaseSettingsRepository();
        const fbRundowns = new FirebaseRundownRepository();
        const fbLogs = new FirebaseActivityLogRepository();

        for (const target of TARGET_TABLES) {
          const tName = target.name;
          logMessage(`📦 Membaca data [${target.label}] dari Supabase...`);

          setTablesState((prev) => prev.map((t) => (t.name === tName ? { ...t, status: 'fetching' } : t)));

          let supaData: any[] = [];
          const { data: fetchRes } = await supabase.from(tName).select('*');
          supaData = fetchRes || [];

          setTablesState((prev) =>
            prev.map((t) => (t.name === tName ? { ...t, supabaseCount: supaData.length, status: 'migrating' } : t))
          );

          logMessage(`🔄 Menulis ${supaData.length} baris [${target.label}] ke Firebase via writeBatch chunking...`);

          if (tName === 'students') {
            await fbStudents.save(supaData);
            const count = (await fbStudents.getAll()).length;
            setTablesState((prev) =>
              prev.map((t) => (t.name === tName ? { ...t, targetCount: count, status: 'success' } : t))
            );
          } else if (tName === 'classes') {
            await fbClasses.save(supaData);
            const count = (await fbClasses.getAll()).length;
            setTablesState((prev) =>
              prev.map((t) => (t.name === tName ? { ...t, targetCount: count, status: 'success' } : t))
            );
          } else if (tName === 'settings') {
            if (supaData.length > 0) {
              await fbSettings.saveSettings(supaData[0]);
            }
            setTablesState((prev) =>
              prev.map((t) => (t.name === tName ? { ...t, targetCount: 1, status: 'success' } : t))
            );
          } else if (tName === 'rundowns') {
            for (const r of supaData) {
              await fbRundowns.saveItem(r);
            }
            const count = (await fbRundowns.getAll()).length;
            setTablesState((prev) =>
              prev.map((t) => (t.name === tName ? { ...t, targetCount: count, status: 'success' } : t))
            );
          } else if (tName === 'activity_logs') {
            for (const l of supaData) {
              await fbLogs.log(l);
            }
            setTablesState((prev) =>
              prev.map((t) => (t.name === tName ? { ...t, targetCount: supaData.length, status: 'success' } : t))
            );
          }

          logMessage(`✅ Tabel [${target.label}] sukses dipindahkan ke Firestore!`);
        }
      } else {
        // Neon Migration
        for (const target of TARGET_TABLES) {
          const tName = target.name;
          logMessage(`📦 Membaca data [${target.label}] dari Supabase...`);
          setTablesState((prev) => prev.map((t) => (t.name === tName ? { ...t, status: 'fetching' } : t)));

          const { data: fetchRes } = await supabase.from(tName).select('*');
          const supaData = fetchRes || [];

          setTablesState((prev) =>
            prev.map((t) => (t.name === tName ? { ...t, supabaseCount: supaData.length, status: 'migrating' } : t))
          );

          const migData = await safeFetchJson('/api/migration/neon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'migrate-table',
              connectionString: connectionString.trim(),
              tableName: tName,
              data: supaData,
            }),
          });

          if (migData.success) {
            setTablesState((prev) =>
              prev.map((t) =>
                t.name === tName
                  ? { ...t, supabaseCount: migData.supabaseCount, targetCount: migData.neonCount, status: 'success' }
                  : t
              )
            );
          } else {
            setTablesState((prev) =>
              prev.map((t) => (t.name === tName ? { ...t, status: 'error', errorMessage: migData.error } : t))
            );
          }
        }
      }

      logMessage('🎉 Migrasi data selesai tanpa error!');
      setMigrationFinished(true);
    } catch (err: any) {
      logMessage(`❌ Error migrasi: ${err.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleToggleActiveDb = (provider: 'FIREBASE' | 'NEON' | 'SUPABASE') => {
    setCurrentActiveDb(provider);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sim_active_db_provider', provider);
    }
    logMessage(`⚡ Sumber Database Utama diubah ke: ${provider}`);
    if (onMigrationComplete) onMigrationComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide">
                  Migrasi Direct Database (Firebase / Neon)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Zero Data Loss
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Pindahkan seluruh master data tanpa batasan timeout atau error 503.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Target Selector */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setMigrationTarget('FIREBASE')}
              className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                migrationTarget === 'FIREBASE'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Firebase Firestore (Rekomendasi)</span>
            </button>
            <button
              onClick={() => setMigrationTarget('NEON')}
              className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                migrationTarget === 'NEON'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Neon Postgres</span>
            </button>
          </div>

          {/* Active Provider Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  currentActiveDb === 'FIREBASE'
                    ? 'bg-amber-500 animate-pulse'
                    : currentActiveDb === 'NEON'
                    ? 'bg-emerald-500'
                    : 'bg-cyan-500'
                }`}
              />
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Database Utama Aktif
                </span>
                <p className="text-sm font-black text-slate-900">
                  {currentActiveDb === 'FIREBASE'
                    ? '🔥 Firebase Firestore (Real-time DB)'
                    : currentActiveDb === 'NEON'
                    ? '⚡ Neon Postgres'
                    : '🔷 Supabase Database'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleToggleActiveDb('FIREBASE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  currentActiveDb === 'FIREBASE'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                🔥 Pakai Firebase
              </button>
              <button
                onClick={() => handleToggleActiveDb('NEON')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  currentActiveDb === 'NEON'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                ⚡ Pakai Neon
              </button>
              <button
                onClick={() => handleToggleActiveDb('SUPABASE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  currentActiveDb === 'SUPABASE'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Pakai Supabase
              </button>
            </div>
          </div>

          {/* Tables Migration Status Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Status Tabel & Verifikasi Data (5 Tabel Master)
              </label>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={isMigrating || isClearingTarget}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Kosongkan seluruh koleksi/tabel pada database target saat ini"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{isClearingTarget ? 'Mengosongkan...' : 'Kosongkan Data Target'}</span>
                </button>

                <button
                  onClick={handleStartMigration}
                  disabled={isMigrating || isClearingTarget}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {isMigrating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <HardDriveUpload className="w-4 h-4" />
                  )}
                  <span>Mulai Migrasi ke {migrationTarget}</span>
                </button>
              </div>
            </div>

            {/* Clear option checkbox */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                id="clearTargetFirst"
                checked={clearTargetBeforeMigration}
                onChange={(e) => setClearTargetBeforeMigration(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400 border-slate-300"
              />
              <label htmlFor="clearTargetFirst" className="cursor-pointer select-none">
                Kosongkan data target (<span className="font-bold text-slate-900">{migrationTarget}</span>) secara otomatis terlebih dahulu sebelum menyalin data dari Supabase.
              </label>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-4">Tabel Master</th>
                    <th className="py-2.5 px-4 text-center">Supabase Row</th>
                    <th className="py-2.5 px-4 text-center">{migrationTarget} Row</th>
                    <th className="py-2.5 px-4 text-center">Status Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {tablesState.map((t) => (
                    <tr key={t.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-400" />
                        <div>
                          <span className="block">{t.label}</span>
                          <code className="text-[10px] text-slate-400 font-mono">{t.name}</code>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                        {t.supabaseCount > 0 ? t.supabaseCount : '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-700">
                        {t.targetCount > 0 ? t.targetCount : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {t.status === 'idle' && (
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                            Menunggu
                          </span>
                        )}
                        {t.status === 'fetching' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Membaca
                          </span>
                        )}
                        {t.status === 'migrating' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Batch Write
                          </span>
                        )}
                        {t.status === 'success' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" /> 100% Synced
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Log Console */}
          {overallLog.length > 0 && (
            <div className="space-y-1.5">
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Log Proses Migrasi:
              </span>
              <div className="p-3 bg-slate-950 text-slate-300 font-mono text-[11px] rounded-2xl h-32 overflow-y-auto space-y-1 shadow-inner">
                {overallLog.map((log, idx) => (
                  <div key={idx} className="leading-snug">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {migrationFinished && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Migrasi Ke Firebase Berhasil!
                  </h4>
                  <p className="text-xs text-slate-600">
                    Seluruh data master telah dipindahkan ke Firebase Firestore dan siap untuk real-time update.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleToggleActiveDb('FIREBASE')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer shadow-sm"
              >
                Aktifkan Firebase Sekarang
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Koneksi aman dengan Firebase Firestore.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>

        {/* Confirmation Modal for Clear Data */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-md w-full space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Kosongkan Data Target ({migrationTarget})?</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Tindakan ini akan <strong className="text-rose-600 font-bold">MENGHAPUS SEMUA DATA</strong> (Siswa, Kelas, Rundown, Activity Log) yang ada di database target <strong className="text-slate-900 font-bold">{migrationTarget}</strong>. Data di Supabase <strong className="text-emerald-700">tetap aman</strong>.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  disabled={isClearingTarget}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleClearTargetData}
                  disabled={isClearingTarget}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  {isClearingTarget && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isClearingTarget ? 'Mengosongkan...' : 'Ya, Kosongkan Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default DatabaseMigrationModal;
