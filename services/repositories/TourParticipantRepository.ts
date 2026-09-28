import { BaseRepository } from './BaseRepository';
import { TourParticipant, Student } from '@/types';
import { dbService } from '../dbService';

export class TourParticipantRepositoryImpl extends BaseRepository<TourParticipant> {
  protected entityName = 'TourParticipant';

  async getAll(): Promise<TourParticipant[]> {
    const students: Student[] = await dbService.getAllStudents();
    return students.map((s) => ({
      id: s.id,
      tourId: s.destination || 'TOUR_BALI_2026',
      studentId: s.id,
      waveId: s.wave || 'BALI_GEL_1',
      tShirtSize: s.tShirtSize,
      tShirtDesign: s.tShirtDesign,
      waiverType: s.waiverType,
      medicalHistory: s.medicalHistory,
      isRegistered: s.isRegistered,
      busNumber: s.busNumber,
      seatNumber: s.seatNumber,
      roomNumber: s.roomNumber,
      updatedAt: s.updatedAt,
    }));
  }

  async getById(id: string): Promise<TourParticipant | null> {
    const all = await this.getAll();
    return all.find((p) => p.id === id || p.studentId === id) || null;
  }

  async create(item: Omit<TourParticipant, 'id'> | Partial<TourParticipant>): Promise<TourParticipant> {
    const participant: TourParticipant = {
      id: item.id || `TP_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      tourId: item.tourId || 'TOUR_BALI_2026',
      studentId: item.studentId || '',
      waveId: item.waveId || 'BALI_GEL_1',
      tShirtSize: item.tShirtSize,
      tShirtDesign: item.tShirtDesign,
      waiverType: item.waiverType,
      medicalHistory: item.medicalHistory,
      isRegistered: item.isRegistered ?? true,
      busNumber: item.busNumber,
      seatNumber: item.seatNumber,
      roomNumber: item.roomNumber,
      updatedAt: new Date().toISOString(),
    };

    return participant;
  }

  async update(id: string, item: Partial<TourParticipant>): Promise<TourParticipant> {
    const existingStudent = (await dbService.getAllStudents()).find((s) => s.id === id);
    if (!existingStudent) {
      throw new Error(`Participant with student id ${id} not found.`);
    }

    const updatedStudent: Student = {
      ...existingStudent,
      wave: item.waveId || existingStudent.wave,
      tShirtSize: item.tShirtSize || existingStudent.tShirtSize,
      tShirtDesign: item.tShirtDesign || existingStudent.tShirtDesign,
      waiverType: item.waiverType || existingStudent.waiverType,
      medicalHistory: item.medicalHistory || existingStudent.medicalHistory,
      isRegistered: item.isRegistered ?? existingStudent.isRegistered,
      busNumber: item.busNumber ?? existingStudent.busNumber,
      seatNumber: item.seatNumber ?? existingStudent.seatNumber,
      roomNumber: item.roomNumber ?? existingStudent.roomNumber,
      updatedAt: new Date().toISOString(),
    };

    await dbService.putSingleStudent(updatedStudent);

    return {
      id: updatedStudent.id,
      tourId: updatedStudent.destination || 'TOUR_BALI_2026',
      studentId: updatedStudent.id,
      waveId: updatedStudent.wave || 'BALI_GEL_1',
      tShirtSize: updatedStudent.tShirtSize,
      tShirtDesign: updatedStudent.tShirtDesign,
      waiverType: updatedStudent.waiverType,
      medicalHistory: updatedStudent.medicalHistory,
      isRegistered: updatedStudent.isRegistered,
      busNumber: updatedStudent.busNumber,
      seatNumber: updatedStudent.seatNumber,
      roomNumber: updatedStudent.roomNumber,
      updatedAt: updatedStudent.updatedAt,
    };
  }

  async delete(id: string): Promise<boolean> {
    await dbService.deleteStudent(id);
    return true;
  }
}

export const TourParticipantRepository = new TourParticipantRepositoryImpl();
