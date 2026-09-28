import { SchoolClass, Student, Bus, AppSettings, Chaperone } from '@/types';
import { calculateWaliAllocation, WaliAllocationItem } from './waliAllocation';

export interface ChaperoneAssignmentResult {
  busId: string;
  guide1: string; // id or name
  guide2: string; // id or name
}

export function autoAssignChaperonesToBuses(
  buses: Bus[],
  students: Student[],
  classes: SchoolClass[],
  settings: AppSettings
): ChaperoneAssignmentResult[] {
  // 1. Get Wali allocations (single source of truth)
  const waliAlloc = calculateWaliAllocation(classes, students, settings, 'PERCENTAGE');
  
  // Get VIPs from masterChaperones (Kakomli)
  const masterChaperones = settings.masterChaperones || [];
  const kakomliList = masterChaperones.filter((c) => c.role === 'KAKOMLI');
  
  // Track all assignments to guarantee zero duplicates across all buses & waves
  const assignedIdentifierSet = new Set<string>();
  const busAssignments: Record<string, { guide1: string; guide2: string }> = {};

  for (const b of buses) {
    busAssignments[b.id] = { guide1: '', guide2: '' };
  }

  const addGuideToBus = (busId: string, identifier: string): boolean => {
    if (!identifier || assignedIdentifierSet.has(identifier.toLowerCase().trim())) {
      return false;
    }
    if (!busAssignments[busId].guide1) {
      busAssignments[busId].guide1 = identifier;
      assignedIdentifierSet.add(identifier.toLowerCase().trim());
      return true;
    }
    if (!busAssignments[busId].guide2) {
      busAssignments[busId].guide2 = identifier;
      assignedIdentifierSet.add(identifier.toLowerCase().trim());
      return true;
    }
    return false;
  };

  // Helper to extract major from department name
  const extractMajor = (deptStr: string = '') => {
    return deptStr.toUpperCase().trim();
  };

  // Calculate student count per class and per major for each bus
  const busClassAffinities: Record<string, Record<string, number>> = {};
  const busMajorAffinities: Record<string, Record<string, number>> = {};

  for (const bus of buses) {
    busClassAffinities[bus.id] = {};
    busMajorAffinities[bus.id] = {};

    const busStudents = students.filter(
      (s) => s.isRegistered && s.busNumber === bus.busNumber && s.wave === bus.wave
    );

    for (const s of busStudents) {
      if (!s.className) continue;
      busClassAffinities[bus.id][s.className] = (busClassAffinities[bus.id][s.className] || 0) + 1;

      const cls = classes.find((c) => c.name === s.className);
      const major = extractMajor(cls?.department);
      if (major) {
        busMajorAffinities[bus.id][major] = (busMajorAffinities[bus.id][major] || 0) + 1;
      }
    }
  }

  // -------------------------------------------------------------
  // Phase 1: Assign Kakomli to their Department's First / Majority Bus
  // -------------------------------------------------------------
  for (const kakomli of kakomliList) {
    const kakomliMajor = extractMajor(kakomli.department);
    if (!kakomliMajor) continue;

    // Find all Bali buses that have students from this major, sorted by affinity DESC, then busNumber ASC
    const matchingBuses = buses
      .filter((b) => b.wave.startsWith('BALI') && (!busAssignments[b.id].guide1 || !busAssignments[b.id].guide2))
      .sort((a, b) => {
        const countA = busMajorAffinities[a.id][kakomliMajor] || 0;
        const countB = busMajorAffinities[b.id][kakomliMajor] || 0;
        if (countB !== countA) return countB - countA;
        return a.busNumber - b.busNumber;
      });

    if (matchingBuses.length > 0) {
      addGuideToBus(matchingBuses[0].id, kakomli.id);
    }
  }

  // -------------------------------------------------------------
  // Phase 2: Assign Wali Kelas based on calculated finalStatus & majority
  // -------------------------------------------------------------
  const getWaliIdentifier = (wali: WaliAllocationItem): string => {
    const masterWali = masterChaperones.find(
      (c) =>
        c.role === 'WALI_KELAS' &&
        (c.notes?.includes(wali.className) ||
          c.department === wali.className ||
          c.name.toLowerCase().trim() === wali.homeroomTeacher.toLowerCase().trim())
    );

    if (masterWali) return masterWali.id;

    const clsObj = classes.find((c) => c.name === wali.className);
    if (clsObj) {
      return `chap-wali-auto-${clsObj.id || clsObj.name}`;
    }
    return wali.homeroomTeacher;
  };

  // 2A: Bali Waves (BALI_GEL_1 and BALI_GEL_2)
  const baliWalis = waliAlloc.items.filter(
    (w) => w.finalStatus === 'BALI_GEL_1' || w.finalStatus === 'BALI_GEL_2'
  );

  for (const wali of baliWalis) {
    const targetWave = wali.finalStatus;
    const identifier = getWaliIdentifier(wali);

    const waveBuses = buses.filter(
      (b) => b.wave === targetWave && (!busAssignments[b.id].guide1 || !busAssignments[b.id].guide2)
    );

    if (waveBuses.length === 0) continue;

    // Find bus with the most students from this wali's class
    const sortedBuses = [...waveBuses].sort((a, b) => {
      const aCount = busClassAffinities[a.id][wali.className] || 0;
      const bCount = busClassAffinities[b.id][wali.className] || 0;
      if (bCount !== aCount) return bCount - aCount;
      return a.busNumber - b.busNumber;
    });

    if (sortedBuses.length > 0) {
      addGuideToBus(sortedBuses[0].id, identifier);
    }
  }

  // 2B: Yogyakarta Wave (YOGYAKARTA / YOGYA_GEL_1)
  const yogyaWalis = waliAlloc.items.filter((w) => w.finalStatus === 'YOGYAKARTA');

  for (const wali of yogyaWalis) {
    const identifier = getWaliIdentifier(wali);

    const yogyaBuses = buses.filter(
      (b) =>
        (b.wave === 'YOGYA_GEL_1' || b.wave === 'YOGYAKARTA') &&
        (!busAssignments[b.id].guide1 || !busAssignments[b.id].guide2)
    );

    if (yogyaBuses.length === 0) continue;

    // Find bus with the most students from this wali's class
    const sortedBuses = [...yogyaBuses].sort((a, b) => {
      const aCount = busClassAffinities[a.id][wali.className] || 0;
      const bCount = busClassAffinities[b.id][wali.className] || 0;
      if (bCount !== aCount) return bCount - aCount;
      return a.busNumber - b.busNumber;
    });

    if (sortedBuses.length > 0) {
      addGuideToBus(sortedBuses[0].id, identifier);
    }
  }

  // -------------------------------------------------------------
  // Phase 3: Sisa Wali / Additional Chaperones Distribution
  // -------------------------------------------------------------
  const allEligibleWalis = waliAlloc.items.filter(
    (w) => w.finalStatus !== 'NOT_PARTICIPATING'
  );

  for (const wali of allEligibleWalis) {
    const identifier = getWaliIdentifier(wali);
    if (assignedIdentifierSet.has(identifier.toLowerCase().trim())) {
      continue; // Already assigned to a bus
    }

    // Try finding an empty chaperone seat in the same wave
    const waveName = wali.finalStatus === 'YOGYAKARTA' ? 'YOGYA_GEL_1' : wali.finalStatus;
    const availableBuses = buses.filter(
      (b) =>
        (b.wave === waveName || (wali.finalStatus === 'YOGYAKARTA' && b.wave === 'YOGYAKARTA')) &&
        (!busAssignments[b.id].guide1 || !busAssignments[b.id].guide2)
    );

    if (availableBuses.length > 0) {
      addGuideToBus(availableBuses[0].id, identifier);
    }
  }

  // Compile final results
  const results: ChaperoneAssignmentResult[] = [];
  for (const b of buses) {
    results.push({
      busId: b.id,
      guide1: busAssignments[b.id].guide1 || 'Pendamping Umum',
      guide2: busAssignments[b.id].guide2 || 'Pendamping Umum',
    });
  }

  return results;
}
