import { Student, Bus, AppSettings } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';
import { getBusChaperoneName, resolveSeatChaperoneInfo, ChaperoneItem } from './busUtils';
import { getWaveChaperones } from '@/lib/utils';

export interface BusPrintOptions {
  buses: Bus[];
  waveToPrint: string;
  tourStudents: Student[];
  defaultBusCapacity?: number;
  settings?: AppSettings;
  allChaperones?: ChaperoneItem[];
  singleBusNumber?: number;
}

export function generateBusPrintDocumentHtml(options: BusPrintOptions): string {
  const {
    buses,
    waveToPrint,
    tourStudents,
    defaultBusCapacity = 50,
    settings,
    allChaperones = [],
    singleBusNumber,
  } = options;

  let relevantBuses = buses.filter((b) => waveToPrint === 'ALL' || b.wave === waveToPrint);

  if (singleBusNumber !== undefined) {
    relevantBuses = relevantBuses.filter((b) => b.busNumber === singleBusNumber);
  } else {
    relevantBuses = relevantBuses
      .filter((b) => {
        // Check if bus has students
        const hasStudents = tourStudents.some(
          (s) => s.wave === b.wave && s.busNumber === b.busNumber && !!s.seatNumber
        );
        if (hasStudents) return true;

        // Check if bus has custom guides/chaperones
        const customGuides = settings?.customBusGuides?.[b.id];
        if (customGuides?.guide1 || customGuides?.guide2 || customGuides?.guide3 || customGuides?.guide4) {
          return true;
        }
        if (b.guide1 || b.guide2) return true;

        return false;
      })
      .sort((a, b) => {
        if (a.wave !== b.wave) return a.wave.localeCompare(b.wave);
        return a.busNumber - b.busNumber;
      });
  }

  const busesToPrint =
    relevantBuses.length > 0
      ? relevantBuses
      : buses.filter((b) => waveToPrint === 'ALL' || b.wave === waveToPrint);

  if (busesToPrint.length === 0) return '';

  const logoUrl = settings?.appLogoUrl || schoolMetadata.school.logo || '';
  const formattedDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let pagesHtml = '';

  busesToPrint.forEach((bus) => {
    const baseCap = bus.capacity || defaultBusCapacity || 50;
    const busStudents = tourStudents.filter((s) => s.wave === bus.wave && s.busNumber === bus.busNumber);
    const highestSeat = Math.max(0, ...busStudents.map((s) => s.seatNumber || 0));
    const cap = Math.min(50, Math.max(baseCap, highestSeat));

    const seatStudentMap = new Map<number, Student>();
    busStudents.forEach((s) => {
      if (s.seatNumber) seatStudentMap.set(s.seatNumber, s);
    });

    const waveName = schoolMetadata.waves.find((w) => w.id === bus.wave)?.name || bus.wave;
    const destinationStr = bus.wave.toUpperCase().includes('YOGYA') ? 'YOGYAKARTA' : 'BALI';

    const waveChaperonesList = getWaveChaperones({
      settings,
      buses,
      classes: [],
      students: tourStudents,
      selectedWave: bus.wave,
    });

    const activeChaperones = [1, 2, 3, 4]
      .map((num) => {
        const info = resolveSeatChaperoneInfo(num, bus, allChaperones, settings, seatStudentMap, waveChaperonesList);
        return {
          num,
          name: info.name,
          roomNumber: info.roomNumber,
        };
      })
      .filter((c) => !!c.name);

    const allFiftySeats = Array.from({ length: 50 }, (_, i) => i + 1);

    // Render Seat Boxes for Grid
    const renderSeatHtml = (sn: number) => {
      const chap = getBusChaperoneName(sn, bus, seatStudentMap, settings, allChaperones);
      const st = seatStudentMap.get(sn);
      if (chap) {
        return `<div class="bus-seat bus-seat-guru"><span class="bus-seat-num">${sn.toString().padStart(2, '0')}</span><span class="bus-seat-badge-guru">GURU</span></div>`;
      }
      if (st) {
        const isM = st.gender === 'LAKI-LAKI';
        const cls = isM ? 'bus-seat-male' : 'bus-seat-female';
        return `<div class="bus-seat ${cls}"><span class="bus-seat-num">${sn.toString().padStart(2, '0')}</span></div>`;
      }
      return `<div class="bus-seat bus-seat-empty"><span class="bus-seat-num">${sn.toString().padStart(2, '0')}</span></div>`;
    };

    // Rows 1 - 11
    let rowsHtml = '';
    for (let i = 0; i < 11; i++) {
      const rowNum = i + 1;
      const start = (rowNum - 1) * 4 + 1;
      const [l1, l2, r1, r2] = [start, start + 1, start + 2, start + 3];

      rowsHtml += `
        <div class="bus-row">
          <div class="bus-seat-pair">${renderSeatHtml(l1)}${renderSeatHtml(l2)}</div>
          <div class="bus-aisle">|</div>
          <div class="bus-seat-pair">${renderSeatHtml(r1)}${renderSeatHtml(r2)}</div>
        </div>
      `;
    }

    // Back row (45 - 50)
    let backRowHtml = '';
    [45, 46, 47, 48, 49, 50].forEach((sn) => {
      backRowHtml += renderSeatHtml(sn);
    });

    // Manifest Table Rows (50 rows)
    let tableRowsHtml = '';
    allFiftySeats.forEach((sn) => {
      const st = seatStudentMap.get(sn);
      const chapInfo = resolveSeatChaperoneInfo(sn, bus, allChaperones, settings, seatStudentMap, waveChaperonesList);
      const isChap = !!chapInfo.name;
      const isM = isChap ? (chapInfo.gender === 'LAKI-LAKI') : (st?.gender === 'LAKI-LAKI');
      const roomNumStr = isChap
        ? (chapInfo.roomNumber ? `Kmr ${chapInfo.roomNumber}` : '-')
        : (st?.roomNumber ? `Kmr ${st.roomNumber}` : '-');

      tableRowsHtml += `
        <tr class="${isChap ? 'row-chap' : st ? (isM ? 'row-male' : 'row-female') : 'row-empty'}">
          <td class="col-kursi">${sn.toString().padStart(2, '0')}</td>
          <td class="col-nama">
            ${isChap ? `<div class="chap-name-wrap"><span class="truncate">${chapInfo.name}</span><span class="badge-guru">GURU</span></div>` : st ? `<span class="truncate">${st.name}</span>` : '-'}
          </td>
          <td class="col-jk">${isChap ? (isM ? 'L' : 'P') : st ? (isM ? 'L' : 'P') : '-'}</td>
          <td class="col-kelas">${isChap ? '<span class="text-pendamping">PENDAMPING</span>' : st ? st.className : '-'}</td>
          <td class="col-kamar">${roomNumStr}</td>
        </tr>
      `;
    });

    // Chaperones Banner
    let chapBannerHtml = '';
    if (activeChaperones.length > 0) {
      chapBannerHtml = `
        <div class="bus-chaperone-bar">
          ${activeChaperones
            .map(
              (c) =>
                `<div class="chap-item"><span class="chap-lbl">PENDAMPING (KURSI ${c.num}):</span> <span class="chap-val">${c.name}</span>${c.roomNumber ? ` <span class="chap-room-tag">KAMAR #${c.roomNumber}</span>` : ''}</div>`
            )
            .join('')}
        </div>
      `;
    }

    pagesHtml += `
      <div class="bus-page">
        <!-- 1. Header KOP -->
        <div class="bus-header">
          <div class="bus-header-left">
            ${logoUrl ? `<img src="${logoUrl}" class="bus-logo" alt="Logo" onerror="this.style.display='none'" />` : '<div class="bus-logo-placeholder">🏛️</div>'}
            <div>
              <h2 class="bus-title-sub">DENAH TEMPAT DUDUK TOUR ${destinationStr} 2025</h2>
              <h1 class="bus-title-main">${schoolMetadata.school.name}</h1>
              <p class="bus-title-desc">Tahun Pelajaran 2025/2026 • Gelombang: ${waveName}</p>
            </div>
          </div>
          <div class="bus-header-right">
            <div class="bus-badge">BUS ${bus.busNumber}</div>
            <div class="bus-subbadge">Format Resmi 2-2</div>
          </div>
        </div>

        ${chapBannerHtml}

        <!-- 2. Main Content Grid (Table 58% + Visual Seat Map 42%) -->
        <div class="bus-content">
          <!-- Left Table (58%) -->
          <div class="bus-table-box">
            <div class="bus-table-header">
              <span>DAFTAR KURSI & PENUMPANG (01 - 50)</span>
              <span>${busStudents.length} / 50 Terisi</span>
            </div>
            <div class="bus-table-scroll">
              <table class="bus-manifest-table">
                <thead>
                  <tr>
                    <th style="width:30px;text-align:center;">KURSI</th>
                    <th>NAMA LENGKAP</th>
                    <th style="width:20px;text-align:center;">JK</th>
                    <th style="width:65px;">KELAS</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right Visual Bus Seat Map (42%) -->
          <div class="bus-visual-box">
            <div class="bus-front-bar">
              <span style="color:#15803d;font-weight:900;">◄ PINTU DEPAN</span>
              <span style="color:#b91c1c;font-weight:900;">KEMUDI ☸ ►</span>
            </div>

            <div class="bus-grid-rows">
              ${rowsHtml}
              <div class="bus-back-row">
                ${backRowHtml}
              </div>
            </div>

            <div class="bus-rear-bar">
              <span style="color:#15803d;font-weight:900;">◄ PINTU BELAKANG</span>
              <span style="color:#64748b;">TOILET / BELAKANG</span>
            </div>
          </div>
        </div>

        <!-- 3. Footer -->
        <div class="bus-footer">
          <div>Sistem Informasi Darmawisata — ${schoolMetadata.school.name}</div>
          <div>Ponorogo, ${formattedDate}</div>
        </div>
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Denah Tempat Duduk Bus - ${schoolMetadata.school.name}</title>
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
          .bus-page {
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
          .bus-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          
          /* KOP Header */
          .bus-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 3px !important;
            margin-bottom: 2px !important;
            flex-shrink: 0 !important;
          }
          .bus-header-left {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
          }
          .bus-logo {
            width: 36px !important;
            height: 36px !important;
            object-fit: contain !important;
          }
          .bus-logo-placeholder {
            font-size: 24px !important;
          }
          .bus-title-sub {
            margin: 0 !important;
            font-size: 10.5px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: -0.2px !important;
            line-height: 1.15 !important;
            color: #0f172a !important;
          }
          .bus-title-main {
            margin: 0 !important;
            font-size: 12px !important;
            font-weight: 900 !important;
            color: #1e1b4b !important;
            line-height: 1.15 !important;
          }
          .bus-title-desc {
            margin: 0 !important;
            font-size: 8px !important;
            color: #64748b !important;
            font-weight: 700 !important;
            line-height: 1.15 !important;
          }
          .bus-header-right {
            text-align: right !important;
          }
          .bus-badge {
            background: #0f172a !important;
            color: #ffffff !important;
            font-size: 12px !important;
            font-weight: 900 !important;
            padding: 2px 10px !important;
            border-radius: 6px !important;
            display: inline-block !important;
          }
          .bus-subbadge {
            font-size: 8px !important;
            color: #64748b !important;
            font-weight: 700 !important;
            margin-top: 1px !important;
          }

          /* Chaperone Bar */
          .bus-chaperone-bar {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 2px 12px !important;
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            padding: 2px 8px !important;
            margin: 2px 0 !important;
            font-size: 8px !important;
            font-weight: 800 !important;
            flex-shrink: 0 !important;
          }
          .chap-item {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            overflow: hidden !important;
          }
          .chap-lbl {
            color: #1e1b4b !important;
            font-weight: 900 !important;
            font-size: 7.5px !important;
            white-space: nowrap !important;
          }
          .chap-val {
            text-decoration: underline !important;
            color: #000000 !important;
            font-weight: 900 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          /* Main Content */
          .bus-content {
            display: flex !important;
            flex-direction: row !important;
            gap: 8px !important;
            flex: 1 1 auto !important;
            min-height: 0 !important;
            margin: 2px 0 !important;
          }

          /* Table Box (58%) */
          .bus-table-box {
            width: 58% !important;
            flex: 0 0 58% !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            background: #ffffff !important;
          }
          .bus-table-header {
            background: #f1f5f9 !important;
            padding: 2px 6px !important;
            border-bottom: 1px solid #cbd5e1 !important;
            display: flex !important;
            justify-content: space-between !important;
            font-size: 8px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            color: #334155 !important;
            flex-shrink: 0 !important;
          }
          .bus-table-scroll {
            flex: 1 1 auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
          }
          .bus-manifest-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            height: 100% !important;
          }
          .bus-manifest-table thead tr {
            background: #f8fafc !important;
            border-bottom: 1px solid #cbd5e1 !important;
            font-size: 8px !important;
            font-weight: 900 !important;
            color: #334155 !important;
            text-transform: uppercase !important;
          }
          .bus-manifest-table th {
            padding: 1px 3px !important;
            border-right: 1px solid #cbd5e1 !important;
            font-size: 8px !important;
            font-weight: 900 !important;
            text-align: left !important;
          }
          .bus-manifest-table th:last-child {
            border-right: none !important;
          }
          .bus-manifest-table td {
            padding: 1px 3px !important;
            border-bottom: 1px solid #e2e8f0 !important;
            border-right: 1px solid #e2e8f0 !important;
            font-size: 8px !important;
            line-height: 1.15 !important;
            vertical-align: middle !important;
          }
          .bus-manifest-table td:last-child {
            border-right: none !important;
          }
          .col-kursi {
            text-align: center !important;
            font-weight: 900 !important;
            background: #f8fafc !important;
            font-size: 8px !important;
          }
          .col-nama {
            font-weight: 900 !important;
            color: #000000 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            font-size: 8.5px !important;
          }
          .col-jk {
            text-align: center !important;
            font-weight: 900 !important;
            font-size: 8px !important;
          }
          .col-kelas {
            color: #334155 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            font-weight: 700 !important;
            font-size: 8px !important;
          }
          .row-chap {
            background: #ecfdf5 !important;
          }
          .row-male {
            background: #f0f9ff !important;
          }
          .row-female {
            background: #fff1f2 !important;
          }
          .row-empty {
            color: #94a3b8 !important;
          }
          .chap-name-wrap {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            color: #064e3b !important;
            font-weight: 900 !important;
          }
          .badge-guru {
            font-size: 6px !important;
            background: #d1fae5 !important;
            color: #065f46 !important;
            padding: 0.5px 2px !important;
            border-radius: 2px !important;
            font-weight: 900 !important;
          }
          .text-pendamping {
            color: #047857 !important;
            font-weight: bold !important;
            font-size: 7px !important;
          }

          /* Visual Seat Box (42%) */
          .bus-visual-box {
            width: 42% !important;
            flex: 0 0 42% !important;
            border: 2px solid #0f172a !important;
            border-radius: 12px !important;
            padding: 5px 6px !important;
            background: #f8fafc !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            height: 100% !important;
            box-sizing: border-box !important;
          }
          .bus-front-bar {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 1px solid #cbd5e1 !important;
            padding-bottom: 2px !important;
            font-size: 7.5px !important;
            font-weight: 900 !important;
            flex-shrink: 0 !important;
          }
          .bus-grid-rows {
            flex: 1 1 auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            margin: 2px 0 !important;
            gap: 1px !important;
          }
          .bus-row {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 3px !important;
            flex: 1 1 auto !important;
          }
          .bus-seat-pair {
            flex: 1 !important;
            display: flex !important;
            gap: 3px !important;
            height: 100% !important;
            align-items: center !important;
          }
          .bus-aisle {
            width: 6px !important;
            text-align: center !important;
            font-size: 7px !important;
            color: #94a3b8 !important;
            font-weight: bold !important;
          }
          .bus-seat {
            flex: 1 !important;
            height: 100% !important;
            min-height: 18px !important;
            max-height: 25px !important;
            border-radius: 4px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 11px !important;
            font-weight: 900 !important;
            overflow: hidden !important;
            padding: 0 1px !important;
            gap: 2px !important;
            box-sizing: border-box !important;
          }
          .bus-seat-num {
            font-size: 11px !important;
            font-weight: 900 !important;
            line-height: 1 !important;
          }
          .bus-seat-guru {
            border: 1.5px solid #16a34a !important;
            background: #dcfce7 !important;
            color: #14532d !important;
          }
          .bus-seat-badge-guru {
            font-size: 6.5px !important;
            color: #14532d !important;
            font-weight: 900 !important;
          }
          .bus-seat-male {
            border: 1.5px solid #0284c7 !important;
            background: #e0f2fe !important;
            color: #0369a1 !important;
          }
          .bus-seat-female {
            border: 1.5px solid #e11d48 !important;
            background: #ffe4e6 !important;
            color: #be123c !important;
          }
          .bus-seat-empty {
            border: 1px dashed #94a3b8 !important;
            background: #ffffff !important;
            color: #94a3b8 !important;
          }
          .bus-back-row {
            display: flex !important;
            gap: 2px !important;
            padding-top: 2px !important;
            border-top: 1px dashed #cbd5e1 !important;
            align-items: center !important;
            flex: 1 1 auto !important;
          }
          .bus-rear-bar {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-top: 1px solid #cbd5e1 !important;
            padding-top: 2px !important;
            font-size: 7.5px !important;
            font-weight: 900 !important;
            color: #64748b !important;
            flex-shrink: 0 !important;
          }

          /* Footer */
          .bus-footer {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-top: 1px solid #cbd5e1 !important;
            padding-top: 2px !important;
            font-size: 7.5px !important;
            color: #64748b !important;
            font-weight: 700 !important;
            flex-shrink: 0 !important;
          }
        </style>
      </head>
      <body onload="setTimeout(function(){ window.print(); }, 400);">
        ${pagesHtml}
      </body>
    </html>
  `;
}

export function printSingleBusPlan(
  busNumber?: number,
  wave?: string,
  tourStudents: Student[] = [],
  buses: Bus[] = [],
  settings?: AppSettings,
  allChaperones: ChaperoneItem[] = []
): void {
  if (typeof window === 'undefined') return;

  const html = generateBusPrintDocumentHtml({
    buses,
    waveToPrint: wave || 'ALL',
    tourStudents,
    settings,
    allChaperones,
    singleBusNumber: busNumber,
  });

  if (!html) {
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
}

export function directPrintAllBuses(
  buses: Bus[],
  waveToPrint: string,
  tourStudents: Student[],
  defaultBusCapacity: number = 50,
  settings?: AppSettings,
  allChaperones: ChaperoneItem[] = []
): void {
  if (typeof window === 'undefined') return;

  const html = generateBusPrintDocumentHtml({
    buses,
    waveToPrint,
    tourStudents,
    defaultBusCapacity,
    settings,
    allChaperones,
  });

  if (!html) {
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
}

