import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Student, AppSettings, SchoolClass, WaveType, MasterChaperone, ChaperoneRole, GenderType, Bus } from "@/types"

export interface WaveChaperoneItem {
  id: string;
  name: string;
  role: string;
  gender: GenderType;
  department?: string;
  phone?: string;
  busNumber?: number;
  assignedSeat?: string;
  isAutoSynced?: boolean;
}

export function getAllDerivedChaperones(
  param1?: MasterChaperone[] | SchoolClass[] | AppSettings,
  param2?: SchoolClass[] | AppSettings | MasterChaperone[]
): (MasterChaperone & { isAutoSynced?: boolean })[] {
  let masterChaperones: MasterChaperone[] = [];
  let classes: SchoolClass[] = [];

  const processArg = (arg: any) => {
    if (!arg) return;
    if (Array.isArray(arg)) {
      if (arg.length === 0) return;
      // Check if it's SchoolClass array or MasterChaperone array
      const first = arg[0];
      if (first && ('homeroomTeacher' in first || 'isCustom' in first || (!('role' in first) && 'name' in first && !('notes' in first)))) {
        classes = arg as SchoolClass[];
      } else {
        masterChaperones = arg as MasterChaperone[];
      }
    } else if (typeof arg === 'object') {
      // It's AppSettings
      if (Array.isArray(arg.masterChaperones)) {
        masterChaperones = arg.masterChaperones;
      }
    }
  };

  processArg(param1);
  processArg(param2);

  // Fallbacks if one was an array of classes and the other was settings
  if (Array.isArray(param1) && !classes.length && param1.some((x: any) => x && ('homeroomTeacher' in x || 'name' in x))) {
    classes = param1 as SchoolClass[];
  }
  if (Array.isArray(param2) && !classes.length && param2.some((x: any) => x && ('homeroomTeacher' in x || 'name' in x))) {
    classes = param2 as SchoolClass[];
  }

  const list = (Array.isArray(masterChaperones) ? masterChaperones : []).map(c => ({ ...c, isAutoSynced: false }));
  const existingNames = new Set(list.map(c => (c.name || '').toLowerCase().trim()));
  
  if (Array.isArray(classes)) {
    classes.forEach(cls => {
      if (cls && cls.homeroomTeacher && cls.homeroomTeacher.trim()) {
        const teacherName = cls.homeroomTeacher.trim();
        if (!existingNames.has(teacherName.toLowerCase())) {
          existingNames.add(teacherName.toLowerCase());
          list.push({
            id: `chap-wali-auto-${cls.id || cls.name}`,
            name: teacherName,
            role: 'WALI_KELAS' as ChaperoneRole,
            department: cls.name,
            phone: cls.teacherPhone || '',
            notes: `Sinkron Otomatis Wali Kelas ${cls.name}`,
            gender: 'LAKI-LAKI',
            isAutoSynced: true
          } as any);
        }
      }
    });
  }
  
  return list;
}

export function getWaveChaperones(params: {
  settings?: AppSettings;
  buses: Bus[];
  classes: SchoolClass[];
  students: Student[];
  selectedWave: WaveType | 'ALL';
}): WaveChaperoneItem[] {
  const { settings, buses = [], classes = [], students = [], selectedWave } = params;
  const list: WaveChaperoneItem[] = [];
  const masterChaperones = settings?.masterChaperones || [];
  const customChaperoneSeats = settings?.customChaperoneSeats || {};
  const customBusGuides = settings?.customBusGuides || {};

  // All derived chaperones (from master + auto homeroom teachers)
  const allDerived = getAllDerivedChaperones(masterChaperones, classes);

  // 1. Identify which classes belong to this wave
  const waveClasses = classes.filter((c) => {
    return students.some(
      (s) => s.className === c.name && (selectedWave === 'ALL' || s.wave === selectedWave) && s.isRegistered
    );
  });

  // 2. Collect buses in this wave
  const waveBusesList = buses.filter((b) => selectedWave === 'ALL' || b.wave === selectedWave);
  const busGuideMap = new Map<string, number>(); // identifier (lower) -> busNumber
  const assignedIdentifiers = new Set<string>();

  // A. From bus guides (guide1..4 and customBusGuides)
  waveBusesList.forEach((b) => {
    const customForBus = customBusGuides[b.id];
    const g1 = customForBus?.guide1 || b.guide1;
    const g2 = customForBus?.guide2 || b.guide2;
    const g3 = customForBus?.guide3 || b.guide3;
    const g4 = customForBus?.guide4 || b.guide4;

    [g1, g2, g3, g4].forEach((g) => {
      if (g && g.trim() && g !== 'Pendamping 1' && g !== 'Pendamping 2' && g !== 'Pendamping 3' && g !== 'Pendamping 4') {
        const idLower = g.toLowerCase().trim();
        assignedIdentifiers.add(idLower);
        busGuideMap.set(idLower, b.busNumber);

        // Also normalize (strip "(Jurusan)" suffix if any)
        const cleanName = g.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
        if (cleanName) {
          assignedIdentifiers.add(cleanName);
          if (!busGuideMap.has(cleanName)) busGuideMap.set(cleanName, b.busNumber);
        }
      }
    });
  });

  // B. From customChaperoneSeats in settings: key `${wave}_bus-${busNum}_seat-${seatNum}`
  Object.entries(customChaperoneSeats).forEach(([key, val]) => {
    if (!val || val === '__STUDENT__' || val === '__NONE__' || val === '') return;
    
    // Check if key belongs to this wave
    let belongsToWave = selectedWave === 'ALL';
    let busNum: number | undefined = undefined;

    if (!belongsToWave && selectedWave) {
      if (key.startsWith(selectedWave)) {
        belongsToWave = true;
      }
    }
    
    // Extract bus number from key
    const busMatch = key.match(/bus-(\d+)/i);
    if (busMatch) {
      busNum = parseInt(busMatch[1], 10);
    }

    if (belongsToWave) {
      const valLower = val.toLowerCase().trim();
      assignedIdentifiers.add(valLower);
      if (busNum && !busGuideMap.has(valLower)) {
        busGuideMap.set(valLower, busNum);
      }

      // Also normalize name
      const cleanName = val.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
      if (cleanName) {
        assignedIdentifiers.add(cleanName);
        if (busNum && !busGuideMap.has(cleanName)) busGuideMap.set(cleanName, busNum);
      }
    }
  });

  // 3. Match from allDerived (Master Chaperones + Auto Synced Wali Kelas)
  // STRICT RULE: ONLY include chaperones who have an assigned bus/seat on this wave!
  const addedIds = new Set<string>();
  const addedNames = new Set<string>();

  allDerived.forEach((c) => {
    const idLower = c.id.toLowerCase().trim();
    const nameLower = c.name.toLowerCase().trim();
    const cleanNameLower = c.name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();

    // Check if chaperone is strictly on a bus in this wave
    const isAssignedToBus =
      assignedIdentifiers.has(idLower) ||
      assignedIdentifiers.has(nameLower) ||
      assignedIdentifiers.has(cleanNameLower);

    if (isAssignedToBus && !addedIds.has(idLower) && !addedNames.has(nameLower)) {
      addedIds.add(idLower);
      addedNames.add(nameLower);

      const busNum = busGuideMap.get(idLower) || busGuideMap.get(nameLower) || busGuideMap.get(cleanNameLower);

      list.push({
        id: c.id,
        name: c.name,
        role: c.role,
        gender: (c.gender as GenderType) || 'LAKI-LAKI',
        department: c.department,
        phone: c.phone,
        busNumber: busNum,
        isAutoSynced: (c as any).isAutoSynced,
      });
    }
  });

  // 4. Fallback for any assignedIdentifiers that were not in allDerived but are seated on a bus
  assignedIdentifiers.forEach((ident) => {
    if (!ident || addedNames.has(ident) || addedIds.has(ident)) return;
    
    // Check if it's already represented in list
    const exists = list.some(
      (item) => item.name.toLowerCase().trim() === ident || item.id.toLowerCase().trim() === ident
    );
    if (!exists) {
      const clsObj = waveClasses.find((c) => c.homeroomTeacher?.toLowerCase().trim() === ident);
      const busNum = busGuideMap.get(ident);
      const cleanDisplay = ident.replace(/\b\w/g, (l) => l.toUpperCase());

      addedNames.add(ident);
      list.push({
        id: `chap-auto-${ident.replace(/\s+/g, '-')}`,
        name: cleanDisplay,
        role: clsObj ? 'WALI_KELAS' : 'LAINNYA',
        gender: 'LAKI-LAKI',
        department: clsObj?.name,
        busNumber: busNum,
        isAutoSynced: true,
      });
    }
  });

  return list;
}

export interface DerivedChaperoneRoom {
  roomNumber: number;
  displayRoomNumber?: number;
  busNumber?: number;
  gender: GenderType;
  chaperones: WaveChaperoneItem[];
}

export function deriveAutoChaperoneRooms(params: {
  waveChaperones: WaveChaperoneItem[];
  customRooms?: Record<string, number>;
  capacity?: number;
}): {
  rooms: DerivedChaperoneRoom[];
  effectiveCustomRooms: Record<string, number>;
} {
  const { waveChaperones = [], customRooms = {}, capacity = 2 } = params;
  const roomsMap = new Map<number, DerivedChaperoneRoom>();
  const effectiveCustomRooms: Record<string, number> = { ...customRooms };
  const usedRoomNumbers = new Set<number>();

  // 1. Process explicit manual custom room assignments with strict gender check
  waveChaperones.forEach((c) => {
    const manualNum = customRooms[c.id] ?? (customRooms[c.name] as number | undefined);
    if (manualNum !== undefined && manualNum > 0) {
      const cGender = c.gender || 'LAKI-LAKI';
      usedRoomNumbers.add(manualNum);
      if (!roomsMap.has(manualNum)) {
        roomsMap.set(manualNum, {
          roomNumber: manualNum,
          gender: cGender,
          busNumber: c.busNumber,
          chaperones: [],
        });
      }
      const targetRoom = roomsMap.get(manualNum)!;
      // Never allow mixed gender in manual assignment
      if (targetRoom.gender === cGender && targetRoom.chaperones.length < capacity) {
        targetRoom.chaperones.push(c);
        if (c.busNumber && !targetRoom.busNumber) {
          targetRoom.busNumber = c.busNumber;
        }
      }
    }
  });

  // Room numbering sequence: Chaperone rooms start at 101
  let nextChaperoneRoomNum = 101;
  const getNextRoomNumber = () => {
    while (usedRoomNumbers.has(nextChaperoneRoomNum)) {
      nextChaperoneRoomNum++;
    }
    usedRoomNumbers.add(nextChaperoneRoomNum);
    return nextChaperoneRoomNum;
  };

  // Find chaperones who are not yet placed in a room
  const isChaperoneAssigned = (c: WaveChaperoneItem) => {
    for (const r of roomsMap.values()) {
      if (r.chaperones.some((chap) => chap.id === c.id || chap.name === c.name)) {
        return true;
      }
    }
    return false;
  };

  const unassigned = waveChaperones.filter((c) => !isChaperoneAssigned(c));

  // 2. STRICT GENDER-FIRST PARTITION
  // Tier 1: Separate Females and Males completely
  const genderPools: { gender: GenderType; items: WaveChaperoneItem[] }[] = [
    { gender: 'PEREMPUAN', items: unassigned.filter((c) => c.gender === 'PEREMPUAN') },
    { gender: 'LAKI-LAKI', items: unassigned.filter((c) => c.gender !== 'PEREMPUAN') },
  ];

  genderPools.forEach(({ gender, items }) => {
    if (items.length === 0) return;

    // Group items of this gender by busNumber
    const busGroups = new Map<number, WaveChaperoneItem[]>();
    items.forEach((c) => {
      const bNum = c.busNumber && c.busNumber > 0 ? c.busNumber : 0;
      if (!busGroups.has(bNum)) {
        busGroups.set(bNum, []);
      }
      busGroups.get(bNum)!.push(c);
    });

    const genderLeftovers: WaveChaperoneItem[] = [];

    // Step A: Fill existing partially-full rooms of the same gender and same bus
    busGroups.forEach((chaps, bNum) => {
      let pool = [...chaps];
      if (bNum > 0) {
        for (const r of roomsMap.values()) {
          if (r.gender === gender && r.busNumber === bNum && r.chaperones.length < capacity) {
            while (r.chaperones.length < capacity && pool.length > 0) {
              const placed = pool.shift()!;
              r.chaperones.push(placed);
              effectiveCustomRooms[placed.id] = r.roomNumber;
            }
          }
          if (pool.length === 0) break;
        }
      }

      // Step B: Form full rooms (capacity = 2) within this same bus
      const fullRoomCount = Math.floor(pool.length / capacity);
      for (let i = 0; i < fullRoomCount; i++) {
        const roomChaps = pool.slice(i * capacity, (i + 1) * capacity);
        const newNum = getNextRoomNumber();
        roomsMap.set(newNum, {
          roomNumber: newNum,
          gender,
          busNumber: bNum > 0 ? bNum : undefined,
          chaperones: roomChaps,
        });
        roomChaps.forEach((c) => {
          effectiveCustomRooms[c.id] = newNum;
        });
      }

      const remainder = pool.slice(fullRoomCount * capacity);
      if (remainder.length > 0) {
        genderLeftovers.push(...remainder);
      }
    });

    // Step C: Pair leftovers of the SAME gender across adjacent buses (strictly same gender!)
    genderLeftovers.sort((a, b) => (a.busNumber || 0) - (b.busNumber || 0));

    // Try placing leftovers into any existing room of the same gender that has space
    const finalLeftovers: WaveChaperoneItem[] = [];
    genderLeftovers.forEach((chap) => {
      let placed = false;
      for (const r of roomsMap.values()) {
        if (r.gender === gender && r.chaperones.length < capacity) {
          r.chaperones.push(chap);
          effectiveCustomRooms[chap.id] = r.roomNumber;
          placed = true;
          break;
        }
      }
      if (!placed) {
        finalLeftovers.push(chap);
      }
    });

    // Form rooms from remaining single leftovers of the SAME gender
    while (finalLeftovers.length > 0) {
      const roomChaps = finalLeftovers.splice(0, capacity);
      const newNum = getNextRoomNumber();
      const primaryBus = roomChaps.find((c) => c.busNumber && c.busNumber > 0)?.busNumber;
      roomsMap.set(newNum, {
        roomNumber: newNum,
        gender,
        busNumber: primaryBus,
        chaperones: roomChaps,
      });
      roomChaps.forEach((c) => {
        effectiveCustomRooms[c.id] = newNum;
      });
    }
  });

  // Sort rooms: Females first, then Males; sorted by room number
  const sortedRooms = Array.from(roomsMap.values()).sort((a, b) => {
    if (a.gender !== b.gender) {
      return a.gender === 'PEREMPUAN' ? -1 : 1;
    }
    return a.roomNumber - b.roomNumber;
  });

  sortedRooms.forEach((r, idx) => {
    r.displayRoomNumber = idx + 1;
  });

  return {
    rooms: sortedRooms,
    effectiveCustomRooms,
  };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWhatsAppLink(phone?: string, text?: string): string {
  if (!phone) return "";
  // Strip all non-digit characters
  let clean = phone.replace(/\D/g, "");
  // Replace leading 0 with 62
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  } else if (clean.startsWith("8")) {
    clean = "628" + clean.slice(1);
  } else if (!clean.startsWith("62") && clean.length > 0) {
    clean = "62" + clean;
  }
  
  const encodedText = text ? encodeURIComponent(text) : "";
  return `https://wa.me/${clean}${encodedText ? `?text=${encodedText}` : ""}`;
}

export interface ParsedClassDetails {
  grade: number;
  department: string;
  sectionNumber: number;
  canonicalName: string;
}

export function parseClassDetails(className?: string): ParsedClassDetails {
  if (!className) {
    return { grade: 12, department: '', sectionNumber: 1, canonicalName: 'XII' };
  }

  const raw = className.trim();
  // Match grade: XII, XI, X or 12, 11, 10
  let grade = 12;
  if (/^(XI|11)\b/i.test(raw)) grade = 11;
  else if (/^(X|10)\b/i.test(raw)) grade = 10;
  else grade = 12;

  // Extract department
  const dept = getDepartmentFromClassName(raw);

  // Extract section / rombel number (e.g. from "XII TKR 4", "XII TPL2", "TKR-4", "XII TKR.4")
  const numMatch = raw.match(/(?:XII|XI|X|\d+)?\s*(?:[A-Za-z]+)?\s*[\.\-_]?\s*(\d+)$/);
  let sectionNumber = 1;
  if (numMatch && numMatch[1]) {
    sectionNumber = parseInt(numMatch[1], 10);
  } else {
    // Try finding any trailing number
    const anyNumMatch = raw.match(/(\d+)\s*$/);
    if (anyNumMatch && anyNumMatch[1]) {
      sectionNumber = parseInt(anyNumMatch[1], 10);
    }
  }

  const gradeRoman = grade === 10 ? 'X' : grade === 11 ? 'XI' : 'XII';
  const canonicalName = dept ? `${gradeRoman} ${dept} ${sectionNumber}` : normalizeClassName(raw);

  return {
    grade,
    department: dept,
    sectionNumber,
    canonicalName,
  };
}

export function normalizeClassName(className?: string): string {
  if (!className) return 'XII';
  let trimmed = className.trim();
  if (!trimmed.toUpperCase().startsWith('XII')) {
    trimmed = `XII ${trimmed}`;
  } else if (/^XII[A-Za-z0-9]/i.test(trimmed)) {
    trimmed = 'XII ' + trimmed.slice(3).trim();
  }
  return trimmed;
}

export function sortClassesAlphabetically<T extends { name: string }>(classesList: T[]): T[] {
  if (!classesList || !Array.isArray(classesList)) return [];
  return [...classesList]
    .map((c) => ({
      ...c,
      name: normalizeClassName(c.name),
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
}

export function getDepartmentFromClassName(className?: string): string {
  if (!className) return '';
  const cleanName = className.toUpperCase().replace(/[._-]/g, ' ').trim();
  if (/\b(TBKR|TBO)\b/.test(cleanName) || cleanName.includes('BODI KENDARAAN') || cleanName.includes('BODI OTOMOTIF') || cleanName.includes('BODI')) return 'TBKR';
  if (/\b(TKRO|TKR)\b/.test(cleanName) || cleanName.includes('KENDARAAN RINGAN') || cleanName.includes('OTOMOTIF')) return 'TKR';
  if (/\bTAB\b/.test(cleanName) || cleanName.includes('ALAT BERAT')) return 'TAB';
  if (/\bTPM\b/.test(cleanName) || cleanName.includes('PEMESINAN') || cleanName.includes('MESIN')) return 'TPM';
  if (/\bTPL\b/.test(cleanName) || cleanName.includes('PENGELASAN') || cleanName.includes('LAS')) return 'TPL';
  if (/\b(TBSM|TSM)\b/.test(cleanName) || cleanName.includes('SEPEDA MOTOR') || cleanName.includes('MOTOR')) return 'TBSM';
  if (/\bTKJ\b/.test(cleanName) || cleanName.includes('KOMPUTER JARINGAN') || cleanName.includes('JARINGAN')) return 'TKJ';
  if (/\bRPL\b/.test(cleanName) || cleanName.includes('PERANGKAT LUNAK') || cleanName.includes('SOFTWARE')) return 'RPL';
  if (/\b(DKV|MM)\b/.test(cleanName) || cleanName.includes('KOMUNIKASI VISUAL') || cleanName.includes('MULTIMEDIA')) return 'DKV';
  if (/\b(ATPH|AP|AT)\b/.test(cleanName) || cleanName.includes('PERTANIAN') || cleanName.includes('AGRIBISNIS')) return 'ATPH';
  if (/\b(AKL|AK)\b/.test(cleanName) || cleanName.includes('AKUNTANSI')) return 'AKL';
  if (/\b(OTKP)\b/.test(cleanName) || cleanName.includes('PERKANTORAN')) return 'OTKP';

  const words = cleanName.replace(/^(XII|XI|X)\s+/, '').split(/\s+/);
  if (words.length > 0 && words[0]) {
    return words[0];
  }
  return '';
}

export function getFullDepartmentFromClassName(className?: string): string {
  if (!className) return '';
  const cleanName = className.toUpperCase().trim();
  const abbrev = getAbbreviationFromDepartment(cleanName) || getDepartmentFromClassName(className);
  if (abbrev) {
    const mappings: { [key: string]: string } = {
      'TKR': 'TKR (Teknik Kendaraan Ringan)',
      'TKRO': 'TKR (Teknik Kendaraan Ringan)',
      'TAB': 'TAB (Teknik Alat Berat)',
      'TPM': 'TPM (Teknik Pemesinan)',
      'TPL': 'TPL (Teknik Pengelasan)',
      'TBSM': 'TBSM (Teknik Bisnis Sepeda Motor)',
      'TBKR': 'TBKR (Teknik Bodi Kendaraan Ringan)',
      'TBO': 'TBKR (Teknik Bodi Kendaraan Ringan)',
      'TKJ': 'TKJ (Teknik Komputer Jaringan)',
      'RPL': 'RPL (Rekayasa Perangkat Lunak)',
      'DKV': 'DKV (Desain Komunikasi Visual)',
      'MM': 'DKV (Desain Komunikasi Visual)',
    };
    return mappings[abbrev] || abbrev;
  }
  return '';
}

export function getAbbreviationFromDepartment(dept?: string): string {
  if (!dept) return '';
  const clean = dept.toUpperCase().trim();
  if (/\b(TBKR|TBO)\b/.test(clean) || clean.includes('BODI KENDARAAN') || clean.includes('BODI OTOMOTIF') || clean.includes('BODI')) return 'TBKR';
  if (/\b(TKRO|TKR)\b/.test(clean) || clean.includes('KENDARAAN RINGAN') || clean.includes('OTOMOTIF')) return 'TKR';
  if (/\bTAB\b/.test(clean) || clean.includes('ALAT BERAT')) return 'TAB';
  if (/\bTPM\b/.test(clean) || clean.includes('PEMESINAN') || clean.includes('MESIN')) return 'TPM';
  if (/\bTPL\b/.test(clean) || clean.includes('PENGELASAN') || clean.includes('LAS')) return 'TPL';
  if (/\b(TBSM|TSM)\b/.test(clean) || clean.includes('SEPEDA MOTOR') || clean.includes('MOTOR')) return 'TBSM';
  if (/\bTKJ\b/.test(clean) || clean.includes('KOMPUTER JARINGAN') || clean.includes('JARINGAN')) return 'TKJ';
  if (/\bRPL\b/.test(clean) || clean.includes('PERANGKAT LUNAK') || clean.includes('SOFTWARE')) return 'RPL';
  if (/\b(DKV|MM)\b/.test(clean) || clean.includes('KOMUNIKASI VISUAL') || clean.includes('MULTIMEDIA')) return 'DKV';
  
  return clean.split(/\s+/)[0];
}

export function getStudentWave(
  studentOrDestination: Student | { destination?: string; className?: string; wave?: WaveType } | string,
  settingsOrClassName?: AppSettings | string,
  classesListOrSettings?: SchoolClass[] | AppSettings,
  maybeSettings?: AppSettings
): WaveType {
  let destination = 'BALI';
  let className = '';
  let studentWave: WaveType | undefined;
  let settings: AppSettings = {};
  let classesList: SchoolClass[] = [];

  if (typeof studentOrDestination === 'string') {
    destination = studentOrDestination;
    className = typeof settingsOrClassName === 'string' ? settingsOrClassName : '';
    if (Array.isArray(classesListOrSettings)) {
      classesList = classesListOrSettings;
      settings = maybeSettings || {};
    } else if (classesListOrSettings && typeof classesListOrSettings === 'object') {
      settings = classesListOrSettings as AppSettings;
    }
  } else if (studentOrDestination && typeof studentOrDestination === 'object') {
    destination = studentOrDestination.destination || 'BALI';
    className = studentOrDestination.className || '';
    studentWave = studentOrDestination.wave;

    if (settingsOrClassName && typeof settingsOrClassName === 'object' && !Array.isArray(settingsOrClassName)) {
      settings = settingsOrClassName as AppSettings;
    }
    if (Array.isArray(classesListOrSettings)) {
      classesList = classesListOrSettings;
    } else if (Array.isArray(settingsOrClassName)) {
      classesList = settingsOrClassName;
    }
  }

  const cleanDest = (destination || 'BALI').toUpperCase().trim();
  if (cleanDest === 'YOGYAKARTA' || cleanDest === 'YOGYA') {
    return 'YOGYA_GEL_1';
  }
  if (cleanDest === 'BALI') {
    const studentClass = classesList.find((c) => normalizeClassName(c.name) === normalizeClassName(className));
    let department = (studentClass?.department || '').toUpperCase().trim();
    if (!department && className) {
      department = getDepartmentFromClassName(className);
    }

    const cleanDept = department.split(' ')[0].toUpperCase().trim();
    const abbrev = getAbbreviationFromDepartment(department).toUpperCase().trim();
    const classAbbrev = getAbbreviationFromDepartment(className).toUpperCase().trim();
    const cleanDeptAbbrev = getAbbreviationFromDepartment(cleanDept).toUpperCase().trim();

    const g1MajorsRaw = settings.waveBaliGel1Majors || ['TKJ', 'RPL', 'DKV'];
    const g2MajorsRaw = settings.waveBaliGel2Majors || ['TBKR', 'TBSM', 'TAB', 'TKR', 'TPM', 'TPL'];

    const g1Norm = g1MajorsRaw.map(m => getAbbreviationFromDepartment(m).toUpperCase().trim());
    const g2Norm = g2MajorsRaw.map(m => getAbbreviationFromDepartment(m).toUpperCase().trim());

    // 1. Strict check against Gelombang 1 configuration (checks both raw code and normalized abbreviation)
    const isG1 =
      g1MajorsRaw.some(m => {
        const mClean = m.toUpperCase().trim();
        return mClean === cleanDept || mClean === department || mClean === abbrev || mClean === classAbbrev || mClean === cleanDeptAbbrev;
      }) ||
      g1Norm.some(m => m === abbrev || m === classAbbrev || m === cleanDeptAbbrev || m === cleanDept);

    if (isG1) {
      return 'BALI_GEL_1';
    }

    // 2. Strict check against Gelombang 2 configuration
    const isG2 =
      g2MajorsRaw.some(m => {
        const mClean = m.toUpperCase().trim();
        return mClean === cleanDept || mClean === department || mClean === abbrev || mClean === classAbbrev || mClean === cleanDeptAbbrev;
      }) ||
      g2Norm.some(m => m === abbrev || m === classAbbrev || m === cleanDeptAbbrev || m === cleanDept);

    if (isG2) {
      return 'BALI_GEL_2';
    }

    // 3. Fallback: if not explicitly in G1, it must be assigned to G2 to never leak into G1
    return 'BALI_GEL_2';
  }
  return studentWave || 'BALI_GEL_1';
}

export function alignAllStudentWaves(
  students: Student[],
  settings: AppSettings,
  classesList: SchoolClass[]
): Student[] {
  return students.map((s) => {
    if (!s.isRegistered) return s;
    const newWave = getStudentWave(s, settings, classesList);
    // If wave changed, purge old bus & room assignments to prevent stale cross-wave ghost seating
    if (s.wave && s.wave !== newWave) {
      return {
        ...s,
        wave: newWave,
        busNumber: undefined,
        seatNumber: undefined,
        roomNumber: undefined,
        bedNumber: undefined,
      };
    }
    return { ...s, wave: newWave };
  });
}

/**
 * Calculates the exact dynamic bus count requirement for a given wave based on settings and student list.
 */
export function calculateRequiredBusesForWave(
  wave: WaveType,
  students: Student[],
  settings?: AppSettings,
  busCapacity: number = 50
): number {
  const vacantOption = settings?.waveBusSettings?.[wave]?.busVacantSeats || settings?.busVacantSeats || (settings?.busReserveFront !== false ? '1-2' : 'none');
  let startSeatNum = 3;
  if (vacantOption === 'none') {
    startSeatNum = 1;
  } else if (vacantOption === '1-4') {
    startSeatNum = 5;
  } else {
    startSeatNum = 3;
  }

  const effectiveCap = Math.max(1, busCapacity - startSeatNum + 1);
  const waveStudents = students.filter(
    (s) => s.isRegistered && s.destination !== 'MAGANG' && s.wave === wave
  );

  if (waveStudents.length === 0) return 0;
  return Math.ceil(waveStudents.length / effectiveCap);
}
