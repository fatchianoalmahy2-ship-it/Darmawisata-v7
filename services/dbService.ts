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

export const dbService = {
  getProvider: (): 'SUPABASE' | 'FIREBASE' => {
    return isSupabaseConfigured() ? 'SUPABASE' : 'FIREBASE';
  },

  isSupabaseActive: (): boolean => {
    return isSupabaseConfigured();
  },

  // --------------------------------------------------------------------------
  // STUDENTS OPERATIONS
  // --------------------------------------------------------------------------
  getAllStudents: async (): Promise<Student[]> => {
    if (isSupabaseConfigured()) {
      try {
        const students = await SupabaseContainer.students.getAll();
        if (students && students.length > 0) {
          return students;
        }
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
          return seedSource;
        }
        return [];
      } catch (err) {
        console.warn('[dbService] Supabase getAllStudents failed, falling back to Firebase:', err);
        return firebaseStudents.getAll();
      }
    }
    return firebaseStudents.getAll();
  },

  putStudents: async (students: Student[], onProgress?: (processed: number, total: number) => void): Promise<void> => {
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
  getAllClasses: async (): Promise<SchoolClass[]> => {
    if (isSupabaseConfigured()) {
      try {
        const classes = await SupabaseContainer.classes.getAll();
        if (classes && classes.length > 0) {
          return classes;
        }
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
          return seedClasses;
        }
        return [];
      } catch (err) {
        console.warn('[dbService] Supabase getAllClasses failed, falling back:', err);
        return firebaseClasses.getAll();
      }
    }
    return firebaseClasses.getAll();
  },

  putClasses: async (classes: SchoolClass[], onProgress?: (processed: number, total: number) => void): Promise<void> => {
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
  getSettings: async (): Promise<AppSettings> => {
    if (isSupabaseConfigured()) {
      try {
        return await SupabaseContainer.settings.getSettings();
      } catch (err) {
        console.warn('[dbService] Supabase getSettings failed, falling back:', err);
        return firebaseSettings.getSettings();
      }
    }
    return firebaseSettings.getSettings();
  },

  putSettings: async (settings: AppSettings): Promise<void> => {
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
  getAllRundowns: async (): Promise<RundownItem[]> => {
    if (isSupabaseConfigured()) {
      try {
        const items = await SupabaseContainer.rundowns.getAll();
        if (items && items.length > 0) {
          return items;
        }
        return await SupabaseContainer.rundowns.resetToDefault();
      } catch (err) {
        console.warn('[dbService] Supabase getAllRundowns failed, falling back:', err);
        return firebaseRundowns.getAll();
      }
    }
    return firebaseRundowns.getAll();
  },

  putRundowns: async (rundowns: RundownItem[]): Promise<void> => {
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

