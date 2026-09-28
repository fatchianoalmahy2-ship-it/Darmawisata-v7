import { BaseRepository } from './BaseRepository';
import { MasterTeacher } from '@/types';
import { getInitialChaperones, saveChaperone, deleteChaperone } from '../firebaseService';

export class TeacherRepositoryImpl extends BaseRepository<MasterTeacher> {
  protected entityName = 'MasterTeacher';

  async getAll(): Promise<MasterTeacher[]> {
    const chaperones = await getInitialChaperones();
    return chaperones.map((c) => ({
      id: c.id,
      nip: '',
      name: c.name,
      gender: c.gender || 'LAKI-LAKI',
      defaultRole: c.role,
      phone: c.phone || '',
      notes: c.notes || '',
    }));
  }

  async getById(id: string): Promise<MasterTeacher | null> {
    const all = await this.getAll();
    return all.find((t) => t.id === id) || null;
  }

  async create(item: Omit<MasterTeacher, 'id'> | Partial<MasterTeacher>): Promise<MasterTeacher> {
    const newTeacher: MasterTeacher = {
      id: item.id || `TCH_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      nip: item.nip || '',
      name: item.name || '',
      gender: item.gender || 'LAKI-LAKI',
      defaultRole: item.defaultRole || 'STAFF',
      phone: item.phone || '',
      notes: item.notes || '',
    };

    await saveChaperone({
      id: newTeacher.id,
      name: newTeacher.name,
      role: newTeacher.defaultRole,
      phone: newTeacher.phone,
      notes: newTeacher.notes,
      gender: newTeacher.gender,
    });

    return newTeacher;
  }

  async update(id: string, item: Partial<MasterTeacher>): Promise<MasterTeacher> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Teacher with id ${id} not found.`);
    }

    const updated: MasterTeacher = {
      ...existing,
      ...item,
      id,
    };

    await saveChaperone({
      id: updated.id,
      name: updated.name,
      role: updated.defaultRole,
      phone: updated.phone,
      notes: updated.notes,
      gender: updated.gender,
    });

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    await deleteChaperone(id);
    return true;
  }
}

export const TeacherRepository = new TeacherRepositoryImpl();
