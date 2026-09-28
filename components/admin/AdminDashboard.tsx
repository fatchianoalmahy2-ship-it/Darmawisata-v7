'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Student, RundownItem, SchoolClass, Bus, Room, AppSettings, AuthUser } from '@/types';
import {
  AdminPillarKey,
  AdminSubTabKey,
  ADMIN_NAVIGATION_TREE,
  DEFAULT_SUBTAB_FOR_PILLAR,
} from '@/lib/navigationMetadata';
import { AdminDesktopSidebar } from './AdminDesktopSidebar';
import { AdminMobileBottomNav } from './AdminMobileBottomNav';
import { AdminMobileSubNavPills } from './AdminMobileSubNavPills';
import { supabase } from '@/lib/supabaseClient';
import {
  ChevronRight,
  SlidersHorizontal,
  RefreshCw,
  Database,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  Settings as SettingsIcon,
  Zap,
} from 'lucide-react';

import AdminOverviewStats from './AdminOverviewStats';
import { ActivityLogManager } from './ActivityLogManager';
import { MasterDataWorkspace } from './MasterDataWorkspace';
import { BusWorkspace } from './BusWorkspace';
import { RoomWorkspace } from './RoomWorkspace';
import { RundownManager } from './RundownManager';
import { DocumentWorkspace } from './DocumentWorkspace';
import { QueryQueueMonitor } from './QueryQueueMonitor';
import { SettingsModal } from './SettingsModal';
import { DatabaseMigrationModal } from './DatabaseMigrationModal';

interface AdminDashboardProps {
  students: Student[];
  classes: SchoolClass[];
  buses: Bus[];
  rooms: Room[];
  rundowns: RundownItem[];
  settings: AppSettings;
  isAngketClosed?: boolean;
  activePillar?: AdminPillarKey;
  onSelectPillar?: (pillar: AdminPillarKey) => void;
  activeSubTab?: AdminSubTabKey;
  onSelectSubTab?: (subTab: AdminSubTabKey) => void;
  onAddStudent: (newStudent: Student) => void;
  onUpdateStudent: (id: string, updates: Partial<Student>) => Promise<void> | void;
  onDeleteStudent: (studentId: string) => void;
  onDeleteMultipleStudents?: (studentIds: string[]) => void;
  onBulkImportStudents: (importedStudents: Student[], importedClasses?: SchoolClass[]) => void;
  onClearAllStudents: () => void;
  onClearAllRooms?: () => void;
  onAutoAllocateRooms: () => void;
  onAutoAllocateBuses: () => void;
  onUpdateStudentSeat?: (studentId: string, busNumber: number, seatNumber: number) => Promise<void> | void;
  onBatchUpdateStudentSeats?: (updates: { studentId: string; busNumber: number; seatNumber: number }[], customMessage?: string) => Promise<void> | void;
  onSaveRundown: (item: RundownItem) => Promise<void>;
  onDeleteRundown: (id: string) => Promise<void>;
  onResetRundowns: () => Promise<void>;
  onAddClass: (newClass: SchoolClass) => void;
  onUpdateClass: (id: string, updates: Partial<SchoolClass>) => Promise<void> | void;
  onDeleteClass: (classId: string) => void;
  onSaveSettings?: (settings: AppSettings) => Promise<void> | void;
  onAuditAndRealignWaves?: () => Promise<void> | void;
  currentUser?: AuthUser;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  students,
  classes,
  buses,
  rooms,
  rundowns,
  settings,
  isAngketClosed = false,
  activePillar: propActivePillar,
  onSelectPillar: propOnSelectPillar,
  activeSubTab: propActiveSubTab,
  onSelectSubTab: propOnSelectSubTab,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onDeleteMultipleStudents,
  onBulkImportStudents,
  onClearAllStudents,
  onClearAllRooms,
  onAutoAllocateRooms,
  onAutoAllocateBuses,
  onUpdateStudentSeat,
  onBatchUpdateStudentSeats,
  onSaveRundown,
  onDeleteRundown,
  onResetRundowns,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onSaveSettings,
  onAuditAndRealignWaves,
  currentUser,
}) => {
  type Pillar = AdminPillarKey;
  type SubTab = AdminSubTabKey;

  const [localActivePillar, setLocalActivePillar] = useState<Pillar>('IKHTISAR');
  const [localActiveSubTab, setLocalActiveSubTab] = useState<SubTab>('OVERVIEW');
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'offline' | 'error'>('checking');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState<boolean>(false);

  const rawActivePillar = propActivePillar || localActivePillar;
  const activePillar: Pillar = rawActivePillar === 'LAPORAN' ? 'IKHTISAR' : rawActivePillar;
  const activeSubTab: SubTab = propActiveSubTab || localActiveSubTab;

  // Initialize from URL query parameters & session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pillarParam = params.get('pillar') as Pillar | null;
      const subtabParam = params.get('subtab') as SubTab | null;

      const cachedPillar = sessionStorage.getItem('sim_admin_pillar') as Pillar | null;
      const cachedSubTab = sessionStorage.getItem('sim_admin_subtab') as SubTab | null;

      const validPillars: Pillar[] = ['IKHTISAR', 'DATA_INDUK', 'OPERASIONAL', 'DOKUMEN', 'SISTEM', 'LAPORAN'];

      let initialPillar: Pillar = 'IKHTISAR';
      let initialSubTab: SubTab = 'OVERVIEW';

      if (pillarParam && validPillars.includes(pillarParam)) {
        initialPillar = pillarParam === 'LAPORAN' ? 'IKHTISAR' : pillarParam;
        initialSubTab = subtabParam || DEFAULT_SUBTAB_FOR_PILLAR[initialPillar];
      } else if (cachedPillar && validPillars.includes(cachedPillar)) {
        initialPillar = cachedPillar === 'LAPORAN' ? 'IKHTISAR' : cachedPillar;
        initialSubTab = cachedSubTab || DEFAULT_SUBTAB_FOR_PILLAR[initialPillar];
      }

      if (propOnSelectPillar && propOnSelectSubTab) {
        // Only initialize if not already provided
        if (!propActivePillar) propOnSelectPillar(initialPillar);
        if (!propActiveSubTab) propOnSelectSubTab(initialSubTab);
      } else {
        setLocalActivePillar(initialPillar);
        setLocalActiveSubTab(initialSubTab);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectPillar = useCallback((pillar: Pillar) => {
    const targetPillar = pillar === 'LAPORAN' ? 'IKHTISAR' : pillar;
    const newDefaultSubTab = DEFAULT_SUBTAB_FOR_PILLAR[targetPillar] || 'OVERVIEW';

    if (propOnSelectPillar && propOnSelectSubTab) {
      propOnSelectPillar(targetPillar);
      propOnSelectSubTab(newDefaultSubTab);
    } else {
      setLocalActivePillar(targetPillar);
      setLocalActiveSubTab(newDefaultSubTab);
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sim_admin_pillar', targetPillar);
      sessionStorage.setItem('sim_admin_subtab', newDefaultSubTab);
      const url = new URL(window.location.href);
      url.searchParams.set('pillar', targetPillar);
      url.searchParams.set('subtab', newDefaultSubTab);
      window.history.replaceState({}, '', url.toString());
    }
  }, [propOnSelectPillar, propOnSelectSubTab]);

  const handleSelectSubTab = useCallback((subTab: SubTab) => {
    if (propOnSelectSubTab) {
      propOnSelectSubTab(subTab);
    } else {
      setLocalActiveSubTab(subTab);
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sim_admin_subtab', subTab);
      const url = new URL(window.location.href);
      url.searchParams.set('subtab', subTab);
      window.history.replaceState({}, '', url.toString());
    }
  }, [propOnSelectSubTab]);

  // Real-time Database Status Monitor
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key || url.includes('placeholder')) {
          setDbStatus('offline');
          return;
        }

        const { error } = await supabase.from('students').select('id').limit(1);
        if (error) {
          console.warn('DB check error:', error);
          setDbStatus('error');
        } else {
          setDbStatus('connected');
        }
      } catch (e) {
        setDbStatus('error');
      }
    };
    checkConnection();
  }, []);

  // Compute Breadcrumb Titles
  const currentPillarNode = useMemo(() => {
    return ADMIN_NAVIGATION_TREE.find((node) => node.id === activePillar);
  }, [activePillar]);

  const currentSubMenu = useMemo(() => {
    return currentPillarNode?.subMenus.find((sub) => sub.id === activeSubTab);
  }, [currentPillarNode, activeSubTab]);

  // Modular Component Content Renderer
  const renderContent = useMemo(() => {
    switch (activePillar) {
      case 'IKHTISAR':
      case 'LAPORAN':
        if (activeSubTab === 'OVERVIEW') {
          return <AdminOverviewStats students={students} classes={classes} settings={settings} />;
        }
        if (activeSubTab === 'MONITOR') {
          return <ActivityLogManager />;
        }
        break;

      case 'DATA_INDUK':
        return (
          <MasterDataWorkspace
            activeSubTab={activeSubTab}
            onSelectSubTab={handleSelectSubTab}
            students={students}
            classes={classes}
            buses={buses}
            rooms={rooms}
            settings={settings}
            isAngketClosed={isAngketClosed}
            onAddStudent={onAddStudent}
            onUpdateStudent={onUpdateStudent as any}
            onDeleteStudent={onDeleteStudent}
            onDeleteMultipleStudents={onDeleteMultipleStudents}
            onBulkImportStudents={onBulkImportStudents}
            onClearAllStudents={onClearAllStudents}
            onAutoAllocateRooms={onAutoAllocateRooms}
            onAutoAllocateBuses={onAutoAllocateBuses}
            onAddClass={onAddClass}
            onUpdateClass={onUpdateClass as any}
            onDeleteClass={onDeleteClass}
            onSaveSettings={onSaveSettings as any}
            onAuditAndRealignWaves={onAuditAndRealignWaves}
          />
        );

      case 'BUS':
        return (
          <BusWorkspace
            activeSubTab={activeSubTab}
            onSelectSubTab={handleSelectSubTab}
            buses={buses}
            students={students}
            classes={classes}
            settings={settings}
            onUpdateStudent={onUpdateStudent as any}
            onUpdateStudentSeat={onUpdateStudentSeat}
            onBatchUpdateStudentSeats={onBatchUpdateStudentSeats}
            onBulkImportStudents={onBulkImportStudents as any}
            onSaveSettings={onSaveSettings as any}
            onAutoAllocateBuses={onAutoAllocateBuses}
          />
        );

      case 'KAMAR':
        return (
          <RoomWorkspace
            activeSubTab={activeSubTab}
            onSelectSubTab={handleSelectSubTab}
            onClearRooms={onClearAllRooms || onClearAllStudents}
            rooms={rooms}
            students={students}
            classes={classes}
            buses={buses}
            onUpdateStudent={onUpdateStudent as any}
            onAutoAllocateRooms={onAutoAllocateRooms}
            settings={settings}
            onSaveSettings={onSaveSettings as any}
          />
        );

      case 'RUNDOWNS':
        return (
          <RundownManager
            rundowns={rundowns}
            onSaveRundown={onSaveRundown}
            onDeleteRundown={onDeleteRundown}
            onResetRundowns={onResetRundowns}
          />
        );

      case 'DOKUMEN':
        return (
          <DocumentWorkspace
            activeSubTab={activeSubTab}
            onSelectSubTab={handleSelectSubTab}
            classes={classes}
            students={students}
            currentUser={currentUser}
            settings={settings}
            onSaveSettings={onSaveSettings as any}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />
        );

      case 'OPERASIONAL':
        // Legacy fallback routing for OPERASIONAL
        if (
          activeSubTab === 'BUS_SEATMAP' ||
          activeSubTab === 'BUS_STUDENTS' ||
          activeSubTab === 'BUS_CHAPERONES' ||
          activeSubTab === 'BUS_CONFIG'
        ) {
          return (
            <BusWorkspace
              activeSubTab={activeSubTab}
              onSelectSubTab={handleSelectSubTab}
              buses={buses}
              students={students}
              classes={classes}
              settings={settings}
              onUpdateStudent={onUpdateStudent as any}
              onBulkImportStudents={onBulkImportStudents as any}
              onSaveSettings={onSaveSettings as any}
              onAutoAllocateBuses={onAutoAllocateBuses}
            />
          );
        }
        if (
          activeSubTab === 'ROOM_VISUAL' ||
          activeSubTab === 'ROOM_LIST' ||
          activeSubTab === 'ROOM_CONFIG'
        ) {
          return (
            <RoomWorkspace
              activeSubTab={activeSubTab}
              onSelectSubTab={handleSelectSubTab}
              onClearRooms={onClearAllRooms || onClearAllStudents}
              rooms={rooms}
              students={students}
              classes={classes}
              buses={buses}
              onUpdateStudent={onUpdateStudent as any}
              onAutoAllocateRooms={onAutoAllocateRooms}
              settings={settings}
              onSaveSettings={onSaveSettings as any}
            />
          );
        }
        if (activeSubTab === 'RUNDOWNS') {
          return (
            <RundownManager
              rundowns={rundowns}
              onSaveRundown={onSaveRundown}
              onDeleteRundown={onDeleteRundown}
              onResetRundowns={onResetRundowns}
            />
          );
        }
        break;

      case 'SISTEM':
        if (activeSubTab === 'SETTINGS') {
          return (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs">
                      <SettingsIcon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Pengaturan & Konfigurasi Darmawisata
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Konfigurasi gelombang, kuota armada bus, kamar hotel, deadline angket, dan kop surat.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                    <span>Buka Panel Konfigurasi</span>
                  </button>
                </div>

                {/* Quick Info Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-5">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Deadline Angket
                    </span>
                    <p className="text-sm font-black text-slate-800">
                      {settings?.angketDeadline || 'Belum diatur'}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        isAngketClosed ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isAngketClosed ? 'Tertutup' : 'Terbuka'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Kapasitas Standar Kamar
                    </span>
                    <p className="text-sm font-black text-slate-800">
                      {settings?.defaultRoomCapacity || 4} Orang / Bed
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Grup: {settings?.roomGroupMethod === 'class' ? 'Per Kelas' : 'Bebas'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Kapasitas Standar Bus
                    </span>
                    <p className="text-sm font-black text-slate-800">
                      {settings?.busBaseCapacity || 50} Kursi
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Cadangan: +{settings?.busBufferCapacity || 2} Kursi
                    </p>
                  </div>
                </div>
              </div>

              {/* Database & Real-time Connectivity Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        Status Database & Sinkronisasi
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Koneksi real-time cloud data storage & migrasi database
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-black rounded-full text-xs shrink-0 self-start sm:self-auto">
                    ● AKTIF
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-3">
                  <p>
                    Data terhubung secara real-time. Setiap perubahan pada alokasi bus, kamar, dan status siswa disinkronkan secara instan ke server.
                  </p>
                  
                  <div className="pt-2">
                    <button
                      onClick={() => setIsMigrationModalOpen(true)}
                      className="px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2.5 shadow-md shadow-slate-900/10 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span>⚡ Tool Migrasi Direct-to-Neon Postgres</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        if (activeSubTab === 'SYNC_QUEUE') {
          return <QueryQueueMonitor />;
        }
        break;
    }

    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
        <h4 className="font-bold text-slate-700">Halaman Sedang Dipersiapkan</h4>
        <p className="text-xs text-slate-500">
          Silakan pilih sub-menu lain melalui navigasi yang tersedia.
        </p>
      </div>
    );
  }, [
    activePillar,
    activeSubTab,
    students,
    classes,
    settings,
    buses,
    rooms,
    rundowns,
    isAngketClosed,
    currentUser,
    onAddStudent,
    onUpdateStudent,
    onDeleteStudent,
    onDeleteMultipleStudents,
    onBulkImportStudents,
    onClearAllStudents,
    onClearAllRooms,
    onAutoAllocateRooms,
    onAutoAllocateBuses,
    onUpdateStudentSeat,
    onBatchUpdateStudentSeats,
    onAddClass,
    onUpdateClass,
    onDeleteClass,
    onSaveRundown,
    onDeleteRundown,
    onResetRundowns,
    onSaveSettings,
    onAuditAndRealignWaves,
    handleSelectSubTab,
  ]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 font-sans">
      {/* 1. TOP BAR / BREADCRUMB HEADER */}
      <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 truncate">
            {currentPillarNode?.label || 'Admin'}
          </h1>
          {currentSubMenu && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-500 truncate">
                {currentSubMenu.label}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Pengaturan Darmawisata"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MOBILE SUB-NAV PILLS */}
      <AdminMobileSubNavPills
        activePillar={activePillar}
        activeSubTab={activeSubTab}
        onSelectSubTab={handleSelectSubTab}
      />

      {/* 3. SCROLLABLE CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto animate-fade-in">{renderContent}</div>
      </main>

      {/* Global Settings Modal */}
      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={settings}
          onSaveSettings={(newSettings) => {
            if (onSaveSettings) onSaveSettings(newSettings);
            setIsSettingsModalOpen(false);
          }}
          onResetData={() => {
            if (confirm('Yakin ingin mereset seluruh data aplikasi?')) {
              onClearAllStudents();
              setIsSettingsModalOpen(false);
            }
          }}
          students={students}
          classesList={classes}
        />
      )}

      {/* Neon Database Migration Modal */}
      <DatabaseMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
      />
    </div>
  );
};

export default AdminDashboard;

