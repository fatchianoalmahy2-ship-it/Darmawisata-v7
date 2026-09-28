import { Student, Bus, WaveType, SchoolClass, AppSettings } from '@/types';
import { getDepartmentFromClassName, getAbbreviationFromDepartment, calculateRequiredBusesForWave, normalizeClassName, parseClassDetails } from '@/lib/utils';
import { autoAssignChaperonesToBuses } from '@/lib/chaperoneAllocator';

export class SeatAllocatorEngine {
  /**
   * Helper to determine student department.
   */
  private static getStudentDepartment(student: Student, classes?: SchoolClass[]): string {
    const clsObj = classes?.find((c) => normalizeClassName(c.name) === normalizeClassName(student.className));
    let dept = clsObj?.department || '';
    if (!dept && student.className) {
      dept = getDepartmentFromClassName(student.className);
    }
    return getAbbreviationFromDepartment(dept).trim().toUpperCase();
  }

  /**
   * Compacts or aligns student seat numbers on a bus while strictly preserving gender bench boundaries
   * when preventMixedGenderBench is active (e.g. if an odd seat is filled by a Female student,
   * a Male student cannot be assigned to the adjacent seat of the same bench pair).
   */
  public static compactBusSeatsWithGenderAwareness(
    busAssignedStudents: Student[],
    availableSeats: number[],
    preventMix: boolean = true
  ): void {
    if (busAssignedStudents.length === 0 || availableSeats.length === 0) return;

    busAssignedStudents.sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

    let availIdx = 0;
    let lastSeatAssigned: number | null = null;
    let lastGenderAssigned: string | null = null;

    for (let i = 0; i < busAssignedStudents.length; i++) {
      const st = busAssignedStudents[i];
      const curGender = (st.gender || '').trim().toUpperCase();
      const isFemale = curGender === 'PEREMPUAN' || curGender === 'P' || curGender === 'FEMALE';
      const genderKey = isFemale ? 'P' : 'L';

      if (availIdx >= availableSeats.length) break;

      // Check if previous student had a different gender and ended on an odd seat number (start of a 2-seat bench)
      if (
        preventMix &&
        lastGenderAssigned !== null &&
        lastGenderAssigned !== genderKey &&
        lastSeatAssigned !== null &&
        lastSeatAssigned % 2 !== 0
      ) {
        // Skip the even seat of that bench pair so opposite gender starts on a new bench (odd seat)
        const evenSeatOfPair = lastSeatAssigned + 1;
        while (availIdx < availableSeats.length && availableSeats[availIdx] <= evenSeatOfPair) {
          availIdx++;
        }
      }

      if (availIdx < availableSeats.length) {
        const assignedSeat = availableSeats[availIdx];
        st.seatNumber = assignedSeat;
        lastSeatAssigned = assignedSeat;
        lastGenderAssigned = genderKey;
        availIdx++;
      }
    }
  }

  /**
   * Resolves a setting for a specific wave, supporting inheritance (Default -> Override).
   */
  public static getSetting<K extends keyof AppSettings>(
    settings: AppSettings | undefined,
    wave: WaveType,
    key: K,
    defaultValue: any
  ): any {
    if (!settings) return defaultValue;
    const waveOverride = settings.waveBusSettings?.[wave];
    if (waveOverride && (waveOverride as any)[key] !== undefined) {
      return (waveOverride as any)[key];
    }
    if (settings[key] !== undefined) {
      return settings[key];
    }
    return defaultValue;
  }

  /**
   * Determines if a specific seat on a bus is reserved for chaperones or available for students.
   */
  public static isSeatReservedForChaperone(
    seatNum: number,
    busNum: number,
    wave: WaveType,
    settings?: AppSettings,
    defaultVacantOption?: string
  ): boolean {
    if (!settings) {
      return seatNum === 1 || seatNum === 2;
    }

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
          return false; // Explicitly converted to Student seat
        }
        return true; // Explicit chaperone name or ID
      }
    }

    // Default policy based on wave / global setting
    const vacantOption =
      defaultVacantOption ||
      SeatAllocatorEngine.getSetting(
        settings,
        wave,
        'busVacantSeats',
        settings.busReserveFront !== false ? '1-2' : 'none'
      );

    if (vacantOption === 'none') return false;
    if (vacantOption === '1-4') return seatNum >= 1 && seatNum <= 4;
    return seatNum === 1 || seatNum === 2;
  }

  /**
   * Returns sorted list of seat numbers available for students on a specific bus.
   */
  public static getAvailableStudentSeatsForBus(
    busNum: number,
    wave: WaveType,
    capacity: number,
    settings?: AppSettings,
    defaultVacantOption?: string
  ): number[] {
    const seats: number[] = [];
    for (let s = 1; s <= capacity; s++) {
      if (!SeatAllocatorEngine.isSeatReservedForChaperone(s, busNum, wave, settings, defaultVacantOption)) {
        seats.push(s);
      }
    }
    return seats;
  }

  /**
   * Auto allocates bus seats for students in a specific wave.
   */
  public static autoAllocateBuses(
    students: Student[],
    busCapacity: number = 50,
    classes?: SchoolClass[],
    customBusGuides?: { [busId: string]: { guide1: string; guide2: string } },
    settings?: AppSettings
  ): { updatedStudents: Student[]; buses: Bus[] } {
    const updated = [...students];
    const buses: Bus[] = [];

    // Clear bus/seat assignments for unregistered students
    updated.forEach((s) => {
      if (!s.isRegistered) {
        s.busNumber = 0;
        s.seatNumber = 0;
      }
    });

    const waves: WaveType[] = ['BALI_GEL_1', 'BALI_GEL_2', 'YOGYA_GEL_1'];
    let globalBusCounter = 1;

    waves.forEach((wave) => {
      const waveStudents = updated.filter((s) => s.isRegistered && s.destination !== 'MAGANG' && s.wave === wave);
      if (waveStudents.length === 0) return;

      // Load active settings criteria for this wave (supporting overrides)
      const busSeatSort = SeatAllocatorEngine.getSetting(settings, wave, 'busSeatSort', 'name');
      const vacantOption = SeatAllocatorEngine.getSetting(settings, wave, 'busVacantSeats', (settings?.busReserveFront !== false ? '1-2' : 'none'));
      
      let startSeatNum = 3;
      if (vacantOption === 'none') {
        startSeatNum = 1;
      } else if (vacantOption === '1-4') {
        startSeatNum = 5;
      } else {
        startSeatNum = 3;
      }

      const numberingMode = SeatAllocatorEngine.getSetting(settings, wave, 'busNumberingMode', 'per-wave');
      const seatPacking = SeatAllocatorEngine.getSetting(settings, wave, 'seatPackingStrategy', 'compact');
      const waveCapacity = SeatAllocatorEngine.getSetting(settings, wave, 'defaultBusCapacity', busCapacity);
      const defaultSortMode = (wave === 'BALI_GEL_1' || wave === 'BALI_GEL_2')
        ? (settings?.busMajorSortModeBali || settings?.busMajorSortMode || 'custom')
        : (settings?.busMajorSortModeYogya || settings?.busMajorSortMode || 'custom');
      const busMajorSortMode = SeatAllocatorEngine.getSetting(settings, wave, 'busMajorSortMode', defaultSortMode);
      const busPriorityByMajorSize = SeatAllocatorEngine.getSetting(settings, wave, 'busPriorityByMajorSize', false);

      // Force groupMethod to be 'class' when major ordering is enabled to keep classes intact and ordered sequentially
      const isMajorSortingActive = busMajorSortMode === 'custom' || busMajorSortMode === 'size' || busPriorityByMajorSize;
      const busGroupMethod = SeatAllocatorEngine.getSetting(settings, wave, 'busGroupMethod', 'class');
      const groupMethod = isMajorSortingActive ? 'class' : busGroupMethod;
      const genderPriority = SeatAllocatorEngine.getSetting(settings, wave, 'busGenderPriority', 'female-front');

      // Separate students of this wave into Females and Males
      const waveFemales = waveStudents.filter((s) => {
        const g = (s.gender || '').trim().toUpperCase();
        return g === 'PEREMPUAN' || g === 'P' || g === 'FEMALE';
      });
      const waveMales = waveStudents.filter((s) => {
        const g = (s.gender || '').trim().toUpperCase();
        return g === 'LAKI-LAKI' || g === 'L' || g === 'MALE' || g === 'LAKILAKI';
      });

      // Helper function to get department for a student
      const getStudentDept = (s: Student) => {
        return SeatAllocatorEngine.getStudentDepartment(s, classes) || 'Lainnya';
      };

      // Helper function to sort a list of students
      const sortStudentList = (list: Student[]) => {
        list.sort((a, b) => {
          if (busSeatSort === 'nis') {
            return (a.nis || '').localeCompare(b.nis || '', undefined, { numeric: true });
          } else {
            return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
          }
        });
      };

      // Helper function to create paired 2-seat blocks
      const createBlocks = (): Student[][] => {
        // Determine groups (Class or Department) based on settings
        const grpKeyFn = (s: Student) => groupMethod === 'department' ? getStudentDept(s) : normalizeClassName(s.className || 'Tanpa Kelas');

        const uniqueGroupNames = Array.from(new Set(waveStudents.map(grpKeyFn)));

        // Helper to find the department of a group name
        const getGroupDept = (groupName: string): string => {
          if (groupMethod === 'department') return groupName;
          const firstStudent = waveStudents.find(s => normalizeClassName(s.className || 'Tanpa Kelas') === groupName);
          if (firstStudent) {
            return getStudentDept(firstStudent);
          }
          const clsObj = classes?.find(c => normalizeClassName(c.name) === groupName);
          if (clsObj?.department) {
            return getAbbreviationFromDepartment(clsObj.department).trim().toUpperCase();
          }
          return getAbbreviationFromDepartment(getDepartmentFromClassName(groupName)).trim().toUpperCase() || 'Lainnya';
        };

        // Calculate total student count for each department in this wave
        const deptSizes = new Map<string, number>();
        waveStudents.forEach((s) => {
          const dept = getGroupDept(grpKeyFn(s));
          deptSizes.set(dept, (deptSizes.get(dept) || 0) + 1);
        });

        // Sort uniqueGroupNames based on configuration:
        // 1. Department Order (custom order -> size -> alphabet)
        // 2. Strict sequential class order for all majors (natural numeric order: XII TKR 1, XII TKR 2, XII TKR 3, XII TKR 4, etc.)
        uniqueGroupNames.sort((a, b) => {
          const deptA = getGroupDept(a);
          const deptB = getGroupDept(b);

          if (deptA !== deptB) {
            const sortMode = busMajorSortMode || (busPriorityByMajorSize ? 'size' : 'custom');

            if (sortMode === 'custom') {
              const customOrder = (wave === 'BALI_GEL_1' || wave === 'BALI_GEL_2')
                ? (settings?.customMajorOrderBali || settings?.customMajorOrder || [])
                : (settings?.customMajorOrderYogya || settings?.customMajorOrder || []);
              if (customOrder.length > 0) {
                const normOrder = customOrder.map(m => getAbbreviationFromDepartment(m).trim().toUpperCase());
                const idxA = normOrder.indexOf(deptA);
                const idxB = normOrder.indexOf(deptB);
                if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
                  return idxA - idxB;
                }
                if (idxA !== -1 && idxB === -1) return -1;
                if (idxA === -1 && idxB !== -1) return 1;
              }
            } else if (sortMode === 'size' || busPriorityByMajorSize) {
              const sizeA = deptSizes.get(deptA) || 0;
              const sizeB = deptSizes.get(deptB) || 0;
              if (sizeA !== sizeB) {
                return sizeB - sizeA;
              }
            }
            return deptA.localeCompare(deptB, undefined, { sensitivity: 'base' });
          }

          // Same department: sort strictly by section number (e.g. XII TKR 1, XII TKR 2, XII TKR 3, XII TKR 4, etc.)
          const parsedA = parseClassDetails(a);
          const parsedB = parseClassDetails(b);
          if (parsedA.sectionNumber !== parsedB.sectionNumber) {
            return parsedA.sectionNumber - parsedB.sectionNumber;
          }
          return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });

        const femaleArrangement = SeatAllocatorEngine.getSetting(settings, wave, 'busFemaleArrangement', 'class');
        const strictOdd = SeatAllocatorEngine.getSetting(settings, wave, 'busStrictOddPairing', false);

        if (femaleArrangement === 'segregated') {
          // ==========================================
          // SEGREGATED: Group all females together, all males together globally
          // ==========================================
          const pairSingleGender = (genderStudents: Student[]): Student[][] => {
            const genderBlocks: Student[][] = [];
            const oddStudents: Student[] = [];

            // Group genderStudents by class/dept
            const groupsMap = new Map<string, Student[]>();
            genderStudents.forEach((s) => {
              const key = grpKeyFn(s);
              if (!groupsMap.has(key)) groupsMap.set(key, []);
              groupsMap.get(key)!.push(s);
            });

            uniqueGroupNames.forEach((grpName) => {
              const grpStudents = [...(groupsMap.get(grpName) || [])];
              sortStudentList(grpStudents);

              for (let i = 0; i < grpStudents.length; i += 2) {
                if (i + 1 < grpStudents.length) {
                  genderBlocks.push([grpStudents[i], grpStudents[i + 1]]);
                } else {
                  oddStudents.push(grpStudents[i]);
                }
              }
            });

            // Pair up odd students
            const pairedOddIds = new Set<string>();
            const unpairedOdds: Student[] = [];

            for (let i = 0; i < oddStudents.length; i++) {
              const studentA = oddStudents[i];
              if (pairedOddIds.has(studentA.id)) continue;

              const deptA = getStudentDept(studentA);
              let foundPair = false;

              for (let j = i + 1; j < oddStudents.length; j++) {
                const studentB = oddStudents[j];
                if (pairedOddIds.has(studentB.id)) continue;

                const deptB = getStudentDept(studentB);
                if (deptA === deptB) {
                  genderBlocks.push([studentA, studentB]);
                  pairedOddIds.add(studentA.id);
                  pairedOddIds.add(studentB.id);
                  foundPair = true;
                  break;
                }
              }

              if (!foundPair) {
                unpairedOdds.push(studentA);
              }
            }

            if (strictOdd) {
              unpairedOdds.forEach((s) => {
                genderBlocks.push([s]);
              });
            } else {
              const finalUnpaired: Student[] = [];
              for (let i = 0; i < unpairedOdds.length; i += 2) {
                if (i + 1 < unpairedOdds.length) {
                  genderBlocks.push([unpairedOdds[i], unpairedOdds[i + 1]]);
                } else {
                  finalUnpaired.push(unpairedOdds[i]);
                }
              }
              finalUnpaired.forEach((s) => {
                genderBlocks.push([s]);
              });
            }

            // Sort these gender blocks to maintain group order
            genderBlocks.sort((blockA, blockB) => {
              const getBlockIdx = (block: Student[]) => {
                const grpA = grpKeyFn(block[0]);
                const idxA = uniqueGroupNames.indexOf(grpA);
                if (block.length === 1) return idxA;

                const grpB = grpKeyFn(block[1]);
                const idxB = uniqueGroupNames.indexOf(grpB);
                if (idxA === idxB) return idxA;

                const deptA = getStudentDept(block[0]);
                const deptB = getStudentDept(block[1]);
                if (deptA !== deptB) {
                  let lastDeptAIdx = idxA;
                  for (let k = idxA; k < uniqueGroupNames.length; k++) {
                    const sample = waveStudents.find((s) => grpKeyFn(s) === uniqueGroupNames[k]);
                    if (sample && getStudentDept(sample) === deptA) {
                      lastDeptAIdx = k;
                    }
                  }
                  return lastDeptAIdx + 0.5;
                }
                return Math.max(idxA, idxB) - 0.5;
              };

              return getBlockIdx(blockA) - getBlockIdx(blockB);
            });

            return genderBlocks;
          };

          const femaleBlocks = pairSingleGender(waveFemales);
          const maleBlocks = pairSingleGender(waveMales);

          if (genderPriority === 'male-front') {
            return [...maleBlocks, ...femaleBlocks];
          } else {
            return [...femaleBlocks, ...maleBlocks];
          }

        } else {
          // ==========================================
          // CLASS-BASED (Tetap Satu Kelas)
          // ==========================================
          const groupBlocksMap = new Map<string, Student[][]>();
          const oddFemales: Student[] = [];
          const oddMales: Student[] = [];

          uniqueGroupNames.forEach((grpName) => {
            const grpStudents = waveStudents.filter(s => grpKeyFn(s) === grpName);
            const femalesInGrp = grpStudents.filter(s => waveFemales.some(f => f.id === s.id));
            const malesInGrp = grpStudents.filter(s => waveMales.some(m => m.id === s.id));

            sortStudentList(femalesInGrp);
            sortStudentList(malesInGrp);

            const grpBlocks: Student[][] = [];

            // Pair females in this class
            for (let i = 0; i < femalesInGrp.length; i += 2) {
              if (i + 1 < femalesInGrp.length) {
                grpBlocks.push([femalesInGrp[i], femalesInGrp[i + 1]]);
              } else {
                oddFemales.push(femalesInGrp[i]);
              }
            }

            // Pair males in this class
            for (let i = 0; i < malesInGrp.length; i += 2) {
              if (i + 1 < malesInGrp.length) {
                grpBlocks.push([malesInGrp[i], malesInGrp[i + 1]]);
              } else {
                oddMales.push(malesInGrp[i]);
              }
            }

            groupBlocksMap.set(grpName, grpBlocks);
          });

          // Resolve odd students across classes: Prioritize same department (1 Jurusan)
          const resolveOdds = (oddsList: Student[], isFemale: boolean) => {
            const pairedOddIds = new Set<string>();
            const unpairedOdds: Student[] = [];

            const getBoundaryGroupKey = (studentA: Student, _studentB?: Student): string => {
              const deptA = getStudentDept(studentA);
              const grpA = grpKeyFn(studentA);
              const deptAGroups = uniqueGroupNames.filter((gName) => {
                const sample = waveStudents.find((s) => grpKeyFn(s) === gName);
                return sample && getStudentDept(sample) === deptA;
              });
              if (deptAGroups.length > 0) {
                return deptAGroups[deptAGroups.length - 1];
              }
              return grpA;
            };

            for (let i = 0; i < oddsList.length; i++) {
              const studentA = oddsList[i];
              if (pairedOddIds.has(studentA.id)) continue;

              const deptA = getStudentDept(studentA);
              let foundPair = false;

              for (let j = i + 1; j < oddsList.length; j++) {
                const studentB = oddsList[j];
                if (pairedOddIds.has(studentB.id)) continue;

                const deptB = getStudentDept(studentB);
                if (deptA === deptB) {
                  // Found same department match! Put them in the last group of deptA to preserve order
                  const targetGrp = getBoundaryGroupKey(studentA, studentB);
                  const grpBlocks = groupBlocksMap.get(targetGrp) || [];
                  
                  if (isFemale) {
                    grpBlocks.unshift([studentA, studentB]);
                  } else {
                    grpBlocks.push([studentA, studentB]);
                  }
                  
                  groupBlocksMap.set(targetGrp, grpBlocks);

                  pairedOddIds.add(studentA.id);
                  pairedOddIds.add(studentB.id);
                  foundPair = true;
                  break;
                }
              }

              if (!foundPair) {
                unpairedOdds.push(studentA);
              }
            }

            if (strictOdd) {
              unpairedOdds.forEach((student) => {
                const targetGrp = getBoundaryGroupKey(student);
                const grpBlocks = groupBlocksMap.get(targetGrp) || [];
                if (isFemale) {
                  grpBlocks.unshift([student]);
                } else {
                  grpBlocks.push([student]);
                }
                groupBlocksMap.set(targetGrp, grpBlocks);
              });
            } else {
              const pairedCrossIds = new Set<string>();
              for (let i = 0; i < unpairedOdds.length; i++) {
                const studentA = unpairedOdds[i];
                if (pairedCrossIds.has(studentA.id)) continue;

                if (i + 1 < unpairedOdds.length) {
                  const studentB = unpairedOdds[i + 1];
                  const targetGrp = getBoundaryGroupKey(studentA, studentB);
                  const grpBlocks = groupBlocksMap.get(targetGrp) || [];
                  if (isFemale) {
                    grpBlocks.unshift([studentA, studentB]);
                  } else {
                    grpBlocks.push([studentA, studentB]);
                  }
                  groupBlocksMap.set(targetGrp, grpBlocks);
                  pairedCrossIds.add(studentA.id);
                  pairedCrossIds.add(studentB.id);
                } else {
                  const targetGrp = getBoundaryGroupKey(studentA);
                  const grpBlocks = groupBlocksMap.get(targetGrp) || [];
                  if (isFemale) {
                    grpBlocks.unshift([studentA]);
                  } else {
                    grpBlocks.push([studentA]);
                  }
                  groupBlocksMap.set(targetGrp, grpBlocks);
                }
              }
            }
          };

          resolveOdds(oddFemales, true);
          resolveOdds(oddMales, false);

          // Flatten and sort class blocks
          const combinedBlocks: Student[][] = [];
          uniqueGroupNames.forEach((grpName) => {
            const grpBlocks = groupBlocksMap.get(grpName) || [];
            
            // Females first in this class's block
            grpBlocks.sort((blockA, blockB) => {
              const isA_Fem = waveFemales.some(s => s.id === blockA[0].id);
              const isB_Fem = waveFemales.some(s => s.id === blockB[0].id);
              if (isA_Fem !== isB_Fem) {
                return isA_Fem ? -1 : 1;
              }
              return 0;
            });

            combinedBlocks.push(...grpBlocks);
          });

          return combinedBlocks;
        }
      };

      const allBlocks = createBlocks();

      // Calculate dynamic bus count required for this wave
      const requiredBusCount = calculateRequiredBusesForWave(wave, updated, settings, waveCapacity);

      const isBlockFemale = (b: Student[]) => {
        return b.some((s) => {
          const g = (s.gender || '').trim().toUpperCase();
          return g === 'PEREMPUAN' || g === 'P' || g === 'FEMALE';
        });
      };

      const preventMix = settings?.preventMixedGenderBench !== false && settings?.busGendersNoMixBench !== false;
      const fillOdd = settings?.busFillOddSeatsTail === true;

      const getUsedSeats = (blocks: Student[][]) => {
        const females = blocks.filter(isBlockFemale);
        const males = blocks.filter((b) => !isBlockFemale(b));
        const femSeats = females.reduce((sum, b) => sum + (seatPacking === 'compact' ? b.length : 2), 0);
        const maleSeats = males.reduce((sum, b) => sum + (seatPacking === 'compact' ? b.length : 2), 0);
        const genderGap = (preventMix && femSeats % 2 !== 0 && maleSeats > 0) ? 1 : 0;
        return femSeats + genderGap + maleSeats;
      };

      // Chunk blocks into bus buckets based on each bus's actual available capacity
      const busBuckets: Student[][][] = [];
      let currentBusBlocks: Student[][] = [];

      let bIndex = 0;
      while (bIndex < allBlocks.length) {
        const block = allBlocks[bIndex];
        const currentBusNum = numberingMode === 'global' ? globalBusCounter + busBuckets.length : busBuckets.length + 1;
        const availableSeatsForThisBus = SeatAllocatorEngine.getAvailableStudentSeatsForBus(
          currentBusNum,
          wave,
          waveCapacity,
          settings,
          vacantOption
        );
        const maxCapacityForThisBus = availableSeatsForThisBus.length;

        const currentUsed = getUsedSeats(currentBusBlocks);
        const blockSize = seatPacking === 'compact' ? block.length : 2;

        if (currentUsed + blockSize > maxCapacityForThisBus) {
          // Always split a 2-student block if exactly 1 seat remains to utilize full capacity
          if (block.length === 2 && (maxCapacityForThisBus - currentUsed) === 1) {
            const [sA, sB] = block;
            currentBusBlocks.push([sA]);
            busBuckets.push(currentBusBlocks);
            currentBusBlocks = [[sB]];
          } else {
            if (currentBusBlocks.length > 0) {
              busBuckets.push(currentBusBlocks);
            }
            currentBusBlocks = [block];
          }
        } else {
          currentBusBlocks.push(block);
        }
        bIndex++;
      }
      if (currentBusBlocks.length > 0) {
        busBuckets.push(currentBusBlocks);
      }

      // Only keep non-empty buckets or at least 1 bucket if wave has students
      if (busBuckets.length === 0 && waveStudents.length > 0) {
        busBuckets.push([]);
      }

      busBuckets.forEach((bucketBlocks, busIndex) => {
        const currentBusNum = numberingMode === 'global' ? globalBusCounter++ : busIndex + 1;
        let currentBusAssignedIds: string[] = [];

        let busBlocks = [...bucketBlocks];
        const femaleArrangement = SeatAllocatorEngine.getSetting(settings, wave, 'busFemaleArrangement', 'class');

        if (femaleArrangement === 'segregated') {
          if (genderPriority === 'female-front') {
            const females = busBlocks.filter(isBlockFemale);
            const males = busBlocks.filter((b) => !isBlockFemale(b));
            busBlocks = [...females, ...males];
          } else if (genderPriority === 'male-front') {
            const females = busBlocks.filter(isBlockFemale);
            const males = busBlocks.filter((b) => !isBlockFemale(b));
            busBlocks = [...males, ...females];
          }
        } else {
          // Class-based (Tetap Sekelas):
          // Blocks are already clustered by class in createBlocks() with females sitting in front of males within each class block.
          // If genderPriority is male-front within class, invert female/male within each class chunk:
          if (genderPriority === 'male-front') {
            // Keep class grouping order, but place males first within their respective class block
            const classOrderMap = new Map<string, Student[][]>();
            busBlocks.forEach((b) => {
              const grp = grpKeyFn(b[0]);
              if (!classOrderMap.has(grp)) classOrderMap.set(grp, []);
              classOrderMap.get(grp)!.push(b);
            });
            const reorderedClassBlocks: Student[][] = [];
            classOrderMap.forEach((blocks) => {
              const males = blocks.filter((b) => !isBlockFemale(b));
              const females = blocks.filter(isBlockFemale);
              reorderedClassBlocks.push(...males, ...females);
            });
            busBlocks = reorderedClassBlocks;
          }
        }

        // Get actual available seats in front-to-back order (e.g. [1, 2, 3...] or [5, 6, 7...])
        const availableSeats = SeatAllocatorEngine.getAvailableStudentSeatsForBus(
          currentBusNum,
          wave,
          waveCapacity,
          settings,
          vacantOption
        );

        let seatIdx = 0;
        let prevBlockFemale: boolean | null = null;

        busBlocks.forEach((block) => {
          const blockFem = isBlockFemale(block);

          // Bench-level gender separation: if gender changes, jump to next bench start if needed
          if (preventMix && prevBlockFemale !== null && prevBlockFemale !== blockFem) {
            if (seatIdx < availableSeats.length) {
              const curSeat = availableSeats[seatIdx];
              if (curSeat % 2 === 0) {
                seatIdx += 1;
              }
            }
          }
          prevBlockFemale = blockFem;

          if (block.length === 2) {
            // Ensure 2-seat pair does not cross bench boundary (must start on odd seat)
            if (seatIdx < availableSeats.length) {
              const curSeat = availableSeats[seatIdx];
              if (curSeat % 2 === 0) {
                seatIdx += 1;
              }
            }

            if (seatIdx + 1 < availableSeats.length) {
              const [sA, sB] = block;
              sA.busNumber = currentBusNum;
              sA.seatNumber = availableSeats[seatIdx];
              sB.busNumber = currentBusNum;
              sB.seatNumber = availableSeats[seatIdx + 1];
              currentBusAssignedIds.push(sA.id, sB.id);
              seatIdx += 2;
            } else if (seatIdx < availableSeats.length) {
              const [sA] = block;
              sA.busNumber = currentBusNum;
              sA.seatNumber = availableSeats[seatIdx];
              currentBusAssignedIds.push(sA.id);
              seatIdx += 1;
            }
          } else {
            if (seatIdx < availableSeats.length) {
              const [sA] = block;
              sA.busNumber = currentBusNum;
              sA.seatNumber = availableSeats[seatIdx];
              currentBusAssignedIds.push(sA.id);
              if (seatPacking === 'compact') {
                seatIdx += 1;
              } else {
                seatIdx += 2;
              }
            }
          }
        });

        // Automatic Compacting & Front-Fill Enforcement:
        // Compact assigned student seats for currentBusNum while strictly respecting gender bench boundaries
        const busAssignedStudents = updated
          .filter((s) => s.wave === wave && s.busNumber === currentBusNum && s.seatNumber && s.seatNumber > 0)
          .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

        SeatAllocatorEngine.compactBusSeatsWithGenderAwareness(busAssignedStudents, availableSeats, preventMix);
        currentBusAssignedIds = busAssignedStudents.map((s) => s.id);

        // Helper to finalize and push the current bus to the array
        const busId = `bus-${wave}-${currentBusNum}`;
        const { guide1, guide2, guide3, guide4 } = SeatAllocatorEngine.calculateGuidesForBus(
          busId,
          currentBusNum,
          wave,
          currentBusAssignedIds,
          updated,
          classes,
          settings,
          customBusGuides
        );

        // Only push if bus has students, OR if it is within requiredBusCount and it is the solitary bus for the wave
        if (currentBusAssignedIds.length > 0 || (busIndex === 0 && requiredBusCount <= 1)) {
          buses.push({
            id: busId,
            busNumber: currentBusNum,
            wave,
            capacity: waveCapacity,
            guide1,
            guide2,
            guide3,
            guide4,
            assignedStudentIds: [...currentBusAssignedIds],
          });
        }
      });
    });

    return { updatedStudents: updated, buses };
  }

  /**
   * Returns list of buses derived from students' bus numbers, ensuring complete bus fleets per wave.
   */
  public static deriveBusesFromStudents(
    students: Student[], 
    busCapacity: number = 50,
    classes?: SchoolClass[],
    customBusGuides?: { [busId: string]: { guide1: string; guide2: string; guide3?: string; guide4?: string } },
    settings?: AppSettings
  ): Bus[] {
    const busMap = new Map<string, Bus>();

    // 1. Populate buses from students who already have busNumber
    students.forEach((s) => {
      if (!s.busNumber || !s.wave) return;
      const key = `${s.wave}-${s.busNumber}`;
      if (!busMap.has(key)) {
        const busId = `bus-${s.wave}-${s.busNumber}`;
        let guide1 = 'Belum Ditentukan';
        let guide2 = 'Belum Ditentukan';
        let guide3 = 'Belum Ditentukan';
        let guide4 = 'Belum Ditentukan';

        if (customBusGuides && customBusGuides[busId]) {
          guide1 = customBusGuides[busId].guide1;
          guide2 = customBusGuides[busId].guide2;
          guide3 = customBusGuides[busId].guide3 || 'Belum Ditentukan';
          guide4 = customBusGuides[busId].guide4 || 'Belum Ditentukan';
        }

        const waveCapacity = SeatAllocatorEngine.getSetting(settings, s.wave, 'defaultBusCapacity', busCapacity);
        const maxSeatInThisBus = Math.max(
          0,
          ...students.filter(st => st.wave === s.wave && st.busNumber === s.busNumber).map(st => st.seatNumber || 0)
        );
        const effectiveBusCapacity = Math.min(50, Math.max(waveCapacity, maxSeatInThisBus));

        busMap.set(key, {
          id: busId,
          busNumber: s.busNumber,
          wave: s.wave,
          capacity: effectiveBusCapacity,
          guide1,
          guide2,
          guide3,
          guide4,
          assignedStudentIds: [],
        });
      }
      busMap.get(key)!.assignedStudentIds.push(s.id);
    });

    // 2. Pre-initialize empty buses for each wave if required by student count / settings
    const waves: WaveType[] = ['BALI_GEL_1', 'BALI_GEL_2', 'YOGYA_GEL_1'];
    const numberingMode = settings?.busNumberingMode || 'per-wave';
    let globalBusCounter = 1;

    waves.forEach((wave) => {
      const waveCapacity = SeatAllocatorEngine.getSetting(settings, wave, 'defaultBusCapacity', busCapacity);
      const waveStudents = students.filter(
        (s) => s.isRegistered && s.destination !== 'MAGANG' && s.wave === wave
      );
      const unassignedCount = waveStudents.filter(
        (s) => !s.busNumber || !s.seatNumber || s.seatNumber === 0
      ).length;
      const highestOccupiedBusNum = Math.max(
        0,
        ...waveStudents.filter((s) => s.seatNumber && s.seatNumber > 0).map((s) => s.busNumber || 0)
      );

      let busesToCreate = 0;
      if (waveStudents.length === 0) {
        busesToCreate = 0;
      } else if (unassignedCount === 0) {
        // All students in this wave are 100% seated: only create/keep up to the highest occupied bus number
        busesToCreate = Math.max(1, highestOccupiedBusNum);
      } else {
        const requiredBuses = calculateRequiredBusesForWave(wave, students, settings, waveCapacity);
        busesToCreate = Math.max(1, highestOccupiedBusNum, requiredBuses);
      }

      for (let i = 1; i <= busesToCreate; i++) {
        const busNum = numberingMode === 'global' ? globalBusCounter++ : i;
        const key = `${wave}-${busNum}`;
        if (!busMap.has(key)) {
          const busId = `bus-${wave}-${busNum}`;
          let guide1 = 'Belum Ditentukan';
          let guide2 = 'Belum Ditentukan';
          let guide3 = 'Belum Ditentukan';
          let guide4 = 'Belum Ditentukan';

          if (customBusGuides && customBusGuides[busId]) {
            guide1 = customBusGuides[busId].guide1;
            guide2 = customBusGuides[busId].guide2;
            guide3 = customBusGuides[busId].guide3 || 'Belum Ditentukan';
            guide4 = customBusGuides[busId].guide4 || 'Belum Ditentukan';
          }

          busMap.set(key, {
            id: busId,
            busNumber: busNum,
            wave,
            capacity: waveCapacity,
            guide1,
            guide2,
            guide3,
            guide4,
            assignedStudentIds: [],
          });
        }
      }
    });

    // Smart Auto-Pruning: Only keep buses with assigned students, or empty buses needed for unassigned students
    const busesList = Array.from(busMap.values())
      .filter((b) => {
        if (b.assignedStudentIds.length > 0) return true;
        const waveStds = students.filter((s) => s.isRegistered && s.destination !== 'MAGANG' && s.wave === b.wave);
        if (waveStds.length === 0) return b.busNumber === 1;

        const unassignedInWave = waveStds.filter(
          (s) => !s.busNumber || !s.seatNumber || s.seatNumber === 0
        ).length;
        const highestOccupied = Math.max(
          0,
          ...waveStds.filter((s) => s.seatNumber && s.seatNumber > 0).map((s) => s.busNumber || 0)
        );

        if (unassignedInWave === 0) {
          return b.busNumber <= Math.max(1, highestOccupied);
        }

        const waveCap = SeatAllocatorEngine.getSetting(settings, b.wave, 'defaultBusCapacity', busCapacity);
        const reqCount = calculateRequiredBusesForWave(b.wave, students, settings, waveCap);
        return b.busNumber <= Math.max(1, highestOccupied, reqCount);
      })
      .sort((a, b) => {
        if (a.wave !== b.wave) {
          return a.wave.localeCompare(b.wave);
        }
        return a.busNumber - b.busNumber;
      });

    // Global auto-assignment of chaperones across all buses (single source of truth)
    const chaperoneAssignments = (classes && settings)
      ? autoAssignChaperonesToBuses(busesList, students, classes, settings)
      : [];
    const chaperoneMap = new Map(chaperoneAssignments.map((a) => [a.busId, a]));

    const formatChaperoneName = (idOrName: string) => {
      if (!idOrName || idOrName === 'Belum Ditentukan' || idOrName === 'Pendamping Umum') {
        return idOrName || 'Pendamping Umum';
      }
      if (idOrName.startsWith('chap-wali-auto-')) {
        const classId = idOrName.replace('chap-wali-auto-', '');
        const foundClass = classes?.find((c) => c.id === classId || c.name === classId);
        if (foundClass && foundClass.homeroomTeacher) {
          return `${foundClass.homeroomTeacher} (${foundClass.name})`;
        }
      }
      const found = settings?.masterChaperones?.find((c) => c.id === idOrName);
      if (found) {
        return found.role === 'KAKOMLI'
          ? `${found.name} (Kakomli ${found.department || ''})`
          : found.name;
      }
      return idOrName;
    };

    busesList.forEach((bus) => {
      const effectiveCustomGuides = customBusGuides || settings?.customBusGuides;
      if (effectiveCustomGuides && effectiveCustomGuides[bus.id]) {
        bus.guide1 = formatChaperoneName(effectiveCustomGuides[bus.id].guide1);
        bus.guide2 = formatChaperoneName(effectiveCustomGuides[bus.id].guide2);
        bus.guide3 = formatChaperoneName(effectiveCustomGuides[bus.id].guide3 || '');
        bus.guide4 = formatChaperoneName(effectiveCustomGuides[bus.id].guide4 || '');
      } else {
        const autoChap = chaperoneMap.get(bus.id);
        if (autoChap) {
          bus.guide1 = formatChaperoneName(autoChap.guide1);
          bus.guide2 = formatChaperoneName(autoChap.guide2);
          bus.guide3 = 'Pendamping Umum';
          bus.guide4 = 'Pendamping Umum';
        } else {
          const { guide1, guide2, guide3, guide4 } = SeatAllocatorEngine.calculateGuidesForBus(
            bus.id,
            bus.busNumber,
            bus.wave,
            bus.assignedStudentIds,
            students,
            classes,
            settings,
            customBusGuides
          );
          bus.guide1 = guide1;
          bus.guide2 = guide2;
          bus.guide3 = guide3;
          bus.guide4 = guide4;
        }
      }
    });

    return busesList;
  }

  /**
   * Calculates guides dynamically based on class majority percentage and Kakomli department priority,
   * respecting manual admin overrides if configured, and enforcing a strict 1-Wali-Kelas-per-bus policy.
   */
  public static calculateGuidesForBus(
    busId: string,
    busNum: number,
    wave: WaveType,
    assignedStudentIds: string[],
    allStudents: Student[],
    classes?: SchoolClass[],
    settings?: AppSettings,
    customBusGuides?: { [busId: string]: { guide1: string; guide2: string; guide3?: string; guide4?: string } }
  ): { guide1: string; guide2: string; guide3?: string; guide4?: string } {
    // 1. Check manual override from customBusGuides or settings.customBusGuides
    const effectiveCustomGuides = customBusGuides || settings?.customBusGuides;
    if (effectiveCustomGuides && effectiveCustomGuides[busId]) {
      const getGuideName = (idOrName: string) => {
        if (!idOrName || idOrName === 'Belum Ditentukan') return 'Belum Ditentukan';
        if (idOrName.startsWith('chap-wali-auto-')) {
          const classId = idOrName.replace('chap-wali-auto-', '');
          const foundClass = classes?.find(c => c.id === classId || c.name === classId);
          if (foundClass && foundClass.homeroomTeacher) {
            return `${foundClass.homeroomTeacher} (${foundClass.name})`;
          }
        }
        const found = settings?.masterChaperones?.find(c => c.id === idOrName);
        return found ? found.name : idOrName;
      };
      return {
        guide1: getGuideName(effectiveCustomGuides[busId].guide1),
        guide2: getGuideName(effectiveCustomGuides[busId].guide2),
        guide3: getGuideName(effectiveCustomGuides[busId].guide3 || ''),
        guide4: getGuideName(effectiveCustomGuides[busId].guide4 || ''),
      };
    }

    // Default fallbacks
    let guide1 = 'Belum Ditentukan';
    let guide2 = 'Belum Ditentukan';
    let guide3 = 'Belum Ditentukan';
    let guide4 = 'Belum Ditentukan';

    // Filter students assigned to this bus
    const busStudents = allStudents.filter((s) => assignedStudentIds.includes(s.id));
    if (busStudents.length === 0) {
      return { guide1, guide2, guide3, guide4 };
    }

    // 2. Count students per class to find majority
    const classCounts: { [className: string]: number } = {};
    busStudents.forEach((s) => {
      if (s.className) {
        classCounts[s.className] = (classCounts[s.className] || 0) + 1;
      }
    });

    // Sort classes by student count descending (majority class first)
    const sortedClasses = Object.keys(classCounts).sort((a, b) => classCounts[b] - classCounts[a]);

    // Helper to find the homeroom teacher for each class
    const getTeacherForClass = (className: string): string | null => {
      const cls = classes?.find((c) => c.name === className);
      return cls && cls.homeroomTeacher ? `${cls.homeroomTeacher} (${cls.name})` : null;
    };

    // 3. Determine if this bus is the "bus awal" (first bus) for any department in this wave
    const getNormalizedDept = (deptStr: string) => {
      return getAbbreviationFromDepartment(deptStr).trim().toUpperCase();
    };

    const deptsInBus = Array.from(
      new Set(busStudents.map((s) => SeatAllocatorEngine.getStudentDepartment(s, classes)))
    );

    let activeKakomli: any = null;

    for (const d of deptsInBus) {
      if (!d) continue;

      // Find all students in this wave belonging to this department
      const allWaveStudentsOfDept = allStudents.filter(
        (s) => s.wave === wave && s.isRegistered && SeatAllocatorEngine.getStudentDepartment(s, classes) === d
      );

      // Find minimum bus number for this department in this wave
      const busNumbersOfDept = allWaveStudentsOfDept
        .map((s) => s.busNumber)
        .filter((num) => num && num > 0) as number[];

      const minBusNum = busNumbersOfDept.length > 0 ? Math.min(...busNumbersOfDept) : 0;

      // If the current bus is indeed the first bus for this department, search for its Kakomli
      if (busNum === minBusNum && minBusNum > 0) {
        const kakomli = settings?.masterChaperones?.find((c) => {
          if (c.role !== 'KAKOMLI') return false;
          const normChaperoneDept = getNormalizedDept(c.department || '');
          return normChaperoneDept === d;
        });

        if (kakomli) {
          activeKakomli = kakomli;
          break; // Take the first matching Kakomli
        }
      }
    }

    // 4. Assign guides based on Kakomli and majority class rules with Strict 1-Wali-Kelas limit
    if (activeKakomli) {
      // Kakomli goes to Guide 1
      guide1 = `${activeKakomli.name} (Kakomli ${activeKakomli.department || ''})`;
      
      // Guide 2 goes to the majority Wali Kelas (and ONLY this Wali Kelas) if Kakomli is not already a Wali Kelas on this bus
      const isKakomliWaliKelasOnBus = classes?.some((c) => c.homeroomTeacher === activeKakomli.name && sortedClasses.includes(c.name));
      if (!isKakomliWaliKelasOnBus && sortedClasses.length > 0) {
        const majTeacher = getTeacherForClass(sortedClasses[0]);
        if (majTeacher) {
          guide2 = majTeacher;
        } else {
          guide2 = 'Pendamping Umum';
        }
      } else {
        guide2 = 'Pendamping Umum';
      }
      // Guides 3 and 4 are general/public
      guide3 = 'Pendamping Umum';
      guide4 = 'Pendamping Umum';
    } else {
      // No Kakomli priority:
      // Guide 1 = Wali Kelas of the majority class
      if (sortedClasses.length > 0) {
        const majTeacher = getTeacherForClass(sortedClasses[0]);
        if (majTeacher) {
          guide1 = majTeacher;
        }
      }

      // Rest of the guides are Pendamping Umum to enforce maximum 1 Wali Kelas per bus
      guide2 = 'Pendamping Umum';
      guide3 = 'Pendamping Umum';
      guide4 = 'Pendamping Umum';
    }

    return { guide1, guide2, guide3, guide4 };
  }

  /**
   * Auto allocates seats for a single bus only within a specific wave.
   * Keeps existing seat assignments for other buses intact, placing unassigned students in available seats.
   */
  public static autoAllocateSingleBus(
    students: Student[],
    wave: WaveType,
    targetBusNumber: number,
    settings?: AppSettings,
    classes?: SchoolClass[],
    customBusGuides?: { [busId: string]: { guide1: string; guide2: string; guide3?: string; guide4?: string } }
  ): { updatedStudents: Student[]; buses: Bus[] } {
    const updated = students.map((s) => ({ ...s }));
    const waveCapacity = SeatAllocatorEngine.getSetting(settings, wave, 'defaultBusCapacity', settings?.defaultBusCapacity || 50);

    // Get available seats on target bus
    const availableSeats = SeatAllocatorEngine.getAvailableStudentSeatsForBus(
      targetBusNumber,
      wave,
      waveCapacity,
      settings
    );

    // Clear seat assignments ONLY for students currently on this bus (in this wave)
    updated.forEach((s) => {
      if (s.wave === wave && s.busNumber === targetBusNumber) {
        s.seatNumber = 0;
      }
    });

    // Collect candidates: unassigned registered students in this wave + students previously on this bus
    const candidates = updated.filter(
      (s) =>
        s.isRegistered &&
        s.destination !== 'MAGANG' &&
        s.wave === wave &&
        (!s.seatNumber || s.seatNumber === 0) &&
        (!s.busNumber || s.busNumber === 0 || s.busNumber === targetBusNumber)
    );

    const genderPriority = SeatAllocatorEngine.getSetting(settings, wave, 'genderPriority', 'female-front');
    const busSeatSort = SeatAllocatorEngine.getSetting(settings, wave, 'busSeatSort', 'name');

    // Sort candidates according to gender priority and sort setting
    candidates.sort((a, b) => {
      if (a.gender !== b.gender) {
        if (genderPriority === 'female-front') return a.gender === 'PEREMPUAN' ? -1 : 1;
        if (genderPriority === 'male-front') return a.gender === 'LAKI-LAKI' ? -1 : 1;
      }
      if (a.className !== b.className) {
        return (a.className || '').localeCompare(b.className || '');
      }
      if (busSeatSort === 'nis') {
        return (a.nis || '').localeCompare(b.nis || '');
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    // Fill available seats
    let seatIdx = 0;
    for (const cand of candidates) {
      if (seatIdx >= availableSeats.length) break;
      cand.busNumber = targetBusNumber;
      cand.seatNumber = availableSeats[seatIdx];
      seatIdx++;
    }

    // Compact target bus while strictly respecting gender bench boundaries
    const preventMix = settings?.preventMixedGenderBench !== false && settings?.busGendersNoMixBench !== false;
    const seatedOnBus = updated
      .filter((s) => s.wave === wave && s.busNumber === targetBusNumber && s.seatNumber && s.seatNumber > 0)
      .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

    SeatAllocatorEngine.compactBusSeatsWithGenderAwareness(seatedOnBus, availableSeats, preventMix);

    const buses = SeatAllocatorEngine.deriveBusesFromStudents(updated, waveCapacity, classes, customBusGuides, settings);
    return { updatedStudents: updated, buses };
  }

  /**
   * Auto allocates seats for all buses in a specific wave, preserving other waves.
   */
  public static autoAllocateWave(
    students: Student[],
    wave: WaveType,
    settings?: AppSettings,
    classes?: SchoolClass[],
    customBusGuides?: { [busId: string]: { guide1: string; guide2: string; guide3?: string; guide4?: string } }
  ): { updatedStudents: Student[]; buses: Bus[] } {
    const updated = students.map((s) => ({ ...s }));

    // Reset assignments for students in THIS wave only
    updated.forEach((s) => {
      if (s.wave === wave) {
        s.busNumber = 0;
        s.seatNumber = 0;
      }
    });

    return SeatAllocatorEngine.autoAllocateBuses(
      updated,
      settings?.defaultBusCapacity || 50,
      classes,
      customBusGuides,
      settings
    );
  }

  /**
   * Compacts seats on a specific bus by removing empty holes and shifting seated students forward in order.
   */
  public static compactBusSeats(
    students: Student[],
    wave: WaveType,
    targetBusNumber: number,
    settings?: AppSettings,
    classes?: SchoolClass[],
    customBusGuides?: { [busId: string]: { guide1: string; guide2: string; guide3?: string; guide4?: string } }
  ): { updatedStudents: Student[]; buses: Bus[] } {
    const updated = students.map((s) => ({ ...s }));
    const waveCapacity = SeatAllocatorEngine.getSetting(settings, wave, 'defaultBusCapacity', settings?.defaultBusCapacity || 50);

    const availableSeats = SeatAllocatorEngine.getAvailableStudentSeatsForBus(
      targetBusNumber,
      wave,
      waveCapacity,
      settings
    );

    // Get all students currently seated in this bus, sorted by seatNumber
    const preventMix = settings?.preventMixedGenderBench !== false && settings?.busGendersNoMixBench !== false;
    const seated = updated
      .filter((s) => s.wave === wave && s.busNumber === targetBusNumber && s.seatNumber && s.seatNumber > 0)
      .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

    SeatAllocatorEngine.compactBusSeatsWithGenderAwareness(seated, availableSeats, preventMix);

    const buses = SeatAllocatorEngine.deriveBusesFromStudents(updated, waveCapacity, classes, customBusGuides, settings);
    return { updatedStudents: updated, buses };
  }

  /**
   * Performs a cascade shift when a student is manually assigned to an occupied seat.
   * Uses physical max bus capacity (50) as the hard ceiling to allow manual 46 -> 47/48/49/50 seat additions.
   */
  public static handleManualSeatAssignment(
    students: Student[],
    studentId: string,
    targetBusNumber: number,
    targetSeatNumber: number,
    busCapacity: number = 50
  ): { updatedStudents: Student[]; pushedStudent: Student | null } {
    const updated = students.map((s) => ({ ...s }));
    const targetStudent = updated.find((s) => s.id === studentId);
    if (!targetStudent) return { updatedStudents: updated, pushedStudent: null };

    const wave = targetStudent.wave;
    if (!wave || targetBusNumber === 0 || targetSeatNumber === 0) {
      // Just unassign or set directly if 0
      const student = updated.find((s) => s.id === studentId);
      if (student) {
        student.busNumber = 0;
        student.seatNumber = 0;
      }
      return { updatedStudents: updated, pushedStudent: null };
    }

    let studentHolding: Student | null = { ...targetStudent, busNumber: targetBusNumber, seatNumber: targetSeatNumber };
    let currentTargetSeat = targetSeatNumber;
    let pushedStudent: Student | null = null;
    const maxSeatCeiling = Math.max(50, busCapacity);

    // Remove the moving student from their old seat in the working copy to avoid self-collision
    const tempIndex = updated.findIndex(s => s.id === studentId);
    if (tempIndex !== -1) {
      updated[tempIndex].busNumber = 0;
      updated[tempIndex].seatNumber = 0;
    }

    while (studentHolding !== null) {
      if (currentTargetSeat > maxSeatCeiling) {
        // Pushed out of the bus only if exceeding the physical maximum 50 seats
        pushedStudent = studentHolding;
        pushedStudent.busNumber = 0;
        pushedStudent.seatNumber = 0;
        
        // Save the pushed student's state back into the array
        const idx = updated.findIndex(s => s.id === pushedStudent!.id);
        if (idx !== -1) {
          updated[idx] = pushedStudent;
        }
        break;
      }

      // Find if there is an existing student at currentTargetSeat on this bus
      const existingIndex = updated.findIndex(
        s => s.wave === wave && s.busNumber === targetBusNumber && s.seatNumber === currentTargetSeat && s.id !== studentHolding!.id
      );

      if (existingIndex === -1) {
        // Seat is empty! Place the holding student here and stop cascade.
        const holdingCopy = { ...studentHolding, busNumber: targetBusNumber, seatNumber: currentTargetSeat };
        const idx = updated.findIndex(s => s.id === holdingCopy.id);
        if (idx !== -1) {
          updated[idx] = holdingCopy;
        }
        studentHolding = null;
      } else {
        // Seat is occupied!
        const existingStudent = { ...updated[existingIndex] };
        
        // Place the holding student in this seat
        const holdingCopy = { ...studentHolding, busNumber: targetBusNumber, seatNumber: currentTargetSeat };
        const idx = updated.findIndex(s => s.id === holdingCopy.id);
        if (idx !== -1) {
          updated[idx] = holdingCopy;
        }

        // The existing student is now held and will be shifted to the next seat
        studentHolding = existingStudent;
        currentTargetSeat++;
      }
    }

    return { updatedStudents: updated, pushedStudent };
  }
}
