'use client';

import React, { useState } from 'react';
import type { Student, SchoolClass, AppSettings } from '@/types';
import { RecapGeneratorService } from '@/services/recapGenerator';
import {
  MapPin,
  Shirt,
  Users,
  CheckCircle2,
  XCircle,
  BarChart3,
  Building,
  Filter,
  Sparkles,
  PieChart,
  Printer,
  FileDown,
  MessageSquare,
  Copy,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

interface AdminOverviewStatsProps {
  students: Student[];
  classes: SchoolClass[];
  settings?: AppSettings;
}

export const AdminOverviewStats: React.FC<AdminOverviewStatsProps> = ({
  students,
  classes,
  settings,
}) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');

  // Share Modal states
  const [activeShareClass, setActiveShareClass] = useState<SchoolClass | null>(null);
  const [sharePhoneNumber, setSharePhoneNumber] = useState<string>('');
  const [shareMessageText, setShareMessageText] = useState<string>('');
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  const handleOpenShareModal = (cls: SchoolClass) => {
    const clsStudents = students.filter((s) => s.className === cls.name);
    const recapText = RecapGeneratorService.generateWhatsAppRecap(cls, clsStudents, settings);
    setActiveShareClass(cls);
    setShareMessageText(recapText);
    
    // Default phone to teacherPhone if exists, else settings autoRecapTargetPhone, else empty
    const defaultPhone = cls.teacherPhone || settings?.autoRecapTargetPhone || '';
    setSharePhoneNumber(defaultPhone);
    setShareCopied(false);
  };

  const handleCopyShareText = () => {
    navigator.clipboard.writeText(shareMessageText);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleSendToWhatsApp = () => {
    const encodedText = encodeURIComponent(shareMessageText);
    const cleanPhone = sharePhoneNumber.replace(/[^0-9]/g, '');
    
    let waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    if (cleanPhone) {
      waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    }
    window.open(waUrl, '_blank');
  };

  // Filter students if class selected
  const filteredStudents = selectedClassFilter === 'ALL'
    ? students
    : students.filter((s) => s.className === selectedClassFilter);

  // Registered stats
  const totalStudents = filteredStudents.length;
  const registeredStudents = filteredStudents.filter((s) => s.isRegistered);
  const unregisteredStudents = filteredStudents.filter((s) => !s.isRegistered);

  // Destination stats
  const baliCount = registeredStudents.filter((s) => s.destination === 'BALI').length;
  const yogyaCount = registeredStudents.filter((s) => s.destination === 'YOGYAKARTA').length;
  const noDestinationCount = registeredStudents.filter((s) => !s.destination).length;

  // Percentage calculations
  const registeredPct = totalStudents ? Math.round((registeredStudents.length / totalStudents) * 100) : 0;
  const baliPct = registeredStudents.length ? Math.round((baliCount / registeredStudents.length) * 100) : 0;
  const yogyaPct = registeredStudents.length ? Math.round((yogyaCount / registeredStudents.length) * 100) : 0;

  // Wave stats
  const waveBali1 = registeredStudents.filter((s) => s.wave === 'BALI_GEL_1').length;
  const waveBali2 = registeredStudents.filter((s) => s.wave === 'BALI_GEL_2').length;
  const waveYogya1 = registeredStudents.filter((s) => s.wave === 'YOGYA_GEL_1').length;

  // T-Shirt Size stats
  const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'] as const;
  const sizeCounts: Record<string, number> = {
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0,
    '3XL': 0,
    '4XL': 0,
  };

  let designACount = 0;
  let designBCount = 0;
  let totalShirtsOrdered = 0;

  registeredStudents.forEach((s) => {
    if (s.tShirtSize) {
      sizeCounts[s.tShirtSize] = (sizeCounts[s.tShirtSize] || 0) + 1;
      totalShirtsOrdered++;
    }
    if (s.tShirtDesign === 'A') designACount++;
    if (s.tShirtDesign === 'B') designBCount++;
  });

  const handlePrint = () => {
    if (typeof window === 'undefined') return;

    // Calculate totals for summary
    const totalSiswaAll = classes.reduce((sum, cls) => sum + students.filter((s) => s.className === cls.name).length, 0);
    const totalTerisiAll = classes.reduce((sum, cls) => sum + students.filter((s) => s.className === cls.name && s.isRegistered).length, 0);
    const totalBaliAll = classes.reduce((sum, cls) => sum + students.filter((s) => s.className === cls.name && s.isRegistered && s.destination === 'BALI').length, 0);
    const totalYogyaAll = classes.reduce((sum, cls) => sum + students.filter((s) => s.className === cls.name && s.isRegistered && s.destination === 'YOGYAKARTA').length, 0);

    const allSizesAll: Record<string, number> = {};
    students.filter(s => s.isRegistered && s.tShirtSize).forEach(s => {
      if (s.tShirtSize) {
        allSizesAll[s.tShirtSize] = (allSizesAll[s.tShirtSize] || 0) + 1;
      }
    });

    // Custom order for sizes
    const sizeOrder = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
    const sortedAllSizes = Object.entries(allSizesAll).sort((a, b) => {
      return sizeOrder.indexOf(a[0]) - sizeOrder.indexOf(b[0]);
    });

    const totalSizesStr = sortedAllSizes
      .map(([sz, c]) => `<span class="size-pill"><strong>${sz}</strong>:${c}</span>`)
      .join(' ') || '-';

    const rowsHtml = classes.map((cls) => {
      const clsStudents = students.filter((s) => s.className === cls.name);
      const clsRegistered = clsStudents.filter((s) => s.isRegistered);
      const clsBali = clsRegistered.filter((s) => s.destination === 'BALI').length;
      const clsYogya = clsRegistered.filter((s) => s.destination === 'YOGYAKARTA').length;

      const clsSizes: Record<string, number> = {};
      clsRegistered.forEach((s) => {
        if (s.tShirtSize) {
          clsSizes[s.tShirtSize] = (clsSizes[s.tShirtSize] || 0) + 1;
        }
      });

      const sortedClsSizes = Object.entries(clsSizes).sort((a, b) => {
        return sizeOrder.indexOf(a[0]) - sizeOrder.indexOf(b[0]);
      });

      const sizeStr = sortedClsSizes
        .map(([sz, c]) => `<span class="size-pill"><strong>${sz}</strong>:${c}</span>`)
        .join(' ') || '-';

      const isComplete = clsRegistered.length === clsStudents.length && clsStudents.length > 0;

      return `
        <tr>
          <td style="font-weight: 800; text-align: center;">${cls.name}</td>
          <td>${cls.homeroomTeacher || '-'}</td>
          <td class="text-center" style="font-weight: 700; text-align: center;">${clsStudents.length}</td>
          <td class="text-center" style="text-align: center;">
            <span class="badge ${isComplete ? 'badge-green' : 'badge-blue'}">
              ${clsRegistered.length} / ${clsStudents.length}
            </span>
          </td>
          <td class="text-center" style="color: #0f766e; background-color: #f0fdf4; font-weight: 800; text-align: center;">${clsBali}</td>
          <td class="text-center" style="color: #b45309; background-color: #fffbeb; font-weight: 800; text-align: center;">${clsYogya}</td>
          <td style="padding: 4px 6px;">${sizeStr}</td>
        </tr>
      `;
    }).join('');

    const numClasses = classes.length;
    let bodyPadding = '12px 15px';
    let fontSize = '11.5px';
    let padding = '5px 8px';
    let headerMargin = '10px';
    let titleSize = '16px';
    let subTitleSize = '10px';
    let metaMargin = '8px';

    if (numClasses > 15) {
      bodyPadding = '5px 8px';
      fontSize = '9px';
      padding = '2px 4px';
      headerMargin = '4px';
      titleSize = '12px';
      subTitleSize = '8px';
      metaMargin = '4px';
    } else if (numClasses > 10) {
      bodyPadding = '8px 12px';
      fontSize = '10px';
      padding = '3px 5px';
      headerMargin = '6px';
      titleSize = '14px';
      subTitleSize = '9px';
      metaMargin = '6px';
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Matriks Progres Pengisian Angket per Kelas</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: ${bodyPadding};
            color: #1e293b;
            line-height: 1.25;
            background: #ffffff;
            font-size: ${fontSize};
          }
          .header {
            text-align: center;
            margin-bottom: ${headerMargin};
            border-bottom: 2px double #94a3b8;
            padding-bottom: 6px;
          }
          .header h1 {
            font-size: ${titleSize};
            font-weight: 850;
            margin: 0;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header h2 {
            font-size: ${subTitleSize};
            font-weight: 700;
            margin: 3px 0 0 0;
            color: #475569;
            letter-spacing: 0.3px;
          }
          .meta-info {
            display: flex;
            justify-content: space-between;
            font-size: calc(${fontSize} - 1.5px);
            color: #475569;
            margin-bottom: ${metaMargin};
            font-weight: 600;
          }
          .report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: ${fontSize};
            margin-top: 2px;
          }
          .report-table th, .report-table td {
            border: 1px solid #64748b;
            padding: ${padding};
            text-align: left;
            vertical-align: middle;
          }
          .report-table th {
            background-color: #e2e8f0;
            color: #0f172a;
            font-weight: 850;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.3px;
          }
          .col-rombel { width: 9%; text-align: center !important; }
          .col-wali { width: 25%; }
          .col-siswa { width: 8%; text-align: center !important; }
          .col-terisi { width: 10%; text-align: center !important; }
          .col-bali { width: 7%; text-align: center !important; }
          .col-jogja { width: 7%; text-align: center !important; }
          .col-kaos { width: 34%; }
          
          .report-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .text-center {
            text-align: center !important;
          }
          .font-bold {
            font-weight: 700;
          }
          .badge {
            display: inline-block;
            padding: 3px 7px;
            border-radius: 4px;
            font-weight: 800;
            font-size: 11px;
            white-space: nowrap;
          }
          .badge-blue {
            background-color: #e0f2fe;
            color: #0369a1;
            border: 1px solid #bae6fd;
          }
          .badge-green {
            background-color: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }
          .size-pill {
            display: inline-block;
            color: #1e293b;
            font-size: 11px;
            font-weight: 600;
            margin-right: 6px;
            white-space: nowrap;
          }
          .total-row {
            background-color: #cbd5e1 !important;
            font-weight: 850;
            color: #0f172a;
          }
          .footer {
            margin-top: 15px;
            text-align: right;
            font-size: 10px;
            color: #64748b;
          }
          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            @page {
              size: A4 portrait;
              margin: 0.8cm 1cm;
            }
            .report-table th {
              background-color: #cbd5e1 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .report-table tr:nth-child(even) {
              background-color: #f8fafc !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .badge-blue {
              background-color: #e0f2fe !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .badge-green {
              background-color: #d1fae5 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .size-pill {
              background-color: transparent !important;
              color: #1e293b !important;
              border: none !important;
              padding: 0 !important;
              margin-right: 6px !important;
            }
            .total-row {
              background-color: #94a3b8 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Matriks Progres Pengisian Angket per Kelas</h1>
          <h2>REKAPITULASI PILIHAN DESTINASI (BALI/JOGJA) & UKURAN KAOS SISWA</h2>
        </div>
        <div class="meta-info">
          <span>Dicetak oleh: Administrator</span>
          <span>Waktu Cetak: ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</span>
        </div>
        <table class="report-table">
          <thead>
            <tr>
              <th class="col-rombel text-center">Rombel</th>
              <th class="col-wali">Wali Kelas</th>
              <th class="col-siswa text-center">Siswa</th>
              <th class="col-terisi text-center">Terisi</th>
              <th class="col-bali text-center">Bali</th>
              <th class="col-jogja text-center">Jogja</th>
              <th class="col-kaos">Rekap Ukuran Kaos</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td style="font-weight: 800; text-align: center;">TOTAL</td>
              <td>-</td>
              <td class="text-center" style="font-weight: 800;">${totalSiswaAll}</td>
              <td class="text-center" style="font-weight: 800;">${totalTerisiAll} / ${totalSiswaAll}</td>
              <td class="text-center" style="color: #0f766e; font-weight: 800;">${totalBaliAll}</td>
              <td class="text-center" style="color: #b45309; font-weight: 800;">${totalYogyaAll}</td>
              <td style="padding: 4px 6px;">${totalSizesStr}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <p>Sistem Informasi Manajemen Darmawisata & Angket Siswa &copy; ${new Date().getFullYear()}</p>
        </div>
        <script>
          setTimeout(function() {
            window.focus();
            window.print();
          }, 300);
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" /> Executive Analytics & Rekapitulasi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ringkasan data real-time pilihan destinasi darmawisata (Bali / Jogja) & pemesanan ukuran kaos
          </p>
        </div>

        {/* Action Controls & Filter Kelas */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0 active:scale-[0.98]"
            title="Cetak Matriks Laporan per Kelas"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Matriks Lengkap</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Kelas ({classes.length} Rombel)</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  Kelas {cls.name} ({cls.department})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Angket Masuk */}
        <div className="bg-gradient-to-br from-sky-500 to-sky-700 text-white p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 opacity-15 pointer-events-none">
            <Users className="w-24 h-24" />
          </div>
          <p className="text-xs font-bold text-sky-100 uppercase tracking-wider">Total Angket Masuk</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black">{registeredStudents.length}</span>
            <span className="text-xs font-bold text-sky-200">/ {totalStudents} Siswa</span>
          </div>
          <div className="w-full bg-sky-900/40 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-sky-200 h-full rounded-full transition-all duration-500"
              style={{ width: `${registeredPct}%` }}
            />
          </div>
          <p className="text-[11px] font-bold text-sky-100 mt-1.5 flex justify-between">
            <span>Progress Pengisian</span>
            <span>{registeredPct}%</span>
          </p>
        </div>

        {/* Card 2: Destinasi BALI */}
        <div className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 opacity-15 pointer-events-none">
            <MapPin className="w-24 h-24" />
          </div>
          <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Tujuan BALI</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black">{baliCount}</span>
            <span className="text-xs font-bold text-emerald-200">Siswa ({baliPct}%)</span>
          </div>
          <div className="mt-3 text-[11px] font-extrabold text-emerald-100 space-y-0.5">
            <p>• Gel. 1: {waveBali1} Siswa</p>
            <p>• Gel. 2: {waveBali2} Siswa</p>
          </div>
        </div>

        {/* Card 3: Destinasi JOGJA */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-white p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 opacity-15 pointer-events-none">
            <MapPin className="w-24 h-24" />
          </div>
          <p className="text-xs font-bold text-amber-100 uppercase tracking-wider">Tujuan YOGYAKARTA</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black">{yogyaCount}</span>
            <span className="text-xs font-bold text-amber-200">Siswa ({yogyaPct}%)</span>
          </div>
          <div className="mt-3 text-[11px] font-extrabold text-amber-100 space-y-0.5">
            <p>• Gel. 1 (Yogya): {waveYogya1} Siswa</p>
            <p>• Belum Memilih: {noDestinationCount} Siswa</p>
          </div>
        </div>

        {/* Card 4: Total Kaos Dipesan */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 opacity-15 pointer-events-none">
            <Shirt className="w-24 h-24" />
          </div>
          <p className="text-xs font-bold text-purple-100 uppercase tracking-wider">Total Kaos Dipesan</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black">{totalShirtsOrdered}</span>
            <span className="text-xs font-bold text-purple-200">Pcs</span>
          </div>
          <div className="mt-3 text-[11px] font-extrabold text-purple-100 space-y-0.5">
            <p>• Desain Opsi A: {designACount} Pcs</p>
            <p>• Desain Opsi B: {designBCount} Pcs</p>
          </div>
        </div>
      </div>

      {/* Main Breakdown Grids: Destinasi & Kaos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Breakdown Destinasi Bali vs Jogja */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" /> Distribusi Pilihan Destinasi
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {registeredStudents.length} Angket
            </span>
          </div>

          {/* Visual Progress Bar Bali vs Jogja */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-extrabold">
              <span className="text-teal-700 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" /> BALI ({baliCount} Siswa / {baliPct}%)
              </span>
              <span className="text-amber-700 flex items-center gap-1">
                YOGYAKARTA ({yogyaCount} Siswa / {yogyaPct}%) <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              </span>
            </div>
            <div className="w-full bg-slate-100 h-4 rounded-full flex overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-teal-500 h-full rounded-l-full transition-all duration-500"
                style={{ width: `${baliPct}%` }}
                title={`Bali: ${baliCount} siswa`}
              />
              <div
                className="bg-amber-500 h-full rounded-r-full transition-all duration-500"
                style={{ width: `${yogyaPct}%` }}
                title={`Jogja: ${yogyaCount} siswa`}
              />
            </div>
          </div>

          {/* Detailed Cards for Bali & Jogja */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 space-y-1">
              <p className="text-xs font-black text-teal-900">Pulau Bali</p>
              <p className="text-2xl font-black text-teal-700">{baliCount} <span className="text-xs font-bold text-teal-600">Siswa</span></p>
              <p className="text-[11px] text-teal-800 font-medium">
                Siswa telah memilih paket darmawisata Bali.
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1">
              <p className="text-xs font-black text-amber-900">Yogyakarta</p>
              <p className="text-2xl font-black text-amber-700">{yogyaCount} <span className="text-xs font-bold text-amber-600">Siswa</span></p>
              <p className="text-[11px] text-amber-800 font-medium">
                Siswa telah memilih paket darmawisata Yogyakarta.
              </p>
            </div>
          </div>

          {/* Status Pengisian Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Sudah Mengisi: <strong className="text-slate-900">{registeredStudents.length}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Belum Mengisi: <strong className="text-slate-900">{unregisteredStudents.length}</strong></span>
            </div>
          </div>
        </div>

        {/* Section 2: Breakdown Ukuran Kaos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Shirt className="w-4 h-4 text-purple-600" /> Rekapitulasi Pesanan Ukuran Kaos
            </h3>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
              Total {totalShirtsOrdered} Pcs
            </span>
          </div>

          {/* Grid Cards Ukuran Kaos (S, M, L, XL, XXL, 3XL, 4XL) */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {ALL_SIZES.map((sz) => {
              const count = sizeCounts[sz] || 0;
              const pct = totalShirtsOrdered ? Math.round((count / totalShirtsOrdered) * 100) : 0;
              return (
                <div
                  key={sz}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    count > 0
                      ? 'bg-purple-50/80 border-purple-200 text-purple-950'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <span className="block text-xs font-black uppercase text-purple-900">{sz}</span>
                  <span className="block text-lg font-black mt-0.5">{count}</span>
                  <span className="block text-[9px] font-bold text-purple-700">{pct}%</span>
                </div>
              );
            })}
          </div>

          {/* Desain Option Summary */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 flex justify-between items-center">
              <span>Desain Kaos A:</span>
              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-black">{designACount} Pcs</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 flex justify-between items-center">
              <span>Desain Kaos B:</span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-black">{designBCount} Pcs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Tabel Rekap Rombel / Per-Kelas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-amber-600" /> Ringkasan Per Rombongan Belajar (Rombel)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian jumlah siswa, status pengisian angket, pilihan tujuan & rekap ukuran kaos tiap kelas
            </p>
          </div>

          {/* Print & Download PDF Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="Cetak Tabel Matriks"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Cetak Matriks</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="Unduh format PDF (Pilih 'Simpan ke PDF' di opsi cetak)"
            >
              <FileDown className="w-4 h-4 text-rose-600" />
              <span>Unduh PDF</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-200">
                <th className="p-3">Rombel / Kelas</th>
                <th className="p-3">Wali Kelas</th>
                <th className="p-3 text-center">Total Siswa</th>
                <th className="p-3 text-center">Terisi</th>
                <th className="p-3 text-center text-teal-800 bg-teal-50/50">Bali</th>
                <th className="p-3 text-center text-amber-800 bg-amber-50/50">Jogja</th>
                <th className="p-3 text-left">Rekap Ukuran Kaos</th>
                <th className="p-3 text-center no-print">Aksi WA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 font-medium">
                    Belum ada data kelas terdaftar.
                  </td>
                </tr>
              ) : (
                classes.map((cls) => {
                  const clsStudents = students.filter((s) => s.className === cls.name);
                  const clsRegistered = clsStudents.filter((s) => s.isRegistered);
                  const clsBali = clsRegistered.filter((s) => s.destination === 'BALI').length;
                  const clsYogya = clsRegistered.filter((s) => s.destination === 'YOGYAKARTA').length;

                  // T-shirt counts for class
                  const clsSizes: Record<string, number> = {};
                  clsRegistered.forEach((s) => {
                    if (s.tShirtSize) {
                      clsSizes[s.tShirtSize] = (clsSizes[s.tShirtSize] || 0) + 1;
                    }
                  });

                  const sizeOrder = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
                  const sizeStr = Object.entries(clsSizes)
                    .sort((a, b) => sizeOrder.indexOf(a[0]) - sizeOrder.indexOf(b[0]))
                    .map(([sz, c]) => `${sz}:${c}`)
                    .join(', ');

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-extrabold text-slate-900">
                        {cls.name} <span className="text-[10px] font-bold text-slate-400">({cls.department})</span>
                      </td>
                      <td className="p-3 font-medium text-slate-700">
                        {cls.homeroomTeacher || '-'}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800">
                        {clsStudents.length}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                          clsRegistered.length === clsStudents.length && clsStudents.length > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          {clsRegistered.length} / {clsStudents.length}
                        </span>
                      </td>
                      <td className="p-3 text-center font-black text-teal-700 bg-teal-50/30">
                        {clsBali}
                      </td>
                      <td className="p-3 text-center font-black text-amber-700 bg-amber-50/30">
                        {clsYogya}
                      </td>
                      <td className="p-3 text-left">
                        {sizeStr ? (
                          <span className="font-bold text-[11px] text-slate-700">
                            {sizeStr}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center no-print">
                        <button
                          onClick={() => handleOpenShareModal(cls)}
                          className="px-2.5 py-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-black transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer active:scale-95 shadow-2xs"
                          title="Bagikan Ringkasan ke WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kirim WA</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Share WhatsApp Modal */}
      {activeShareClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Bagikan Rekapitulasi Rombel - {activeShareClass.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Kirim laporan progress pengisian angket ke WhatsApp Wali Kelas atau Guru terkait.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveShareClass(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Phone Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Nomor WhatsApp Penerima
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">+</span>
                    <input
                      type="text"
                      value={sharePhoneNumber}
                      onChange={(e) => setSharePhoneNumber(e.target.value)}
                      placeholder="628123456789 (Gunakan format kode negara, e.g. 62)"
                      className="w-full pl-7 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 focus:bg-white transition-all"
                    />
                  </div>
                  {activeShareClass.teacherPhone && sharePhoneNumber !== activeShareClass.teacherPhone && (
                    <button
                      onClick={() => setSharePhoneNumber(activeShareClass.teacherPhone || '')}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                    >
                      No. Wali Kelas
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Default terisi dari nomor HP Wali Kelas ({activeShareClass.homeroomTeacher || '-'}).
                </p>
              </div>

              {/* Message Text area */}
              <div className="space-y-1.5 flex-1 flex flex-col min-h-[250px]">
                <label className="block text-xs font-bold text-slate-700">
                  Isi Pesan WhatsApp (Dapat Diedit)
                </label>
                <textarea
                  value={shareMessageText}
                  onChange={(e) => setShareMessageText(e.target.value)}
                  className="w-full flex-1 p-3.5 text-xs font-medium font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 focus:bg-white resize-none transition-all leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setActiveShareClass(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleCopyShareText}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {shareCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Salin Pesan</span>
                  </>
                )}
              </button>
              <button
                onClick={handleSendToWhatsApp}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-200 active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Kirim ke WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOverviewStats;
