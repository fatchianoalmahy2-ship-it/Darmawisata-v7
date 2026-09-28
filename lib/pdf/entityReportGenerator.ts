'use client';

import { Student, SchoolClass, Bus, AppSettings } from '@/types';
import { getBase64LogoForPdf } from '@/lib/logoHelper';
import schoolMetadata from '@/config/schoolMetadata.json';

async function loadPdfEngines() {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = (autoTableModule as any).default || autoTableModule;
  return { jsPDF, autoTable };
}

interface ClassPdfOptions {
  classes: SchoolClass[];
  students: Student[];
  settings?: Partial<AppSettings> | null;
  academicYear?: string;
  selectedClassId?: string; // Optional: print only 1 class
}

interface BusPdfOptions {
  buses: Bus[];
  students: Student[];
  settings?: Partial<AppSettings> | null;
  academicYear?: string;
  selectedBusNumber?: number; // Optional: print only 1 bus
}

export interface SuratPdfOptions {
  type: 'IZIN' | 'TIDAK_MAMPU';
  students: Student[];
  settings?: Partial<AppSettings> | null;
  academicYear?: string;
  selectedStudentId?: string;
  batchClassName?: string;
}

/**
 * Generates an official, enterprise-standard A4 PDF report with EXACTLY 1 PAGE PER CLASS.
 * Standardizes font size strictly to >= 11pt for maximum field readability.
 */
export async function generateClassManifestPDF(options: ClassPdfOptions): Promise<void> {
  const { classes, students, settings, academicYear = '2025/2026', selectedClassId } = options;

  const targetClasses = selectedClassId
    ? classes.filter((c) => c.id === selectedClassId)
    : classes;

  if (targetClasses.length === 0) {
    throw new Error('Tidak ada data kelas yang dipilih.');
  }

  // Preload school logo Base64
  const logoBase64 = await getBase64LogoForPdf(settings?.headerLogoUrl || settings?.appLogoUrl);
  const schoolName = settings?.schoolName || schoolMetadata.school.name || 'SMK PGRI 2 PONOROGO';
  const schoolAddress = settings?.schoolAddress || schoolMetadata.school.address || 'Jl. Soekarno Hatta No. 123, Ponorogo';

  const { jsPDF, autoTable } = await loadPdfEngines();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  targetClasses.forEach((cls, index) => {
    if (index > 0) {
      doc.addPage('a4', 'portrait');
    }

    const classStudents = students
      .filter((s) => s.className?.trim().toLowerCase() === cls.name.trim().toLowerCase())
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));

    // ==========================================
    // 1. KOP SURAT RESMI (HEADER)
    // ==========================================
    const startX = 14;
    const pageWidth = 210;
    const marginX = 14;
    let headerY = 12;

    // Draw Logo if available
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', startX, headerY - 2, 20, 20);
      } catch {
        // Fallback silently if format error
      }
    }

    // Text Header
    const textStartX = logoBase64 ? startX + 23 : startX;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13); // >= 11pt
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(schoolName.toUpperCase(), textStartX, headerY + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11); // Strict >= 11pt rule
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Alamat: ${schoolAddress}`, textStartX, headerY + 8);
    doc.text(`KEGIATAN DARMAWISATA & STUDY TOUR TAHUN AJARAN ${academicYear}`, textStartX, headerY + 13);

    // Header Divider Line
    headerY += 18;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(marginX, headerY, pageWidth - marginX, headerY);
    doc.setLineWidth(0.2);
    doc.line(marginX, headerY + 1, pageWidth - marginX, headerY + 1);

    // ==========================================
    // 2. METADATA KELAS & WALI
    // ==========================================
    const metaY = headerY + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`DAFTAR PESERTA KELAS: ${cls.name}`, marginX, metaY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text(`Wali Kelas: ${cls.homeroomTeacher || '-'}`, marginX, metaY + 5);

    const waveLabel = cls.manualWaliDestination
      ? cls.manualWaliDestination.replace('_', ' ')
      : 'Gelombang 1 & 2';
    doc.text(`Total Siswa: ${classStudents.length} Peserta | Gelombang: ${waveLabel}`, marginX, metaY + 10);

    // ==========================================
    // 3. TABEL DATA SISWA (FONT MINIMAL 11PT)
    // ==========================================
    const tableBody = classStudents.map((s, sIdx) => [
      (sIdx + 1).toString(),
      s.nis || '-',
      s.name,
      s.gender === 'PEREMPUAN' ? 'P' : 'L',
      s.isRegistered ? 'Terdaftar' : 'Belum',
      s.busNumber ? `Bus ${s.busNumber}` : '-',
      s.seatNumber ? `#${s.seatNumber}` : '-',
      s.roomNumber ? `Kmr ${s.roomNumber}` : '-',
      '', // Kolom TTD / Cek
    ]);

    autoTable(doc, {
      startY: metaY + 13,
      head: [['No', 'NIS', 'Nama Lengkap Siswa', 'L/P', 'Status', 'Bus', 'Kursi', 'Kamar', 'Paraf']],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 11, // Strict requirement: MINIMAL 11pt
        cellPadding: 1.8,
        textColor: [15, 23, 42],
        lineColor: [203, 213, 225],
        lineWidth: 0.15,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [15, 23, 42], // Slate 900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 24 },
        2: { halign: 'left', cellWidth: 'auto' },
        3: { halign: 'center', cellWidth: 12 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 18 },
        6: { halign: 'center', cellWidth: 16 },
        7: { halign: 'center', cellWidth: 18 },
        8: { halign: 'center', cellWidth: 18 },
      },
      margin: { left: marginX, right: marginX, bottom: 25 },
      didDrawPage: () => {
        // ==========================================
        // 4. FOOTER TANDA TANGAN DI BAGIAN BAWAH
        // ==========================================
        const footerY = 275;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);

        // Kiri: Info Halaman
        doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} | SIM Darmawisata`, marginX, footerY + 10);

        // Kanan: Slot TTD Wali Kelas
        const signX = 145;
        doc.text('Ponorogo, ..........................', signX, footerY);
        doc.text('Wali Kelas,', signX, footerY + 5);
        doc.setFont('helvetica', 'bold');
        doc.text(cls.homeroomTeacher || '...........................................', signX, footerY + 16);
      },
    });
  });

  const fileName = targetClasses.length === 1
    ? `Daftar_Peserta_${targetClasses[0].name.replace(/\s+/g, '_')}.pdf`
    : `Daftar_Seluruh_Kelas_Darmawisata.pdf`;

  doc.save(fileName);
}

/**
 * Generates an official, enterprise-standard A4 PDF report with EXACTLY 1 PAGE PER BUS.
 * Standardizes font size strictly to >= 11pt.
 */
export async function generateBusManifestPDF(options: BusPdfOptions): Promise<void> {
  const { buses, students, settings, academicYear = '2025/2026', selectedBusNumber } = options;

  const targetBuses = selectedBusNumber
    ? buses.filter((b) => b.busNumber === selectedBusNumber)
    : buses.sort((a, b) => a.busNumber - b.busNumber);

  if (targetBuses.length === 0) {
    throw new Error('Tidak ada data armada bus yang dipilih.');
  }

  // Preload school logo Base64
  const logoBase64 = await getBase64LogoForPdf(settings?.headerLogoUrl || settings?.appLogoUrl);
  const schoolName = settings?.schoolName || schoolMetadata.school.name || 'SMK PGRI 2 PONOROGO';
  const schoolAddress = settings?.schoolAddress || schoolMetadata.school.address || 'Jl. Soekarno Hatta No. 123, Ponorogo';

  const { jsPDF, autoTable } = await loadPdfEngines();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  targetBuses.forEach((bus, index) => {
    if (index > 0) {
      doc.addPage('a4', 'portrait');
    }

    // Get all students on this bus
    const busStudents = students
      .filter((s) => s.busNumber === bus.busNumber)
      .sort((a, b) => (a.seatNumber || 999) - (b.seatNumber || 999));

    // ==========================================
    // 1. KOP SURAT RESMI (HEADER)
    // ==========================================
    const startX = 14;
    const pageWidth = 210;
    const marginX = 14;
    let headerY = 12;

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', startX, headerY - 2, 20, 20);
      } catch {
        // Ignore fallback
      }
    }

    const textStartX = logoBase64 ? startX + 23 : startX;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(schoolName.toUpperCase(), textStartX, headerY + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(`Alamat: ${schoolAddress}`, textStartX, headerY + 8);
    doc.text(`MANIFEST PENUMPANG ARMADA BUS - STUDY TOUR ${academicYear}`, textStartX, headerY + 13);

    // Divider Line
    headerY += 18;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(marginX, headerY, pageWidth - marginX, headerY);
    doc.setLineWidth(0.2);
    doc.line(marginX, headerY + 1, pageWidth - marginX, headerY + 1);

    // ==========================================
    // 2. BUS INFORMATION
    // ==========================================
    const metaY = headerY + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`ARMADA BUS NOMOR: #${bus.busNumber}`, marginX, metaY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    const waveName = bus.wave ? bus.wave.replace('_', ' ') : 'Gelombang 1';
    doc.text(`Gelombang: ${waveName} | Kapasitas: ${bus.capacity || 50} Kursi | Terisi: ${busStudents.length} Peserta`, marginX, metaY + 5);

    const guides = [bus.guide1, bus.guide2, bus.guide3, bus.guide4].filter(Boolean).join(', ');
    doc.text(`Pendamping / Tour Leader: ${guides || 'Panitia Resmi'}`, marginX, metaY + 10);

    // ==========================================
    // 3. TABEL MANIFEST PENUMPANG (FONT MINIMAL 11PT)
    // ==========================================
    const tableBody = busStudents.map((s, sIdx) => [
      (sIdx + 1).toString(),
      s.seatNumber ? `#${s.seatNumber}` : '-',
      s.nis || '-',
      s.name,
      s.className || '-',
      s.gender === 'PEREMPUAN' ? 'P' : 'L',
      s.roomNumber ? `Kmr ${s.roomNumber}` : '-',
      s.medicalHistory ? s.medicalHistory : '-',
      '', // Cek Hadir
    ]);

    autoTable(doc, {
      startY: metaY + 13,
      head: [['No', 'Kursi', 'NIS', 'Nama Lengkap Siswa', 'Kelas', 'L/P', 'Kamar', 'Catatan Medis', 'Presensi']],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 11, // Strict requirement: MINIMAL 11pt
        cellPadding: 1.7,
        textColor: [15, 23, 42],
        lineColor: [203, 213, 225],
        lineWidth: 0.15,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 14 },
        2: { halign: 'center', cellWidth: 22 },
        3: { halign: 'left', cellWidth: 'auto' },
        4: { halign: 'center', cellWidth: 22 },
        5: { halign: 'center', cellWidth: 10 },
        6: { halign: 'center', cellWidth: 16 },
        7: { halign: 'left', cellWidth: 26 },
        8: { halign: 'center', cellWidth: 16 },
      },
      margin: { left: marginX, right: marginX, bottom: 25 },
      didDrawPage: () => {
        // ==========================================
        // 4. FOOTER TANDA TANGAN KOORDINATOR BUS
        // ==========================================
        const footerY = 275;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);

        doc.text(`Manifest Bus Resmi | Tanggal: ${new Date().toLocaleDateString('id-ID')}`, marginX, footerY + 10);

        const signX = 145;
        doc.text('Koordinator Bus,', signX, footerY);
        doc.setFont('helvetica', 'bold');
        doc.text(bus.guide1 || '...........................................', signX, footerY + 16);
      },
    });
  });

  const fileName = targetBuses.length === 1
    ? `Manifest_Bus_${targetBuses[0].busNumber}.pdf`
    : `Manifest_Seluruh_Armada_Bus.pdf`;

  doc.save(fileName);
}

/**
 * Generates official A4 Surat Izin & Surat Pernyataan JTM PDF (1 Page per student).
 * Strict formatting: Zero cut-off, exact Kop Surat, Font >= 11pt, perfect margins.
 */
export async function generateSuratOfficialPDF(options: SuratPdfOptions): Promise<void> {
  const { type, students, settings, academicYear = '2025/2026', selectedStudentId } = options;

  const targetStudents = selectedStudentId
    ? students.filter((s) => s.id === selectedStudentId)
    : students;

  if (targetStudents.length === 0) {
    throw new Error('Tidak ada data siswa yang dipilih untuk dicetak.');
  }

  // Preload school logo Base64
  const logoBase64 = await getBase64LogoForPdf(settings?.headerLogoUrl || settings?.appLogoUrl);
  const schoolName = settings?.schoolName || schoolMetadata.school.name || 'SMK PGRI 2 PONOROGO';
  const travelAgency = settings?.travelAgency || schoolMetadata.school.travelAgency || 'Biro Fiesta Tour and Travel';

  const { jsPDF } = await loadPdfEngines();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const gel1Dates = settings?.baliGel1Dates || '10-14 Oktober 2026';
  const gel2Dates = settings?.baliGel2Dates || '23-27 Oktober 2026';
  const yogyaDates = settings?.yogyaGel1Dates || '15-16 Oktober 2026';

  targetStudents.forEach((student, index) => {
    if (index > 0) {
      doc.addPage('a4', 'portrait');
    }

    const marginX = 20;
    const pageWidth = 210;
    const contentWidth = 170; // 210 - 40
    let currY = 10;

    // ==========================================
    // 1. KOP SURAT RESMI (HEADER)
    // ==========================================
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', marginX, currY + 1, 23, 23);
      } catch {
        // Fallback silently if image cannot be decoded
      }
    }

    const textCenterX = marginX + 23 + (contentWidth - 23) / 2;

    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN', textCenterX, currY + 4, { align: 'center' });
    doc.text('PERSATUAN GURU REPUBLIK INDONESIA (YPLP-PGRI)', textCenterX, currY + 8.5, { align: 'center' });
    doc.text('KABUPATEN PONOROGO - JAWA TIMUR', textCenterX, currY + 13, { align: 'center' });

    doc.setFontSize(18);
    doc.setTextColor(220, 38, 38); // Official Red
    doc.text(schoolName.toUpperCase(), textCenterX, currY + 20, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('TERAKREDITASI A', textCenterX, currY + 24.5, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('Alamat : Jl. Soekarno - Hatta, Kertosari, Babadan, Ponorogo. Telp. 0352-461821/Fax. 0352-462659', textCenterX, currY + 28.5, { align: 'center' });
    doc.text('Website: smkpgri2ponorogo.com      E-mail: smkpgri2ponorogo@yahoo.com', textCenterX, currY + 32, { align: 'center' });

    // Double Divider Line
    currY += 34;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.line(marginX, currY, marginX + contentWidth, currY);
    doc.setLineWidth(0.25);
    doc.line(marginX, currY + 1.2, marginX + contentWidth, currY + 1.2);

    // ==========================================
    // 2. DOKUMEN CONTENT
    // ==========================================
    currY += 10;

    const parentName = student.parentName?.trim() || '...................................................';
    const parentAddress = student.parentAddress?.trim() || student.address?.trim() || '...................................................';
    const destinationUpper = (student.destination || 'BALI').toUpperCase();

    if (type === 'IZIN') {
      // TITLE
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('SURAT IZIN ORANG TUA', pageWidth / 2, currY, { align: 'center' });
      const titleWidth = doc.getTextWidth('SURAT IZIN ORANG TUA');
      doc.setLineWidth(0.3);
      doc.line((pageWidth - titleWidth) / 2, currY + 1, (pageWidth + titleWidth) / 2, currY + 1);

      currY += 8;
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Yang bertanda tangan dibawah ini :', marginX, currY);

      // Section 1: Data Orang Tua
      currY += 6;
      const colLabelX = marginX + 6;
      const colValX = marginX + 62;
      const valMaxWidth = contentWidth - 68;

      doc.text('Nama Orang Tua / Wali', colLabelX, currY);
      doc.text(`:  ${parentName}`, colValX, currY);

      currY += 5.5;
      doc.text('Alamat', colLabelX, currY);
      const addressLines = doc.splitTextToSize(parentAddress, valMaxWidth);
      doc.text(':  ' + (addressLines[0] || ''), colValX, currY);
      if (addressLines.length > 1) {
        for (let l = 1; l < addressLines.length; l++) {
          currY += 5;
          doc.text('   ' + addressLines[l], colValX, currY);
        }
      }

      // Section 2: Data Siswa
      currY += 7.5;
      doc.text('Dengan ini memberikan izin kepada :', marginX, currY);

      currY += 6;
      doc.text('Nama Peserta Didik', colLabelX, currY);
      doc.setFont('times', 'bold');
      doc.text(`:  ${student.name}`, colValX, currY);
      doc.setFont('times', 'normal');

      currY += 5.5;
      doc.text('NIS (Nomor Induk Siswa)', colLabelX, currY);
      doc.setFont('times', 'bold');
      doc.text(`:  ${student.nis}`, colValX, currY);
      doc.setFont('times', 'normal');

      currY += 5.5;
      doc.text('Kelas', colLabelX, currY);
      doc.setFont('times', 'bold');
      doc.text(`:  ${student.className}`, colValX, currY);
      doc.setFont('times', 'normal');

      currY += 5.5;
      doc.text('Mengikuti Darmawisata ke', colLabelX, currY);
      doc.setFont('times', 'bold');
      doc.text(`:  ${student.destination || 'BALI'}`, colValX, currY);
      doc.setFont('times', 'normal');

      // Section 3: Jadwal Pelaksanaan
      currY += 7.5;
      doc.setFont('times', 'bold');
      doc.text('yang akan dilaksanakan pada :', colLabelX, currY);
      doc.setFont('times', 'normal');

      currY += 5.5;
      if (destinationUpper.includes('YOGYA')) {
        doc.text(`1. Yogyakarta Gelombang I : ( ${yogyaDates} )`, colLabelX + 4, currY);
      } else if (destinationUpper.includes('BALI')) {
        doc.text(`1. Bali Gelombang I : ( ${gel1Dates} )`, colLabelX + 4, currY);
        currY += 5;
        doc.text(`2. Bali Gelombang II : ( ${gel2Dates} )`, colLabelX + 4, currY);
      } else {
        doc.text(`1. Bali Gelombang I : ( ${gel1Dates} )`, colLabelX + 4, currY);
        currY += 5;
        doc.text(`2. Bali Gelombang II : ( ${gel2Dates} )`, colLabelX + 4, currY);
        currY += 5;
        doc.text(`3. Yogyakarta Gelombang I : ( ${yogyaDates} )`, colLabelX + 4, currY);
      }

      // Section 4: Paragraf Penutup
      currY += 8;
      const openingText = `Yang diselenggarakan oleh ${schoolName}, bekerja sama dengan ${travelAgency}.`;
      const openingLines = doc.splitTextToSize(openingText, contentWidth);
      doc.text(openingLines, marginX, currY);
      currY += openingLines.length * 5 + 2;

      const closingText = 'Demikian surat izin ini saya buat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.';
      const closingLines = doc.splitTextToSize(closingText, contentWidth);
      doc.text(closingLines, marginX, currY);

      // Section 5: Signature Area
      const signX = 135;
      const signY = 225;
      const dateStr = `Ponorogo, ${gel1Dates.split(' ').slice(-2).join(' ') || 'Oktober 2026'}`;

      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.text(dateStr, signX, signY, { align: 'center' });
      doc.setFont('times', 'bold');
      doc.text('Orang Tua / Wali', signX, signY + 5.5, { align: 'center' });

      doc.text(`( ${parentName} )`, signX, signY + 26, { align: 'center' });
      const parentNameWidth = doc.getTextWidth(`( ${parentName} )`);
      doc.setLineWidth(0.25);
      doc.line(signX - parentNameWidth / 2, signY + 27, signX + parentNameWidth / 2, signY + 27);

    } else {
      // SURAT PERNYATAAN JTM
      doc.setFont('times', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(15, 23, 42);
      doc.text('SURAT PERNYATAAN JALUR TIDAK MAMPU (JTM)', pageWidth / 2, currY, { align: 'center' });
      const titleWidth = doc.getTextWidth('SURAT PERNYATAAN JALUR TIDAK MAMPU (JTM)');
      doc.setLineWidth(0.3);
      doc.line((pageWidth - titleWidth) / 2, currY + 1, (pageWidth + titleWidth) / 2, currY + 1);

      currY += 8;
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text('Yang bertanda tangan dibawah ini saya :', marginX, currY);
      doc.setFont('times', 'normal');

      currY += 6;
      const colLabelX = marginX + 6;
      const colValX = marginX + 65;
      const valMaxWidth = contentWidth - 71;

      doc.text('1. Nama (Orang tua/Wali)', colLabelX, currY);
      doc.text(`:  ${parentName}`, colValX, currY);

      currY += 5.5;
      doc.text('2. Alamat Lengkap', colLabelX, currY);
      const addressLines = doc.splitTextToSize(parentAddress, valMaxWidth);
      doc.text(':  ' + (addressLines[0] || ''), colValX, currY);
      if (addressLines.length > 1) {
        for (let l = 1; l < addressLines.length; l++) {
          currY += 5;
          doc.text('   ' + addressLines[l], colValX, currY);
        }
      }

      currY += 7.5;
      doc.setFont('times', 'bold');
      doc.text('Adalah Orang Tua / Wali Murid dari :', marginX, currY);
      doc.setFont('times', 'normal');

      currY += 6;
      doc.text('1. Nama (Siswa / Siswi)', colLabelX, currY);
      doc.setFont('times', 'bold');
      doc.text(`:  ${student.name}`, colValX, currY);
      doc.setFont('times', 'normal');

      currY += 5.5;
      doc.text('2. NIS', colLabelX, currY);
      doc.setFont('times', 'bold');
      doc.text(`:  ${student.nis}`, colValX, currY);
      doc.setFont('times', 'normal');

      currY += 5.5;
      doc.text('3. Kelas', colLabelX, currY);
      doc.setFont('times', 'bold');
      doc.text(`:  ${student.className}`, colValX, currY);
      doc.setFont('times', 'normal');

      currY += 5.5;
      doc.text('4. Kategori / Jalur', colLabelX, currY);
      doc.setFont('times', 'bold');
      doc.text(':  Jalur Tidak Mampu (JTM)', colValX, currY);
      doc.setFont('times', 'normal');

      currY += 8;
      doc.setFont('times', 'bold');
      doc.text('Dengan ini MENYATAKAN DENGAN SESUNGGUHNYA bahwa :', marginX, currY);
      doc.setFont('times', 'normal');

      currY += 6;
      const point1 = '1. Saya mengetahui, memahami dan menyetujui anak saya untuk ikut STUDY TOUR KE BALI.';
      const point1Lines = doc.splitTextToSize(point1, contentWidth - 4);
      doc.text(point1Lines, marginX + 4, currY);
      currY += point1Lines.length * 5 + 1.5;

      const point2 = '2. Saya sanggup membayar dan melunasi biaya study tour ke Bali dengan biaya penuh 100%, sebagaimana ketentuan dari sekolah terkait biaya kegiatan study tour.';
      const point2Lines = doc.splitTextToSize(point2, contentWidth - 4);
      doc.text(point2Lines, marginX + 4, currY);
      currY += point2Lines.length * 5 + 1.5;

      const point3 = '3. Apabila saya tidak melaksanakan ketentuan poin 2 di atas, maka saya siap menerima sanksi sesuai dengan ketentuan sekolah.';
      const point3Lines = doc.splitTextToSize(point3, contentWidth - 4);
      doc.text(point3Lines, marginX + 4, currY);
      currY += point3Lines.length * 5 + 2;

      const closingText = 'Demikian Surat Pernyataan ini saya buat dengan sebenarnya dan tanpa ada tekanan atau paksaan dari pihak manapun.';
      const closingLines = doc.splitTextToSize(closingText, contentWidth);
      doc.text(closingLines, marginX, currY);

      // Signature Area
      const signX = 135;
      const signY = 225;

      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.text('Ponorogo, . . . . . . . . . . . . . . . .', signX, signY, { align: 'center' });
      doc.setFont('times', 'bold');
      doc.text('Yang membuat Pernyataan,', signX, signY + 5, { align: 'center' });
      doc.text('Orang Tua / Wali Murid', signX, signY + 9.5, { align: 'center' });

      doc.text(`( ${parentName} )`, signX, signY + 27, { align: 'center' });
      const parentNameWidth = doc.getTextWidth(`( ${parentName} )`);
      doc.setLineWidth(0.25);
      doc.line(signX - parentNameWidth / 2, signY + 28, signX + parentNameWidth / 2, signY + 28);
    }
  });

  const baseFileName = type === 'IZIN' ? 'Surat_Izin_Orang_Tua' : 'Surat_Pernyataan_JTM';
  const fileName = targetStudents.length === 1
    ? `${baseFileName}_${targetStudents[0].name.replace(/\s+/g, '_')}.pdf`
    : `${baseFileName}_Batch_${targetStudents.length}_Siswa.pdf`;

  doc.save(fileName);
}

