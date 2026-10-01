import { Student, SchoolClass, AppSettings, RundownItem } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  DatabaseContainer as SupabaseContainer,
} from './supabaseService';
import {
  FirebaseStudentRepository,
  FirebaseClassRepository,
  FirebaseSettingsRepository,
  FirebaseRundownRepository,
  FirebaseActivityLogRepository,
  getInitialStudents as getInitialStudentsFirebase,
  getInitialClasses as getInitialClassesFirebase,
  getInitialSettings as getInitialSettingsFirebase,
  getInitialRundowns as getInitialRundownsFirebase,
} from './firebaseService';
import schoolMetadata from '@/config/schoolMetadata.json';

const firebaseStudents = new FirebaseStudentRepository();
const firebaseClasses = new FirebaseClassRepository();
const firebaseSettings = new FirebaseSettingsRepository();
const firebaseRundowns = new FirebaseRundownRepository();
const firebaseActivityLogs = new FirebaseActivityLogRepository();

// In-Memory SWR Cache with TTL (3 minutes) to drastically reduce PostgREST egress
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

let studentsCache: CacheEntry<Student[]> | null = null;
let classesCache: CacheEntry<SchoolClass[]> | null = null;
let settingsCache: CacheEntry<AppSettings> | null = null;
let rundownsCache: CacheEntry<RundownItem[]> | null = null;

export const invalidateDbCache = (target?: 'students' | 'classes' | 'settings' | 'rundowns' | 'all') => {
  if (!target || target === 'all') {
    studentsCache = null;
    classesCache = null;
    settingsCache = null;
    rundownsCache = null;
  } else if (target === 'students') {
    studentsCache = null;
  } else if (target === 'classes') {
    classesCache = null;
  } else if (target === 'settings') {
    settingsCache = null;
  } else if (target === 'rundowns') {
    rundownsCache = null;
  }
};

export const dbService = {
  getProvider: (): 'SUPABASE' | 'FIREBASE' => {
    return isSupabaseConfigured() ? 'SUPABASE' : 'FIREBASE';
  },

  isSupabaseActive: (): boolean => {
    return isSupabaseConfigured();
  },

  invalidateCache: invalidateDbCache,

  // --------------------------------------------------------------------------
  // STUDENTS OPERATIONS
  // --------------------------------------------------------------------------
  getAllStudents: async (forceRefresh = false): Promise<Student[]> => {
    const now = Date.now();
    if (!forceRefresh && studentsCache && (now - studentsCache.timestamp < CACHE_TTL_MS)) {
      return studentsCache.data;
    }

    let result: Student[] = [];
    if (isSupabaseConfigured()) {
      try {
        const students = await SupabaseContainer.students.getAll();
        if (students && students.length > 0) {
          result = students;
        } else {
          // AUTO-SEED to Supabase if Supabase table is empty
          console.info('[dbService] Supabase students table is empty. Initiating auto-seed from fallback...');
          let seedSource: Student[] = [];
          try {
            seedSource = await firebaseStudents.getAll();
          } catch {
            seedSource = [];
          }
          if (!seedSource || seedSource.length === 0) {
            seedSource = (schoolMetadata.initialStudents as unknown as Student[]) || [];
          }
          if (seedSource.length > 0) {
            await SupabaseContainer.students.save(seedSource);
            console.info(`[dbService] Successfully auto-seeded ${seedSource.length} students into Supabase!`);
            result = seedSource;
          }
        }
      } catch (err) {
        console.warn('[dbService] Supabase getAllStudents failed, falling back to Firebase:', err);
        result = await firebaseStudents.getAll();
      }
    } else {
      result = await firebaseStudents.getAll();
    }

    if (result && result.length > 0) {
      studentsCache = { data: result, timestamp: now };
    }
    return result;
  },

  getStudentById: async (id: string): Promise<Student | null> => {
    if (!id) return null;
    if (studentsCache?.data) {
      const found = studentsCache.data.find((s) => s.id === id);
      if (found) return found;
    }
    if (isSupabaseConfigured()) {
      try {
        return await SupabaseContainer.students.getById(id);
      } catch (err) {
        console.warn('[dbService] Supabase getById failed, falling back:', err);
      }
    }
    return firebaseStudents.getById(id);
  },

  getStudentByNis: async (nis: string): Promise<Student | null> => {
    if (!nis) return null;
    const cleanNis = nis.trim().toLowerCase();
    if (studentsCache?.data) {
      const found = studentsCache.data.find((s) => s.nis?.toLowerCase() === cleanNis);
      if (found) return found;
    }
    if (isSupabaseConfigured()) {
      try {
        return await SupabaseContainer.students.getByNis(nis);
      } catch (err) {
        console.warn('[dbService] Supabase getByNis failed, falling back:', err);
      }
    }
    return firebaseStudents.getByNis(nis);
  },

  getStudentsByClass: async (className: string): Promise<Student[]> => {
    if (!className) return [];
    const normalizedTarget = normalizeClassName(className);
    if (studentsCache?.data) {
      const matches = studentsCache.data.filter((s) => normalizeClassName(s.className) === normalizedTarget);
      if (matches.length > 0) return matches;
    }
    if (isSupabaseConfigured()) {
      try {
        return await SupabaseContainer.students.getByClass(className);
      } catch (err) {
        console.warn('[dbService] Supabase getByClass failed, falling back:', err);
      }
    }
    return firebaseStudents.getByClass(className);
  },

  putStudents: async (students: Student[], onProgress?: (processed: number, total: number) => void): Promise<void> => {
    invalidateDbCache('students');
    if (isSupabaseConfigured()) {
      try {
        await SupabaseContainer.students.save(students);
        if (onProgress) onProgress(students.length, students.length);
        return;
      } catch (err) {
        console.warn('[dbService] Supabase putStudents failed, attempting fallback:', err);
      }
    }
    return firebaseStudents.save(students, onProgress);
  },

  putSingleStudent: async (student: Student): Promise<void> => {
    invalidateDbCache('students');
    if (isSupabaseConfigured()) {
      try {
        await SupabaseContainer.students.saveSingle(student);
        return;
      } catch (err: any) {
        console.error('[dbService] Supabase putSingleStudent failed:', err);
        throw err;
      }
    }
    return firebaseStudents.saveSingle(student);
  },

  deleteStudent: async (studentId: string): Promise<void> => {
    invalidateDbCache('students');
    if (isSupabaseConfigured()) {
      try {
        await SupabaseContainer.students.deleteSingle(studentId);
        return;
      } catch (err) {
        console.warn('[dbService] Supabase deleteStudent failed:', err);
      }
    }
    return firebaseStudents.deleteSingle(studentId);
  },

  deleteMultipleStudents: async (studentIds: string[]): Promise<void> => {
    invalidateDbCache('students');
    if (isSupabaseConfigured()) {
      try {
        await SupabaseContainer.students.deleteMultiple(studentIds);
        return;
      } catch (err) {
        console.warn('[dbService] Supabase deleteMultipleStudents failed:', err);
      }
    }
    return firebaseStudents.deleteMultiple(studentIds);
  },

  clearStudents: async (): Promise<void> => {
    invalidateDbCache('students');
    if (isSupabaseConfigured()) {
      try {
        await SupabaseContainer.students.clearAll();
        return;
      } catch (err) {
        console.warn('[dbService] Supabase clearStudents failed:', err);
      }
    }
    return firebaseStudents.clearAll();
  },

  // --------------------------------------------------------------------------
  // CLASSES OPERATIONS
  // --------------------------------------------------------------------------
  getAllClasses: async (forceRefresh = false): Promise<SchoolClass[]> => {
    const now = Date.now();
    if (!forceRefresh && classesCache && (now - classesCache.timestamp < CACHE_TTL_MS)) {
      return classesCache.data;
    }

    let result: SchoolClass[] = [];
    if (isSupabaseConfigured()) {
      try {
        const classes = await SupabaseContainer.classes.getAll();
        if (classes && classes.length > 0) {
          result = classes;
        } else {
          // AUTO-SEED Classes to Supabase if empty
          console.info('[dbService] Supabase classes table is empty. Auto-seeding classes...');
          let seedClasses: SchoolClass[] = [];
          try {
            seedClasses = await firebaseClasses.getAll();
          } catch {
            seedClasses = [];
          }
          if (!seedClasses || seedClasses.length === 0) {
            seedClasses = (schoolMetadata.classes as unknown as SchoolClass[]) || [];
          }
          if (seedClasses.length > 0) {
            await SupabaseContainer.classes.save(seedClasses);
            result = seedClasses;
          }
        }
      } catch (err) {
        console.warn('[dbService] Supabase getAllClasses failed, falling back:', err);
        result = await firebaseClasses.getAll();
      }
    } else {
      result = await firebaseClasses.getAll();
    }

    if (result && result.length > 0) {
      classesCache = { data: result, timestamp: now };
    }
    return result;
  },

  putClasses: async (classes: SchoolClass[], onProgress?: (processed: number, total: number) => void): Promise<void> => {
    invalidateDbCache('classes');
    if (isSupabaseConfigured()) {
      try {
        await SupabaseContainer.classes.save(classes);
        if (onProgress) onProgress(classes.length, classes.length);
        return;
      } catch (err) {
        console.warn('[dbService] Supabase putClasses failed, attempting fallback:', err);
      }
    }
    return firebaseClasses.save(classes, onProgress);
  },

  deleteClass: async (classId: string): Promise<void> => {
    invalidateDbCache('classes');
    if (isSupabaseConfigured()) {
      try {
        await SupabaseContainer.classes.deleteSingle(classId);
        return;
      } catch (err) {
        console.warn('[dbService] Supabase deleteClass failed:', err);
      }
    }
    return firebaseClasses.deleteSingle(classId);
  },

  clearClasses: async (): Promise<void> => {
    invalidateDbCache('classes');
    if (isSupabaseConfigured()) {
      try {
        await SupabaseContainer.classes.clearAll();
        return;
      } catch (err) {
        console.warn('[dbService] Supabase clearClasses failed:', err);
      }
    }
    return firebaseClasses.clearAll();
  },

  // --------------------------------------------------------------------------
  // SETTINGS OPERATIONS
  // --------------------------------------------------------------------------
  getSettings: async (forceRefresh = false): Promise<AppSettings> => {
    const now = Date.now();
    if (!forceRefresh && settingsCache && (now - settingsCache.timestamp < CACHE_TTL_MS)) {
      return settingsCache.data;
    }

    let result: AppSettings;
    if (isSupabaseConfigured()) {
      try {
        result = await SupabaseContainer.settings.getSettings();
      } catch (err) {
        console.warn('[dbService] Supabase getSettings failed, falling back:', err);
        result = await firebaseSettings.getSettings();
      }
    } else {
      result = await firebaseSettings.getSettings();
    }

    if (result) {
      settingsCache = { data: result, timestamp: now };
    }
    return result;
  },

  putSettings: async (settings: AppSettings): Promise<void> => {
    invalidateDbCache('settings');
    if (isSupabaseConfigured()) {
      try {
        await SupabaseContainer.settings.saveSettings(settings);
        return;
      } catch (err) {
        console.warn('[dbService] Supabase putSettings failed, falling back:', err);
      }
    }
    return firebaseSettings.saveSettings(settings);
  },

  // --------------------------------------------------------------------------
  // RUNDOWNS OPERATIONS
  // --------------------------------------------------------------------------
  getAllRundowns: async (forceRefresh = false): Promise<RundownItem[]> => {
    const now = Date.now();
    if (!forceRefresh && rundownsCache && (now - rundownsCache.timestamp < CACHE_TTL_MS)) {
      return rundownsCache.data;
    }

    let result: RundownItem[] = [];
    if (isSupabaseConfigured()) {
      try {
        const items = await SupabaseContainer.rundowns.getAll();
        if (items && items.length > 0) {
          result = items;
        } else {
          result = await SupabaseContainer.rundowns.resetToDefault();
        }
      } catch (err) {
        console.warn('[dbService] Supabase getAllRundowns failed, falling back:', err);
        result = await firebaseRundowns.getAll();
      }
    } else {
      result = await firebaseRundowns.getAll();
    }

    if (result && result.length > 0) {
      rundownsCache = { data: result, timestamp: now };
    }
    return result;
  },

  putRundowns: async (rundowns: RundownItem[]): Promise<void> => {
    invalidateDbCache('rundowns');
    if (isSupabaseConfigured()) {
      try {
        for (const r of rundowns) {
          await SupabaseContainer.rundowns.saveItem(r);
        }
        return;
      } catch (err) {
        console.warn('[dbService] Supabase putRundowns failed:', err);
      }
    }
    for (const r of rundowns) {
      await firebaseRundowns.saveItem(r);
    }
  },

  putRundown: async (item: RundownItem): Promise<RundownItem> => {
    invalidateDbCache('rundowns');
    if (isSupabaseConfigured()) {
      try {
        return await SupabaseContainer.rundowns.saveItem(item);
      } catch (err) {
        console.warn('[dbService] Supabase putRundown failed:', err);
      }
    }
    return firebaseRundowns.saveItem(item);
  },

  deleteRundown: async (itemId: string): Promise<void> => {
    invalidateDbCache('rundowns');
    if (isSupabaseConfigured()) {
      try {
        await SupabaseContainer.rundowns.deleteItem(itemId);
        return;
      } catch (err) {
        console.warn('[dbService] Supabase deleteRundown failed:', err);
      }
    }
    return firebaseRundowns.deleteItem(itemId);
  },

  clearRundowns: async (): Promise<RundownItem[]> => {
    invalidateDbCache('rundowns');
    if (isSupabaseConfigured()) {
      try {
        return await SupabaseContainer.rundowns.resetToDefault();
      } catch (err) {
        console.warn('[dbService] Supabase clearRundowns failed:', err);
      }
    }
    return firebaseRundowns.resetToDefault();
  },

  // BACKGROUND SYNC QUEUE OPERATIONS - NO-OP in Full Online Mode
  getSyncQueue: async () => [],
  enqueueTask: async (action: string, payload: any) => {},
  removeTask: async (taskId: string) => {},
  removeStudentFromSyncQueue: async (studentId: string) => {},

  isSyncing: false,
  clearAllCaches: async () => {},
  triggerSync: async () => {},

  executeTask: async (task: any): Promise<void> => {},
};

