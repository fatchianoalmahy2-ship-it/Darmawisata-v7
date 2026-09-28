import { Student, Room, GenderType, WaveType, AppSettings, SchoolClass } from '@/types';
import { getDepartmentFromClassName, getAbbreviationFromDepartment, normalizeClassName } from '@/lib/utils';

export class RoomAllocatorEngine {
  /**
   * Helper to determine student department.
   */
  public static getStudentDepartment(student: Student, classes?: SchoolClass[]): string {
    const clsObj = classes?.find((c) => normalizeClassName(c.name) === normalizeClassName(student.className));
    let dept = clsObj?.department || '';
    if (!dept && student.className) {
      dept = getDepartmentFromClassName(student.className);
    }
    const abbr = getAbbreviationFromDepartment(dept).trim().toUpperCase();
    return abbr || 'LAIN';
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
    const waveOverride = settings.waveRoomSettings?.[wave];
    if (waveOverride && (waveOverride as any)[key] !== undefined) {
      return (waveOverride as any)[key];
    }
    if (settings[key] !== undefined) {
      return settings[key];
    }
    return defaultValue;
  }

  /**
   * Main auto-allocation algorithm for students into rooms.
   * Priority Hierarchy:
   * Level 1: Intra-Class (Satu Kelas) per Bus -> Isi kamar penuh (4 bed) dari kelas yang sama.
   * Level 2: Intra-Department (Satu Jurusan) per Bus -> Sisa kelas dalam 1 jurusan digabung (2+2, 3+1, dst).
   * Level 3: Cross-Department per Bus -> Sisa kelas lintas jurusan di bus yang sama digabung membentuk kamar 4.
   * Level 4: Cross-Bus Leftover Merging (Lintas Bus per Gelombang) -> Sisa-sisa bus dalam gelombang & gender yang sama digabungkan membentuk kamar penuh (2+2, 3+1, 2+1+1).
   * Tail: Maksimal 1 kamar sisa per gelombang. Jika sisa 1 siswa, pinjam 1 siswa dari kamar penuh sehingga menjadi 3 + 2.
   */
  public static autoAllocateRooms(
    students: Student[],
    roomCapacity: number = 4,
    settings?: AppSettings,
    classes?: SchoolClass[]
  ): { updatedStudents: Student[]; rooms: Room[] } {
    const updated = students.map((s) => ({ ...s }));
    const roomMap: Map<string, Room> = new Map();

    // Separate students by Wave
    const waves: WaveType[] = ['BALI_GEL_1', 'BALI_GEL_2', 'YOGYA_GEL_1'];
    const genders: GenderType[] = ['PEREMPUAN', 'LAKI-LAKI']; // Female rooms first, then Male

    waves.forEach((wave) => {
      let currentRoomId = 1;

      // Resolve dynamic room capacity from settings, strictly defaulting to 4 for students
      const capacity = RoomAllocatorEngine.getSetting(settings, wave, 'defaultRoomCapacity', roomCapacity || 4);

      // Filter active registered students for this wave (excluding Magang and unregistered)
      const wavePool = updated.filter(
        (s) => s.isRegistered !== false && s.destination !== 'MAGANG' && s.wave === wave
      );

      if (wavePool.length === 0) return;

      genders.forEach((gender) => {
        const waveGenderPool = wavePool.filter((s) => s.gender === gender);
        if (waveGenderPool.length === 0) return;

        // Allocate students across wave & gender with priority: Bus -> Class -> Dept -> Cross-Dept -> Cross-Bus
        const waveGenderRooms = RoomAllocatorEngine.allocateWaveGenderPool(waveGenderPool, capacity, classes);

        // Assign room numbers, bed numbers, and create Room objects
        waveGenderRooms.forEach((roomStudents) => {
          if (roomStudents.length === 0) return;
          const roomId = `room-${wave}-${currentRoomId}`;

          // Calculate dominant bus by student plurality in this room
          const busCountMap: Record<number, number> = {};
          roomStudents.forEach((st) => {
            if (st.busNumber && st.busNumber > 0) {
              busCountMap[st.busNumber] = (busCountMap[st.busNumber] || 0) + 1;
            }
          });
          let primaryBus: number | undefined = undefined;
          let maxBusCount = 0;
          Object.entries(busCountMap).forEach(([bNumStr, cnt]) => {
            if (cnt > maxBusCount) {
              maxBusCount = cnt;
              primaryBus = Number(bNumStr);
            }
          });

          roomStudents.forEach((student, bedIdx) => {
            student.roomNumber = currentRoomId;
            student.bedNumber = bedIdx + 1;
          });

          roomMap.set(roomId, {
            id: roomId,
            roomNumber: currentRoomId,
            gender,
            capacity,
            wave,
            busNumber: primaryBus,
            assignedStudentIds: roomStudents.map((s) => s.id),
          });
          currentRoomId++;
        });
      });
    });

    return {
      updatedStudents: updated,
      rooms: Array.from(roomMap.values()),
    };
  }

  /**
   * Helper algorithm to allocate a whole wave & gender student pool into rooms.
   * Priority: Bus -> Class -> Dept -> Cross-Dept -> Cross-Bus Merging.
   * Rules:
   * - Max room capacity (default 4).
   * - Full rooms formed from the same class & bus first.
   * - Sisa 5 siswa dipecah menjadi 3 + 2.
   * - Sisa 2 siswa dipasangkan dengan sisa 2 siswa lain (2+2=4), baik satu bus maupun lintas bus dalam gelombang yang sama.
   * - Sisa 1 siswa digabung dengan sisa 3 atau 1 lainnya.
   * - Dijamin tidak ada siswa yang sendirian (anti-isolasi).
   */
  public static allocateWaveGenderPool(
    waveGenderPool: Student[],
    maxCapacity: number = 4,
    classes?: SchoolClass[]
  ): Student[][] {
    if (waveGenderPool.length === 0) return [];

    const finalizedRooms: Student[][] = [];

    // Group students by Bus Number
    const busNumbers = Array.from(
      new Set(waveGenderPool.map((s) => (s.busNumber && s.busNumber > 0 ? s.busNumber : 0)))
    ).sort((a, b) => {
      if (a === 0) return 1;
      if (b === 0) return -1;
      return a - b;
    });

    // Structure for leftover chunks across the wave
    interface LeftoverChunk {
      id: string;
      busNumber: number;
      className: string;
      dept: string;
      students: Student[];
    }

    let globalChunks: LeftoverChunk[] = [];
    let chunkIdCounter = 1;

    // Step 1: Per Bus, extract full rooms and structured leftover chunks
    busNumbers.forEach((busNum) => {
      const busPool = waveGenderPool.filter((s) =>
        busNum === 0 ? !s.busNumber || s.busNumber <= 0 : s.busNumber === busNum
      );
      if (busPool.length === 0) return;

      const classMap = new Map<string, Student[]>();
      busPool.forEach((st) => {
        const cls = st.className || 'UNKNOWN';
        if (!classMap.has(cls)) {
          classMap.set(cls, []);
        }
        classMap.get(cls)!.push(st);
      });

      let busChunks: LeftoverChunk[] = [];

      classMap.forEach((classStudents, className) => {
        classStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id'));
        const count = classStudents.length;
        const dept = RoomAllocatorEngine.getStudentDepartment(classStudents[0], classes);

        if (maxCapacity === 4) {
          if (count === 5) {
            busChunks.push({ id: `c_${chunkIdCounter++}`, busNumber: busNum, className, dept, students: classStudents.slice(0, 3) });
            busChunks.push({ id: `c_${chunkIdCounter++}`, busNumber: busNum, className, dept, students: classStudents.slice(3) });
          } else if (count > 5 && count % 4 === 1) {
            const fullCount = Math.floor(count / 4) - 1;
            for (let i = 0; i < fullCount; i++) {
              finalizedRooms.push(classStudents.slice(i * 4, (i + 1) * 4));
            }
            const remaining5 = classStudents.slice(fullCount * 4);
            busChunks.push({ id: `c_${chunkIdCounter++}`, busNumber: busNum, className, dept, students: remaining5.slice(0, 3) });
            busChunks.push({ id: `c_${chunkIdCounter++}`, busNumber: busNum, className, dept, students: remaining5.slice(3) });
          } else {
            const fullCount = Math.floor(count / 4);
            for (let i = 0; i < fullCount; i++) {
              finalizedRooms.push(classStudents.slice(i * 4, (i + 1) * 4));
            }
            const rem = classStudents.slice(fullCount * 4);
            if (rem.length > 0) {
              busChunks.push({ id: `c_${chunkIdCounter++}`, busNumber: busNum, className, dept, students: rem });
            }
          }
        } else {
          const fullCount = Math.floor(count / maxCapacity);
          for (let i = 0; i < fullCount; i++) {
            finalizedRooms.push(classStudents.slice(i * maxCapacity, (i + 1) * maxCapacity));
          }
          const rem = classStudents.slice(fullCount * maxCapacity);
          if (rem.length > 0) {
            busChunks.push({ id: `c_${chunkIdCounter++}`, busNumber: busNum, className, dept, students: rem });
          }
        }
      });

      // Internal chunk matcher helper
      const tryMatch = (targetList: LeftoverChunk[]): boolean => {
        if (maxCapacity === 4) {
          // Pattern 1: 2 + 2 = 4 (Prioritas utama teman sekelas)
          for (let i = 0; i < targetList.length; i++) {
            if (targetList[i].students.length === 2) {
              for (let j = i + 1; j < targetList.length; j++) {
                if (targetList[j].students.length === 2) {
                  const room = [...targetList[i].students, ...targetList[j].students];
                  finalizedRooms.push(room);
                  const idI = targetList[i].id;
                  const idJ = targetList[j].id;
                  busChunks = busChunks.filter((c) => c.id !== idI && c.id !== idJ);
                  return true;
                }
              }
            }
          }
          // Pattern 2: 3 + 1 = 4
          for (let i = 0; i < targetList.length; i++) {
            if (targetList[i].students.length === 3) {
              for (let j = 0; j < targetList.length; j++) {
                if (i !== j && targetList[j].students.length === 1) {
                  const room = [...targetList[i].students, ...targetList[j].students];
                  finalizedRooms.push(room);
                  const idI = targetList[i].id;
                  const idJ = targetList[j].id;
                  busChunks = busChunks.filter((c) => c.id !== idI && c.id !== idJ);
                  return true;
                }
              }
            }
          }
          // Pattern 3: 2 + 1 + 1 = 4
          for (let i = 0; i < targetList.length; i++) {
            if (targetList[i].students.length === 2) {
              const ones = targetList.filter((c, idx) => idx !== i && c.students.length === 1);
              if (ones.length >= 2) {
                const room = [...targetList[i].students, ...ones[0].students, ...ones[1].students];
                finalizedRooms.push(room);
                const idI = targetList[i].id;
                const id1 = ones[0].id;
                const id2 = ones[1].id;
                busChunks = busChunks.filter((c) => c.id !== idI && c.id !== id1 && c.id !== id2);
                return true;
              }
            }
          }
          // Pattern 4: 1 + 1 + 1 + 1 = 4
          const allOnes = targetList.filter((c) => c.students.length === 1);
          if (allOnes.length >= 4) {
            const room = [
              ...allOnes[0].students,
              ...allOnes[1].students,
              ...allOnes[2].students,
              ...allOnes[3].students,
            ];
            finalizedRooms.push(room);
            const usedIds = new Set([allOnes[0].id, allOnes[1].id, allOnes[2].id, allOnes[3].id]);
            busChunks = busChunks.filter((c) => !usedIds.has(c.id));
            return true;
          }
        }
        return false;
      };

      // Step 2A: Intra-Department Matching within same bus
      const departments = Array.from(new Set(busChunks.map((c) => c.dept)));
      departments.forEach((dept) => {
        let matched = true;
        while (matched) {
          const deptChunks = busChunks.filter((c) => c.dept === dept);
          if (deptChunks.length === 0) break;
          matched = tryMatch(deptChunks);
        }
      });

      // Step 2B: Cross-Department Matching within same bus
      let crossMatched = true;
      while (crossMatched) {
        if (busChunks.length === 0) break;
        crossMatched = tryMatch(busChunks);
      }

      // Collect remaining leftover chunks from this bus into the global wave pool
      globalChunks.push(...busChunks);
    });

    // =========================================================================
    // STEP 2: CROSS-BUS RECONCILIATION & BUDDY MATCHING (LINTAS BUS PER GELOMBANG)
    // =========================================================================

    // 2.1: CROSS-BUS SAME-CLASS REUNION (Reuni Teman Sekelas yang Terpisah Bus)
    // Pindai apakah ada sisa siswa dari kelas yang sama di bus berbeda untuk disatukan kembali
    let classReunionFound = true;
    while (classReunionFound) {
      classReunionFound = false;
      const classNames = Array.from(new Set(globalChunks.map((c) => c.className)));
      for (const clsName of classNames) {
        const sameClassChunks = globalChunks.filter((c) => c.className === clsName);
        if (sameClassChunks.length > 1) {
          const allClassStudents = sameClassChunks.flatMap((c) => c.students);
          const chunkIdsToRemove = new Set(sameClassChunks.map((c) => c.id));
          globalChunks = globalChunks.filter((c) => !chunkIdsToRemove.has(c.id));

          if (allClassStudents.length >= 4) {
            finalizedRooms.push(allClassStudents.slice(0, 4));
            const remClassStudents = allClassStudents.slice(4);
            if (remClassStudents.length > 0) {
              globalChunks.push({
                id: `c_${chunkIdCounter++}`,
                busNumber: sameClassChunks[0].busNumber,
                className: clsName,
                dept: sameClassChunks[0].dept,
                students: remClassStudents,
              });
            }
          } else {
            // Gabungkan menjadi satu chunk utuh (misal 1 + 1 = 2 atau 2 + 1 = 3) agar tetap bersama
            globalChunks.push({
              id: `c_${chunkIdCounter++}`,
              busNumber: sameClassChunks[0].busNumber,
              className: clsName,
              dept: sameClassChunks[0].dept,
              students: allClassStudents,
            });
          }
          classReunionFound = true;
          break;
        }
      }
    }

    // 2.2: GLOBAL CHUNK MATCHING HELPER
    const tryMatchGlobal = (targetList: LeftoverChunk[]): boolean => {
      if (maxCapacity === 4) {
        // PRIORITAS A: 2 + 2 = 4 (Buddy System: 2 siswa Kelas A + 2 siswa Kelas B)
        // Sub-prioritas A1: Sesama Jurusan
        for (let i = 0; i < targetList.length; i++) {
          if (targetList[i].students.length === 2) {
            for (let j = i + 1; j < targetList.length; j++) {
              if (targetList[j].students.length === 2 && targetList[i].dept === targetList[j].dept) {
                finalizedRooms.push([...targetList[i].students, ...targetList[j].students]);
                const idI = targetList[i].id;
                const idJ = targetList[j].id;
                globalChunks = globalChunks.filter((c) => c.id !== idI && c.id !== idJ);
                return true;
              }
            }
          }
        }
        // Sub-prioritas A2: Lintas Jurusan (tetap terjamin punya 1 teman sekelas)
        for (let i = 0; i < targetList.length; i++) {
          if (targetList[i].students.length === 2) {
            for (let j = i + 1; j < targetList.length; j++) {
              if (targetList[j].students.length === 2) {
                finalizedRooms.push([...targetList[i].students, ...targetList[j].students]);
                const idI = targetList[i].id;
                const idJ = targetList[j].id;
                globalChunks = globalChunks.filter((c) => c.id !== idI && c.id !== idJ);
                return true;
              }
            }
          }
        }

        // PRIORITAS B: 3 + 1 = 4 (Anti-Isolasi: prioritaskan sesama jurusan untuk siswa tunggal)
        for (let i = 0; i < targetList.length; i++) {
          if (targetList[i].students.length === 3) {
            // Coba sesama jurusan terlebih dahulu
            for (let j = 0; j < targetList.length; j++) {
              if (i !== j && targetList[j].students.length === 1 && targetList[i].dept === targetList[j].dept) {
                finalizedRooms.push([...targetList[i].students, ...targetList[j].students]);
                const idI = targetList[i].id;
                const idJ = targetList[j].id;
                globalChunks = globalChunks.filter((c) => c.id !== idI && c.id !== idJ);
                return true;
              }
            }
            // Fallback: lintas jurusan
            for (let j = 0; j < targetList.length; j++) {
              if (i !== j && targetList[j].students.length === 1) {
                finalizedRooms.push([...targetList[i].students, ...targetList[j].students]);
                const idI = targetList[i].id;
                const idJ = targetList[j].id;
                globalChunks = globalChunks.filter((c) => c.id !== idI && c.id !== idJ);
                return true;
              }
            }
          }
        }

        // PRIORITAS C: 2 + 1 + 1 = 4
        for (let i = 0; i < targetList.length; i++) {
          if (targetList[i].students.length === 2) {
            const ones = targetList.filter((c, idx) => idx !== i && c.students.length === 1);
            if (ones.length >= 2) {
              ones.sort((a, b) => (a.dept === targetList[i].dept ? -1 : 1));
              finalizedRooms.push([...targetList[i].students, ...ones[0].students, ...ones[1].students]);
              const idI = targetList[i].id;
              const id1 = ones[0].id;
              const id2 = ones[1].id;
              globalChunks = globalChunks.filter((c) => c.id !== idI && c.id !== id1 && c.id !== id2);
              return true;
            }
          }
        }

        // PRIORITAS D: 1 + 1 + 1 + 1 = 4
        const allOnes = targetList.filter((c) => c.students.length === 1);
        if (allOnes.length >= 4) {
          allOnes.sort((a, b) => a.dept.localeCompare(b.dept));
          finalizedRooms.push([
            ...allOnes[0].students,
            ...allOnes[1].students,
            ...allOnes[2].students,
            ...allOnes[3].students,
          ]);
          const usedIds = new Set([allOnes[0].id, allOnes[1].id, allOnes[2].id, allOnes[3].id]);
          globalChunks = globalChunks.filter((c) => !usedIds.has(c.id));
          return true;
        }
      }
      return false;
    };

    // Jalankan pencocokan global sesama jurusan dulu, kemudian lintas jurusan
    const globalDepts = Array.from(new Set(globalChunks.map((c) => c.dept)));
    globalDepts.forEach((dept) => {
      let matched = true;
      while (matched) {
        const deptChunks = globalChunks.filter((c) => c.dept === dept);
        if (deptChunks.length === 0) break;
        matched = tryMatchGlobal(deptChunks);
      }
    });

    let globalCrossMatched = true;
    while (globalCrossMatched) {
      if (globalChunks.length === 0) break;
      globalCrossMatched = tryMatchGlobal(globalChunks);
    }

    // =========================================================================
    // STEP 3: WAVE FINAL TAIL HANDLING (MAKSIMAL 1 KAMAR SISA DI SELURUH GELOMBANG)
    // =========================================================================
    const waveTailStudents: Student[] = globalChunks.flatMap((c) => c.students);
    let remStudents = [...waveTailStudents];

    while (remStudents.length > 0) {
      const totalRem = remStudents.length;
      if (totalRem === maxCapacity || totalRem === 3 || totalRem === 2) {
        finalizedRooms.push(remStudents);
        remStudents = [];
      } else if (totalRem === 5) {
        // Sisa 5 di ujung gelombang: pecah jadi 3 + 2
        finalizedRooms.push(remStudents.slice(0, 3));
        finalizedRooms.push(remStudents.slice(3));
        remStudents = [];
      } else if (totalRem === 1) {
        // Jika sisa 1 siswa saja di ujung gelombang, pinjam 1 siswa dari kamar penuh terakhir agar jadi 3 + 2
        if (finalizedRooms.length > 0 && finalizedRooms[finalizedRooms.length - 1].length >= 4) {
          const lastFullRoom = finalizedRooms.pop()!;
          const borrowedStudent = lastFullRoom.pop()!;
          finalizedRooms.push(lastFullRoom); // menjadi 3
          finalizedRooms.push([borrowedStudent, remStudents[0]]); // menjadi 2 (tidak ada siswa sendirian)
        } else {
          finalizedRooms.push(remStudents);
        }
        remStudents = [];
      } else if (totalRem > maxCapacity) {
        if (totalRem === maxCapacity + 1) {
          finalizedRooms.push(remStudents.slice(0, 3));
          remStudents = remStudents.slice(3);
        } else {
          finalizedRooms.push(remStudents.slice(0, maxCapacity));
          remStudents = remStudents.slice(maxCapacity);
        }
      } else {
        finalizedRooms.push(remStudents);
        remStudents = [];
      }
    }

    return finalizedRooms;
  }

  /**
   * Automatically synchronizes a single student's room assignment when their bus changes.
   * If moved out of bus (newBusNumber <= 0), their room is cleared.
   * If moved to a new bus, it finds the best matching room on that new bus with available capacity,
   * prioritizing same class and same department. If none available, creates the next available room for that bus.
   */
  public static reassignStudentToBusRoom(
    students: Student[],
    studentId: string,
    newBusNumber: number,
    settings?: AppSettings,
    classes?: SchoolClass[]
  ): { updatedStudents: Student[]; targetRoomNumber?: number } {
    const updated = students.map((s) => ({ ...s }));
    const targetIdx = updated.findIndex((s) => s.id === studentId);
    if (targetIdx === -1) return { updatedStudents: updated };

    const target = updated[targetIdx];
    const wave = target.wave || 'BALI_GEL_1';
    const gender = target.gender || 'LAKI-LAKI';
    const capacity = RoomAllocatorEngine.getSetting(settings, wave, 'defaultRoomCapacity', 4);

    // If unseated or removed from bus
    if (!newBusNumber || newBusNumber <= 0) {
      target.roomNumber = undefined;
      target.bedNumber = undefined;
      return { updatedStudents: updated };
    }

    target.busNumber = newBusNumber;

    // Check if the student's current room is already exclusively within the new bus
    if (target.roomNumber) {
      const roomOccupants = updated.filter(
        (s) => s.id !== target.id && s.wave === wave && s.roomNumber === target.roomNumber
      );
      const isPureNewBus = roomOccupants.length === 0 || roomOccupants.every((s) => s.busNumber === newBusNumber);
      if (isPureNewBus && roomOccupants.length < capacity) {
        // Can stay in current room, just ensure bedNumber is valid
        target.bedNumber = roomOccupants.length + 1;
        return { updatedStudents: updated, targetRoomNumber: target.roomNumber };
      }
    }

    // Find all active rooms in the new bus with same wave and gender
    const busStudents = updated.filter(
      (s) => s.id !== target.id && s.wave === wave && s.gender === gender && s.busNumber === newBusNumber && s.roomNumber
    );

    const roomOccupantsMap = new Map<number, Student[]>();
    busStudents.forEach((s) => {
      const rNum = s.roomNumber!;
      if (!roomOccupantsMap.has(rNum)) {
        roomOccupantsMap.set(rNum, []);
      }
      roomOccupantsMap.get(rNum)!.push(s);
    });

    const targetDept = RoomAllocatorEngine.getStudentDepartment(target, classes);

    // Candidate rooms with capacity < capacity
    const availableRooms: { roomNumber: number; occupants: Student[]; score: number }[] = [];
    roomOccupantsMap.forEach((occupants, roomNumber) => {
      if (occupants.length < capacity) {
        let score = 0;
        // High score if same class
        if (occupants.some((o) => o.className === target.className)) {
          score += 10;
        }
        // Medium score if same department
        if (occupants.some((o) => RoomAllocatorEngine.getStudentDepartment(o, classes) === targetDept)) {
          score += 5;
        }
        availableRooms.push({ roomNumber, occupants, score });
      }
    });

    if (availableRooms.length > 0) {
      // Pick best matching room
      availableRooms.sort((a, b) => b.score - a.score || a.occupants.length - b.occupants.length);
      const chosen = availableRooms[0];
      target.roomNumber = chosen.roomNumber;
      target.bedNumber = chosen.occupants.length + 1;
      return { updatedStudents: updated, targetRoomNumber: target.roomNumber };
    }

    // No existing room in new bus has space -> Provision next available room number for this wave
    const allUsedRoomNumbers = updated
      .filter((s) => s.wave === wave && s.roomNumber && s.roomNumber > 0)
      .map((s) => s.roomNumber!);
    const nextRoomNumber = allUsedRoomNumbers.length > 0 ? Math.max(...allUsedRoomNumbers) + 1 : 1;

    target.roomNumber = nextRoomNumber;
    target.bedNumber = 1;
    return { updatedStudents: updated, targetRoomNumber: target.roomNumber };
  }

  /**
   * Compatibility alias for allocateBusGenderPool
   */
  public static allocateBusGenderPool(
    genderPool: Student[],
    maxCapacity: number = 4,
    classes?: SchoolClass[]
  ): Student[][] {
    return RoomAllocatorEngine.allocateWaveGenderPool(genderPool, maxCapacity, classes);
  }

  /**
   * Generates room views from student assignments.
   */
  public static deriveRoomsFromStudents(students: Student[], capacity: number = 4, settings?: AppSettings): Room[] {
    const roomsMap = new Map<string, Room>();

    students.forEach((s) => {
      if (!s.roomNumber || !s.wave || s.destination === 'MAGANG') return;
      const roomNum = s.roomNumber;
      const key = `${s.wave}-${roomNum}`;
      const waveCapacity = RoomAllocatorEngine.getSetting(settings, s.wave, 'defaultRoomCapacity', capacity || 4);
      if (!roomsMap.has(key)) {
        roomsMap.set(key, {
          id: `room-${s.wave}-${roomNum}`,
          roomNumber: roomNum,
          gender: s.gender || 'LAKI-LAKI',
          capacity: waveCapacity,
          wave: s.wave,
          busNumber: s.busNumber || undefined,
          assignedStudentIds: [],
        });
      }
      roomsMap.get(key)!.assignedStudentIds.push(s.id);
    });

    const waveGroupMap = new Map<string, Room[]>();
    Array.from(roomsMap.values()).forEach((r) => {
      if (!waveGroupMap.has(r.wave)) {
        waveGroupMap.set(r.wave, []);
      }
      waveGroupMap.get(r.wave)!.push(r);
    });

    const result: Room[] = [];
    waveGroupMap.forEach((waveRooms) => {
      waveRooms.sort((a, b) => a.roomNumber - b.roomNumber);
      waveRooms.forEach((r, idx) => {
        r.displayRoomNumber = idx + 1;
        const roomOccupants = students.filter(
          (st) => st.wave === r.wave && st.roomNumber === r.roomNumber
        );
        const busCountMap: Record<number, number> = {};
        roomOccupants.forEach((st) => {
          if (st.busNumber && st.busNumber > 0) {
            busCountMap[st.busNumber] = (busCountMap[st.busNumber] || 0) + 1;
          }
        });
        let primaryBus: number | undefined = undefined;
        let maxBusCount = 0;
        Object.entries(busCountMap).forEach(([bNumStr, cnt]) => {
          if (cnt > maxBusCount) {
            maxBusCount = cnt;
            primaryBus = Number(bNumStr);
          }
        });
        r.busNumber = primaryBus;
        result.push(r);
      });
    });

    return result.sort((a, b) => {
      if (a.wave !== b.wave) return a.wave.localeCompare(b.wave);
      return (a.displayRoomNumber || a.roomNumber) - (b.displayRoomNumber || b.roomNumber);
    });
  }
}
