import { BaseRepository } from './BaseRepository';
import { Student } from '@/types';
import { dbService } from '../dbService';

export class StudentRepositoryImpl extends BaseRepository<Student> {
  protected entityName = 'Student';

  async getAll(): Promise<Student[]> {
    return await dbService.getAllStudents();
  }

  async getById(id: string): Promise<Student | null> {
    const all = await this.getAll();
    return all.find((s) => s.id === id) || null;
  }

  async create(item: Omit<Student, 'id'> | Partial<Student>): Promise<Student> {
    const newStudent: Student = {
      id: item.id || `STU_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      nis: item.nis || '',
      name: item.name || '',
      className: item.className || '',
      gender: item.gender || 'LAKI-LAKI',
      isRegistered: item.isRegistered ?? true,
      destination: item.destination,
      wave: item.wave,
      tShirtSize: item.tShirtSize,
      tShirtDesign: item.tShirtDesign,
      parentName: item.parentName,
      parentJob: item.parentJob,
      parentPhone: item.parentPhone,
      studentPhone: item.studentPhone,
      address: item.address,
      medicalHistory: item.medicalHistory,
      waiverType: item.waiverType,
      busNumber: item.busNumber,
      seatNumber: item.seatNumber,
      roomNumber: item.roomNumber,
      updatedAt: new Date().toISOString(),
    };

    await dbService.putSingleStudent(newStudent);
    return newStudent;
  }

  async update(id: string, item: Partial<Student>): Promise<Student> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Student with id ${id} not found.`);
    }

    const updated: Student = {
      ...existing,
      ...item,
      id,
      updatedAt: new Date().toISOString(),
    };

    await dbService.putSingleStudent(updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    await dbService.deleteStudent(id);
    return true;
  }

  override async bulkDelete(ids: string[]): Promise<boolean> {
    await dbService.deleteMultipleStudents(ids);
    return true;
  }
}

export const StudentRepository = new StudentRepositoryImpl();
