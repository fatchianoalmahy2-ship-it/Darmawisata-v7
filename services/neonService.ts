import { Student, SchoolClass, AppSettings, RundownItem, ActivityLog } from '@/types';

export function getActiveDbProvider(): 'SUPABASE' | 'NEON' | 'FIREBASE' {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('sim_active_db_provider') as 'FIREBASE' | 'NEON' | 'SUPABASE') || 'FIREBASE';
  }
  return 'FIREBASE';
}

export function getNeonConnStr(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sim_neon_connection_string') || '';
  }
  return '';
}

export async function callNeonApi(action: string, payload: any = {}): Promise<any> {
  const connectionString = getNeonConnStr();
  const res = await fetch('/api/neon/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      connectionString,
      payload,
    }),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || `Gagal mengeksekusi aksi ${action} di Neon DB`);
  }
  return data.data;
}

// ----------------------------------------------------------------------------
// NEON REPOSITORIES
// ----------------------------------------------------------------------------
export class NeonStudentRepository {
  async getAll(): Promise<Student[]> {
    try {
      const students = await callNeonApi('getStudents');
      return (students || []) as Student[];
    } catch (err) {
      console.warn('[NeonStudentRepository] Error getting students from Neon:', err);
      return [];
    }
  }

  async save(students: Student[]): Promise<void> {
    await callNeonApi('saveStudents', { students });
  }

  async saveSingle(student: Student): Promise<void> {
    await callNeonApi('saveSingleStudent', { student });
  }

  async deleteSingle(id: string): Promise<void> {
    await callNeonApi('deleteSingleStudent', { id });
  }

  async deleteMultiple(ids: string[]): Promise<void> {
    await callNeonApi('deleteMultipleStudents', { ids });
  }

  async clearAll(): Promise<void> {
    await callNeonApi('clearAllStudents');
  }
}

export class NeonClassRepository {
  async getAll(): Promise<SchoolClass[]> {
    try {
      const classes = await callNeonApi('getClasses');
      return (classes || []) as SchoolClass[];
    } catch (err) {
      console.warn('[NeonClassRepository] Error getting classes from Neon:', err);
      return [];
    }
  }

  async save(classes: SchoolClass[]): Promise<void> {
    await callNeonApi('saveClasses', { classes });
  }

  async deleteSingle(id: string): Promise<void> {
    await callNeonApi('deleteSingleClass', { id });
  }

  async clearAll(): Promise<void> {
    await callNeonApi('clearAllClasses');
  }
}

export class NeonSettingsRepository {
  async getSettings(): Promise<AppSettings> {
    try {
      const settings = await callNeonApi('getSettings');
      return settings as AppSettings;
    } catch (err) {
      console.warn('[NeonSettingsRepository] Error getting settings from Neon:', err);
      return {} as AppSettings;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await callNeonApi('saveSettings', { settings });
  }
}

export class NeonRundownRepository {
  async getAll(): Promise<RundownItem[]> {
    try {
      const rundowns = await callNeonApi('getRundowns');
      return (rundowns || []) as RundownItem[];
    } catch (err) {
      console.warn('[NeonRundownRepository] Error getting rundowns from Neon:', err);
      return [];
    }
  }

  async saveItem(item: RundownItem): Promise<RundownItem> {
    await callNeonApi('saveRundownItem', { item });
    return item;
  }

  async deleteItem(id: string): Promise<void> {
    await callNeonApi('deleteRundownItem', { id });
  }
}

export class NeonActivityLogRepository {
  async getAll(): Promise<ActivityLog[]> {
    try {
      const logs = await callNeonApi('getActivityLogs');
      return (logs || []) as ActivityLog[];
    } catch (err) {
      console.warn('[NeonActivityLogRepository] Error getting logs from Neon:', err);
      return [];
    }
  }

  async log(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    const newLog: ActivityLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    await callNeonApi('logActivity', { log: newLog });
  }
}
