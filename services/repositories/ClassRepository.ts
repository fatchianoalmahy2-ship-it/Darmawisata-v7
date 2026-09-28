import { BaseRepository } from './BaseRepository';
import { SchoolClass } from '@/types';
import { dbService } from '../dbService';

export class ClassRepositoryImpl extends BaseRepository<SchoolClass> {
  protected entityName = 'SchoolClass';

  async getAll(): Promise<SchoolClass[]> {
    return await dbService.getAllClasses();
  }

  async getById(id: string): Promise<SchoolClass | null> {
    const all = await this.getAll();
    return all.find((c) => c.id === id) || null;
  }

  async create(item: Omit<SchoolClass, 'id'> | Partial<SchoolClass>): Promise<SchoolClass> {
    const all = await this.getAll();
    const newClass: SchoolClass = {
      id: item.id || `CLS_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: item.name || '',
      department: item.department || '',
      totalStudents: item.totalStudents || 0,
      homeroomTeacher: item.homeroomTeacher || '',
      teacherPhone: item.teacherPhone || '',
      teacherPassword: item.teacherPassword || '',
      manualWaliDestination: item.manualWaliDestination,
      manualWaliNotes: item.manualWaliNotes,
    };

    await dbService.putClasses([...all, newClass]);
    return newClass;
  }

  async update(id: string, item: Partial<SchoolClass>): Promise<SchoolClass> {
    const all = await this.getAll();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`Class with id ${id} not found.`);
    }

    const updatedClass: SchoolClass = {
      ...all[index],
      ...item,
      id,
    };

    all[index] = updatedClass;
    await dbService.putClasses(all);
    return updatedClass;
  }

  async delete(id: string): Promise<boolean> {
    await dbService.deleteClass(id);
    return true;
  }
}

export const ClassRepository = new ClassRepositoryImpl();
