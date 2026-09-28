'use client';

import { useState, useEffect, useCallback } from 'react';
import { Student, SchoolClass, AppSettings, Bus, Room, AuthUser, RundownItem } from '@/types';
import { AuthService, DEFAULT_PUBLIC_USER } from '@/services/authService';
import { dbService } from '@/services/dbService';
import { getDynamicSupabaseClient } from '@/lib/supabaseClient';
import {
  subscribeStudents,
  subscribeClasses,
  subscribeSettings,
  subscribeRundowns,
} from '@/services/firebaseService';
import { RoomAllocatorEngine } from '@/services/roomAllocator';
import { SeatAllocatorEngine } from '@/services/seatAllocator';
import { normalizeClassName, alignAllStudentWaves } from '@/lib/utils';
import schoolMetadata from '@/config/schoolMetadata.json';

// Cache keys metadata (retained for backward cleanup only)
export const LS_CACHE_KEYS = {
  STUDENTS: 'sim_darmawisata_cache_students',
  CLASSES: 'sim_darmawisata_cache_classes',
  SETTINGS: 'sim_darmawisata_cache_settings',
  RUNDOWNS: 'sim_darmawisata_cache_rundowns',
  LAST_SYNC: 'sim_darmawisata_cache_last_sync',
};

export function useAppData() {
  const [currentUser, setCurrentUser] = useState<AuthUser>(DEFAULT_PUBLIC_USER);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [settings, setSettings] = useState<AppSettings>(schoolMetadata.defaultSettings as AppSettings);
  const [rundowns, setRundowns] = useState<RundownItem[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');

  const checkIsAngketClosed = useCallback((stgs: AppSettings) => {
    if (stgs.isAngketClosed) return true;
    if (stgs.angketDeadline) {
      const deadline = new Date(stgs.angketDeadline + 'T23:59:59');
      return new Date() > deadline;
    }
    return false;
  }, []);

  const isAngketClosed = checkIsAngketClosed(settings);

  const autoAllocateAllWhenClosed = useCallback((
    currentStudents: Student[],
    currentSettings: AppSettings,
    classList?: SchoolClass[]
  ) => {
    let updated = alignAllStudentWaves(currentStudents, currentSettings, classList || []);

    const seatRes = SeatAllocatorEngine.autoAllocateBuses(
      updated,
      currentSettings.defaultBusCapacity || 50,
      classList,
      currentSettings.customBusGuides,
      currentSettings
    );
    updated = seatRes.updatedStudents;

    const roomRes = RoomAllocatorEngine.autoAllocateRooms(
      updated,
      currentSettings.defaultRoomCapacity || 3,
      currentSettings,
      classList
    );
    updated = roomRes.updatedStudents;

    return {
      updatedStudents: updated,
      buses: seatRes.buses,
      rooms: roomRes.rooms,
    };
  }, []);

  // Targeted fetching helpers directly from dbService (Cloud-First Supabase)
  const fetchStudentsOnly = useCallback(async () => {
    try {
      const stds = await dbService.getAllStudents();
      if (stds && stds.length > 0) {
        setStudents(stds);
      }
    } catch (e) {
      console.warn('Error fetching students:', e);
    }
  }, []);

  const fetchClassesOnly = useCallback(async () => {
    try {
      const clss = await dbService.getAllClasses();
      if (clss && clss.length > 0) {
        setClasses(clss);
      }
    } catch (e) {
      console.warn('Error fetching classes:', e);
    }
  }, []);

  const fetchSettingsOnly = useCallback(async () => {
    try {
      const stgs = await dbService.getSettings();
      if (stgs) {
        setSettings(stgs);
      }
    } catch (e) {
      console.warn('Error fetching settings:', e);
    }
  }, []);

  const fetchRundownsOnly = useCallback(async () => {
    try {
      const rdns = await dbService.getAllRundowns();
      if (rdns && rdns.length > 0) {
        setRundowns(rdns);
      }
    } catch (e) {
      console.warn('Error fetching rundowns:', e);
    }
  }, []);

  // Centralized fetching logic from Cloud Database with Staged Fast Hydration
  const fetchAllData = useCallback(async () => {
    setIsSyncing(true);

    // Safety fallback: Ensure splash screen unlocks within 3.5s no matter what
    const unlockTimer = setTimeout(() => {
      setIsLoaded(true);
      setIsSyncing(false);
    }, 3500);

    try {
      // STAGE 1: Instant Unlock (< 150ms) - Core Configurations, Classes, & Rundowns
      const [initialStgs, initialClss, initialRdns] = await Promise.all([
        dbService.getSettings().catch((e) => {
          console.warn('Error fetching settings:', e);
          return null;
        }),
        dbService.getAllClasses().catch((e) => {
          console.warn('Error fetching classes:', e);
          return [];
        }),
        dbService.getAllRundowns().catch((e) => {
          console.warn('Error fetching rundowns:', e);
          return [];
        }),
      ]);

      if (initialStgs) setSettings(initialStgs);
      if (initialClss && initialClss.length > 0) setClasses(initialClss);
      if (initialRdns && initialRdns.length > 0) setRundowns(initialRdns);

      // INSTANT UNLOCK: Release Splash Screen immediately so user sees UI without waiting
      clearTimeout(unlockTimer);
      setIsLoaded(true);

      // STAGE 2: Non-blocking Background Hydration - Master Student Dataset & Allocations (Admin / Wali Kelas only)
      const currentUserRole = AuthService.getCurrentUser().role;
      const isAdminOrWali = currentUserRole === 'ADMIN' || currentUserRole === 'WALI_KELAS';

      if (isAdminOrWali) {
        const initialStds = await dbService.getAllStudents().catch((e) => {
          console.warn('Error fetching students in background:', e);
          return [];
        });

        const activeStgs = initialStgs || (schoolMetadata.defaultSettings as AppSettings);
        const activeClss = initialClss && initialClss.length > 0 ? initialClss : [];

        if (initialStds && initialStds.length > 0) {
          setStudents(initialStds);

          // Async derivation off the main blocking cycle
          setTimeout(() => {
            try {
              const finalBuses = SeatAllocatorEngine.deriveBusesFromStudents(
                initialStds,
                activeStgs.defaultBusCapacity,
                activeClss,
                activeStgs.customBusGuides,
                activeStgs
              );
              const finalRooms = RoomAllocatorEngine.deriveRoomsFromStudents(
                initialStds,
                activeStgs.defaultRoomCapacity,
                activeStgs
              );
              if (finalBuses) setBuses(finalBuses);
              if (finalRooms) setRooms(finalRooms);
            } catch (deriveErr) {
              console.warn('Error deriving buses/rooms:', deriveErr);
            }
          }, 0);
        }
      }
      setLoadError('');
    } catch (err: any) {
      console.error('Fetch data failed from database:', err);
      setLoadError(err.message || 'Error sync data');
      clearTimeout(unlockTimer);
      setIsLoaded(true);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    // Step A: Hydrate current auth user
    const savedUser = AuthService.getCurrentUser();
    setCurrentUser(savedUser);

    // Step B: Automatic Cleanup of stale localStorage data to enforce Zero-Local-Storage architecture
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(LS_CACHE_KEYS.STUDENTS);
        localStorage.removeItem(LS_CACHE_KEYS.CLASSES);
        localStorage.removeItem(LS_CACHE_KEYS.SETTINGS);
        localStorage.removeItem(LS_CACHE_KEYS.RUNDOWNS);
        localStorage.removeItem(LS_CACHE_KEYS.LAST_SYNC);
        localStorage.removeItem('local_activity_logs');
      } catch (_) {}
    }

    // Step C: Direct Fast Cloud Hydration from Supabase
    fetchAllData();

    // Debounce & Coalesce queue for Realtime updates to drastically cut Egress
    let pendingTables = new Set<'students' | 'classes' | 'settings' | 'rundowns'>();
    let debounceTimer: NodeJS.Timeout | null = null;

    const processPendingRealtimeSync = () => {
      const tablesToSync = Array.from(pendingTables);
      pendingTables.clear();

      if (tablesToSync.length >= 3) {
        // If almost everything changed, do a single full fetch
        fetchAllData();
      } else {
        // Selective sync only for tables that actually changed!
        if (tablesToSync.includes('students')) fetchStudentsOnly();
        if (tablesToSync.includes('classes')) fetchClassesOnly();
        if (tablesToSync.includes('settings')) fetchSettingsOnly();
        if (tablesToSync.includes('rundowns')) fetchRundownsOnly();
      }
    };

    const queueTableSync = (table: 'students' | 'classes' | 'settings' | 'rundowns') => {
      pendingTables.add(table);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(processPendingRealtimeSync, 800);
    };

    // Step D: Setup Cloud Realtime Subscriptions (ADMIN or WALI_KELAS only)
    const activeRole = currentUser.role !== 'PUBLIC_SISWA' ? currentUser.role : savedUser.role;
    const isAnyAdmin = activeRole === 'ADMIN' || activeRole === 'WALI_KELAS';

    if (!isAnyAdmin) {
      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
      };
    }

    if (dbService.isSupabaseActive()) {
      const dynamicSupabase = getDynamicSupabaseClient();
      const channel = dynamicSupabase
        .channel('sim_darmawisata_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => queueTableSync('students'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => queueTableSync('classes'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => queueTableSync('settings'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rundowns' }, () => queueTableSync('rundowns'))
        .subscribe();

      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        dynamicSupabase.removeChannel(channel);
      };
    }

    const unsubStudents = subscribeStudents((newStudents) => {
      if (newStudents && newStudents.length > 0) {
        setStudents(newStudents);
      }
    });

    const unsubClasses = subscribeClasses((newClasses) => {
      if (newClasses && newClasses.length > 0) {
        setClasses(newClasses);
      }
    });

    const unsubSettings = subscribeSettings((newSettings) => {
      if (newSettings && Object.keys(newSettings).length > 0) {
        setSettings(newSettings);
      }
    });

    const unsubRundowns = subscribeRundowns((newRundowns) => {
      if (newRundowns && newRundowns.length > 0) {
        setRundowns(newRundowns);
      }
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubStudents();
      unsubClasses();
      unsubSettings();
      unsubRundowns();
    };
  }, [fetchAllData, fetchStudentsOnly, fetchClassesOnly, fetchSettingsOnly, fetchRundownsOnly, currentUser.role]);

  // Reactively derive buses and rooms whenever students, classes, or settings change (client-side edits)
  useEffect(() => {
    if (isLoaded && students.length > 0) {
      const derivedBuses = SeatAllocatorEngine.deriveBusesFromStudents(
        students,
        settings.defaultBusCapacity || 50,
        classes,
        settings.customBusGuides,
        settings
      );
      const derivedRooms = RoomAllocatorEngine.deriveRoomsFromStudents(
        students,
        settings.defaultRoomCapacity || 3,
        settings
      );
      setBuses(derivedBuses);
      setRooms(derivedRooms);
    }
  }, [isLoaded, students, classes, settings]);

  const forceRemoteSync = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);

  return {
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
  };
}
