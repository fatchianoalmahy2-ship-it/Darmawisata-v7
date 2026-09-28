import { Student, Bus, Room } from '@/types';

export interface StudentStatistics {
  total: number;
  participating: number;
  notParticipating: number;
  internship: number;
  undecided: number;
  male: number;
  female: number;
  allocatedBus: number;
  unallocatedBus: number;
  allocatedRoom: number;
  unallocatedRoom: number;
  percentageParticipating: number;
}

export class DataAggregatorService {
  /**
   * Calculates comprehensive student statistics
   */
  public static calculateStudentStats(students: Student[]): StudentStatistics {
    const total = students.length;
    let participating = 0;
    let notParticipating = 0;
    let internship = 0;
    let undecided = 0;
    let male = 0;
    let female = 0;
    let allocatedBus = 0;
    let allocatedRoom = 0;

    for (let i = 0; i < total; i++) {
      const s = students[i];
      const status = s.status || 'BELUM_ISI';
      if (status === 'BERANGKAT') participating++;
      else if (status === 'TIDAK_IKUT') notParticipating++;
      else if (status === 'MAGANG') internship++;
      else undecided++;

      if (s.gender === 'LAKI_LAKI') male++;
      else if (s.gender === 'PEREMPUAN') female++;

      if (s.busNumber && s.busNumber > 0) allocatedBus++;
      if (s.roomNumber && s.roomNumber.trim().length > 0) allocatedRoom++;
    }

    const percentageParticipating = total > 0 ? Math.round((participating / total) * 100) : 0;

    return {
      total,
      participating,
      notParticipating,
      internship,
      undecided,
      male,
      female,
      allocatedBus,
      unallocatedBus: participating - allocatedBus,
      allocatedRoom,
      unallocatedRoom: participating - allocatedRoom,
      percentageParticipating,
    };
  }

  /**
   * Filters students according to standard criteria
   */
  public static filterStudents(
    students: Student[],
    criteria: {
      wave?: string;
      gender?: string;
      busNumber?: number | 'ALL';
      className?: string | 'ALL';
      status?: string | 'ALL';
      search?: string;
    }
  ): Student[] {
    const { wave, gender, busNumber, className, status, search } = criteria;
    const searchLower = search?.toLowerCase().trim();

    return students.filter((st) => {
      if (wave && wave !== 'ALL' && st.wave !== wave) return false;
      if (gender && gender !== 'ALL' && st.gender !== gender) return false;
      if (busNumber !== undefined && busNumber !== 'ALL') {
        if (busNumber === 0 && st.busNumber) return false;
        if (busNumber > 0 && st.busNumber !== busNumber) return false;
      }
      if (className && className !== 'ALL' && st.className !== className) return false;
      if (status && status !== 'ALL' && st.status !== status) return false;
      if (searchLower) {
        const matchesName = st.name.toLowerCase().includes(searchLower);
        const matchesNis = st.nis.toLowerCase().includes(searchLower);
        const matchesClass = st.className.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesNis && !matchesClass) return false;
      }
      return true;
    });
  }
}
