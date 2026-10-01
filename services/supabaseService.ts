import { supabase, isSupabaseConfigured, getDynamicSupabaseClient } from '@/lib/supabaseClient';
import { Student, SchoolClass, AppSettings, RundownItem, AdminCredentials, ActivityLog } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';
import { sortClassesAlphabetically, normalizeClassName } from '@/lib/utils';

// Helper to determine if Supabase connection should be bypassed (unconfigured/placeholder)
export function shouldSkipSupabase(): boolean {
  return !isSupabaseConfigured();
}

// ----------------------------------------------------------------------------
// METADATA & SCHEMA CONFIGURATION (Metadata-Driven approach)
// ----------------------------------------------------------------------------
export const SCHEMA_CONFIGS = {
  students: {
    selectFields: '*',
    primaryKey: 'id',
  },
  classes: {
    selectFields: '*',
    primaryKey: 'id',
  },
  settings: {
    selectFields: '*',
    primaryKey: 'id',
  },
  rundowns: {
    selectFields: '*',
    primaryKey: 'id',
  },
  activityLogs: {
    selectFields: '*',
    primaryKey: 'id',
  }
};

// ----------------------------------------------------------------------------
// INTERFACES (SOLID: Dependency Inversion Principle)
// ----------------------------------------------------------------------------
export interface IStudentRepository {
  getById(id: string): Promise<Student | null>;
  getByNis(nis: string): Promise<Student | null>;
  getByClass(className: string): Promise<Student[]>;
  getAll(): Promise<Student[]>;
  save(students: Student[]): Promise<void>;
  saveSingle(student: Student): Promise<void>;
  bulkUpdate(ids: string[], updates: Partial<Student>): Promise<void>;
  deleteSingle(id: string): Promise<void>;
  deleteMultiple(ids: string[]): Promise<void>;
  clearAll(): Promise<void>;
}

export interface IClassRepository {
  getAll(): Promise<SchoolClass[]>;
  save(classes: SchoolClass[]): Promise<void>;
  deleteSingle(id: string): Promise<void>;
  clearAll(): Promise<void>;
}

export interface ISettingsRepository {
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
  getAdminCredentials(): Promise<AdminCredentials | null>;
  saveAdminCredentials(creds: AdminCredentials): Promise<void>;
}

export interface IRundownRepository {
  getAll(): Promise<RundownItem[]>;
  saveItem(item: RundownItem): Promise<RundownItem>;
  deleteItem(id: string): Promise<void>;
  resetToDefault(): Promise<RundownItem[]>;
}

export interface IActivityLogRepository {
  getAll(limit?: number): Promise<ActivityLog[]>;
  log(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void>;
}

// ----------------------------------------------------------------------------
// UTILITY HELPERS (KISS, DRY principles)
// ----------------------------------------------------------------------------
export async function getDb(): Promise<any> {
  return null;
}

export async function getFirebaseSDK(): Promise<any> {
  return null;
}

export function cleanData<T>(obj: T): T {
  if (obj === undefined) return null as unknown as T;
  if (obj === null) return null as unknown as T;
  if (Array.isArray(obj)) return obj.map((item) => cleanData(item)) as unknown as T;
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = (obj as any)[key];
        cleaned[key] = val === undefined ? null : cleanData(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// ----------------------------------------------------------------------------
// SAFE UPSERT ENGINE (Dynamic missing-column prevention handler)
// ----------------------------------------------------------------------------
export async function safeUpsert(table: string, data: any[], onConflict = 'id'): Promise<void> {
  if (!data || data.length === 0) return;

  if (shouldSkipSupabase()) {
    console.warn(`[Supabase] Skipped upsert on table '${table}' because Supabase is not configured.`);
    return;
  }

  let currentData = [...data];
  let attempts = 0;
  const maxAttempts = 5; // Reduced from 50 to prevent high latency loop on persistent issues

  while (attempts < maxAttempts) {
    try {
      const { error } = await supabase.from(table).upsert(currentData, { onConflict });
      if (!error) return;

      const fullMsg = `${error.message || ''} ${error.details || ''} ${error.hint || ''} ${JSON.stringify(error)}`;
      
      // Find missing column names from any error pattern
      const matches = [
        ...fullMsg.matchAll(/Could not find the ['"]?([^'"]+?)['"]? column/gi),
        ...fullMsg.matchAll(/column ['"]?([^'"]+?)['"]? of relation/gi),
        ...fullMsg.matchAll(/column ['"]?([^'"]+?)['"]? does not exist/gi),
        ...fullMsg.matchAll(/has no column ['"]?([^'"]+?)['"]?/gi),
      ];

      const missingCols = Array.from(new Set(matches.map((m) => m[1]).filter(Boolean)));

      if (missingCols.length > 0) {
        console.warn(`[Supabase] Table '${table}' missing column(s): ${missingCols.join(', ')}. Stripping keys and retrying...`);
        currentData = currentData.map((item) => {
          if (item && typeof item === 'object') {
            const newItem = { ...item };
            for (const col of missingCols) {
              delete newItem[col];
            }
            return newItem;
          }
          return item;
        });
        attempts++;
      } else {
        console.warn(`[Supabase] Upsert issue on table '${table}':`, error);
        throw new Error(`Supabase ${table} upsert error: ${error.message || fullMsg}`);
      }
    } catch (e: any) {
      const isFetchError = e.message?.includes('Failed to fetch') || e.name === 'TypeError' || (typeof navigator !== 'undefined' && !navigator.onLine);
      if (isFetchError) {
        console.warn(`[Supabase] Network/Offline warning during upsert on '${table}':`, e.message);
        throw new Error(`TypeError: Failed to fetch (Supabase offline)`);
      }
      throw e;
    }
  }

  // If maxAttempts reached, attempt one final call or throw clear error
  try {
    const { error: finalErr } = await supabase.from(table).upsert(currentData, { onConflict });
    if (finalErr) {
      throw new Error(`Supabase ${table} upsert error after ${maxAttempts} attempts: ${finalErr.message}`);
    }
  } catch (e: any) {
    const isFetchError = e.message?.includes('Failed to fetch') || e.name === 'TypeError' || (typeof navigator !== 'undefined' && !navigator.onLine);
    if (isFetchError) {
      console.warn(`[Supabase] Network/Offline warning during final upsert on '${table}':`, e.message);
      throw new Error(`TypeError: Failed to fetch (Supabase offline)`);
    }
    throw e;
  }
}

// ----------------------------------------------------------------------------
// OOP CONCRETE REPOSITORY IMPLEMENTATIONS (SOLID, Separation of Concerns)
// ----------------------------------------------------------------------------

export class SupabaseStudentRepository implements IStudentRepository {
  async getById(id: string): Promise<Student | null> {
    if (!id || shouldSkipSupabase()) return null;
    try {
      const { data, error } = await supabase
        .from('students')
        .select(SCHEMA_CONFIGS.students.selectFields)
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      data.className = normalizeClassName(data.className);
      return data as Student;
    } catch (err) {
      console.error('[SupabaseStudentRepository] Error fetching student by ID:', err);
      return null;
    }
  }

  async getByNis(nis: string): Promise<Student | null> {
    const cleanNis = nis.trim();
    if (!cleanNis) return null;
    if (shouldSkipSupabase()) {
      return null;
    }

    try {
      // High-performance NIS lookup: exact match limit 1 first
      const { data: exactMatch, error: exactErr } = await supabase
        .from('students')
        .select(SCHEMA_CONFIGS.students.selectFields)
        .eq('nis', cleanNis)
        .limit(1)
        .maybeSingle();

      if (exactMatch && !exactErr) {
        exactMatch.className = normalizeClassName(exactMatch.className);
        return exactMatch as Student;
      }

      // Fallback: prefix match limit 5
      const { data, error } = await supabase
        .from('students')
        .select(SCHEMA_CONFIGS.students.selectFields)
        .ilike('nis', `${cleanNis}%`)
        .limit(5);

      if (error || !data || data.length === 0) return null;

      const firstMatch = data[0];
      firstMatch.className = normalizeClassName(firstMatch.className);
      return firstMatch as Student;
    } catch (err) {
      console.error('[SupabaseStudentRepository] Error fetching student by NIS:', err);
      return null;
    }
  }

  async getByClass(className: string): Promise<Student[]> {
    if (shouldSkipSupabase()) {
      return [];
    }
    try {
      const normalizedTargetClass = normalizeClassName(className);
      const { data, error } = await supabase
        .from('students')
        .select(SCHEMA_CONFIGS.students.selectFields)
        .eq('className', normalizedTargetClass);

      if (data && !error) {
        return data.map((d) => ({
          ...d,
          className: normalizeClassName(d.className),
        })) as Student[];
      }
      return [];
    } catch (err) {
      console.error('[SupabaseStudentRepository] Error fetching students by class:', err);
      return [];
    }
  }

  async getAll(): Promise<Student[]> {
    if (shouldSkipSupabase()) {
      return [];
    }
    try {
      const { data, error } = await supabase
        .from('students')
        .select(SCHEMA_CONFIGS.students.selectFields);

      if (data && !error) {
        const students = data as unknown as Student[];
        students.forEach((s) => {
          s.className = normalizeClassName(s.className);
          if (!s.isRegistered) {
            delete s.destination;
            delete s.wave;
            delete s.tShirtSize;
            delete s.tShirtDesign;
            delete s.parentName;
            delete s.parentAddress;
            delete s.parentPhone;
            delete s.studentPhone;
            delete s.medicalHistory;
            delete s.busNumber;
            delete s.seatNumber;
            delete s.roomNumber;
          }
        });
        return students;
      }
      return [];
    } catch (err) {
      console.warn('[SupabaseStudentRepository] Error loading students:', err);
      return [];
    }
  }

  async save(students: Student[]): Promise<void> {
    if (!students || students.length === 0) return;
    const CHUNK_SIZE = 100;
    const cleaned = students.map((s) => {
      const c = cleanData(s);
      if (c && typeof c === 'object') {
        delete (c as any).bedNumber;
      }
      return c;
    });
    
    // Execute chunks in parallel groups for maximum throughput
    const chunks: any[][] = [];
    for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
      chunks.push(cleaned.slice(i, i + CHUNK_SIZE));
    }
    
    await Promise.all(
      chunks.map((chunk) => safeUpsert('students', chunk, SCHEMA_CONFIGS.students.primaryKey))
    );
  }

  async saveSingle(student: Student): Promise<void> {
    if (!student || !student.id) return;
    const existing = await this.getById(student.id);
    const c = cleanData(student);
    if (c && typeof c === 'object') {
      delete (c as any).bedNumber;
    }
    await safeUpsert('students', [c], SCHEMA_CONFIGS.students.primaryKey);

    try {
      const isNew = !existing;
      await DatabaseContainer.activityLogs.log({
        action: isNew ? 'ADD' : 'UPDATE',
        nis: student.nis || '',
        name: student.name || 'Siswa',
        className: student.className || '',
        operator: 'Sistem / Admin',
        details: isNew
          ? `Menambahkan siswa baru: ${student.name} (NIS: ${student.nis || '-'}, Kelas: ${student.className || '-'})`
          : `Memperbarui data siswa: ${student.name} (NIS: ${student.nis || '-'}, Kelas: ${student.className || '-'})`,
      });
    } catch (logErr) {
      console.warn('[SupabaseStudentRepository] Auto log error:', logErr);
    }
  }

  async bulkUpdate(studentIds: string[], updates: Partial<Student>): Promise<void> {
    if (!studentIds || studentIds.length === 0 || !updates || Object.keys(updates).length === 0) return;
    if (shouldSkipSupabase()) {
      console.warn('[Supabase] Skipped bulkUpdate students (unconfigured).');
      return;
    }
    const cleanUpdates = cleanData(updates);
    if (cleanUpdates && typeof cleanUpdates === 'object') {
      delete (cleanUpdates as any).bedNumber;
      delete (cleanUpdates as any).id;
    }
    const CHUNK_SIZE = 100;
    for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
      const chunk = studentIds.slice(i, i + CHUNK_SIZE);
      try {
        const { error } = await supabase
          .from('students')
          .update(cleanUpdates)
          .in('id', chunk);
        if (error) {
          console.error('[SupabaseStudentRepository] Error bulk updating students:', error);
          throw new Error(`Supabase bulk update students error: ${error.message || JSON.stringify(error)}`);
        }
      } catch (e: any) {
        const isFetchError = e.message?.includes('Failed to fetch') || e.name === 'TypeError' || (typeof navigator !== 'undefined' && !navigator.onLine);
        if (isFetchError) {
          console.warn(`[Supabase] Network/Offline warning during student bulkUpdate:`, e.message);
          throw new Error(`TypeError: Failed to fetch (Supabase offline)`);
        }
        throw e;
      }
    }

    try {
      await DatabaseContainer.activityLogs.log({
        action: 'UPDATE',
        operator: 'Sistem / Admin',
        details: `Pembaruan massal ${studentIds.length} data siswa (Kolom: ${Object.keys(updates).join(', ')}).`,
      });
    } catch (logErr) {
      console.warn('[SupabaseStudentRepository] Auto log error:', logErr);
    }
  }

  async deleteSingle(studentId: string): Promise<void> {
    if (!studentId) return;
    if (shouldSkipSupabase()) {
      console.warn('[Supabase] Skipped deleteSingle student (unconfigured).');
      return;
    }
    let existing: Student | null = null;
    try {
      existing = await this.getById(studentId);
    } catch (e) {
      // ignore
    }

    try {
      const { error } = await supabase.from('students').delete().eq('id', studentId);
      if (error) {
        console.error('[SupabaseStudentRepository] Error deleting student:', error);
        throw new Error(`Supabase student delete error: ${error.message || JSON.stringify(error)}`);
      }

      try {
        await DatabaseContainer.activityLogs.log({
          action: 'DELETE',
          nis: existing?.nis || '',
          name: existing?.name || 'Siswa',
          className: existing?.className || '',
          operator: 'Sistem / Admin',
          details: `Menghapus data siswa: ${existing?.name || studentId} (NIS: ${existing?.nis || '-'})`,
        });
      } catch (logErr) {
        console.warn('[SupabaseStudentRepository] Auto log error:', logErr);
      }
    } catch (e: any) {
      const isFetchError = e.message?.includes('Failed to fetch') || e.name === 'TypeError' || (typeof navigator !== 'undefined' && !navigator.onLine);
      if (isFetchError) {
        console.warn(`[Supabase] Network/Offline warning during student deleteSingle:`, e.message);
        throw new Error(`TypeError: Failed to fetch (Supabase offline)`);
      }
      throw e;
    }
  }

  async deleteMultiple(studentIds: string[]): Promise<void> {
    if (!studentIds || studentIds.length === 0) return;
    if (shouldSkipSupabase()) {
      console.warn('[Supabase] Skipped deleteMultiple students (unconfigured).');
      return;
    }
    const CHUNK_SIZE = 100;
    for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
      const chunk = studentIds.slice(i, i + CHUNK_SIZE);
      try {
        const { error } = await supabase.from('students').delete().in('id', chunk);
        if (error) {
          console.error('[SupabaseStudentRepository] Error deleting multiple students:', error);
          throw new Error(`Supabase students delete error: ${error.message || JSON.stringify(error)}`);
        }
      } catch (e: any) {
        const isFetchError = e.message?.includes('Failed to fetch') || e.name === 'TypeError' || (typeof navigator !== 'undefined' && !navigator.onLine);
        if (isFetchError) {
          console.warn(`[Supabase] Network/Offline warning during student deleteMultiple:`, e.message);
          throw new Error(`TypeError: Failed to fetch (Supabase offline)`);
        }
        throw e;
      }
    }

    try {
      await DatabaseContainer.activityLogs.log({
        action: 'DELETE',
        operator: 'Sistem / Admin',
        details: `Menghapus massal ${studentIds.length} data siswa.`,
      });
    } catch (logErr) {
      console.warn('[SupabaseStudentRepository] Auto log error:', logErr);
    }
  }

  async clearAll(): Promise<void> {
    if (shouldSkipSupabase()) {
      console.warn('[Supabase] Skipped clearAll students (unconfigured).');
      return;
    }
    try {
      const { error } = await supabase.from('students').delete().neq('id', '');
      if (error) {
        console.error('[SupabaseStudentRepository] Error clearing students:', error);
        throw new Error(`Supabase clear students error: ${error.message || JSON.stringify(error)}`);
      }

      try {
        await DatabaseContainer.activityLogs.log({
          action: 'CLEAR',
          operator: 'Sistem / Admin',
          details: `Mengosongkan seluruh data siswa dari database.`,
        });
      } catch (logErr) {
        console.warn('[SupabaseStudentRepository] Auto log error:', logErr);
      }
    } catch (e: any) {
      const isFetchError = e.message?.includes('Failed to fetch') || e.name === 'TypeError' || (typeof navigator !== 'undefined' && !navigator.onLine);
      if (isFetchError) {
        console.warn(`[Supabase] Network/Offline warning during student clearAll:`, e.message);
        throw new Error(`TypeError: Failed to fetch (Supabase offline)`);
      }
      throw e;
    }
  }
}

export class SupabaseClassRepository implements IClassRepository {
  async getAll(): Promise<SchoolClass[]> {
    if (shouldSkipSupabase()) {
      return [];
    }
    try {
      const { data, error } = await supabase.from('classes').select(SCHEMA_CONFIGS.classes.selectFields);
      if (data && !error) {
        const classes = data.map((cls: any) => ({
          ...cls,
          name: normalizeClassName(cls.name),
        })) as SchoolClass[];
        return sortClassesAlphabetically(classes);
      }
      return [];
    } catch (err) {
      console.warn('[SupabaseClassRepository] Error loading classes:', err);
      return [];
    }
  }

  async save(classes: SchoolClass[]): Promise<void> {
    if (!classes || classes.length === 0) return;
    const CHUNK_SIZE = 50;
    const cleaned = classes.map((c) => cleanData(c));
    for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
      const chunk = cleaned.slice(i, i + CHUNK_SIZE);
      await safeUpsert('classes', chunk, SCHEMA_CONFIGS.classes.primaryKey);
    }
  }

  async deleteSingle(classId: string): Promise<void> {
    if (!classId) return;
    if (shouldSkipSupabase()) {
      console.warn('[Supabase] Skipped deleteSingle class (unconfigured).');
      return;
    }
    try {
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      if (error) {
        console.error('[SupabaseClassRepository] Error deleting class:', error);
        throw new Error(`Supabase class delete error: ${error.message || JSON.stringify(error)}`);
      }
    } catch (e: any) {
      const isFetchError = e.message?.includes('Failed to fetch') || e.name === 'TypeError' || (typeof navigator !== 'undefined' && !navigator.onLine);
      if (isFetchError) {
        console.warn(`[Supabase] Network/Offline warning during class deleteSingle:`, e.message);
        throw new Error(`TypeError: Failed to fetch (Supabase offline)`);
      }
      throw e;
    }
  }

  async clearAll(): Promise<void> {
    if (shouldSkipSupabase()) {
      console.warn('[Supabase] Skipped clearAll classes (unconfigured).');
      return;
    }
    try {
      const { error } = await supabase.from('classes').delete().neq('id', '');
      if (error) {
        console.error('[SupabaseClassRepository] Error clearing classes:', error);
        throw new Error(`Supabase clear classes error: ${error.message || JSON.stringify(error)}`);
      }
    } catch (e: any) {
      const isFetchError = e.message?.includes('Failed to fetch') || e.name === 'TypeError' || (typeof navigator !== 'undefined' && !navigator.onLine);
      if (isFetchError) {
        console.warn(`[Supabase] Network/Offline warning during class clearAll:`, e.message);
        throw new Error(`TypeError: Failed to fetch (Supabase offline)`);
      }
      throw e;
    }
  }
}

export class SupabaseSettingsRepository implements ISettingsRepository {
  async getSettings(): Promise<AppSettings> {
    if (shouldSkipSupabase()) {
      return schoolMetadata.defaultSettings as AppSettings;
    }
    
    let lastError: any = null;
    const maxRetries = 3;
    const retryDelayMs = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select(SCHEMA_CONFIGS.settings.selectFields)
          .eq('id', 'global')
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data && (data as any).data) {
          return (data as any).data as AppSettings;
        }
        
        return schoolMetadata.defaultSettings as AppSettings;
      } catch (err) {
        lastError = err;
        console.warn(`[SupabaseSettingsRepository] Attempt ${attempt} failed:`, err);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
        }
      }
    }

    console.error('[SupabaseSettingsRepository] All loading settings attempts failed. Falling back to default settings. Last error:', lastError);
    return schoolMetadata.defaultSettings as AppSettings;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await safeUpsert('settings', [{ id: 'global', data: cleanData(settings) }], 'id');
  }

  async getAdminCredentials(): Promise<AdminCredentials | null> {
    if (shouldSkipSupabase()) {
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('settings')
        .select(SCHEMA_CONFIGS.settings.selectFields)
        .eq('id', 'admin')
        .maybeSingle();

      if (data && (data as any).data && !error) {
        return (data as any).data as AdminCredentials;
      }
      return null;
    } catch (err) {
      console.error('[SupabaseSettingsRepository] Error loading admin credentials:', err);
      return null;
    }
  }

  async saveAdminCredentials(creds: AdminCredentials): Promise<void> {
    await safeUpsert('settings', [{ id: 'admin', data: cleanData(creds) }], 'id');
  }
}

export class SupabaseRundownRepository implements IRundownRepository {
  async getAll(): Promise<RundownItem[]> {
    try {
      const { data, error } = await supabase.from('rundowns').select(SCHEMA_CONFIGS.rundowns.selectFields);
      if (data && !error) {
        const items = data as unknown as RundownItem[];
        return items.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
      }
      return [];
    } catch (err) {
      console.warn('[SupabaseRundownRepository] Error loading rundowns:', err);
      return [];
    }
  }

  async saveItem(item: RundownItem): Promise<RundownItem> {
    const itemId = item.id || `rd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const itemToSave = { ...item, id: itemId };
    await safeUpsert('rundowns', [cleanData(itemToSave)], SCHEMA_CONFIGS.rundowns.primaryKey);
    return itemToSave;
  }

  async deleteItem(itemId: string): Promise<void> {
    if (!itemId) return;
    if (shouldSkipSupabase()) {
      console.warn('[Supabase] Skipped deleteItem rundown (unconfigured).');
      return;
    }
    try {
      const { error } = await supabase.from('rundowns').delete().eq('id', itemId);
      if (error) {
        console.error('[SupabaseRundownRepository] Error deleting rundown item:', error);
        throw new Error(`Supabase rundown delete error: ${error.message || JSON.stringify(error)}`);
      }
    } catch (e: any) {
      const isFetchError = e.message?.includes('Failed to fetch') || e.name === 'TypeError' || (typeof navigator !== 'undefined' && !navigator.onLine);
      if (isFetchError) {
        console.warn(`[Supabase] Network/Offline warning during rundown deleteItem:`, e.message);
        throw new Error(`TypeError: Failed to fetch (Supabase offline)`);
      }
      throw e;
    }
  }

  async resetToDefault(): Promise<RundownItem[]> {
    const defaultItems: RundownItem[] = [
      ...(schoolMetadata.rundowns.BALI as RundownItem[]).map((r, idx) => ({ ...r, id: `bali_${idx}` })),
      ...(schoolMetadata.rundowns.YOGYAKARTA as RundownItem[]).map((r, idx) => ({ ...r, id: `yogya_${idx}` })),
    ];

    if (shouldSkipSupabase()) {
      console.warn('[Supabase] Skipped resetToDefault rundowns (unconfigured). Returning defaults locally.');
      return defaultItems;
    }

    try {
      const { error: delErr } = await supabase.from('rundowns').delete().neq('id', '');
      if (delErr) console.warn('[SupabaseRundownRepository] Warning clearing rundowns:', delErr);
    } catch (e: any) {
      const isFetchError = e.message?.includes('Failed to fetch') || e.name === 'TypeError' || (typeof navigator !== 'undefined' && !navigator.onLine);
      if (isFetchError) {
        console.warn(`[Supabase] Network/Offline warning during rundown clear in resetToDefault:`, e.message);
      } else {
        throw e;
      }
    }
    
    const cleaned = defaultItems.map((item) => cleanData(item));
    await safeUpsert('rundowns', cleaned, SCHEMA_CONFIGS.rundowns.primaryKey);
    return defaultItems;
  }
}

export class SupabaseActivityLogRepository implements IActivityLogRepository {
  async getAll(limit = 100): Promise<ActivityLog[]> {
    if (shouldSkipSupabase()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(SCHEMA_CONFIGS.activityLogs.selectFields)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (data && !error) {
        return data as unknown as ActivityLog[];
      }

      console.warn('[SupabaseActivityLogRepository] activity_logs table query failed or is missing, using settings backup...', error);
      const { data: backupData } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'activity_logs_backup')
        .maybeSingle();
      if (backupData && backupData.data) {
        return (backupData.data as unknown as ActivityLog[]).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      }
    } catch (err) {
      console.warn('[SupabaseActivityLogRepository] Error loading activity logs from Supabase:', err);
    }
    return [];
  }

  async log(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    const newLog: ActivityLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    if (shouldSkipSupabase()) {
      return;
    }

    try {
      const { error } = await supabase.from('activity_logs').insert([cleanData(newLog)]);
      if (!error) return;

      console.warn('[SupabaseActivityLogRepository] Direct table insert failed, saving to settings backup...', error);
      const { data: currentBackup } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'activity_logs_backup')
        .maybeSingle();

      const existingLogs: ActivityLog[] = currentBackup?.data ? (currentBackup.data as unknown as ActivityLog[]) : [];
      const updatedLogs = [newLog, ...existingLogs].slice(0, 200);

      await safeUpsert('settings', [{ id: 'activity_logs_backup', data: cleanData(updatedLogs) }], 'id');
    } catch (err) {
      console.warn('[SupabaseActivityLogRepository] Fallback saving activity log:', err);
      try {
        const { data: currentBackup } = await supabase
          .from('settings')
          .select('data')
          .eq('id', 'activity_logs_backup')
          .maybeSingle();

        const existingLogs: ActivityLog[] = currentBackup?.data ? (currentBackup.data as unknown as ActivityLog[]) : [];
        const updatedLogs = [newLog, ...existingLogs].slice(0, 200);

        await safeUpsert('settings', [{ id: 'activity_logs_backup', data: cleanData(updatedLogs) }], 'id');
      } catch (fallbackErr) {
        console.warn('[SupabaseActivityLogRepository] Fallback saving to settings failed:', fallbackErr);
      }
    }
  }
}

// ----------------------------------------------------------------------------
// SERVICE CONTAINER / INVERSION CONTAINER (OOP-driven Singletons)
// ----------------------------------------------------------------------------
export class DatabaseContainer {
  public static readonly students: IStudentRepository = new SupabaseStudentRepository();
  public static readonly classes: IClassRepository = new SupabaseClassRepository();
  public static readonly settings: ISettingsRepository = new SupabaseSettingsRepository();
  public static readonly rundowns: IRundownRepository = new SupabaseRundownRepository();
  public static readonly activityLogs: IActivityLogRepository = new SupabaseActivityLogRepository();
}

// ----------------------------------------------------------------------------
// COMPATIBILITY EXPORTS (Preserves identical functional API signatures)
// ----------------------------------------------------------------------------
export async function getStudentById(id: string): Promise<Student | null> {
  return DatabaseContainer.students.getById(id);
}

export async function getStudentByNis(nis: string): Promise<Student | null> {
  return DatabaseContainer.students.getByNis(nis);
}

export async function getStudentsByClass(className: string): Promise<Student[]> {
  return DatabaseContainer.students.getByClass(className);
}

export async function getInitialStudents(): Promise<Student[]> {
  return DatabaseContainer.students.getAll();
}

export async function saveStudents(students: Student[]): Promise<void> {
  return DatabaseContainer.students.save(students);
}

export async function saveSingleStudent(student: Student): Promise<void> {
  return DatabaseContainer.students.saveSingle(student);
}

export async function bulkUpdateStudents(studentIds: string[], updates: Partial<Student>): Promise<void> {
  return DatabaseContainer.students.bulkUpdate(studentIds, updates);
}

export async function deleteSingleStudent(studentId: string): Promise<void> {
  return DatabaseContainer.students.deleteSingle(studentId);
}

export async function deleteMultipleStudents(studentIds: string[]): Promise<void> {
  return DatabaseContainer.students.deleteMultiple(studentIds);
}

export async function clearAllStudents(): Promise<void> {
  return DatabaseContainer.students.clearAll();
}

export async function getInitialClasses(): Promise<SchoolClass[]> {
  return DatabaseContainer.classes.getAll();
}

export async function saveClasses(classes: SchoolClass[]): Promise<void> {
  return DatabaseContainer.classes.save(classes);
}

export async function deleteSingleClass(classId: string): Promise<void> {
  return DatabaseContainer.classes.deleteSingle(classId);
}

export async function clearAllClasses(): Promise<void> {
  return DatabaseContainer.classes.clearAll();
}

export async function getInitialSettings(): Promise<AppSettings> {
  return DatabaseContainer.settings.getSettings();
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return DatabaseContainer.settings.saveSettings(settings);
}

export async function getAdminCredentialsSupabase(): Promise<AdminCredentials | null> {
  return DatabaseContainer.settings.getAdminCredentials();
}

export async function saveAdminCredentialsSupabase(creds: AdminCredentials): Promise<void> {
  return DatabaseContainer.settings.saveAdminCredentials(creds);
}

export async function getInitialRundowns(): Promise<RundownItem[]> {
  return DatabaseContainer.rundowns.getAll();
}

export async function saveRundownItem(item: RundownItem): Promise<RundownItem> {
  return DatabaseContainer.rundowns.saveItem(item);
}

export async function deleteRundownItem(itemId: string): Promise<void> {
  return DatabaseContainer.rundowns.deleteItem(itemId);
}

export async function resetRundownsToDefault(): Promise<RundownItem[]> {
  return DatabaseContainer.rundowns.resetToDefault();
}

export async function getInitialActivityLogs(limit = 100): Promise<ActivityLog[]> {
  return DatabaseContainer.activityLogs.getAll(limit);
}

export async function logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
  return DatabaseContainer.activityLogs.log(log);
}
