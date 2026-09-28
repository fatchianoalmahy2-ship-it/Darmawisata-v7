import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit as limitQuery,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '@/lib/firebase';
import { Student, SchoolClass, AppSettings, RundownItem, AdminCredentials, ActivityLog, MasterChaperone } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';
import { sortClassesAlphabetically, normalizeClassName } from '@/lib/utils';

const BATCH_CHUNK_SIZE = 200; // Chunking size per batch to stay under Firestore's 500 limit & optimize memory

/**
 * Defensive data sanitizer to remove undefined/NaN fields and keep clean payloads for Firestore
 */
export function cleanData(obj: any): any {
  if (obj === undefined) return null;
  if (typeof obj === 'number' && isNaN(obj)) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => cleanData(item));

  const cleaned: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (val !== undefined && typeof val !== 'function') {
        cleaned[key] = cleanData(val);
      }
    }
  }
  return cleaned;
}

// ----------------------------------------------------------------------------
// BASELINE CACHE TRACKING & SMART DIFFING ENGINE (Zero-Waste Quota Optimizer)
// ----------------------------------------------------------------------------
const studentBaselineMap = new Map<string, Student>();
const classBaselineMap = new Map<string, SchoolClass>();
let settingsBaselineJson = '';

function isStudentEqual(a?: Student | null, b?: Student | null): boolean {
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.nis === b.nis &&
    a.gender === b.gender &&
    a.className === b.className &&
    a.parentApproval === b.parentApproval &&
    a.busNumber === b.busNumber &&
    a.seatNumber === b.seatNumber &&
    a.roomNumber === b.roomNumber &&
    a.parentName === b.parentName &&
    a.parentPhone === b.parentPhone &&
    a.parentAddress === b.parentAddress &&
    a.reason === b.reason &&
    a.hasParticipatedBefore === b.hasParticipatedBefore &&
    a.signatureData === b.signatureData &&
    a.verifiedAt === b.verifiedAt &&
    a.updatedAt === b.updatedAt
  );
}

function isClassEqual(a?: SchoolClass | null, b?: SchoolClass | null): boolean {
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.totalStudents === b.totalStudents &&
    a.genderBreakdown?.L === b.genderBreakdown?.L &&
    a.genderBreakdown?.P === b.genderBreakdown?.P
  );
}

// ----------------------------------------------------------------------------
// FIREBASE FIRESTORE REPOSITORIES
// ----------------------------------------------------------------------------

export class FirebaseStudentRepository {
  private colName = 'students';

  async getById(id: string): Promise<Student | null> {
    if (!id) return null;
    try {
      const docRef = doc(db, this.colName, id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      const data = snap.data() as Student;
      data.className = normalizeClassName(data.className);
      studentBaselineMap.set(data.id, { ...data });
      return data;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${this.colName}/${id}`);
      return null;
    }
  }

  async getByNis(nis: string): Promise<Student | null> {
    const cleanNis = nis.trim();
    if (!cleanNis) return null;
    try {
      const q = query(collection(db, this.colName), where('nis', '==', cleanNis), limitQuery(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const student = snap.docs[0].data() as Student;
        student.className = normalizeClassName(student.className);
        studentBaselineMap.set(student.id, { ...student });
        return student;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, this.colName);
      return null;
    }
  }

  async getByClass(className: string): Promise<Student[]> {
    try {
      const targetClass = normalizeClassName(className);
      const q = query(collection(db, this.colName), where('className', '==', targetClass));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const student = d.data() as Student;
        student.className = normalizeClassName(student.className);
        studentBaselineMap.set(student.id, { ...student });
        return student;
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, this.colName);
      return [];
    }
  }

  async getAll(): Promise<Student[]> {
    try {
      const snap = await getDocs(collection(db, this.colName));
      if (snap.empty) return [];
      const students = snap.docs.map((d) => {
        const s = d.data() as Student;
        s.className = normalizeClassName(s.className);
        studentBaselineMap.set(s.id, { ...s });
        return s;
      });
      return students;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, this.colName);
      return [];
    }
  }

  // Real-time listener for live updates across all clients
  subscribeAll(callback: (students: Student[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, this.colName),
      (snap) => {
        const students = snap.docs.map((d) => {
          const s = d.data() as Student;
          s.className = normalizeClassName(s.className);
          studentBaselineMap.set(s.id, { ...s });
          return s;
        });
        callback(students);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, this.colName);
      }
    );
  }

  async save(students: Student[], onProgress?: (processed: number, total: number) => void): Promise<void> {
    if (!students || students.length === 0) return;

    // Delta-detection: Filter only modified or newly created students
    const deltaStudents = studentBaselineMap.size > 0
      ? students.filter((s) => {
          const baseline = studentBaselineMap.get(s.id);
          return !baseline || !isStudentEqual(baseline, s);
        })
      : students;

    // If no data has changed, skip database write completely (0 writes consumed)
    if (deltaStudents.length === 0) {
      if (onProgress) onProgress(students.length, students.length);
      return;
    }

    const cleaned = deltaStudents.map((s) => {
      const c = cleanData(s);
      if (c && typeof c === 'object') {
        delete (c as any).bedNumber;
      }
      return c;
    });

    let processedCount = 0;
    const totalCount = cleaned.length;

    try {
      for (let i = 0; i < cleaned.length; i += BATCH_CHUNK_SIZE) {
        const chunk = cleaned.slice(i, i + BATCH_CHUNK_SIZE);
        const batch = writeBatch(db);

        for (const student of chunk) {
          if (!student.id) continue;
          const ref = doc(db, this.colName, student.id);
          batch.set(ref, student, { merge: true });
        }

        await batch.commit();

        // Update local baseline map for persisted chunk
        for (const s of chunk) {
          studentBaselineMap.set(s.id, { ...s });
        }

        processedCount += chunk.length;
        if (onProgress) onProgress(processedCount, totalCount);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, this.colName);
    }
  }

  async saveSingle(student: Student): Promise<void> {
    if (!student || !student.id) return;
    
    // Check if student data has not changed compared to baseline
    const baseline = studentBaselineMap.get(student.id);
    if (baseline && isStudentEqual(baseline, student)) {
      return; // Skip write (0 quota used)
    }

    const c = cleanData(student);
    if (c && typeof c === 'object') {
      delete (c as any).bedNumber;
    }
    try {
      const docRef = doc(db, this.colName, student.id);
      await setDoc(docRef, c, { merge: true });
      studentBaselineMap.set(student.id, { ...student });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, this.colName);
    }
  }

  async bulkUpdate(studentIds: string[], updates: Partial<Student>): Promise<void> {
    if (!studentIds || studentIds.length === 0 || !updates) return;
    const cleanUpdates = cleanData(updates);
    if (cleanUpdates && typeof cleanUpdates === 'object') {
      delete (cleanUpdates as any).bedNumber;
      delete (cleanUpdates as any).id;
    }

    try {
      for (let i = 0; i < studentIds.length; i += BATCH_CHUNK_SIZE) {
        const chunk = studentIds.slice(i, i + BATCH_CHUNK_SIZE);
        const batch = writeBatch(db);

        for (const id of chunk) {
          const ref = doc(db, this.colName, id);
          batch.update(ref, cleanUpdates);
        }

        await batch.commit();

        for (const id of chunk) {
          const existing = studentBaselineMap.get(id);
          if (existing) {
            studentBaselineMap.set(id, { ...existing, ...cleanUpdates });
          }
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, this.colName);
    }
  }

  async deleteSingle(id: string): Promise<void> {
    if (!id) return;
    try {
      await deleteDoc(doc(db, this.colName, id));
      studentBaselineMap.delete(id);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, this.colName);
    }
  }

  async deleteMultiple(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    try {
      for (let i = 0; i < ids.length; i += BATCH_CHUNK_SIZE) {
        const chunk = ids.slice(i, i + BATCH_CHUNK_SIZE);
        const batch = writeBatch(db);
        for (const id of chunk) {
          batch.delete(doc(db, this.colName, id));
        }
        await batch.commit();
        for (const id of chunk) {
          studentBaselineMap.delete(id);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, this.colName);
    }
  }

  async clearAll(): Promise<void> {
    const snap = await getDocs(collection(db, this.colName));
    if (snap.empty) return;

    const ids = snap.docs.map((d) => d.id);
    await this.deleteMultiple(ids);
    studentBaselineMap.clear();
  }
}

export class FirebaseClassRepository {
  private colName = 'classes';

  async getAll(): Promise<SchoolClass[]> {
    try {
      const snap = await getDocs(collection(db, this.colName));
      if (snap.empty) return [];
      const classes = snap.docs.map((d) => {
        const item = {
          ...(d.data() as SchoolClass),
          name: normalizeClassName(d.data().name),
        };
        classBaselineMap.set(item.id, { ...item });
        return item;
      });
      return sortClassesAlphabetically(classes);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, this.colName);
      return [];
    }
  }

  subscribeAll(callback: (classes: SchoolClass[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, this.colName),
      (snap) => {
        const classes = snap.docs.map((d) => {
          const item = {
            ...(d.data() as SchoolClass),
            name: normalizeClassName(d.data().name),
          };
          classBaselineMap.set(item.id, { ...item });
          return item;
        });
        callback(sortClassesAlphabetically(classes));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, this.colName);
      }
    );
  }

  async save(classes: SchoolClass[], onProgress?: (processed: number, total: number) => void): Promise<void> {
    if (!classes || classes.length === 0) return;

    const deltaClasses = classBaselineMap.size > 0
      ? classes.filter((c) => {
          const baseline = classBaselineMap.get(c.id);
          return !baseline || !isClassEqual(baseline, c);
        })
      : classes;

    if (deltaClasses.length === 0) {
      if (onProgress) onProgress(classes.length, classes.length);
      return;
    }

    const cleaned = deltaClasses.map((c) => cleanData(c));

    let processed = 0;
    try {
      for (let i = 0; i < cleaned.length; i += BATCH_CHUNK_SIZE) {
        const chunk = cleaned.slice(i, i + BATCH_CHUNK_SIZE);
        const batch = writeBatch(db);

        for (const item of chunk) {
          if (!item.id) continue;
          batch.set(doc(db, this.colName, item.id), item, { merge: true });
        }

        await batch.commit();

        for (const item of chunk) {
          classBaselineMap.set(item.id, { ...item });
        }

        processed += chunk.length;
        if (onProgress) onProgress(processed, cleaned.length);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, this.colName);
    }
  }

  async deleteSingle(id: string): Promise<void> {
    if (!id) return;
    try {
      await deleteDoc(doc(db, this.colName, id));
      classBaselineMap.delete(id);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, this.colName);
    }
  }

  async clearAll(): Promise<void> {
    try {
      const snap = await getDocs(collection(db, this.colName));
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      classBaselineMap.clear();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, this.colName);
    }
  }
}

export class FirebaseSettingsRepository {
  private colName = 'settings';

  async getSettings(): Promise<AppSettings> {
    try {
      const ref = doc(db, this.colName, 'global');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const settings = (data.data ? (data.data as AppSettings) : (data as AppSettings));
        settingsBaselineJson = JSON.stringify(cleanData(settings));
        return settings;
      }
      return schoolMetadata.defaultSettings as AppSettings;
    } catch (err) {
      console.warn('[FirebaseSettingsRepository] Error getting settings:', err);
      return schoolMetadata.defaultSettings as AppSettings;
    }
  }

  subscribeSettings(callback: (settings: AppSettings) => void): Unsubscribe {
    return onSnapshot(doc(db, this.colName, 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const settings = (data.data ? (data.data as AppSettings) : (data as AppSettings));
        settingsBaselineJson = JSON.stringify(cleanData(settings));
        callback(settings);
      } else {
        callback(schoolMetadata.defaultSettings as AppSettings);
      }
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const cleaned = cleanData(settings);
    const serialized = JSON.stringify(cleaned);
    if (settingsBaselineJson && settingsBaselineJson === serialized) {
      return; // Skip redundant write (0 quota used)
    }

    try {
      const ref = doc(db, this.colName, 'global');
      await setDoc(ref, { id: 'global', data: cleaned }, { merge: true });
      settingsBaselineJson = serialized;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, this.colName);
    }
  }

  async getAdminCredentials(): Promise<AdminCredentials | null> {
    try {
      const ref = doc(db, this.colName, 'admin');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        return (data.data || data) as AdminCredentials;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  async saveAdminCredentials(creds: AdminCredentials): Promise<void> {
    try {
      const ref = doc(db, this.colName, 'admin');
      await setDoc(ref, { id: 'admin', data: cleanData(creds) }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, this.colName);
    }
  }
}

export class FirebaseRundownRepository {
  private colName = 'rundowns';

  async getAll(): Promise<RundownItem[]> {
    try {
      const snap = await getDocs(collection(db, this.colName));
      if (snap.empty) {
        return (schoolMetadata.rundowns as unknown as RundownItem[]) || [];
      }
      const items = snap.docs.map((d) => d.data() as RundownItem);
      return items.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, this.colName);
      return (schoolMetadata.rundowns as unknown as RundownItem[]) || [];
    }
  }

  subscribeAll(callback: (rundowns: RundownItem[]) => void): Unsubscribe {
    return onSnapshot(collection(db, this.colName), (snap) => {
      if (snap.empty) {
        callback((schoolMetadata.rundowns as unknown as RundownItem[]) || []);
        return;
      }
      const items = snap.docs.map((d) => d.data() as RundownItem);
      callback(items.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time)));
    });
  }

  async saveItem(item: RundownItem): Promise<RundownItem> {
    const itemId = item.id || `rd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const itemToSave = { ...item, id: itemId };
    try {
      await setDoc(doc(db, this.colName, itemId), cleanData(itemToSave), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, this.colName);
    }
    return itemToSave;
  }

  async deleteItem(id: string): Promise<void> {
    if (!id) return;
    try {
      await deleteDoc(doc(db, this.colName, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, this.colName);
    }
  }

  async resetToDefault(): Promise<RundownItem[]> {
    const defaultItems: RundownItem[] = [
      ...(schoolMetadata.rundowns.BALI as RundownItem[]).map((r, idx) => ({ ...r, id: `bali_${idx}` })),
      ...(schoolMetadata.rundowns.YOGYAKARTA as RundownItem[]).map((r, idx) => ({ ...r, id: `yogya_${idx}` })),
    ];

    const snap = await getDocs(collection(db, this.colName));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    const saveBatch = writeBatch(db);
    for (const item of defaultItems) {
      saveBatch.set(doc(db, this.colName, item.id), cleanData(item));
    }
    await saveBatch.commit();

    return defaultItems;
  }
}

export class FirebaseActivityLogRepository {
  private colName = 'activity_logs';
  private logQueue: Omit<ActivityLog, 'id' | 'timestamp'>[] = [];
  private logTimer: NodeJS.Timeout | null = null;
  private lastLogTimestamp = 0;

  async getAll(limitVal = 100): Promise<ActivityLog[]> {
    try {
      const q = query(collection(db, this.colName), orderBy('timestamp', 'desc'), limitQuery(limitVal));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as ActivityLog);
      }
      return [];
    } catch (err) {
      return [];
    }
  }

  subscribeAll(callback: (logs: ActivityLog[]) => void, limitVal = 100): Unsubscribe {
    const q = query(collection(db, this.colName), orderBy('timestamp', 'desc'), limitQuery(limitVal));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => d.data() as ActivityLog));
    }, (err) => {
      console.warn('[ActivityLogRepository] Listener error:', err);
    });
  }

  async log(logData: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    const now = Date.now();
    // In-memory throttling: Coalesce rapid logs within 2000ms
    this.logQueue.push(logData);

    if (this.logTimer) {
      clearTimeout(this.logTimer);
    }

    this.logTimer = setTimeout(async () => {
      if (this.logQueue.length === 0) return;
      
      const itemsToFlush = [...this.logQueue];
      this.logQueue = [];

      try {
        if (itemsToFlush.length === 1) {
          const item = itemsToFlush[0];
          const newLog: ActivityLog = {
            ...item,
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            timestamp: new Date().toISOString(),
          };
          await setDoc(doc(db, this.colName, newLog.id), cleanData(newLog));
        } else {
          // Aggregate multiple burst logs into a single concise log entry to save write quota
          const latestItem = itemsToFlush[itemsToFlush.length - 1];
          const summaryLog: ActivityLog = {
            action: latestItem.action,
            operator: latestItem.operator,
            details: `[Batch ${itemsToFlush.length} Aktivitas] ${latestItem.details}`,
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            timestamp: new Date().toISOString(),
          };
          await setDoc(doc(db, this.colName, summaryLog.id), cleanData(summaryLog));
        }
      } catch (err) {
        console.warn('[FirebaseActivityLogRepository] Error flushing log:', err);
      }
    }, 1500);
  }
}

// ----------------------------------------------------------------------------
// SINGLETON DATABASE CONTAINER & CONVENIENCE EXPORTS
// ----------------------------------------------------------------------------
export class DatabaseContainer {
  public static readonly students = new FirebaseStudentRepository();
  public static readonly classes = new FirebaseClassRepository();
  public static readonly settings = new FirebaseSettingsRepository();
  public static readonly rundowns = new FirebaseRundownRepository();
  public static readonly activityLogs = new FirebaseActivityLogRepository();
}

// Students API
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

export async function saveStudents(students: Student[], onProgress?: (processed: number, total: number) => void): Promise<void> {
  return DatabaseContainer.students.save(students, onProgress);
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

export async function clearAllFirebaseData(): Promise<void> {
  await DatabaseContainer.students.clearAll();
  await DatabaseContainer.classes.clearAll();
  const rdSnap = await getDocs(collection(db, 'rundowns'));
  if (!rdSnap.empty) {
    const batch = writeBatch(db);
    rdSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  const logSnap = await getDocs(collection(db, 'activity_logs'));
  if (!logSnap.empty) {
    const batch = writeBatch(db);
    logSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// Classes API
export async function getInitialClasses(): Promise<SchoolClass[]> {
  return DatabaseContainer.classes.getAll();
}

export async function saveClasses(classes: SchoolClass[], onProgress?: (processed: number, total: number) => void): Promise<void> {
  return DatabaseContainer.classes.save(classes, onProgress);
}

export async function deleteSingleClass(classId: string): Promise<void> {
  return DatabaseContainer.classes.deleteSingle(classId);
}

export async function clearAllClasses(): Promise<void> {
  return DatabaseContainer.classes.clearAll();
}

// Settings API
export async function getInitialSettings(): Promise<AppSettings> {
  return DatabaseContainer.settings.getSettings();
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return DatabaseContainer.settings.saveSettings(settings);
}

export async function getAdminCredentialsFirebase(): Promise<AdminCredentials | null> {
  return DatabaseContainer.settings.getAdminCredentials();
}

export async function saveAdminCredentialsFirebase(creds: AdminCredentials): Promise<void> {
  return DatabaseContainer.settings.saveAdminCredentials(creds);
}

// Chaperones (Pendamping) API via Settings
export async function getInitialChaperones(): Promise<MasterChaperone[]> {
  const stgs = await DatabaseContainer.settings.getSettings();
  return (stgs?.masterChaperones as MasterChaperone[]) || [];
}

export async function saveChaperone(chaperone: MasterChaperone): Promise<void> {
  const stgs = await DatabaseContainer.settings.getSettings();
  const list = [...((stgs?.masterChaperones as MasterChaperone[]) || [])];
  const idx = list.findIndex((c) => c.id === chaperone.id);
  if (idx >= 0) {
    list[idx] = chaperone;
  } else {
    list.push(chaperone);
  }
  await DatabaseContainer.settings.saveSettings({
    ...stgs,
    masterChaperones: list,
  });
}

export async function deleteChaperone(id: string): Promise<void> {
  const stgs = await DatabaseContainer.settings.getSettings();
  const list = ((stgs?.masterChaperones as MasterChaperone[]) || []).filter((c) => c.id !== id);
  await DatabaseContainer.settings.saveSettings({
    ...stgs,
    masterChaperones: list,
  });
}

// Rundowns API
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

// Activity Logs API
export async function getInitialActivityLogs(limit = 100): Promise<ActivityLog[]> {
  return DatabaseContainer.activityLogs.getAll(limit);
}

export async function logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
  return DatabaseContainer.activityLogs.log(log);
}

// Realtime Subscriptions
export function subscribeStudents(callback: (students: Student[]) => void): Unsubscribe {
  return DatabaseContainer.students.subscribeAll(callback);
}

export function subscribeClasses(callback: (classes: SchoolClass[]) => void): Unsubscribe {
  return DatabaseContainer.classes.subscribeAll(callback);
}

export function subscribeSettings(callback: (settings: AppSettings) => void): Unsubscribe {
  return DatabaseContainer.settings.subscribeSettings(callback);
}

export function subscribeRundowns(callback: (rundowns: RundownItem[]) => void): Unsubscribe {
  return DatabaseContainer.rundowns.subscribeAll(callback);
}

export function subscribeActivityLogs(callback: (logs: ActivityLog[]) => void, limit = 100): Unsubscribe {
  return DatabaseContainer.activityLogs.subscribeAll(callback, limit);
}

