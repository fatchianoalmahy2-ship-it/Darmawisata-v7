'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppTab } from '@/components/ui/Header';
import { MainLayout } from '@/components/layout/MainLayout';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import dynamic from 'next/dynamic';

import { AngketForm } from '@/components/angket/AngketForm';
import { SuratIzinView } from '@/components/surat/SuratIzinView';
import { RundownTimeline } from '@/components/rundown/RundownTimeline';
import { LoginModal } from '@/components/auth/LoginModal';

// High-Performance Dynamic Code Splitting for heavy panels
const TabLoadingSkeleton = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[320px] p-8 space-y-4 bg-white/80 backdrop-blur-xs rounded-3xl border border-slate-100 shadow-xs">
    <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-semibold text-slate-500 animate-pulse">{title}</p>
  </div>
);

const AdminDashboard = dynamic(
  () => import('@/components/admin/AdminDashboard').then((m) => m.AdminDashboard),
  { loading: () => <TabLoadingSkeleton title="Menyiapkan Dasbor Administrator..." />, ssr: false }
);

const RecapDashboard = dynamic(
  () => import('@/components/recap/RecapDashboard').then((m) => m.RecapDashboard),
  { loading: () => <TabLoadingSkeleton title="Menyiapkan Rekapitulasi Data..." />, ssr: false }
);

const BusSeatMap = dynamic(
  () => import('@/components/bus/BusSeatMap').then((m) => m.BusSeatMap),
  { loading: () => <TabLoadingSkeleton title="Menyiapkan Denah Armada Bus..." />, ssr: false }
);

const RoomGrid = dynamic(
  () => import('@/components/kamar/RoomGrid').then((m) => m.RoomGrid),
  { loading: () => <TabLoadingSkeleton title="Menyiapkan Alokasi Kamar Hotel..." />, ssr: false }
);

const WaliKelasPortal = dynamic(
  () => import('@/components/walikelas/WaliKelasPortal').then((m) => m.WaliKelasPortal),
  { loading: () => <TabLoadingSkeleton title="Menyiapkan Portal Wali Kelas..." />, ssr: false }
);

const SettingsModal = dynamic(
  () => import('@/components/admin/SettingsModal').then((m) => m.SettingsModal),
  { ssr: false }
);

const ProfileSettingsModal = dynamic(
  () => import('@/components/auth/ProfileSettingsModal').then((m) => m.ProfileSettingsModal),
  { ssr: false }
);

import { Student, SchoolClass, AppSettings, Bus, Room, AuthUser, RundownItem } from '@/types';
import { AdminPillarKey, AdminSubTabKey, DEFAULT_SUBTAB_FOR_PILLAR } from '@/lib/navigationMetadata';
import { AutoRecapScheduler } from '@/components/recap/AutoRecapScheduler';
import { AuthService, DEFAULT_PUBLIC_USER } from '@/services/authService';
import { dbService } from '@/services/dbService';
import {
  getInitialStudents,
  getInitialClasses,
  getInitialSettings,
  getInitialRundowns,
  resetRundownsToDefault,
  logActivity,
} from '@/services/firebaseService';
import { RoomAllocatorEngine } from '@/services/roomAllocator';
import { SeatAllocatorEngine } from '@/services/seatAllocator';
import { normalizeClassName, getStudentWave, alignAllStudentWaves, getWaveChaperones, deriveAutoChaperoneRooms } from '@/lib/utils';
import schoolMetadata from '@/config/schoolMetadata.json';
import { useAppData, LS_CACHE_KEYS } from '@/hooks/useAppData';
import { Lock, LogIn } from 'lucide-react';
import { SchoolLogo } from '@/components/ui/SchoolLogo';

export default function HomePage() {
  return (
    <ToastProvider>
      <HomePageContent />
    </ToastProvider>
  );
}

function HomePageContent() {
  const { showToast } = useToast();
  const {
    currentUser,
    setCurrentUser,
    students,
    setStudents,
    classes,
    setClasses,
    settings,
    setSettings,
    rundowns,
    setRundowns,
    buses,
    setBuses,
    rooms,
    setRooms,
    isLoaded,
    isSyncing,
    loadError,
    isAngketClosed,
    checkIsAngketClosed,
    autoAllocateAllWhenClosed,
    forceRemoteSync,
  } = useAppData();

  // Handler to change active tab with URL sync and storage persistence
  const handleTabChange = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('sim_active_tab', tab);
        localStorage.setItem('sim_active_tab', tab);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.replaceState(null, '', url.toString());
      } catch (e) {
        console.warn('Failed to sync active tab to URL/Storage:', e);
      }
    }
  }, []);

  const [activeTab, setActiveTab] = useState<AppTab>('ANGKET');
  const [adminPillar, setAdminPillar] = useState<AdminPillarKey>('IKHTISAR');
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTabKey>('OVERVIEW');

  const handleSelectPillar = useCallback((pillar: AdminPillarKey) => {
    setAdminPillar(pillar);
    const defaultSub = DEFAULT_SUBTAB_FOR_PILLAR[pillar] || 'OVERVIEW';
    setAdminSubTab(defaultSub);
  }, []);

  const handleSelectSubTab = useCallback((subTab: AdminSubTabKey) => {
    setAdminSubTab(subTab);
  }, []);

  const [selectedStudentForSurat, setSelectedStudentForSurat] = useState<Student | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState<boolean>(false);

  // Draft / Dirty state tracking for quota optimization
  const [dirtyStudentIds, setDirtyStudentIds] = useState<Set<string>>(new Set());
  const [isSavingDirtyData, setIsSavingDirtyData] = useState<boolean>(false);

  const addDirtyStudents = useCallback((newDirtyIds: string[]) => {
    setDirtyStudentIds(prev => {
      const next = new Set(prev);
      newDirtyIds.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const handleSaveDirtyChanges = async () => {
    if (dirtyStudentIds.size === 0) return;
    setIsSavingDirtyData(true);
    const changedStudents = students.filter(s => dirtyStudentIds.has(s.id));
    try {
      await dbService.putStudents(changedStudents);
      await dbService.enqueueTask('save_students', changedStudents);
      await dbService.triggerSync();
      setDirtyStudentIds(new Set());
      showToast(`Berhasil menyimpan ${changedStudents.length} perubahan ke database.`, 'success');
    } catch (e: any) {
      if (e?.code === 'resource-exhausted' || e?.message?.includes('Quota') || e?.message?.includes('quota')) {
         showToast('Batas penyimpanan harian sistem (Quota) telah tercapai. Data Anda aman di memori, namun tidak dapat disinkronkan ke Cloud hingga besok.', 'error');
      } else {
         console.error('Error saving dirty changes:', e);
         showToast('Gagal menyimpan ke database.', 'error');
      }
    } finally {
      setIsSavingDirtyData(false);
    }
  };

  // Authentication State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [targetTabForLogin, setTargetTabForLogin] = useState<string | undefined>(undefined);
  const [initialRoleForLogin, setInitialRoleForLogin] = useState<'ADMIN' | 'WALI_KELAS' | 'PUBLIC_SISWA' | undefined>(undefined);

  // Restore activeTab from URL searchParams, storage, or user role after mount/auth change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab') as AppTab | null;
    const sessionTab = (sessionStorage.getItem('sim_active_tab') || localStorage.getItem('sim_active_tab')) as AppTab | null;

    const candidateTab = urlTab || sessionTab;
    const validTabs: AppTab[] = ['ANGKET', 'DENAH_BUS', 'PEMBAGIAN_KAMAR', 'REKAP_HARIAN', 'RUNDOWN', 'SURAT_IZIN', 'WALI_KELAS', 'ADMIN'];
    const activeRole = currentUser.role !== 'PUBLIC_SISWA' ? currentUser.role : AuthService.getCurrentUser().role;

    if (candidateTab && validTabs.includes(candidateTab)) {
      if (candidateTab === 'ADMIN' && activeRole !== 'ADMIN') {
        // Lacks permission
      } else if (candidateTab === 'WALI_KELAS' && activeRole !== 'WALI_KELAS' && activeRole !== 'ADMIN') {
        // Lacks permission
      } else {
        setActiveTab(candidateTab);
        return;
      }
    }

    // Fallback by user role if no saved valid tab or no permission
    if (activeRole === 'ADMIN') {
      setActiveTab('ADMIN');
    } else if (activeRole === 'WALI_KELAS') {
      setActiveTab('WALI_KELAS');
    } else {
      setActiveTab('ANGKET');
    }
  }, [currentUser.role]);

  // Auth Handlers
  const handleOpenLoginModal = (targetTabName?: string, initialRole?: 'ADMIN' | 'WALI_KELAS' | 'PUBLIC_SISWA') => {
    setTargetTabForLogin(targetTabName);
    setInitialRoleForLogin(initialRole);
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setIsLoginModalOpen(false);
    showToast(`Selamat datang, ${user.name || user.username || 'Pengguna'}!`, 'success');
    if (user.role === 'ADMIN') {
      handleTabChange('ADMIN');
    } else if (user.role === 'WALI_KELAS') {
      handleTabChange('WALI_KELAS');
    }
  };

  const handleLogout = () => {
    const freshPublic = AuthService.logout();
    setCurrentUser(freshPublic);
    handleTabChange('ANGKET');
    showToast('Sesi berhasil keluar.', 'info');
  };

  // Student Handlers with Cloud Supabase and React Memory State Sync
  const handleSaveStudent = async (updatedStudent: Student, isAlreadySynced = false) => {
    const computedWave = getStudentWave(updatedStudent, settings, classes);
    const prevExisting = students.find((s) => s.id === updatedStudent.id);
    const normalizedStudent: Student = {
      ...updatedStudent,
      wave: computedWave,
      ...(prevExisting && prevExisting.wave && prevExisting.wave !== computedWave
        ? { busNumber: undefined, seatNumber: undefined, roomNumber: undefined, bedNumber: undefined }
        : {}),
    };

    setStudents((prev) => {
      const index = prev.findIndex((s) => s.id === normalizedStudent.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = normalizedStudent;
        return copy;
      }
      return [normalizedStudent, ...prev];
    });

    try {
      await dbService.putSingleStudent(normalizedStudent);
    } catch (e) {
      console.warn('Failed to save student to backend:', e);
    }

    if (!isAlreadySynced) {
      await dbService.enqueueTask('save_student', normalizedStudent);
    }
    showToast(`Data siswa ${normalizedStudent.name} berhasil disimpan!`, 'success');
  };

  const handleUpdateStudent = async (id: string, updates: Partial<Student>) => {
    let updatedStudent: Student | null = null;
    setStudents((prev) => {
      const existing = prev.find((s) => s.id === id);
      if (!existing) {
        if (updates.name && updates.className) {
          const newS: Student = {
            id: id || crypto.randomUUID(),
            nis: updates.nis || '',
            name: updates.name || '',
            className: updates.className || '',
            gender: updates.gender || 'L',
            isRegistered: updates.isRegistered || false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...updates,
          } as Student;
          newS.wave = getStudentWave(newS, settings, classes);
          updatedStudent = newS;
          return [newS, ...prev];
        }
        return prev;
      }

      updatedStudent = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const computedWave = getStudentWave(updatedStudent, settings, classes);
      if (existing.wave && existing.wave !== computedWave) {
        updatedStudent.busNumber = undefined;
        updatedStudent.seatNumber = undefined;
        updatedStudent.roomNumber = undefined;
        updatedStudent.bedNumber = undefined;
      }
      updatedStudent.wave = computedWave;

      return prev.map((s) => (s.id === id ? updatedStudent! : s));
    });

    if (updatedStudent) {
      try {
        await dbService.putSingleStudent(updatedStudent);
      } catch (e) {
        console.warn('Failed to persist student update to backend:', e);
      }
      await dbService.enqueueTask('save_student', updatedStudent);
      showToast(`Data siswa ${(updatedStudent as Student).name} berhasil disimpan!`, 'success');
    }
  };

  const handleAddStudent = async (newStudent: Student) => {
    const calculatedWave = getStudentWave(newStudent, settings, classes);
    const finalStudent: Student = { ...newStudent, wave: calculatedWave };

    setStudents((prev) => {
      const index = prev.findIndex((s) => s.id === finalStudent.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = finalStudent;
        return copy;
      }
      return [finalStudent, ...prev];
    });

    try {
      await dbService.putSingleStudent(finalStudent);
    } catch (e) {
      console.warn('Failed to save student to backend:', e);
    }
    await dbService.enqueueTask('save_student', finalStudent);
    
    // Log Activity
    try {
      await logActivity({
        action: 'ADD',
        nis: finalStudent.nis,
        name: finalStudent.name,
        className: finalStudent.className,
        operator: currentUser.name || currentUser.role || 'Admin',
        details: `Menambahkan siswa baru: ${finalStudent.name} (NIS: ${finalStudent.nis}) ke kelas ${finalStudent.className}.`,
      });
    } catch (e) {
      console.error('Error logging student add:', e);
    }

    showToast(`Siswa baru ${finalStudent.name} berhasil ditambahkan!`, 'success');
  };

  const handleDeleteStudent = async (studentId: string) => {
    const target = students.find((s) => s.id === studentId);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    await dbService.deleteStudent(studentId);
    if (target) {
      // Log Activity
      try {
        await logActivity({
          action: 'DELETE',
          nis: target.nis,
          name: target.name,
          className: target.className,
          operator: currentUser.name || currentUser.role || 'Admin',
          details: `Menghapus siswa: ${target.name} (NIS: ${target.nis}) dari kelas ${target.className}.`,
        });
      } catch (e) {
        console.error('Error logging student delete:', e);
      }

      showToast(`Data siswa ${target.name} berhasil dihapus.`, 'info');
    }
  };

  const handleDeleteMultipleStudents = async (studentIds: string[]) => {
    if (!studentIds || studentIds.length === 0) return;
    const targets = students.filter((s) => studentIds.includes(s.id));
    setStudents((prev) => prev.filter((s) => !studentIds.includes(s.id)));
    
    // Direct batch deletion from Supabase
    await dbService.deleteMultipleStudents(studentIds);
    
    // Log Activity
    try {
      const namesStr = targets.map((t) => `${t.name} (${t.className})`).join(', ');
      await logActivity({
        action: 'DELETE',
        operator: currentUser.name || currentUser.role || 'Admin',
        details: `Menghapus ${studentIds.length} siswa secara massal: ${namesStr.substring(0, 300)}${namesStr.length > 300 ? '...' : ''}.`,
      });
    } catch (e) {
      console.error('Error logging bulk student delete:', e);
    }

    showToast(`Berhasil menghapus ${studentIds.length} data siswa terpilih.`, 'info');
  };

  const handleBulkImportStudents = async (
    importedStudents: Student[],
    importedClasses?: SchoolClass[]
  ) => {
    const studentMap = new Map<string, Student>();
    students.forEach((s) => studentMap.set(s.nis || s.id, s));
    
    // Merge imported students, reusing existing ID if matched by NIS to avoid duplicates in DB
    const finalImportedStudents = importedStudents.map((imported) => {
      const existing = studentMap.get(imported.nis || imported.id);
      if (existing) {
        return {
          ...imported,
          id: existing.id // MUST reuse the existing ID to overwrite in DB
        };
      }
      return imported;
    });

    finalImportedStudents.forEach((s) => studentMap.set(s.nis || s.id, s));
    const combined = Array.from(studentMap.values());

    setStudents(combined);
    await dbService.putStudents(finalImportedStudents);
    await dbService.enqueueTask('save_students', finalImportedStudents);

    if (importedClasses && importedClasses.length > 0) {
      setClasses((prevClasses) => {
        const classMap = new Map(prevClasses.map((c) => [c.name, c]));
        importedClasses.forEach((uc) => {
          const existing = classMap.get(uc.name);
          if (existing) {
            classMap.set(uc.name, {
              ...existing,
              totalStudents: Math.max(existing.totalStudents, uc.totalStudents),
              homeroomTeacher: uc.homeroomTeacher || existing.homeroomTeacher,
            });
          } else {
            classMap.set(uc.name, uc);
          }
        });
        const updatedClassesList = Array.from(classMap.values());
        dbService.putClasses(updatedClassesList);
        dbService.enqueueTask('save_classes', updatedClassesList);
        return updatedClassesList;
      });
    }

    // Log Activity
    try {
      await logActivity({
        action: 'BULK_IMPORT',
        operator: currentUser.name || currentUser.role || 'Admin',
        details: `Mengimpor ${importedStudents.length} data siswa melalui file excel/csv secara massal.`,
      });
    } catch (e) {
      console.error('Error logging student bulk import:', e);
    }

    showToast(`Berhasil mengimpor ${importedStudents.length} data siswa.`, 'success');
  };

  const handleClearAllStudents = async () => {
    setStudents([]);
    setClasses([]);
    setBuses([]);
    setRooms([]);
    await dbService.clearStudents();
    await dbService.clearClasses();
    await dbService.enqueueTask('clear_students', null);
    await dbService.enqueueTask('clear_classes', null);

    // Log Activity
    try {
      await logActivity({
        action: 'CLEAR',
        operator: currentUser.name || currentUser.role || 'Admin',
        details: `Mengosongkan seluruh data siswa dan kelas di sistem (Clear All).`,
      });
    } catch (e) {
      console.error('Error logging clear all:', e);
    }

    showToast('Seluruh data siswa dan kelas telah dikosongkan.', 'warning');
  };

  const handleClearClassData = async (
    className: string,
    actionType: 'REGISTRATION_ONLY' | 'DELETE_STUDENTS'
  ) => {
    try {
      if (actionType === 'REGISTRATION_ONLY') {
        const updated = students.map((s) => {
          if (s.className === className) {
            return {
              id: s.id,
              nis: s.nis,
              name: s.name,
              className: s.className,
              gender: s.gender,
              isRegistered: false,
            };
          }
          return s;
        });
        setStudents(updated);
        const updatedClassStudents = updated.filter((s) => s.className === className);
        await dbService.putStudents(updatedClassStudents);
        await dbService.enqueueTask('save_students', updatedClassStudents);

        // Log Activity
        try {
          await logActivity({
            action: 'UPDATE',
            className: className,
            operator: currentUser.name || currentUser.role || 'Admin',
            details: `Mereset status registrasi angket seluruh siswa di kelas ${className} menjadi belum mengisi.`,
          });
        } catch (e) {
          console.error('Error logging class reset:', e);
        }
      } else {
        const classStudentsToDelete = students.filter((s) => s.className === className);
        const remainingStudents = students.filter((s) => s.className !== className);
        setStudents(remainingStudents);
        await Promise.all(classStudentsToDelete.map((s) => dbService.deleteStudent(s.id)));
        await Promise.all(classStudentsToDelete.map((s) => dbService.enqueueTask('delete_student', s.id)));

        // Log Activity
        try {
          await logActivity({
            action: 'DELETE',
            className: className,
            operator: currentUser.name || currentUser.role || 'Admin',
            details: `Menghapus seluruh siswa (${classStudentsToDelete.length} orang) dan kelas ${className} dari sistem.`,
          });
        } catch (e) {
          console.error('Error logging class clear delete:', e);
        }

        const targetClass = classes.find((c) => c.name === className);
        if (targetClass) {
          const remainingClasses = classes.filter((c) => c.id !== targetClass.id);
          setClasses(remainingClasses);
          await dbService.deleteClass(targetClass.id);
          await dbService.enqueueTask('delete_class', targetClass.id);
        }
      }
      showToast(`Data kelas ${className} berhasil dibersihkan.`, 'warning');
    } catch (err) {
      console.error(`Gagal mengosongkan data kelas ${className}:`, err);
      showToast(`Gagal mengosongkan data kelas ${className}.`, 'error');
      throw err;
    }
  };

  // Class CRUD handlers
  const handleAddClass = async (newClass: SchoolClass) => {
    const updated = [...classes, newClass];
    setClasses(updated);
    await dbService.putClasses(updated);
    await dbService.enqueueTask('save_classes', updated);
    showToast(`Kelas ${newClass.name} berhasil ditambahkan!`, 'success');
  };

  const handleUpdateClass = async (
    classOrId: SchoolClass | string,
    partialUpdates?: Partial<SchoolClass>
  ) => {
    let targetClass: SchoolClass;
    if (typeof classOrId === 'string') {
      const existing = classes.find((c) => c.id === classOrId);
      if (!existing) return;
      targetClass = { ...existing, ...partialUpdates };
    } else {
      targetClass = classOrId;
    }

    const updated = classes.map((c) => (c.id === targetClass.id ? targetClass : c));
    setClasses(updated);
    await dbService.putClasses(updated);
    await dbService.enqueueTask('save_classes', updated);
    showToast(`Data kelas ${targetClass.name} berhasil diperbarui!`, 'success');
  };

  const handleDeleteClass = async (classId: string) => {
    const target = classes.find((c) => c.id === classId);
    const updated = classes.filter((c) => c.id !== classId);
    setClasses(updated);
    await dbService.deleteClass(classId);
    await dbService.enqueueTask('delete_class', classId);
    showToast(`Kelas ${target ? target.name : ''} berhasil dihapus.`, 'info');
  };

  const handleUpdateStudentSeat = async (
    studentId: string,
    busNumber: number,
    seatNumber: number
  ) => {
    const targetStudent = students.find((s) => s.id === studentId);
    if (!targetStudent) return;

    const studentWave = targetStudent.wave || 'BALI_GEL_1';
    const waveCapacity = SeatAllocatorEngine.getSetting(settings, studentWave, 'defaultBusCapacity', settings.defaultBusCapacity || 50);

    // Perform the smart cascade manual seat allocation
    const result = SeatAllocatorEngine.handleManualSeatAssignment(
      students,
      studentId,
      busNumber,
      seatNumber,
      waveCapacity
    );

    // AUTO-SYNC BUS TO ROOM: If student's bus changed, realign their room assignment to their new bus
    let finalStudents = result.updatedStudents;
    if (targetStudent.busNumber !== busNumber) {
      const roomSyncRes = RoomAllocatorEngine.reassignStudentToBusRoom(
        finalStudents,
        studentId,
        busNumber,
        settings,
        classes
      );
      finalStudents = roomSyncRes.updatedStudents;
    }

    if (result.pushedStudent && result.pushedStudent.busNumber !== targetStudent.busNumber) {
      const pushedSync = RoomAllocatorEngine.reassignStudentToBusRoom(
        finalStudents,
        result.pushedStudent.id,
        result.pushedStudent.busNumber || 0,
        settings,
        classes
      );
      finalStudents = pushedSync.updatedStudents;
    }

    // Deteksi delta siswa yang mengalami perubahan data kursi atau kamar
    const changedStudents = finalStudents.filter((updated) => {
      const original = students.find((s) => s.id === updated.id);
      return !original ||
        original.busNumber !== updated.busNumber ||
        original.seatNumber !== updated.seatNumber ||
        original.roomNumber !== updated.roomNumber ||
        original.bedNumber !== updated.bedNumber;
    });

    setStudents(finalStudents);

    if (changedStudents.length > 0) {
      addDirtyStudents(changedStudents.map(s => s.id));
    }

    // Update the buses and rooms list state so the UI reflects the changes instantly
    const updatedBuses = SeatAllocatorEngine.deriveBusesFromStudents(
      finalStudents,
      settings.defaultBusCapacity || 50,
      classes,
      settings.customBusGuides,
      settings
    );
    setBuses(updatedBuses);

    const updatedRooms = RoomAllocatorEngine.deriveRoomsFromStudents(
      finalStudents,
      settings.defaultRoomCapacity || 4,
      settings
    );
    setRooms(updatedRooms);

    if (seatNumber === 0 || busNumber === 0) {
      showToast(`Kursi dan kamar siswa ${targetStudent.name} berhasil dikosongkan.`, 'info');
    } else if (result.pushedStudent) {
      showToast(
        `Berhasil memindahkan ${targetStudent.name}. Siswa ${result.pushedStudent.name} tergeser keluar bus karena kapasitas penuh.`,
        'info'
      );
    } else {
      showToast(`Posisi kursi dan kamar untuk ${targetStudent.name} berhasil disinkronkan!`, 'success');
    }
  };

  const handleBatchUpdateStudentSeats = async (
    updates: { studentId: string; busNumber: number; seatNumber: number }[],
    customMessage?: string
  ) => {
    if (updates.length === 0) return;

    let updatedStudents = [...students];
    updates.forEach((up) => {
      const idx = updatedStudents.findIndex((s) => s.id === up.studentId);
      if (idx !== -1) {
        updatedStudents[idx] = {
          ...updatedStudents[idx],
          busNumber: typeof up.busNumber === 'number' ? up.busNumber : 0,
          seatNumber: typeof up.seatNumber === 'number' ? up.seatNumber : 0,
          updatedAt: new Date().toISOString(),
        };
      }
    });

    // AUTO-SYNC BUS TO ROOM: For any student whose busNumber changed, realign their room!
    updates.forEach((up) => {
      const orig = students.find((s) => s.id === up.studentId);
      if (orig && orig.busNumber !== up.busNumber) {
        const syncRes = RoomAllocatorEngine.reassignStudentToBusRoom(
          updatedStudents,
          up.studentId,
          up.busNumber,
          settings,
          classes
        );
        updatedStudents = syncRes.updatedStudents;
      }
    });

    // Deteksi delta siswa yang mengalami perubahan data kursi atau kamar secara massal
    const changedStudents = updatedStudents.filter((updated) => {
      const original = students.find((s) => s.id === updated.id);
      return !original ||
        original.busNumber !== updated.busNumber ||
        original.seatNumber !== updated.seatNumber ||
        original.roomNumber !== updated.roomNumber ||
        original.bedNumber !== updated.bedNumber;
    });

    setStudents(updatedStudents);

    if (changedStudents.length > 0) {
      addDirtyStudents(changedStudents.map(s => s.id));

      // Log Activity with exact context and count
      try {
        await logActivity({
          action: 'UPDATE',
          operator: currentUser.name || currentUser.role || 'Admin',
          details: customMessage
            ? `${customMessage} (Disimpan ke Draft)`
            : `Pembaruan posisi kursi dan kamar untuk ${changedStudents.length} siswa (Disimpan ke Draft).`,
        });
      } catch (e) {
        console.error('Error logging batch seat update:', e);
      }
    }

    const updatedBuses = SeatAllocatorEngine.deriveBusesFromStudents(
      updatedStudents,
      settings.defaultBusCapacity || 50,
      classes,
      settings.customBusGuides,
      settings
    );
    setBuses(updatedBuses);

    const updatedRooms = RoomAllocatorEngine.deriveRoomsFromStudents(
      updatedStudents,
      settings.defaultRoomCapacity || 4,
      settings
    );
    setRooms(updatedRooms);

    if (customMessage) {
      showToast(customMessage, 'success');
    } else if (updates.length === 1) {
      const singleStudent = students.find((s) => s.id === updates[0].studentId);
      showToast(`Posisi kursi dan kamar ${singleStudent?.name || 'siswa'} berhasil diperbarui!`, 'success');
    } else {
      showToast(`Alokasi kursi dan kamar untuk ${changedStudents.length} siswa berhasil disinkronkan!`, 'success');
    }
  };

  const handleAutoAllocateRooms = async () => {
    const alignedStudents = alignAllStudentWaves(students, settings, classes);

    const result = RoomAllocatorEngine.autoAllocateRooms(
      alignedStudents,
      settings.defaultRoomCapacity,
      settings,
      classes
    );

    const changedStudents = result.updatedStudents.filter((updated) => {
      const original = students.find((s) => s.id === updated.id);
      return !original ||
        original.roomNumber !== updated.roomNumber ||
        original.bedNumber !== updated.bedNumber;
    });

    setStudents(result.updatedStudents);
    setRooms(result.rooms);

    // Auto-sync chaperone rooms to their buses at the same time
    const wavesList: WaveType[] = ['BALI_GEL_1', 'BALI_GEL_2', 'YOGYA_GEL_1'];
    let allChaps: any[] = [];
    wavesList.forEach((wv) => {
      const chaps = getWaveChaperones({ settings, buses, classes, students: result.updatedStudents, selectedWave: wv });
      allChaps.push(...chaps);
    });
    const chapRes = deriveAutoChaperoneRooms({ waveChaperones: allChaps, customRooms: {}, capacity: 2 });
    if (settings) {
      handleSaveSettings({
        ...settings,
        customChaperoneRooms: chapRes.effectiveCustomRooms,
      });
    }

    if (changedStudents.length > 0) {
      addDirtyStudents(changedStudents.map(s => s.id));

      try {
        await logActivity({
          action: 'UPDATE',
          operator: currentUser.name || currentUser.role || 'Admin',
          details: `Alokasi otomatis kamar hotel & pendamping (Draft): Menetapkan ${changedStudents.length} siswa ke dalam ${result.rooms.length} kamar bus.`,
        });
      } catch (e) {
        console.error('Error logging auto room allocation:', e);
      }
    }
    showToast(`Draft pembagian ${result.rooms.length} kamar hotel (${changedStudents.length} siswa & pendamping bus) selesai disinkronkan. Jangan lupa klik Simpan ke Database!`, 'success');
  };

  const handleClearAllRooms = async () => {
    // Clear room allocation fields ONLY for students who currently have room/bed
    const changedStudents: Student[] = [];
    const cleared = students.map((s) => {
      if (s.roomNumber !== undefined || s.bedNumber !== undefined) {
        const updated = {
          ...s,
          roomNumber: undefined,
          bedNumber: undefined,
        };
        changedStudents.push(updated);
        return updated;
      }
      return s;
    });

    setStudents(cleared);
    setRooms([]);

    if (changedStudents.length > 0) {
      addDirtyStudents(changedStudents.map(s => s.id));

      // Log Activity
      try {
        await logActivity({
          action: 'CLEAR',
          operator: currentUser.name || currentUser.role || 'Admin',
          details: `Mengosongkan alokasi kamar hotel untuk ${changedStudents.length} siswa (Disimpan ke Draft).`,
        });
      } catch (e) {
        console.error('Error logging clear rooms:', e);
      }
    }

    showToast(`Draft pengosongan kamar hotel (${changedStudents.length} siswa) selesai.`, 'warning');
  };

  const handleUpdateStudentRoom = async (studentId: string, targetRoomNumber: number | null, targetBedNumber: number | null) => {
    let changedStudent: Student | null = null;
    const updated = students.map((s) => {
      if (s.id === studentId) {
        changedStudent = {
          ...s,
          roomNumber: targetRoomNumber || undefined,
          bedNumber: targetBedNumber || undefined,
        };
        return changedStudent;
      }
      return s;
    });

    setStudents(updated);

    if (changedStudent) {
      addDirtyStudents([changedStudent.id]);
    }
  };

  const handleSwapStudentRooms = async (studentAId: string, studentBId: string) => {
    const studentA = students.find((s) => s.id === studentAId);
    const studentB = students.find((s) => s.id === studentBId);
    if (!studentA || !studentB) return;

    const roomA = studentA.roomNumber;
    const bedA = studentA.bedNumber;
    const roomB = studentB.roomNumber;
    const bedB = studentB.bedNumber;

    let changedA: Student | null = null;
    let changedB: Student | null = null;

    const updated = students.map((s) => {
      if (s.id === studentAId) {
        changedA = {
          ...s,
          roomNumber: roomB,
          bedNumber: bedB,
        };
        return changedA;
      }
      if (s.id === studentBId) {
        changedB = {
          ...s,
          roomNumber: roomA,
          bedNumber: bedA,
        };
        return changedB;
      }
      return s;
    });

    setStudents(updated);
    const changedStudents = [changedA, changedB].filter(Boolean) as Student[];

    if (changedStudents.length > 0) {
      addDirtyStudents(changedStudents.map(s => s.id));
    }
  };

  const handleAutoAllocateBuses = async () => {
    // 1. Fresh alignment of all registered students with current wave settings
    const alignedStudents = alignAllStudentWaves(students, settings, classes);

    // 2. Pure reset & auto allocation of buses and seats
    const result = SeatAllocatorEngine.autoAllocateBuses(
      alignedStudents,
      settings.defaultBusCapacity,
      classes,
      settings.customBusGuides,
      settings
    );

    const changedStudents = result.updatedStudents.filter((updated) => {
      const original = students.find((s) => s.id === updated.id);
      return !original ||
        original.busNumber !== updated.busNumber ||
        original.seatNumber !== updated.seatNumber;
    });

    // 3. React in-memory state updates
    setStudents(result.updatedStudents);
    setBuses(result.buses);

    // 4. Batch upsert & sync delta directly to Supabase
    if (changedStudents.length > 0) {
      addDirtyStudents(changedStudents.map(s => s.id));

      try {
        await logActivity({
          action: 'UPDATE',
          operator: currentUser.name || currentUser.role || 'Admin',
          details: `Alokasi otomatis seluruh bus (Draft): Menetapkan ${changedStudents.length} siswa ke dalam ${result.buses.length} bus.`,
        });
      } catch (e) {
        console.error('Error logging auto bus allocation:', e);
      }
    }

    showToast(`Draft penetapan tempat duduk di ${result.buses.length} bus (${changedStudents.length} siswa) selesai. Jangan lupa klik Simpan ke Database!`, 'success');
  };

  // Settings & Rundown Handlers
  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await dbService.putSettings(newSettings);
    await dbService.enqueueTask('save_settings', newSettings);

    // Re-align all registered student waves based on the new wave settings (e.g. TBSM vs TSM)
    const alignedStudents = alignAllStudentWaves(students, newSettings, classes);

    // Clear seat/room assignments ONLY for students whose wave actually changed
    const finalStudents = alignedStudents.map((s) => {
      const originalStudent = students.find((os) => os.id === s.id);
      if (originalStudent && originalStudent.wave !== s.wave) {
        return {
          ...s,
          busNumber: undefined,
          seatNumber: undefined,
          roomNumber: undefined,
          bedNumber: undefined,
        };
      }
      return s;
    });

    const finalBusesList = SeatAllocatorEngine.deriveBusesFromStudents(
      finalStudents,
      newSettings.defaultBusCapacity || 50,
      classes,
      newSettings.customBusGuides,
      newSettings
    );

    const finalRoomsList = RoomAllocatorEngine.deriveRoomsFromStudents(
      finalStudents,
      newSettings.defaultRoomCapacity || 3,
      newSettings
    );

    const changedStudents = finalStudents.filter((fs) => {
      const os = students.find((s) => s.id === fs.id);
      return (
        !os ||
        os.busNumber !== fs.busNumber ||
        os.seatNumber !== fs.seatNumber ||
        os.roomNumber !== fs.roomNumber ||
        os.bedNumber !== fs.bedNumber ||
        os.wave !== fs.wave
      );
    });

    setStudents(finalStudents);
    setBuses(finalBusesList);
    setRooms(finalRoomsList);

    if (changedStudents.length > 0) {
      try {
        await dbService.putStudents(changedStudents);
      } catch (e) {
        console.warn('Failed to persist settings student changes to backend:', e);
      }
      await dbService.enqueueTask('save_students', changedStudents);
    }
    await dbService.triggerSync();

    showToast('Pengaturan sistem berhasil disimpan dan disinkronisasi ke server.', 'success');
  };

  const handleAuditAndRealignWaves = async () => {
    const alignedStudents = alignAllStudentWaves(students, settings, classes);
    let changedCount = 0;
    const finalStudents = alignedStudents.map((s) => {
      const originalStudent = students.find((os) => os.id === s.id);
      if (originalStudent && originalStudent.wave !== s.wave) {
        changedCount++;
        return {
          ...s,
          busNumber: undefined,
          seatNumber: undefined,
          roomNumber: undefined,
          bedNumber: undefined,
        };
      }
      return s;
    });

    const finalBusesList = SeatAllocatorEngine.deriveBusesFromStudents(
      finalStudents,
      settings.defaultBusCapacity || 50,
      classes,
      settings.customBusGuides,
      settings
    );

    const finalRoomsList = RoomAllocatorEngine.deriveRoomsFromStudents(
      finalStudents,
      settings.defaultRoomCapacity || 3,
      settings
    );

    const changedStudents = finalStudents.filter((fs) => {
      const os = students.find((s) => s.id === fs.id);
      return (
        !os ||
        os.busNumber !== fs.busNumber ||
        os.seatNumber !== fs.seatNumber ||
        os.roomNumber !== fs.roomNumber ||
        os.bedNumber !== fs.bedNumber ||
        os.wave !== fs.wave
      );
    });

    setStudents(finalStudents);
    setBuses(finalBusesList);
    setRooms(finalRoomsList);

    if (changedStudents.length > 0) {
      try {
        await dbService.putStudents(changedStudents);
      } catch (e) {
        console.warn('Failed to persist audit changes to backend:', e);
      }
      await dbService.enqueueTask('save_students', changedStudents);
    }
    await dbService.triggerSync();

    try {
      await logActivity({
        action: 'UPDATE',
        operator: currentUser.name || currentUser.role || 'Admin',
        details: `Audit & Penyelarasan Gelombang: ${changedCount} siswa diperbarui gelombangnya dan disinkronisasi ke server.`,
      });
    } catch (e) {
      console.error('Error logging wave audit:', e);
    }

    if (changedCount > 0) {
      showToast(`Audit Selesai: ${changedCount} siswa berhasil diselaraskan gelombangnya!`, 'success');
    } else {
      showToast('Audit Selesai: Seluruh gelombang siswa sudah 100% selaras dengan jurusan.', 'info');
    }
  };

  const handleSaveRundown = async (item: RundownItem) => {
    const updated = rundowns.some((r) => r.id === item.id)
      ? rundowns.map((r) => (r.id === item.id ? item : r))
      : [...rundowns, item];
    setRundowns(updated);
    await dbService.putRundown(item);
    await dbService.enqueueTask('save_rundown', item);
    showToast(`Agenda "${item.activity}" berhasil disimpan!`, 'success');
  };

  const handleDeleteRundown = async (id: string) => {
    const target = rundowns.find((r) => r.id === id);
    setRundowns(rundowns.filter((r) => r.id !== id));
    await dbService.deleteRundown(id);
    await dbService.enqueueTask('delete_rundown', id);
    showToast(`Agenda "${target ? target.activity : ''}" berhasil dihapus.`, 'info');
  };

  const handleResetRundowns = async () => {
    const defaultRdns = await resetRundownsToDefault();
    setRundowns(defaultRdns);
    await dbService.clearRundowns();
    await dbService.putRundowns(defaultRdns);
    showToast('Jadwal & Destinasi berhasil direset ke konfigurasi default.', 'info');
  };

  const handleNavigateToSurat = (student: Student) => {
    setSelectedStudentForSurat(student);
    handleTabChange('SURAT_IZIN');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 space-y-4 select-none animate-in fade-in duration-150">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="text-emerald-400 font-black text-sm tracking-wider">SIM</span>
            </div>
          </div>
          <div className="absolute -inset-2 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin"></div>
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-extrabold text-sm tracking-tight text-white">
            {settings?.schoolName || 'SMK PGRI 2 PONOROGO'}
          </h3>
          <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">
            SIM DARMAWISATA
          </p>
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <p className="text-[11px] text-slate-400 font-medium">
              Memuat data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const registeredCount = students.filter((s) => s.isRegistered).length;
  const isPublicUser = currentUser.role === 'PUBLIC_SISWA';
  const isAdminUser = currentUser.role === 'ADMIN';
  const isWaliKelas = currentUser.role === 'WALI_KELAS';
  const isLockedForWali = settings?.lockBusAndRoomForWali && !isAngketClosed && isWaliKelas;

  return (
    <MainLayout
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      currentUser={currentUser}
      onLogout={handleLogout}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onOpenProfileSettings={() => setIsProfileSettingsOpen(true)}
      onOpenLoginModal={handleOpenLoginModal}
      totalStudentsCount={students.length}
      registeredStudentsCount={registeredCount}
      settings={settings}
      isSyncing={isSyncing}
      activePillar={adminPillar}
      onSelectPillar={handleSelectPillar}
      activeSubTab={adminSubTab}
      onSelectSubTab={setAdminSubTab}
    >
      {dirtyStudentIds.size > 0 && (
        <div className="sticky top-16 sm:top-20 z-40 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm shadow-amber-900/5 backdrop-blur-md">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Perubahan Belum Disimpan (Draft Mode)</h3>
              <p className="text-xs text-amber-700 mt-0.5">Ada <b>{dirtyStudentIds.size}</b> data siswa yang berubah secara lokal. Klik <b>Simpan ke Database</b> agar tidak hilang.</p>
            </div>
          </div>
          <button
            onClick={handleSaveDirtyChanges}
            disabled={isSavingDirtyData}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-amber-600/20 active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isSavingDirtyData ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Menyimpan...
              </>
            ) : (
              'Simpan ke Database'
            )}
          </button>
        </div>
      )}
      <AutoRecapScheduler settings={settings} onSettingsUpdate={handleSaveSettings} />
      {activeTab === 'ANGKET' && (
        <AngketForm
          students={students}
          classes={classes}
          settings={settings}
          onSaveStudent={handleSaveStudent}
          onNavigateToSurat={handleNavigateToSurat}
        />
      )}

      {activeTab === 'WALI_KELAS' && (
        isPublicUser ? (
          <AccessDeniedCard
            title="Akses Portal Wali Kelas Terkunci"
            description="Menu ini berisi statistik dan laporan khusus Wali Kelas. Silakan login sebagai Wali Kelas atau Admin Panitia untuk melanjutkan."
            onLogin={() => handleOpenLoginModal('Menu Wali Kelas')}
          />
        ) : (
          <WaliKelasPortal
            classes={classes}
            students={students}
            thresholdPercentage={settings.waliKelasParticipationThreshold}
            currentUser={currentUser}
            settings={settings}
            onUpdateSettings={handleSaveSettings}
            onClearClassData={handleClearClassData}
            onUpdateClass={handleUpdateClass as any}
            onAddClass={handleAddClass}
            onDeleteClass={handleDeleteClass}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleSaveStudent as any}
            onDeleteStudent={handleDeleteStudent}
          />
        )
      )}

      {activeTab === 'REKAP_HARIAN' && (
        isPublicUser ? (
          <AccessDeniedCard
            title="Akses Rekap WA & PDF Terkunci"
            description="Fitur rekap harian otomatis WA/PDF khusus digunakan oleh Wali Kelas dan Panitia. Silakan login untuk melihat rekap."
            onLogin={() => handleOpenLoginModal('Rekap WA / PDF')}
          />
        ) : (
          <RecapDashboard
            classes={classes}
            students={students}
            currentUser={currentUser}
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )
      )}

      {activeTab === 'DENAH_BUS' && (
        isPublicUser ? (
          <AccessDeniedCard
            title="Akses Denah Bus Terkunci"
            description="Denah duduk bus memerlukan verifikasi login Wali Kelas atau Admin Panitia."
            onLogin={() => handleOpenLoginModal('Denah Bus')}
          />
        ) : isLockedForWali ? (
          <AccessDeniedCard
            title="Akses Denah Bus Dikunci"
            description="Menu Denah Bus saat ini dikunci oleh Administrator untuk Wali Kelas dan akan terbuka secara otomatis setelah angket ditutup."
          />
        ) : (
          <div className="space-y-4">
            {!isAngketClosed && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-amber-100 text-amber-800 rounded-xl font-bold">ℹ️ Info Pra-Penutupan</span>
                  <p>
                    Pengisian angket masih dibuka. Anda dapat memantau, menyusun, dan menyesuaikan denah kursi bus secara langsung.
                  </p>
                </div>
              </div>
            )}
            <BusSeatMap
              students={students}
              buses={buses}
              defaultBusCapacity={settings.defaultBusCapacity}
              onUpdateStudentSeat={handleUpdateStudentSeat}
              onBatchUpdateStudentSeats={handleBatchUpdateStudentSeats}
              onOpenBusConfig={() => setIsSettingsOpen(true)}
              settings={settings}
              onUpdateSettings={handleSaveSettings}
              onAutoAllocateBuses={handleAutoAllocateBuses}
            />
          </div>
        )
      )}

      {activeTab === 'PEMBAGIAN_KAMAR' && (
        isPublicUser ? (
          <AccessDeniedCard
            title="Akses Pembagian Kamar Terkunci"
            description="Pembagian kamar hotel memerlukan verifikasi login Wali Kelas atau Admin Panitia."
            onLogin={() => handleOpenLoginModal('Pembagian Kamar')}
          />
        ) : isLockedForWali ? (
          <AccessDeniedCard
            title="Akses Pembagian Kamar Dikunci"
            description="Menu Pembagian Kamar saat ini dikunci oleh Administrator untuk Wali Kelas dan akan terbuka secara otomatis setelah angket ditutup."
          />
        ) : (
          <div className="space-y-4">
            {!isAngketClosed && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-amber-100 text-amber-800 rounded-xl font-bold">ℹ️ Info Pra-Penutupan</span>
                  <p>
                    Pengisian angket masih dibuka. Anda dapat menjalankan alokasi otomatis atau menyesuaikan susunan kamar siswa.
                  </p>
                </div>
              </div>
            )}
            <RoomGrid
              students={students}
              rooms={rooms}
              defaultRoomCapacity={settings.defaultRoomCapacity}
              onAutoAllocateRooms={handleAutoAllocateRooms}
              onOpenRoomConfig={() => setIsSettingsOpen(true)}
              settings={settings}
              classes={classes}
              buses={buses}
              onUpdateStudentRoom={handleUpdateStudentRoom}
              onSwapStudentRooms={handleSwapStudentRooms}
              onSaveSettings={handleSaveSettings}
            />
          </div>
        )
      )}

      {activeTab === 'SURAT_IZIN' && (
        <SuratIzinView
          students={students}
          initialStudent={selectedStudentForSurat}
          settings={settings}
          onSaveSettings={handleSaveSettings}
          currentUser={currentUser}
          onNavigateToAngket={() => handleTabChange('ANGKET')}
        />
      )}

      {activeTab === 'RUNDOWN' && <RundownTimeline rundowns={rundowns} />}

      {activeTab === 'ADMIN' && (
        !isAdminUser ? (
          <AccessDeniedCard
            title="Akses Admin Panitia Terkunci"
            description="Halaman ini hanya dapat diakses oleh Panitia Utama (Super Admin) dengan kredensial terdaftar."
            onLogin={() => handleOpenLoginModal('Admin Data', 'ADMIN')}
          />
        ) : (
          <AdminDashboard
            students={students}
            classes={classes}
            buses={buses}
            rooms={rooms}
            rundowns={rundowns}
            settings={settings}
            isAngketClosed={isAngketClosed}
            activePillar={adminPillar}
            onSelectPillar={handleSelectPillar}
            activeSubTab={adminSubTab}
            onSelectSubTab={handleSelectSubTab}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onDeleteMultipleStudents={handleDeleteMultipleStudents}
            onBulkImportStudents={handleBulkImportStudents}
            onClearAllStudents={handleClearAllStudents}
            onClearAllRooms={handleClearAllRooms}
            onAutoAllocateRooms={handleAutoAllocateRooms}
            onAutoAllocateBuses={handleAutoAllocateBuses}
            onUpdateStudentSeat={handleUpdateStudentSeat}
            onBatchUpdateStudentSeats={handleBatchUpdateStudentSeats}
            onSaveRundown={handleSaveRundown}
            onDeleteRundown={handleDeleteRundown}
            onResetRundowns={handleResetRundowns}
            onAddClass={handleAddClass}
            onUpdateClass={handleUpdateClass as any}
            onDeleteClass={handleDeleteClass}
            onSaveSettings={handleSaveSettings}
            onAuditAndRealignWaves={handleAuditAndRealignWaves}
          />
        )
      )}

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        students={students}
        classesList={classes}
        onSaveSettings={handleSaveSettings}
        onForceRemoteSync={async () => {
          await forceRemoteSync();
          showToast('Cache lokal berhasil dibersihkan dan data disinkronkan dari Supabase!', 'success');
        }}
        onResetData={() => {
          if (confirm('Aksi ini akan mereset pengaturan ke default. Lanjutkan?')) {
            handleSaveSettings(schoolMetadata.defaultSettings as AppSettings);
          }
        }}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        classes={classes}
        onLoginSuccess={handleLoginSuccess}
        targetTabName={targetTabForLogin}
        initialRole={initialRoleForLogin}
      />

      <ProfileSettingsModal
        isOpen={isProfileSettingsOpen}
        onClose={() => setIsProfileSettingsOpen(false)}
        currentUser={currentUser}
        classes={classes}
        onUpdateClass={handleUpdateClass as any}
        onUpdateCurrentUser={(updatedUser) => setCurrentUser(updatedUser)}
      />
    </MainLayout>
  );
}

// Access Denied Placeholder Component
function AccessDeniedCard({
  title,
  description,
  onLogin,
}: {
  title: string;
  description: string;
  onLogin?: () => void;
}) {
  return (
    <div className="max-w-xl mx-auto my-12 bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-5 shadow-lg animate-in fade-in" id="access-denied-card">
      <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
        <Lock className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{description}</p>
      </div>
      {onLogin && (
        <button
          onClick={onLogin}
          className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
        >
          <LogIn className="w-4 h-4 text-emerald-400" />
          <span>Login Otentikasi Sekarang</span>
        </button>
      )}
    </div>
  );
}
