import { Student, Bus, WaveType, AppSettings, SchoolClass, GenderType } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';
import { getAllDerivedChaperones, WaveChaperoneItem, deriveAutoChaperoneRooms } from '@/lib/utils';
import { SeatAllocatorEngine } from '@/services/seatAllocator';

export interface ChaperoneItem {
  id: string;
  name: string;
  role?: string;
  gender?: GenderType;
  department?: string;
}

export function calculateWaveMetrics(
  tourStudents: Student[],
  waveOrBuses: WaveType | Bus[],
  totalBusesOrWave?: number | WaveType
) {
  let selectedWave: WaveType = 'BALI_GEL_2';
  let totalBuses = 0;

  if (typeof waveOrBuses === 'string') {
    selectedWave = waveOrBuses as WaveType;
    totalBuses = typeof totalBusesOrWave === 'number' ? totalBusesOrWave : 0;
  } else if (Array.isArray(waveOrBuses)) {
    totalBuses = waveOrBuses.length;
    selectedWave = (typeof totalBusesOrWave === 'string' ? totalBusesOrWave : 'BALI_GEL_2') as WaveType;
  }

  const inWave = (tourStudents || []).filter((s) => s && s.wave === selectedWave);
  const seated = inWave.filter((s) => s.busNumber && s.busNumber > 0 && s.seatNumber && s.seatNumber > 0);
  const unseated = inWave.filter((s) => !s.seatNumber || s.seatNumber === 0);
  const male = inWave.filter((s) => s.gender === 'LAKI-LAKI');
  const female = inWave.filter((s) => s.gender === 'PEREMPUAN');

  return {
    totalStudents: inWave.length,
    seatedCount: seated.length,
    unseatedCount: unseated.length,
    maleCount: male.length,
    femaleCount: female.length,
    totalBuses,
    occupancyPercentage: inWave.length > 0 ? Math.round((seated.length / inWave.length) * 100) : 0,
  };
}

export function calculateBusMetrics(
  studentsOrTourList: Student[],
  busOrCapacity: Bus | number,
  selectedWave?: WaveType
) {
  let busStudents: Student[] = [];
  let capacity = 50;

  if (typeof busOrCapacity === 'number') {
    busStudents = studentsOrTourList || [];
    capacity = busOrCapacity;
  } else if (busOrCapacity && typeof busOrCapacity === 'object') {
    const bus = busOrCapacity as Bus;
    const wave = selectedWave || bus.wave;
    busStudents = (studentsOrTourList || []).filter(
      (s) => s && s.wave === wave && s.busNumber === bus.busNumber
    );
    capacity = bus.capacity || 50;
  }

  const seated = busStudents.filter((s) => s.seatNumber && s.seatNumber > 0);
  const unseated = busStudents.filter((s) => !s.seatNumber || s.seatNumber === 0);
  const male = seated.filter((s) => s.gender === 'LAKI-LAKI');
  const female = seated.filter((s) => s.gender === 'PEREMPUAN');
  const remaining = Math.max(0, capacity - seated.length);

  return {
    totalAssigned: busStudents.length,
    seatedCount: seated.length,
    unseatedCount: unseated.length,
    maleCount: male.length,
    femaleCount: female.length,
    capacity,
    remainingSeats: remaining,
  };
}

export function checkIsSeatVacated(seatNum: number, settings?: AppSettings, wave?: string, busNum?: number): boolean {
  if (settings && wave && busNum) {
    const keys = [
      `${wave}_bus-${busNum}_seat-${seatNum}`,
      `${wave}-bus-${busNum}-seat-${seatNum}`,
      `bus-${wave}-${busNum}_seat-${seatNum}`,
      `bus-${busNum}_seat-${seatNum}`,
      `seat-${seatNum}`,
    ];
    for (const k of keys) {
      const val = settings.customChaperoneSeats?.[k];
      if (val !== undefined) {
        if (val === '__STUDENT__' || val === 'STUDENT' || val === '__NONE__' || val === '') {
          return false;
        }
        return true;
      }
    }
  }

  const vacantOption = SeatAllocatorEngine.getSetting(
    settings,
    (wave || 'BALI_GEL_1') as WaveType,
    'busVacantSeats',
    settings?.busVacantSeats || (settings?.busReserveFront !== false ? '1-2' : 'none')
  );

  if (vacantOption === 'none') return false;
  if (vacantOption === '1-4') return seatNum >= 1 && seatNum <= 4;
  return seatNum === 1 || seatNum === 2;
}

export function resolveSeatChaperoneName(
  seatNum: number,
  bus?: Bus,
  allChaperones: ChaperoneItem[] = [],
  settings?: AppSettings,
  seatStudentMap?: Map<number, Student>
): string {
  if (!bus) return '';

  const getChaperoneName = (chaperoneIdOrName?: string, defaultName?: string) => {
    if (!chaperoneIdOrName) return defaultName || '';
    const found = allChaperones.find((c) => c.id === chaperoneIdOrName || c.name === chaperoneIdOrName);
    if (found) return found.name;
    return chaperoneIdOrName;
  };

  const keys = [
    `${bus.wave}_bus-${bus.busNumber}_seat-${seatNum}`,
    `${bus.wave}-bus-${bus.busNumber}-seat-${seatNum}`,
    `bus-${bus.wave}-${bus.busNumber}_seat-${seatNum}`,
    `bus-${bus.busNumber}_seat-${seatNum}`,
    `seat-${seatNum}`,
  ];

  for (const k of keys) {
    const customVal = settings?.customChaperoneSeats?.[k];
    if (customVal !== undefined) {
      if (customVal === '__STUDENT__' || customVal === 'STUDENT' || customVal === '__NONE__' || customVal === '') {
        return '';
      }
      return getChaperoneName(customVal);
    }
  }

  if (seatStudentMap && seatStudentMap.has(seatNum)) {
    return '';
  }

  const customGuideForBus = settings?.customBusGuides?.[bus.id];
  const localGuide1 = getChaperoneName(customGuideForBus?.guide1) || getChaperoneName(bus.guide1) || 'Pendamping 1';
  const localGuide2 = getChaperoneName(customGuideForBus?.guide2) || getChaperoneName(bus.guide2) || 'Pendamping 2';
  const localGuide3 = getChaperoneName(customGuideForBus?.guide3) || getChaperoneName(bus.guide3) || 'Pendamping 3';
  const localGuide4 = getChaperoneName(customGuideForBus?.guide4) || getChaperoneName(bus.guide4) || 'Pendamping 4';

  if (checkIsSeatVacated(seatNum, settings, bus.wave, bus.busNumber)) {
    if (seatNum === 1) return localGuide1;
    if (seatNum === 2) return localGuide2;
    if (seatNum === 3) return localGuide3;
    if (seatNum === 4) return localGuide4;
    return 'Pendamping';
  }
  return '';
}

export function getBusChaperoneName(
  seatNum: number,
  bus: Bus,
  seatStudentMap: Map<number, Student>,
  settings?: AppSettings,
  allChaperones: ChaperoneItem[] = []
): string {
  return resolveSeatChaperoneName(seatNum, bus, allChaperones, settings, seatStudentMap);
}

export function resolveSeatChaperoneInfo(
  seatNum: number,
  bus?: Bus,
  allChaperones: ChaperoneItem[] = [],
  settings?: AppSettings,
  seatStudentMap?: Map<number, Student>,
  waveChaperones: WaveChaperoneItem[] = []
): { name: string; roomNumber?: number; gender?: GenderType } {
  const name = resolveSeatChaperoneName(seatNum, bus, allChaperones, settings, seatStudentMap);
  if (!name) return { name: '' };

  // Match against waveChaperones or allChaperones to find gender and room
  const found = waveChaperones.find(
    (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim() || c.id === name
  ) || allChaperones.find(
    (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim() || c.id === name
  );

  const gender: GenderType = (found as any)?.gender || 'LAKI-LAKI';

  // Check manual room assignment
  let roomNumber: number | undefined = undefined;
  if (found?.id && settings?.customChaperoneRooms?.[found.id]) {
    roomNumber = settings.customChaperoneRooms[found.id];
  } else if (settings?.customChaperoneRooms?.[name]) {
    roomNumber = settings.customChaperoneRooms[name];
  }

  // If not manually assigned, check derived auto rooms
  if (!roomNumber && waveChaperones.length > 0) {
    const { rooms } = deriveAutoChaperoneRooms({
      waveChaperones,
      customRooms: settings?.customChaperoneRooms,
      capacity: 2,
    });
    for (const r of rooms) {
      if (r.chaperones.some((c) => c.name.toLowerCase().trim() === name.toLowerCase().trim() || c.id === found?.id)) {
        roomNumber = r.displayRoomNumber ?? r.roomNumber;
        break;
      }
    }
  }

  return { name, roomNumber, gender };
}

