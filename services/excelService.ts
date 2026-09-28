export class ExcelService {
  /**
   * Reads and parses an uploaded Excel file to JSON
   */
  public static async importExcel<T>(file: File): Promise<T[]> {
    const XLSX = await import('xlsx');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<T>(worksheet, { defval: '' });
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Format file Excel tidak valid atau rusak.'));
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file.'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Exports an array of objects to an Excel (.xlsx) file
   */
  public static async exportToExcel<T extends Record<string, any>>(
    data: T[],
    fileName: string,
    sheetName: string = 'Data'
  ): Promise<void> {
    if (typeof window === 'undefined') return;
    const XLSX = await import('xlsx');

    // Convert data array into sheets
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Write file
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  /**
   * Formats and exports Student master data cleanly
   */
  public static async exportMasterData(students: any[], fileName: string = 'Master_Data_Siswa'): Promise<void> {
    const formatted = students.map((s, idx) => ({
      No: idx + 1,
      NIS: s.nis || '',
      'Nama Siswa': s.name || '',
      Kelas: s.className || '',
      'Jenis Kelamin': s.gender || '',
      Tujuan: s.destination || '',
      Gelombang: s.wave || '',
      'Ukuran Kaos': s.tShirtSize || '',
      'Orang Tua': s.parentName || '',
      'WA Ortu': s.parentPhone || '',
      'WA Siswa': s.studentPhone || '',
      'Riwayat Medis': s.medicalHistory || '',
      'Beasiswa/Jalur': s.waiverType || '',
      'Bus #': s.busNumber || '',
      'Kamar #': s.roomNumber || '',
      'Status Angket': s.isRegistered ? 'Sudah Mengisi' : 'Belum Mengisi',
    }));

    await this.exportToExcel(formatted, fileName, 'Siswa');
  }

  /**
   * Exports buses into separate sheets (one per bus) with Wave info, Chaperones, and Passenger Seats
   */
  public static async exportBusesToExcel(
    buses: any[],
    students: any[],
    settings?: any,
    fileName: string = 'Data_Manifes_Siswa_Per_Bus'
  ): Promise<void> {
    if (typeof window === 'undefined') return;
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    buses.forEach((bus) => {
      // Find students in this bus
      const busPassengers = students
        .filter((s) => s.busNumber === bus.busNumber && s.wave === bus.wave)
        .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

      // Get wave display label
      let waveLabel = bus.wave;
      if (bus.wave === 'BALI_GEL_1') waveLabel = 'Bali Gelombang 1';
      else if (bus.wave === 'BALI_GEL_2') waveLabel = 'Bali Gelombang 2';
      else if (bus.wave === 'YOGYA_GEL_1') waveLabel = 'Yogyakarta Gelombang 1';

      // Assemble header metadata lines to make it look highly professional
      const metadata = [
        ['MANIFES & PENEMPATAN KURSI ARMADA'],
        [`Nomor Bus: Bus ${bus.busNumber} | Gelombang: ${waveLabel}`],
        [`Kapasitas Maksimal: ${bus.capacity} Kursi | Terisi: ${busPassengers.length} Siswa`],
        [],
        ['GURU PENDAMPING / CHAPERONES:'],
        [`Pendamping 1: ${bus.guide1 || 'Belum Ditentukan'}`],
        [`Pendamping 2: ${bus.guide2 || 'Belum Ditentukan'}`],
      ];

      if (settings?.busVacantSeats === '1-4') {
        metadata.push([`Pendamping 3: ${bus.guide3 || 'Belum Ditentukan'}`]);
        metadata.push([`Pendamping 4: ${bus.guide4 || 'Belum Ditentukan'}`]);
      }

      metadata.push([]); // blank separator
      metadata.push(['No Kursi', 'Nama Siswa', 'Kelas', 'NIS', 'Jenis Kelamin']);

      // Append passengers
      const rows = busPassengers.map((psg) => [
        psg.seatNumber || '-',
        psg.name || '',
        psg.className || '',
        psg.nis || '',
        psg.gender || '',
      ]);

      const sheetData = [...metadata, ...rows];

      // Convert to sheet
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Simple auto-fit columns
      const maxCols = 5;
      const colWidths = [];
      for (let c = 0; c < maxCols; c++) {
        let maxLen = 10;
        sheetData.forEach((row) => {
          if (row && row[c] !== undefined) {
            const valStr = String(row[c]);
            if (valStr.length > maxLen) {
              maxLen = valStr.length;
            }
          }
        });
        colWidths.push({ wch: Math.min(maxLen + 3, 40) });
      }
      worksheet['!cols'] = colWidths;

      // Tab Sheet Name: Max 31 chars in excel, e.g. "Bus 1 (Bali Gel 1)"
      let shortWave = 'Gel';
      if (bus.wave === 'BALI_GEL_1') shortWave = 'Bali Gel 1';
      else if (bus.wave === 'BALI_GEL_2') shortWave = 'Bali Gel 2';
      else if (bus.wave === 'YOGYA_GEL_1') shortWave = 'Yogya Gel 1';
      const sheetName = `Bus ${bus.busNumber} (${shortWave})`;

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  /**
   * Exports room allocations to Excel (.xlsx) file with full details for hotel front desk
   */
  public static async exportRoomsToExcel(
    rooms: any[],
    students: any[],
    defaultCapacity: number = 3,
    fileName: string = 'Data_Rooming_List_Hotel'
  ): Promise<void> {
    if (typeof window === 'undefined') return;
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    // Flatten all room-student data
    const rows: any[] = [];
    let counter = 1;

    rooms.forEach((room) => {
      const roomStudents = students.filter(
        (s) => s.wave === room.wave && s.roomNumber === room.roomNumber
      );

      let waveLabel = room.wave;
      if (room.wave === 'BALI_GEL_1') waveLabel = 'Bali Gelombang 1';
      else if (room.wave === 'BALI_GEL_2') waveLabel = 'Bali Gelombang 2';
      else if (room.wave === 'YOGYA_GEL_1') waveLabel = 'Yogyakarta Gelombang 1';

      if (roomStudents.length > 0) {
        roomStudents.forEach((st, idx) => {
          rows.push({
            'No.': counter++,
            'No. Kamar': room.displayRoomNumber ?? room.roomNumber,
            'Kelas': st.className || '-',
            'Nama Siswa': st.name || '',
            'Jenis Kelamin': st.gender === 'PEREMPUAN' ? 'P' : 'L',
            'Status': 'Terisi',
            'No. Bus': st.busNumber ? `Bus ${st.busNumber}` : '-',
            'Absensi Berangkat': '',
            'Hotel H1': '',
            'Hotel H2': '',
            'Hotel H3': '',
            'Hotel H4': '',
            'Absensi Pulang': '',
          });
        });

        // Add empty slots if under-capacity
        const emptySlots = (room.capacity || defaultCapacity) - roomStudents.length;
        for (let i = 0; i < emptySlots; i++) {
          rows.push({
            'No.': counter++,
            'No. Kamar': room.displayRoomNumber ?? room.roomNumber,
            'Kelas': '-',
            'Nama Siswa': '[ Slot Bed Kosong ]',
            'Jenis Kelamin': room.gender === 'PEREMPUAN' ? 'P' : 'L',
            'Status': 'Kosong',
            'No. Bus': '-',
            'Absensi Berangkat': '',
            'Hotel H1': '',
            'Hotel H2': '',
            'Hotel H3': '',
            'Hotel H4': '',
            'Absensi Pulang': '',
          });
        }
      } else {
        // Room completely empty
        for (let i = 0; i < (room.capacity || defaultCapacity); i++) {
          rows.push({
            'No.': counter++,
            'No. Kamar': room.displayRoomNumber ?? room.roomNumber,
            'Kelas': '-',
            'Nama Siswa': '[ Slot Bed Kosong ]',
            'Jenis Kelamin': room.gender === 'PEREMPUAN' ? 'P' : 'L',
            'Status': 'Kosong',
            'No. Bus': '-',
            'Absensi Berangkat': '',
            'Hotel H1': '',
            'Hotel H2': '',
            'Hotel H3': '',
            'Hotel H4': '',
            'Absensi Pulang': '',
          });
        }
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const colWidths = [
      { wch: 6 },  // No.
      { wch: 12 }, // No. Kamar
      { wch: 14 }, // Kelas
      { wch: 32 }, // Nama Siswa
      { wch: 14 }, // Jenis Kelamin
      { wch: 12 }, // Status
      { wch: 12 }, // No. Bus
      { wch: 18 }, // Absensi Berangkat
      { wch: 10 }, // Hotel H1
      { wch: 10 }, // Hotel H2
      { wch: 10 }, // Hotel H3
      { wch: 10 }, // Hotel H4
      { wch: 18 }, // Absensi Pulang
    ];
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rooming List');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }
}
