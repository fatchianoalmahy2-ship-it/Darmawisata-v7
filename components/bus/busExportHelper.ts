import { Student, Bus } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';

/**
 * Lazy, on-demand Excel manifest export.
 * Dynamically imports 'xlsx' only when triggered, preventing heavy bundle loads on initial build/render.
 */
export async function exportBusManifestExcel(
  tourStudents: Student[],
  selectedWave: string
): Promise<void> {
  const XLSX = await import('xlsx');

  const waveStudentsList = tourStudents
    .filter((s) => s.wave === selectedWave)
    .sort((a, b) => {
      if ((a.busNumber || 999) !== (b.busNumber || 999)) return (a.busNumber || 999) - (b.busNumber || 999);
      return (a.seatNumber || 999) - (b.seatNumber || 999);
    });

  const rows = waveStudentsList.map((s, index) => ({
    No: index + 1,
    'Gelombang': schoolMetadata.waves.find((w) => w.id === s.wave)?.name || s.wave,
    'Armada Bus': s.busNumber ? `Bus ${s.busNumber}` : 'Belum Ada Bus',
    'No Kursi': s.seatNumber ? s.seatNumber : 'Belum Ada Kursi',
    'Nama Siswa': s.name,
    'Jenis Kelamin': s.gender || '-',
    'Kelas': s.className || '-',
    'Jurusan': s.major || '-',
    'Status': s.seatNumber ? 'Sudah Duduk' : 'Belum Dapat Kursi',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Manifest Penumpang');
  XLSX.writeFile(workbook, `Manifest_Bus_${selectedWave}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportBusSeatingToExcel(
  tourStudents: Student[],
  buses: Bus[],
  selectedWave: string,
  busNumber?: number,
  getSeatChaperoneName?: (seatNum: number) => string
): Promise<void> {
  const XLSX = await import('xlsx');

  let filteredStudents = tourStudents.filter((s) => s.wave === selectedWave);
  if (busNumber) {
    filteredStudents = filteredStudents.filter((s) => s.busNumber === busNumber);
  }

  const busStudentsSorted = filteredStudents.sort((a, b) => {
    if ((a.busNumber || 999) !== (b.busNumber || 999)) return (a.busNumber || 999) - (b.busNumber || 999);
    return (a.seatNumber || 999) - (b.seatNumber || 999);
  });

  const rows: any[] = [];

  // If specific bus, output 1 to 50 seating plan
  if (busNumber) {
    const seatMap = new Map<number, Student>();
    busStudentsSorted.forEach((s) => {
      if (s.seatNumber) seatMap.set(s.seatNumber, s);
    });

    for (let seat = 1; seat <= 50; seat++) {
      const student = seatMap.get(seat);
      const chaperone = getSeatChaperoneName ? getSeatChaperoneName(seat) : '';
      
      rows.push({
        'No Kursi': seat,
        'Armada Bus': `Bus ${busNumber}`,
        'Nama Penumpang': student?.name || (chaperone ? `[PENDAMPING] ${chaperone}` : '- KOSONG -'),
        'Jenis': student ? 'Siswa' : chaperone ? 'Guru/Pendamping' : 'Kosong',
        'Jenis Kelamin': student?.gender || '-',
        'Kelas': student?.className || '-',
        'Jurusan': student?.major || '-',
      });
    }
  } else {
    // All wave manifest
    busStudentsSorted.forEach((s, idx) => {
      rows.push({
        No: idx + 1,
        'Armada Bus': s.busNumber ? `Bus ${s.busNumber}` : 'Belum Ada Bus',
        'No Kursi': s.seatNumber || 'Belum Ada',
        'Nama Siswa': s.name,
        'Jenis Kelamin': s.gender || '-',
        'Kelas': s.className || '-',
        'Jurusan': s.major || '-',
      });
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  const sheetName = busNumber ? `Bus_${busNumber}` : 'Manifest_Penumpang';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `Denah_Kursi_${selectedWave}${busNumber ? `_Bus_${busNumber}` : ''}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

