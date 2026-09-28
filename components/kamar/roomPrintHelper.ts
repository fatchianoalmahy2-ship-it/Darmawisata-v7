import { Student, Room, Bus, AppSettings, SchoolClass } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';
import { DestinationRulesService } from '@/services/destinationRules';

export interface RoomPrintSheet {
  sheetKey: string;
  busKey: string;
  busNum: number;
  isUnassigned: boolean;
  busRooms: {
    id: string;
    roomNumber: number;
    displayRoomNumber?: number;
    gender: string;
    capacity: number;
    wave: string;
    assignedStudentIds: string[];
    occupants: Student[];
  }[];
  femaleRooms: any[];
  maleRooms: any[];
  totalOccupants: number;
  pageIndex: number;
  totalPages: number;
}

export interface ChaperoneRoomPrintItem {
  id: string;
  roomNumber: number;
  displayRoomNumber?: number;
  gender: string;
  wave: string;
  chaperones: {
    id: string;
    name: string;
    role?: string;
    department?: string;
    busNumber?: number;
  }[];
}

export interface RoomPrintOptions {
  roomType: 'STUDENT' | 'CHAPERONE';
  selectedWave: string;
  busSheets?: RoomPrintSheet[];
  chaperoneRooms?: ChaperoneRoomPrintItem[];
  buses: Bus[];
  settings?: AppSettings;
  defaultRoomCapacity?: number;
}

export function generateRoomPrintDocumentHtml(options: RoomPrintOptions): string {
  const {
    roomType,
    selectedWave,
    busSheets = [],
    chaperoneRooms = [],
    buses,
    settings,
    defaultRoomCapacity = 4,
  } = options;

  const schoolName = settings?.schoolName || schoolMetadata.school.name;
  const logoUrl = settings?.appLogoUrl || schoolMetadata.school.logo || '';
  const waveLabel =
    schoolMetadata.waves.find((w) => w.id === selectedWave)?.name || selectedWave;
  const formattedDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let pagesHtml = '';

  if (roomType === 'STUDENT') {
    if (busSheets.length === 0) return '';

    busSheets.forEach((sheet) => {
      const {
        busNum,
        isUnassigned,
        busRooms,
        femaleRooms,
        maleRooms,
        totalOccupants,
        pageIndex,
        totalPages,
      } = sheet;

      const busObj = buses.find(
        (b) =>
          b.busNumber === busNum &&
          (selectedWave === 'ALL' || b.wave === selectedWave)
      );

      const FIXED_ROOM_BLOCKS = 12;
      const emptyRoomCount = Math.max(0, FIXED_ROOM_BLOCKS - busRooms.length);
      const allRoomBlocks: {
        isPlaceholder: boolean;
        placeholderIdx?: number;
        room?: (typeof busRooms)[0];
      }[] = [];

      // 50:50 Fair internal room division between Guru Pendamping 1 (P1) and Guru Pendamping 2 (P2)
      const picAssignmentMap = new Map<number, 'P1' | 'P2'>();
      const half = Math.ceil(busRooms.length / 2);
      busRooms.forEach((r, idx) => {
        picAssignmentMap.set(r.roomNumber, idx < half ? 'P1' : 'P2');
      });
      const p1Count = Array.from(picAssignmentMap.values()).filter((v) => v === 'P1').length;
      const p2Count = Array.from(picAssignmentMap.values()).filter((v) => v === 'P2').length;

      busRooms.forEach((r) => {
        allRoomBlocks.push({ isPlaceholder: false, room: r });
      });

      for (let p = 0; p < emptyRoomCount; p++) {
        allRoomBlocks.push({
          isPlaceholder: true,
          placeholderIdx: busRooms.length + p + 1,
        });
      }

      let tableRowsHtml = '';

      allRoomBlocks.forEach((block, blockIdx) => {
        if (!block.isPlaceholder && block.room) {
          const room = block.room;
          const roomStudents = room.occupants || [];
          const emptySlots = Math.max(
            0,
            (room.capacity || defaultRoomCapacity) - roomStudents.length
          );

          const allSlots: {
            isStudent: boolean;
            student?: Student;
          }[] = [];

          roomStudents.forEach((st) => {
            allSlots.push({ isStudent: true, student: st });
          });

          for (let i = 0; i < emptySlots; i++) {
            allSlots.push({ isStudent: false });
          }

          const totalRows = allSlots.length || 1;

          allSlots.forEach((slot, slotIdx) => {
            const isFirst = slotIdx === 0;
            const isMale = slot.student?.gender === 'LAKI-LAKI';

            tableRowsHtml += `
              <tr class="${!slot.isStudent ? 'row-empty-slot' : isMale ? 'row-student-male' : 'row-student-female'}">
                ${
                  isFirst
                    ? `<td rowspan="${totalRows}" class="col-room-num">
                        <div class="room-idx">${room.displayRoomNumber || blockIdx + 1}</div>
                        <div class="room-gender-tag">${room.gender === 'PEREMPUAN' ? 'PUTRI' : 'PUTRA'} • ${picAssignmentMap.get(room.roomNumber) || 'P1'}</div>
                      </td>`
                    : ''
                }
                <td class="col-center col-bold text-nowrap">${slot.isStudent ? slot.student?.className || '-' : '-'}</td>
                <td class="col-nama">
                  ${
                    slot.isStudent
                      ? `<span class="st-name">${slot.student?.name}</span>`
                      : `<span class="st-empty-slot">[ Slot Kosong ]</span>`
                  }
                </td>
                <td class="col-center col-bold">${slot.isStudent ? (isMale ? 'L' : 'P') : '-'}</td>
                <td class="col-center col-bold">
                  ${
                    slot.isStudent
                      ? '<span class="tag-terisi">Terisi</span>'
                      : '<span class="tag-kosong">Kosong</span>'
                  }
                </td>
                <td class="col-center col-bold text-nowrap">
                  ${
                    slot.isStudent
                      ? slot.student?.busNumber
                        ? `Bus ${slot.student.busNumber}`
                        : 'Tanpa Bus'
                      : '-'
                  }
                </td>
                <td class="col-center col-chk"><div class="chk-box"></div></td>
                <td class="col-center col-chk"><div class="chk-box"></div></td>
                <td class="col-center col-chk"><div class="chk-box"></div></td>
                <td class="col-center col-chk"><div class="chk-box"></div></td>
                <td class="col-center col-chk"><div class="chk-box"></div></td>
              </tr>
            `;
          });
        } else {
          // Placeholder Block
          const placeholderRows = Array.from({ length: defaultRoomCapacity || 4 });
          placeholderRows.forEach((_, pIdx) => {
            const isFirst = pIdx === 0;
            tableRowsHtml += `
              <tr class="row-placeholder">
                ${
                  isFirst
                    ? `<td rowspan="${defaultRoomCapacity || 4}" class="col-room-num col-placeholder-room">
                        <div class="room-idx">${blockIdx + 1}</div>
                        <div class="room-gender-tag">CADANGAN</div>
                      </td>`
                    : ''
                }
                <td class="col-center">-</td>
                <td class="col-nama col-placeholder-line">................................................</td>
                <td class="col-center">-</td>
                <td class="col-center"><span class="tag-cadangan">Cadangan</span></td>
                <td class="col-center">-</td>
                <td class="col-center col-chk"><div class="chk-box"></div></td>
                <td class="col-center col-chk"><div class="chk-box"></div></td>
                <td class="col-center col-chk"><div class="chk-box"></div></td>
                <td class="col-center col-chk"><div class="chk-box"></div></td>
                <td class="col-center col-chk"><div class="chk-box"></div></td>
              </tr>
            `;
          });
        }
      });

      // Resolve Chaperones for signatures
      const { guide1Name, secondaryGuideLabel, secondaryGuideName } =
        DestinationRulesService.resolveChaperones(selectedWave, busObj, settings);

      const busLabel = isUnassigned
        ? 'Armada Bus'
        : `Armada Bus #${busNum || '-'}`;

      pagesHtml += `
        <div class="room-page">
          <!-- 1. Header KOP -->
          <div class="room-header">
            <div class="room-header-left">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" class="room-logo" alt="Logo" onerror="this.style.display='none'" />`
                  : '<div class="room-logo-placeholder">🏛️</div>'
              }
              <div>
                <h4 class="room-school-name">${schoolName}</h4>
                <p class="room-school-sub">${waveLabel} • TA 2025/2026</p>
              </div>
            </div>
            <div class="room-header-center">
              <span class="room-title-doc">MANIFEST KAMAR & ABSENSI</span>
              <span class="room-bus-badge">${isUnassigned ? 'TANPA BUS' : `BUS #${busNum}`}</span>
              ${totalPages > 1 ? `<span class="room-page-num">Hal ${pageIndex} / ${totalPages}</span>` : ''}
            </div>
            <div class="room-header-right">
              <div class="room-stat-badge">${totalOccupants} SISWA • ${busRooms.length} KAMAR</div>
              <div class="room-stat-sub">Putri: ${femaleRooms.length} | Putra: ${maleRooms.length} • PIC: P1 (${p1Count}) • P2 (${p2Count})</div>
            </div>
          </div>

          <!-- 2. Table Section -->
          <div class="room-table-wrap">
            <table class="room-manifest-table">
              <thead>
                <tr>
                  <th rowspan="2" style="width: 5.5%;">NO. KMR</th>
                  <th rowspan="2" style="width: 10%;">KELAS</th>
                  <th rowspan="2" style="width: 40%;">NAMA SISWA</th>
                  <th rowspan="2" style="width: 3.5%;">L/P</th>
                  <th rowspan="2" style="width: 6.5%;">STATUS</th>
                  <th rowspan="2" style="width: 7.5%;">NO. BUS</th>
                  <th rowspan="2" style="width: 6%;">BRKT</th>
                  <th colspan="3" style="width: 15%;">ABSENSI HOTEL</th>
                  <th rowspan="2" style="width: 6%;">PLG</th>
                </tr>
                <tr class="thead-sub">
                  <th style="width: 5%;">H1</th>
                  <th style="width: 5%;">H2</th>
                  <th style="width: 5%;">H3</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>

          <!-- 3. Legend & Notes Bar -->
          <div class="room-legend-bar">
            <div class="legend-items">
              <span class="legend-title">📌 SIMBOL:</span>
              <span><strong>✓</strong> Hadir</span>
              <span><strong>S</strong> Sakit</span>
              <span><strong>I</strong> Izin</span>
              <span><strong>P</strong> Pindah</span>
            </div>
            <div class="legend-notes">
              <span class="legend-title">📝 CATATAN:</span>
              <div class="notes-line"></div>
            </div>
          </div>

          <!-- 4. Signature Matrix -->
          <div class="room-signature-section">
            <div class="sig-date">Ponorogo, ${formattedDate}</div>
            <div class="sig-grid">
              <div class="sig-col">
                <div class="sig-role">Panitia / Koordinator Lapangan</div>
                <div class="sig-sub">Panitia Darmawisata ${schoolName}</div>
                <div class="sig-spacer"></div>
                <div class="sig-name">( ................................................... )</div>
                <div class="sig-nip">NIP/NIPY: ....................................</div>
              </div>
              <div class="sig-col">
                <div class="sig-role">Guru Pendamping 1</div>
                <div class="sig-sub">Koordinator ${busLabel} • PIC P1 (${p1Count} Kmr)</div>
                <div class="sig-spacer"></div>
                <div class="sig-name">(${guide1Name ? ` ${guide1Name} ` : ' ................................................... '})</div>
                <div class="sig-nip">NIP/NIPY: ....................................</div>
              </div>
              <div class="sig-col">
                <div class="sig-role">${secondaryGuideLabel}</div>
                <div class="sig-sub">Pendamping ${busLabel} • PIC P2 (${p2Count} Kmr)</div>
                <div class="sig-spacer"></div>
                <div class="sig-name">(${secondaryGuideName ? ` ${secondaryGuideName} ` : ' ................................................... '})</div>
                <div class="sig-nip">NIP/NIPY: ....................................</div>
              </div>
            </div>
          </div>
        </div>
      `;
    });
  } else {
    // CHAPERONE Room Manifest
    if (chaperoneRooms.length === 0) return '';

    const totalChaperones = chaperoneRooms.reduce(
      (acc, r) => acc + r.chaperones.length,
      0
    );

    let chapTableRows = '';
    chaperoneRooms.forEach((room) => {
      const chaps = room.chaperones;
      const totalRows = chaps.length || 1;

      chaps.forEach((chap, idx) => {
        const isFirst = idx === 0;
        const parenIdx = chap.name.indexOf('(');
        const cleanedName =
          parenIdx !== -1 ? chap.name.substring(0, parenIdx).trim() : chap.name;

        chapTableRows += `
          <tr>
            ${
              isFirst
                ? `<td rowspan="${totalRows}" class="col-room-num">
                    <div class="room-idx">${room.displayRoomNumber || room.roomNumber}</div>
                    <div class="room-gender-tag">${room.gender === 'PEREMPUAN' ? 'PUTRI' : 'PUTRA'}</div>
                  </td>`
                : ''
            }
            <td class="col-nama">
              <div class="chap-full-name">${cleanedName}</div>
              ${
                chap.role
                  ? `<div class="chap-sub-role">${chap.role === 'WALI_KELAS' ? `Wali Kelas ${chap.department || ''}` : chap.role}</div>`
                  : ''
              }
            </td>
            <td class="col-center col-bold">${chap.busNumber ? `Bus #${chap.busNumber}` : 'Panitia'}</td>
            <td class="col-center col-paraf"><div class="paraf-line">paraf</div></td>
            <td class="col-center col-paraf"><div class="paraf-line">paraf</div></td>
          </tr>
        `;
      });
    });

    pagesHtml += `
      <div class="room-page">
        <!-- 1. Header KOP -->
        <div class="room-header">
          <div class="room-header-left">
            ${
              logoUrl
                ? `<img src="${logoUrl}" class="room-logo" alt="Logo" onerror="this.style.display='none'" />`
                : '<div class="room-logo-placeholder">🏛️</div>'
            }
            <div>
              <h4 class="room-school-name">${schoolName}</h4>
              <p class="room-school-sub">${waveLabel} • TA 2025/2026</p>
            </div>
          </div>
          <div class="room-header-center">
            <span class="room-title-doc">MANIFEST KAMAR GURU PENDAMPING & WALI KELAS</span>
          </div>
          <div class="room-header-right">
            <div class="room-stat-badge">${totalChaperones} GURU • ${chaperoneRooms.length} KAMAR</div>
          </div>
        </div>

        <!-- 2. Table Section -->
        <div class="room-table-wrap">
          <table class="room-manifest-table">
            <thead>
              <tr>
                <th style="width: 10%;">NO. KAMAR</th>
                <th style="width: 50%;">NAMA GURU / WALI KELAS</th>
                <th style="width: 14%;">ARMADA BUS</th>
                <th style="width: 13%;">TTD BERANGKAT</th>
                <th style="width: 13%;">TTD PULANG</th>
              </tr>
            </thead>
            <tbody>
              ${chapTableRows}
            </tbody>
          </table>
        </div>

        <!-- 3. Signature Matrix -->
        <div class="room-signature-section">
          <div class="sig-date">Ponorogo, ${formattedDate}</div>
          <div class="sig-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="sig-col">
              <div class="sig-role">Koordinator Lapangan</div>
              <div class="sig-sub">Panitia Darmawisata ${schoolName}</div>
              <div class="sig-spacer"></div>
              <div class="sig-name">( ................................................... )</div>
              <div class="sig-nip">NIP/NIPY: ....................................</div>
            </div>
            <div class="sig-col">
              <div class="sig-role">Ketua Panitia Darmawisata</div>
              <div class="sig-sub">${schoolName}</div>
              <div class="sig-spacer"></div>
              <div class="sig-name">( ................................................... )</div>
              <div class="sig-nip">NIP/NIPY: ....................................</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Manifest Kamar & Absensi - ${schoolName}</title>
        <style>
          @page {
            size: 210mm 297mm portrait;
            margin: 0;
          }
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          }
          .room-page {
            width: 210mm !important;
            height: 285mm !important;
            max-height: 287mm !important;
            box-sizing: border-box !important;
            padding: 4mm 6mm !important;
            margin: 0 auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            background: #ffffff !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          .room-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* KOP Header */
          .room-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 3px !important;
            margin-bottom: 2px !important;
            flex-shrink: 0 !important;
          }
          .room-header-left {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            min-width: 0 !important;
          }
          .room-logo {
            width: 32px !important;
            height: 32px !important;
            object-fit: contain !important;
          }
          .room-logo-placeholder {
            font-size: 20px !important;
          }
          .room-school-name {
            margin: 0 !important;
            font-size: 9.5px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.2px !important;
            line-height: 1.15 !important;
            color: #0f172a !important;
          }
          .room-school-sub {
            margin: 0 !important;
            font-size: 7.5px !important;
            color: #64748b !important;
            font-weight: 700 !important;
            line-height: 1.15 !important;
          }
          .room-header-center {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
          }
          .room-title-doc {
            font-size: 9.5px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: -0.2px !important;
            color: #0f172a !important;
          }
          .room-bus-badge {
            background: #0f172a !important;
            color: #facc15 !important;
            padding: 1.5px 6px !important;
            border-radius: 4px !important;
            font-size: 8px !important;
            font-weight: 900 !important;
            letter-spacing: 0.2px !important;
          }
          .room-page-num {
            font-size: 7.5px !important;
            color: #64748b !important;
            font-weight: 800 !important;
          }
          .room-header-right {
            text-align: right !important;
          }
          .room-stat-badge {
            border: 1px solid #0f172a !important;
            background: #f8fafc !important;
            color: #0f172a !important;
            font-size: 8px !important;
            font-weight: 900 !important;
            padding: 1.5px 6px !important;
            border-radius: 4px !important;
            display: inline-block !important;
          }
          .room-stat-sub {
            font-size: 7px !important;
            color: #64748b !important;
            font-weight: 700 !important;
            margin-top: 1px !important;
          }

          /* Table */
          .room-table-wrap {
            flex: 1 1 auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            margin: 2px 0 !important;
          }
          .room-manifest-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            height: 100% !important;
          }
          .room-manifest-table thead tr {
            background: #f1f5f9 !important;
            font-size: 7.5px !important;
            font-weight: 900 !important;
            color: #0f172a !important;
            text-transform: uppercase !important;
          }
          .room-manifest-table thead th {
            border: 1px solid #000000 !important;
            padding: 1px 2px !important;
            text-align: center !important;
            vertical-align: middle !important;
          }
          .thead-sub th {
            font-size: 7px !important;
            background: #e2e8f0 !important;
          }
          .room-manifest-table tbody td {
            border: 1px solid #000000 !important;
            padding: 0.5px 2px !important;
            font-size: 7.5px !important;
            line-height: 1.15 !important;
            vertical-align: middle !important;
          }
          .col-room-num {
            text-align: center !important;
            background: #f8fafc !important;
            vertical-align: middle !important;
            padding: 1px !important;
          }
          .room-idx {
            font-size: 8.5px !important;
            font-weight: 900 !important;
            color: #000000 !important;
            line-height: 1 !important;
          }
          .room-gender-tag {
            font-size: 6px !important;
            font-weight: 900 !important;
            color: #475569 !important;
            text-transform: uppercase !important;
            margin-top: 1px !important;
            line-height: 1 !important;
          }
          .col-center {
            text-align: center !important;
          }
          .col-bold {
            font-weight: 800 !important;
          }
          .text-nowrap {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .col-nama {
            font-weight: 800 !important;
            color: #000000 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            padding-left: 3px !important;
          }
          .st-name {
            font-size: 8px !important;
            font-weight: 800 !important;
          }
          .st-empty-slot {
            font-size: 7px !important;
            color: #94a3b8 !important;
            font-style: italic !important;
          }
          .tag-terisi {
            color: #15803d !important;
            font-weight: 900 !important;
            font-size: 7px !important;
          }
          .tag-kosong {
            color: #d97706 !important;
            font-weight: 800 !important;
            font-size: 7px !important;
          }
          .tag-cadangan {
            color: #64748b !important;
            font-weight: 800 !important;
            font-size: 7px !important;
          }
          .col-chk {
            vertical-align: middle !important;
            padding: 0 !important;
          }
          .chk-box {
            width: 6px !important;
            height: 6px !important;
            border: 1px solid #64748b !important;
            border-radius: 1px !important;
            margin: 0 auto !important;
          }
          .col-placeholder-line {
            color: #cbd5e1 !important;
            letter-spacing: 1px !important;
          }
          .row-placeholder {
            background: #fafafa !important;
          }
          .row-student-male {
            background: #ffffff !important;
          }
          .row-student-female {
            background: #ffffff !important;
          }
          .row-empty-slot {
            background: #fffbeb !important;
          }

          /* Legend & Notes */
          .room-legend-bar {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 4px !important;
            padding: 1px 6px !important;
            margin: 2px 0 !important;
            font-size: 6.5px !important;
            background: #f8fafc !important;
            flex-shrink: 0 !important;
          }
          .legend-items {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
          }
          .legend-title {
            font-weight: 900 !important;
            color: #0f172a !important;
          }
          .legend-items strong {
            border: 1px solid #94a3b8 !important;
            padding: 0 2px !important;
            border-radius: 2px !important;
            background: #ffffff !important;
            font-size: 6.5px !important;
          }
          .legend-notes {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            flex: 1 1 auto !important;
            margin-left: 12px !important;
          }
          .notes-line {
            flex: 1 1 auto !important;
            border-bottom: 1px dashed #94a3b8 !important;
            height: 1px !important;
          }

          /* Signature Section */
          .room-signature-section {
            border-top: 1px solid #000000 !important;
            padding-top: 2px !important;
            flex-shrink: 0 !important;
          }
          .sig-date {
            text-align: right !important;
            font-size: 7.5px !important;
            font-weight: 800 !important;
            color: #0f172a !important;
            margin-bottom: 2px !important;
          }
          .sig-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            text-align: center !important;
            gap: 6px !important;
          }
          .sig-col {
            font-size: 7.5px !important;
          }
          .sig-role {
            font-weight: 900 !important;
            color: #0f172a !important;
            text-transform: uppercase !important;
            font-size: 7.5px !important;
            line-height: 1.15 !important;
          }
          .sig-sub {
            font-size: 6.5px !important;
            color: #64748b !important;
            font-weight: 700 !important;
            line-height: 1.15 !important;
          }
          .sig-spacer {
            height: 18px !important;
          }
          .sig-name {
            font-weight: 900 !important;
            font-size: 7.5px !important;
            line-height: 1.15 !important;
          }
          .sig-nip {
            font-size: 6.5px !important;
            color: #64748b !important;
            margin-top: 1px !important;
            line-height: 1.15 !important;
          }
          .chap-full-name {
            font-size: 8.5px !important;
            font-weight: 900 !important;
            color: #000000 !important;
          }
          .chap-sub-role {
            font-size: 7px !important;
            font-weight: 700 !important;
            color: #64748b !important;
          }
          .paraf-line {
            font-size: 7px !important;
            color: #cbd5e1 !important;
            text-align: center !important;
          }
        </style>
      </head>
      <body onload="setTimeout(function(){ window.print(); }, 400);">
        ${pagesHtml}
      </body>
    </html>
  `;
}
