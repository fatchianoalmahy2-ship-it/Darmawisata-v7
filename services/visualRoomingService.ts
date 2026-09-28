import { Student, Room, GenderType, WaveType } from '@/types';

export interface RoomDropPayload {
  studentIds: string[];
  sourceRoomNumber?: number | null;
  targetRoomNumber: number;
  targetBedNumber?: number | null;
}

export interface RoomValidationResult {
  isValid: boolean;
  message?: string;
}

export class VisualRoomingService {
  /**
   * Validate if students can be placed in target room
   */
  static validateRoomAssignment(
    studentsToMove: Student[],
    targetRoom: Room,
    existingRoomOccupants: Student[],
    roomCapacity: number
  ): RoomValidationResult {
    if (studentsToMove.length === 0) {
      return { isValid: false, message: 'Tidak ada siswa yang dipilih' };
    }

    // Check capacity
    const availableSlots = roomCapacity - existingRoomOccupants.length;
    if (studentsToMove.length > availableSlots) {
      return {
        isValid: false,
        message: `Kamar #${targetRoom.roomNumber} hanya memiliki ${availableSlots} slot tersisa (mencoba memasukkan ${studentsToMove.length} siswa).`,
      };
    }

    // Check gender consistency
    const invalidGender = studentsToMove.find(
      (s) => s.gender && s.gender !== targetRoom.gender
    );
    if (invalidGender) {
      return {
        isValid: false,
        message: `Siswa "${invalidGender.name}" berjenis kelamin ${invalidGender.gender}, tidak cocok dengan Kamar #${targetRoom.roomNumber} (${targetRoom.gender}).`,
      };
    }

    return { isValid: true };
  }

  /**
   * Execute batch assignment of students to a room
   */
  static async executeBatchRoomAssignment(
    studentIds: string[],
    targetRoomNumber: number | null,
    onUpdateStudentRoom: (studentId: string, targetRoomNumber: number | null, targetBedNumber: number | null) => Promise<void> | void
  ): Promise<void> {
    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i];
      await onUpdateStudentRoom(studentId, targetRoomNumber, targetRoomNumber ? i + 1 : null);
    }
  }

  /**
   * Execute student room swap
   */
  static async executeStudentRoomSwap(
    studentA: Student,
    studentB: Student,
    onSwapStudentRooms: (studentAId: string, studentBId: string) => Promise<void> | void
  ): Promise<void> {
    await onSwapStudentRooms(studentA.id, studentB.id);
  }
}
