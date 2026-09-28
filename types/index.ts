export type DestinationType = 'BALI' | 'YOGYAKARTA' | 'MAGANG';

export type WaveType = 'BALI_GEL_1' | 'BALI_GEL_2' | 'YOGYA_GEL_1';

export type GenderType = 'LAKI-LAKI' | 'PEREMPUAN';

export type TShirtSize = 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL' | '4XL';

export type WaiverType = 'NONE' | '25%' | '50%';

export type UserRole = 'PUBLIC_SISWA' | 'WALI_KELAS' | 'ADMIN';

export type ChaperoneRole = 'WALI_KELAS' | 'KAKOMLI' | 'STAFF' | 'KARYAWAN' | 'PANITIA' | 'MEDIS' | 'TOUR_LEADER' | 'LAINNYA';

export interface Chaperone {
  id: string;
  name: string;
  role: ChaperoneRole;
  department?: string;
  phone?: string;
  notes?: string;
  gender?: GenderType;
  assignedWave?: WaveType | 'ALL';
}

export type MasterChaperone = Chaperone;

export interface AuthUser {
  role: UserRole;
  name: string;
  username?: string;
  assignedClassName?: string;
}

export interface Student {
  id: string;
  nis: string;
  name: string;
  className: string;
  gender: GenderType;
  destination?: DestinationType;
  wave?: WaveType;
  tShirtSize?: TShirtSize;
  tShirtDesign?: 'A' | 'B';
  parentName?: string;
  parentJob?: string;
  parentAddress?: string;
  parentPhone?: string;
  studentPhone?: string;
  address?: string; // Added to fix address errors
  medicalHistory?: string;
  waiverType?: WaiverType;
  busNumber?: number;
  seatNumber?: number;
  roomNumber?: number;
  isRegistered: boolean;
  updatedAt?: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  department: string;
  totalStudents: number;
  homeroomTeacher: string;
  teacherPhone?: string;
  teacherPassword?: string;
  manualWaliDestination?: 'BALI_GEL_1' | 'BALI_GEL_2' | 'YOGYAKARTA' | 'NOT_PARTICIPATING' | 'AUTO';
  manualWaliNotes?: string;
}

export interface Bus {
  id: string;
  busNumber: number;
  wave: WaveType;
  capacity: number;
  guide1: string;
  guide2: string;
  guide3?: string;
  guide4?: string;
  assignedStudentIds: string[];
}

export interface Room {
  id: string;
  roomNumber: number;
  displayRoomNumber?: number;
  gender: GenderType;
  capacity: number;
  wave: WaveType;
  busNumber?: number;
  assignedStudentIds: string[];
}

export interface TourDestinationInfo {
  id: string;
  name: string;
  destination: DestinationType;
  wave: WaveType;
  dates: string;
  price: number;
  formattedPrice: string;
  spots: string[];
}

export interface RundownItem {
  id?: string;
  day: number;
  time: string;
  activity: string;
  location: string;
  notes?: string;
}

export interface AppSettings {
  defaultBusCapacity: number;
  defaultRoomCapacity: number;
  waliKelasParticipationThreshold: number; // percentage, e.g. 75
  schoolName: string;
  schoolAddress: string;
  headmasterName: string;
  travelAgency: string;
  baliGel1Dates: string;
  baliGel2Dates: string;
  yogyaGel1Dates: string;
  baliPrice: number;
  yogyaPrice: number;
  angketDeadline: string;
  isAngketClosed: boolean;
  showAngketSearchButton?: boolean;
  appName?: string;
  appLogoUrl?: string;
  headerLogoUrl?: string;
  tshirtDesignAUrl?: string;
  tshirtDesignBUrl?: string;
  tshirtSectionTitle?: string;
  tshirtDesignATitle?: string;
  tshirtDesignADesc?: string;
  tshirtDesignBTitle?: string;
  tshirtDesignBDesc?: string;
  baliBadge?: string;
  baliTitle?: string;
  baliDesc?: string;
  yogyaBadge?: string;
  yogyaTitle?: string;
  yogyaDesc?: string;
  suratIzinOpeningText?: string;
  suratIzinClosingText?: string;
  autoRecapEnabled?: boolean;
  autoRecapTime?: string; // e.g. "16:00"
  autoRecapTargetGroup?: string;
  autoRecapTargetPhone?: string;
  templateUnregisteredSummary?: string;
  templateClassReminder?: string;
  lastAutoRecapSentAt?: string;
  lastAutoRecapSentStatus?: string;
  lastAutoRecapSentDate?: string;
  stopAutoRecapWhenComplete?: boolean;
  busAllocationRules?: string;
  roomAllocationRules?: string;
  totalGelombangBali?: number;
  showWaliParticipationStatusInPortal?: boolean;
  waliQuotaMode?: 'auto' | 'manual';
  customQuotaWaliYogya?: number;
  customQuotaWaliBali?: number;
  customWaliDestinations?: { [classId: string]: { destination: 'AUTO' | 'BALI_GEL_1' | 'BALI_GEL_2' | 'YOGYAKARTA' | 'NOT_PARTICIPATING'; notes?: string } };
  customBusGuides?: { [busId: string]: { guide1: string; guide2: string; guide3?: string; guide4?: string } };
  customChaperoneSeats?: { [key: string]: string };
  whatsappMode?: 'direct' | 'gateway';
  whatsappGatewayUrl?: string;
  whatsappGatewayToken?: string;
  masterChaperones?: Chaperone[];
  waveBaliGel1Majors?: string[];
  waveBaliGel2Majors?: string[];
  waveYogyaGel1Majors?: string[];
  waveDistributionMode?: 'auto-even' | 'major-based';
  busGroupMethod?: 'class' | 'department';
  busSeatSort?: 'name' | 'nis';
  busReserveFront?: boolean;
  busVacantSeats?: 'none' | '1-2' | '1-4';
  busGenderPriority?: 'none' | 'female-front' | 'male-front';
  busAutoCreateEnabled?: boolean;
  busPriorityByMajorSize?: boolean;
  busMajorSortMode?: 'custom' | 'size' | 'alphabet';
  customMajorOrder?: string[];
  busMajorSortModeBali?: 'custom' | 'size' | 'alphabet';
  busMajorSortModeYogya?: 'custom' | 'size' | 'alphabet';
  customMajorOrderBali?: string[];
  customMajorOrderYogya?: string[];
  busFemaleArrangement?: 'class' | 'segregated';
  busStrictOddPairing?: boolean;
  busNumberingMode?: 'per-wave' | 'global';
  seatPackingStrategy?: 'compact' | 'standard';
  busGendersNoMixBench?: boolean;
  preventMixedGenderBench?: boolean;
  busFillOddSeatsTail?: boolean;
  roomGroupMethod?: 'class' | 'department';
  roomFillMax?: boolean;
  roomOptimizeCascade?: boolean;
  hideBusMenu?: boolean;
  hideKamarMenu?: boolean;
  lockBusAndRoomForWali?: boolean;
  defaultTourDestination?: DestinationType; // e.g. 'BALI' or 'YOGYAKARTA'
  lockDestinationForStudents?: boolean; // When true, destination selection is locked to defaultTourDestination and hidden/disabled for students and homeroom teachers (Wali)
  waveBusSettings?: {
    [waveId: string]: {
      defaultBusCapacity?: number;
      busGroupMethod?: 'class' | 'department';
      busSeatSort?: 'name' | 'nis';
      busReserveFront?: boolean;
      busVacantSeats?: 'none' | '1-2' | '1-4';
      busGenderPriority?: 'none' | 'female-front' | 'male-front';
      busAutoCreateEnabled?: boolean;
      busFemaleArrangement?: 'class' | 'segregated';
      busStrictOddPairing?: boolean;
      busNumberingMode?: 'per-wave' | 'global';
      seatPackingStrategy?: 'compact' | 'standard';
      busGendersNoMixBench?: boolean;
      busFillOddSeatsTail?: boolean;
    }
  };
  waveRoomSettings?: {
    [waveId: string]: {
      defaultRoomCapacity?: number;
      roomGroupMethod?: 'class' | 'department';
      roomFillMax?: boolean;
      roomOptimizeCascade?: boolean;
    }
  };
}

export interface ActivityLog {
  id: string;
  action: 'ADD' | 'DELETE' | 'UPDATE' | 'BULK_IMPORT' | 'CLEAR';
  nis?: string;
  name?: string;
  className?: string;
  operator: string;
  details: string;
  timestamp: string;
}

export interface WaliKelasSummary {
  className: string;
  teacherName: string;
  totalStudents: number;
  participatingStudents: number;
  percentage: number;
  isEligible: boolean;
  baliCount: number;
  yogyaCount: number;
  unassignedCount: number;
}

export interface SyncTask {
  id: string;
  action: string;
  payload: any;
  timestamp: number;
}

export interface AdminCredentials {
  username: string;
  password: string;
  name: string;
}

// ==========================================
// DECOUPLED MASTER DATA & TOUR ENTITY TYPES
// ==========================================

export interface MasterDepartment {
  id: string;
  code: string;
  name: string;
  headTeacherId?: string;
  description?: string;
}

export interface MasterClass {
  id: string;
  name: string;
  departmentId: string;
  departmentCode: string;
  academicYear: string;
  homeroomTeacherId?: string;
  homeroomTeacherName: string;
  teacherPhone?: string;
  totalStudents?: number;
}

export interface MasterStudent {
  id: string;
  nis: string;
  nisn?: string;
  name: string;
  gender: GenderType;
  classId: string;
  className: string;
  departmentCode?: string;
  studentPhone?: string;
  address?: string;
  parentName?: string;
  parentJob?: string;
  parentPhone?: string;
}

export interface MasterTeacher {
  id: string;
  nip?: string;
  name: string;
  gender: GenderType;
  defaultRole: ChaperoneRole;
  departmentId?: string;
  phone?: string;
  notes?: string;
}

export interface TourEvent {
  id: string;
  title: string;
  destination: DestinationType;
  academicYear: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
}

export interface TourWave {
  id: string;
  tourId: string;
  waveCode: WaveType;
  name: string;
  defaultBusCapacity: number;
  busVacantSeats?: 'none' | '1-2' | '1-4';
  genderPriority?: 'none' | 'female-front' | 'male-front';
}

export interface TourParticipant {
  id: string;
  tourId: string;
  studentId: string;
  waveId: WaveType;
  tShirtSize?: TShirtSize;
  tShirtDesign?: 'A' | 'B';
  waiverType?: WaiverType;
  medicalHistory?: string;
  isRegistered: boolean;
  busNumber?: number;
  seatNumber?: number;
  roomNumber?: number;
  updatedAt?: string;
}

export interface TourChaperoneAssignment {
  id: string;
  tourId: string;
  waveId: WaveType | 'ALL';
  teacherId: string;
  assignedRole: ChaperoneRole;
  assignedBusNumber?: number;
}

