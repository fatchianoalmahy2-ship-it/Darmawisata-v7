'use client';

import React, { useState } from 'react';
import { Student, SchoolClass, AppSettings } from '@/types';
import { Printer, CheckCircle2, XCircle, FileText, Search, Download, Loader2 } from 'lucide-react';
import { generateClassManifestPDF } from '@/lib/pdf/entityReportGenerator';

interface StatusAngketA4ReportProps {
  selectedClassName: string;
  classes: SchoolClass[];
  students: Student[];
  settings?: AppSettings;
}

// Helpers for auto-shrinking text in fixed column width while strictly keeping 1 single line
const getNameInlineStyle = (name: string): React.CSSProperties => {
  const len = name ? name.length : 0;
  if (len <= 20) return { fontSize: '8.5px', lineHeight: '1.1' };
  if (len <= 26) return { fontSize: '7.5px', lineHeight: '1.1', letterSpacing: '-0.2px' };
  if (len <= 34) return { fontSize: '6.5px', lineHeight: '1.05', letterSpacing: '-0.3px' };
  return { fontSize: '5.5px', lineHeight: '1.0', letterSpacing: '-0.4px' };
};

const getMedicalInlineStyle = (med: string): React.CSSProperties => {
  const len = med ? med.length : 0;
  if (len <= 14) return { fontSize: '8px', lineHeight: '1.1' };
  if (len <= 24) return { fontSize: '7px', lineHeight: '1.1', letterSpacing: '-0.2px' };
  if (len <= 36) return { fontSize: '6px', lineHeight: '1.05', letterSpacing: '-0.3px' };
  return { fontSize: '5.2px', lineHeight: '1.0', letterSpacing: '-0.4px' };
};

export const StatusAngketA4Report: React.FC<StatusAngketA4ReportProps> = ({
  selectedClassName,
  classes,
  students,
  settings,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const targetClasses =
    selectedClassName === 'ALL'
      ? classes
      : classes.filter((c) => c.name === selectedClassName);

  const formattedDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleExportDirectPdf = async () => {
    try {
      setIsExportingPdf(true);
      await generateClassManifestPDF({
        classes: targetClasses,
        students,
        settings,
        academicYear: settings?.academicYear || '2026/2027',
      });
    } catch (err: any) {
      alert(`Gagal mengekspor PDF: ${err?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintWindow = () => {
    if (typeof window === 'undefined') return;
    const printContent = document.getElementById('printable-status-angket')?.innerHTML;
    if (!printContent) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <title>Laporan Rekap Status Angket - ${settings?.schoolName || 'SMK PGRI 2 Ponorogo'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 3mm 4mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-size: 8px;
              line-height: 1.15;
            }
            .a4-page-block {
              width: 100%;
              max-width: 210mm;
              height: 288mm;
              max-height: 288mm;
              margin: 0 auto;
              padding: 3mm 4mm;
              background: #ffffff;
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              break-inside: avoid;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
              overflow: hidden;
            }
            .a4-page-block:last-child {
              page-break-after: avoid;
              break-after: avoid;
            }
            .no-print {
              display: none !important;
            }
            .doc-title {
              text-align: center;
              margin-bottom: 2px;
            }
            .doc-title h3 {
              margin: 0;
              font-size: 10.5px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.2px;
            }
            .doc-title p {
              margin: 0.5px 0 0 0;
              font-size: 7.5px;
              font-weight: 700;
              color: #334155;
            }
            .meta-box {
              display: grid;
              grid-template-columns: 24% 24% 28% 24%;
              gap: 3px;
              border: 1px solid #000000;
              background-color: #f8fafc;
              padding: 2px 4px;
              margin-bottom: 2px;
              border-radius: 2px;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            .meta-label {
              font-size: 6.5px;
              text-transform: uppercase;
              font-weight: bold;
              color: #475569;
              white-space: nowrap;
            }
            .meta-value {
              font-size: 8.5px;
              font-weight: 900;
              color: #0f172a;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            table {
              width: 100%;
              table-layout: fixed;
              border-collapse: collapse;
              margin-bottom: 2px;
            }
            tr {
              height: 5.2mm;
              max-height: 5.2mm;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            th, td {
              border: 1px solid #000000;
              padding: 1px 2px !important;
              text-align: left;
              font-size: 8px !important;
              line-height: 1.1 !important;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              height: 5.2mm;
              max-height: 5.2mm;
            }
            th {
              background-color: #e2e8f0 !important;
              font-weight: 900;
              text-transform: uppercase;
              font-size: 7.5px !important;
              padding: 2px 2px !important;
              height: 5mm;
            }
            .text-center {
              text-align: center;
            }
            .badge-check {
              color: #065f46;
              background-color: #d1fae5 !important;
              padding: 0px 3px;
              border-radius: 4px;
              font-weight: 900;
              font-size: 7.5px;
              display: inline-block;
            }
            .badge-cross {
              color: #991b1b;
              background-color: #ffe4e6 !important;
              padding: 0px 3px;
              border-radius: 4px;
              font-weight: 900;
              font-size: 7.5px;
              display: inline-block;
            }
            .footer-sig {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              padding-top: 2px;
              border-top: 1px solid #000000;
              margin-top: auto;
              font-size: 8px;
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            setTimeout(() => {
              window.focus();
              window.print();
            }, 250);
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Control Action Toolbar */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Format Cetak A4 Standar 38 Baris (Pasti 1 Halaman per Kelas)</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            Laporan Rekap Status Pengisian Angket
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedClassName === 'ALL'
              ? `Mencetak laporan seluruh kelas (${classes.length} kelas) — Format presisi 38 baris, 1 lembar A4 per kelas`
              : `Mencetak laporan resmi kelas ${selectedClassName} — Format presisi 38 baris (1 lembar A4)`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full lg:w-auto items-center">
          {/* Search Filter for screen view */}
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 sm:top-3 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter nama / NIS..."
              className="w-full h-11 sm:h-12 pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
          </div>

          {/* Export Direct Vector PDF (1 Kelas 1 Halaman, Font >= 11pt) */}
          <button
            type="button"
            onClick={handleExportDirectPdf}
            disabled={isExportingPdf}
            className="w-full h-11 sm:h-12 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-xl sm:rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Download className="w-4 h-4 shrink-0" />
            )}
            <span>{isExportingPdf ? 'Membuat PDF...' : 'Download PDF Manifest (≥11pt)'}</span>
          </button>

          {/* Cetak Browser Button */}
          <button
            type="button"
            onClick={handlePrintWindow}
            className="w-full h-11 sm:h-12 py-2.5 px-3 bg-[#00875a] hover:bg-emerald-700 text-white font-extrabold rounded-xl sm:rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Cetak A4 Window</span>
          </button>
        </div>
      </div>

      {/* Printable Area Wrapper */}
      <div id="printable-status-angket" className="space-y-8">
        {targetClasses.map((cls) => {
          let clsStudents = students.filter((s) => s.className === cls.name);

          if (searchFilter) {
            clsStudents = clsStudents.filter((s) =>
              s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
              s.nis.toLowerCase().includes(searchFilter.toLowerCase())
            );
          }

          const magangCount = clsStudents.filter((s) => s.destination === 'MAGANG').length;
          const registeredCount = clsStudents.filter((s) => s.isRegistered && s.destination !== 'MAGANG').length;
          const unregisteredCount = clsStudents.filter((s) => !s.isRegistered).length;

          return (
            <div
              key={cls.id}
              className="a4-page-block bg-white rounded-2xl border border-slate-300 p-3 sm:p-4 shadow-lg text-slate-900 font-sans max-w-[210mm] min-h-[277mm] max-h-[288mm] mx-auto box-border flex flex-col justify-between overflow-hidden print:max-h-[288mm] print:overflow-hidden print:border-none print:shadow-none"
            >
              <div>
                {/* Judul Laporan Ringkas */}
                <div className="doc-title text-center mb-1">
                  <h3 className="text-xs font-black uppercase tracking-wide text-slate-900 underline decoration-slate-900 decoration-2 underline-offset-2">
                    LAPORAN REKAP STATUS PENGISIAN ANGKET PEMINATAN DARMAWISATA
                  </h3>
                  <p className="text-[8px] text-slate-600 font-bold mt-0.5">
                    {settings?.schoolName || 'SMK PGRI 2 PONOROGO'} • TAHUN AJARAN {settings?.academicYear || '2026/2027'} • Tanggal Cetak: {formattedDate}
                  </p>
                </div>

                {/* Metadata Header Box: Nama Wali, Kelas, Rekap Status, Rekap Ukuran Kaos */}
                {(() => {
                  const sizeCounts: Record<string, number> = {};
                  clsStudents.forEach((s) => {
                    if (s.isRegistered && s.tShirtSize) {
                      sizeCounts[s.tShirtSize] = (sizeCounts[s.tShirtSize] || 0) + 1;
                    }
                  });
                  const sizeSummary = Object.entries(sizeCounts)
                    .map(([sz, count]) => `${sz}:${count}`)
                    .join(' | ');

                  return (
                    <div className="meta-box bg-slate-50 border border-slate-300 rounded-xs p-1 mb-1 grid grid-cols-4 gap-1 text-xs font-bold text-slate-900">
                      <div className="meta-item">
                        <span className="meta-label text-[7px] uppercase font-bold text-slate-500 block truncate">
                          Wali Kelas:
                        </span>
                        <span className="meta-value text-[9px] font-black text-slate-900 truncate">
                          {cls.homeroomTeacher || 'Belum diisi'}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label text-[7px] uppercase font-bold text-slate-500 block truncate">
                          Kelas / Jurusan:
                        </span>
                        <span className="meta-value text-[9px] font-black text-slate-900 truncate">
                          {cls.name} ({cls.department})
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label text-[7px] uppercase font-bold text-slate-500 block truncate">
                          Status Pengisian:
                        </span>
                        <span className="meta-value text-[9px] font-black text-emerald-700 truncate">
                          {registeredCount} Ikut | {magangCount} Magang | {unregisteredCount} Belum
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label text-[7px] uppercase font-bold text-slate-500 block truncate">
                          Rekap Kaos:
                        </span>
                        <span className="meta-value text-[9px] font-black text-purple-900 truncate" title={sizeSummary || '-'}>
                          {sizeSummary || '-'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Table with strict column grid (Standardized 38 Rows) */}
                <div className="overflow-hidden my-0.5">
                  <table className="w-full text-left border-collapse border border-slate-400 table-fixed">
                    <colgroup>
                      <col style={{ width: '4.5%' }} />
                      <col style={{ width: '31.5%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '21%' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-200 text-slate-900 font-black border-b border-slate-400">
                        <th className="py-0.5 px-0.5 border border-slate-400 text-center uppercase text-[7.5px]">
                          No.
                        </th>
                        <th className="py-0.5 px-1 border border-slate-400 uppercase text-[7.5px]">
                          Nama Siswa
                        </th>
                        <th className="py-0.5 px-0.5 border border-slate-400 text-center uppercase text-[7.5px]">
                          NIS
                        </th>
                        <th className="py-0.5 px-0.5 border border-slate-400 text-center uppercase text-[7.5px]">
                          Status
                        </th>
                        <th className="py-0.5 px-0.5 border border-slate-400 text-center uppercase text-[7.5px]">
                          Pilihan
                        </th>
                        <th className="py-0.5 px-0.5 border border-slate-400 text-center uppercase text-[7.5px]">
                          Kaos
                        </th>
                        <th className="py-0.5 px-1 border border-slate-400 text-left uppercase text-[7.5px]">
                          Riwayat Sakit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const TARGET_ROW_COUNT = 38;
                        const totalRowsToRender = Math.max(clsStudents.length, TARGET_ROW_COUNT);
                        const displayRows = Array.from({ length: totalRowsToRender }, (_, i) => clsStudents[i] || null);

                        return displayRows.map((st, idx) => {
                          if (!st) {
                            return (
                              <tr key={`empty-${cls.id}-${idx}`} className="border-b border-slate-300">
                                <td className="py-0 px-0.5 border border-slate-300 text-center font-bold text-slate-400 text-[7.5px]">
                                  {idx + 1}
                                </td>
                                <td className="py-0 px-1 border border-slate-300 text-slate-300 text-[7.5px]">-</td>
                                <td className="py-0 px-0.5 border border-slate-300 text-center text-slate-300 font-mono text-[7.5px]">-</td>
                                <td className="py-0 px-0.5 border border-slate-300 text-center text-slate-300 text-[7.5px]">-</td>
                                <td className="py-0 px-0.5 border border-slate-300 text-center text-slate-300 text-[7.5px]">-</td>
                                <td className="py-0 px-0.5 border border-slate-300 text-center text-slate-300 text-[7.5px]">-</td>
                                <td className="py-0 px-1 border border-slate-300 text-center text-slate-300 text-[7.5px]">-</td>
                              </tr>
                            );
                          }

                          const destinationLabel = !st.isRegistered
                            ? '-'
                            : st.destination === 'BALI'
                            ? 'Bali'
                            : st.destination === 'YOGYAKARTA'
                            ? 'Jogja'
                            : st.destination === 'MAGANG'
                            ? 'Magang'
                            : '-';

                          const medicalHistoryText = !st.isRegistered
                            ? '-'
                            : st.medicalHistory && st.medicalHistory.trim()
                            ? st.medicalHistory.trim()
                            : '-';

                          return (
                            <tr key={st.id} className="border-b border-slate-300 hover:bg-slate-50">
                              <td className="py-0 px-0.5 border border-slate-300 text-center font-bold text-slate-700 text-[8px]">
                                {idx + 1}
                              </td>
                              <td className="py-0 px-1 border border-slate-300 font-extrabold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                                <span
                                  style={getNameInlineStyle(st.name)}
                                  className="block whitespace-nowrap overflow-hidden text-ellipsis uppercase font-black"
                                  title={st.name}
                                >
                                  {st.name}
                                </span>
                              </td>
                              <td className="py-0 px-0.5 border border-slate-300 text-center font-mono font-bold text-slate-700 text-[7.5px] whitespace-nowrap">
                                {st.nis || '-'}
                              </td>
                              <td className="py-0 px-0.5 border border-slate-300 text-center font-bold whitespace-nowrap">
                                {st.isRegistered ? (
                                  <span className="badge-check inline-flex items-center px-1 py-0 rounded-xs text-[7.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 className="w-2 h-2 text-emerald-700 shrink-0 inline no-print mr-0.5" />
                                    <span>✓ Sudah</span>
                                  </span>
                                ) : (
                                  <span className="badge-cross inline-flex items-center px-1 py-0 rounded-xs text-[7.5px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                    <XCircle className="w-2 h-2 text-rose-700 shrink-0 inline no-print mr-0.5" />
                                    <span>✗ Belum</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-0 px-0.5 border border-slate-300 text-center font-bold text-slate-800 text-[8px] whitespace-nowrap">
                                {destinationLabel === 'Bali' ? (
                                  <span className="px-1 py-0 rounded-xs text-[7.5px] font-black bg-sky-100 text-sky-800 border border-sky-300 inline-block">
                                    Bali
                                  </span>
                                ) : destinationLabel === 'Jogja' ? (
                                  <span className="px-1 py-0 rounded-xs text-[7.5px] font-black bg-amber-100 text-amber-800 border border-amber-300 inline-block">
                                    Jogja
                                  </span>
                                ) : destinationLabel === 'Magang' ? (
                                  <span className="px-1 py-0 rounded-xs text-[7.5px] font-black bg-blue-100 text-blue-800 border border-blue-300 inline-block">
                                    Magang
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal text-[7.5px]">-</span>
                                )}
                              </td>
                              <td className="py-0 px-0.5 border border-slate-300 text-center font-extrabold text-slate-800 text-[8px] whitespace-nowrap">
                                {st.isRegistered && st.tShirtSize ? (
                                  <span className="px-0.5 py-0 rounded-xs text-[7.5px] font-black bg-purple-100 text-purple-900 border border-purple-300 inline-block">
                                    {st.tShirtSize} {st.tShirtDesign ? `(${st.tShirtDesign})` : ''}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal text-[7.5px]">-</span>
                                )}
                              </td>
                              <td className="py-0 px-1 border border-slate-300 text-left font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                {medicalHistoryText !== '-' ? (
                                  <span
                                    style={getMedicalInlineStyle(medicalHistoryText)}
                                    className="text-rose-900 font-bold bg-rose-50 px-1 py-0 rounded-xs border border-rose-200 block whitespace-nowrap overflow-hidden text-ellipsis"
                                    title={medicalHistoryText}
                                  >
                                    {medicalHistoryText}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal text-center block text-[7.5px]">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Summary & Tanda Tangan */}
              <div className="footer-sig pt-1 border-t border-slate-400 text-[8px] text-slate-600 flex items-end justify-between mt-0.5">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900 text-[8px]">
                    Ringkasan Kelas: Total = {clsStudents.length} Siswa | Ikut Tour = {registeredCount} | Magang = {magangCount} | Belum Mengisi = {unregisteredCount}
                  </p>
                  <p className="text-[7px] text-slate-400">
                    Dicetak resmi melalui Sistem Informasi Darmawisata {settings?.schoolName || 'SMK PGRI 2 Ponorogo'}
                  </p>
                </div>

                <div className="text-center font-bold text-slate-900 min-w-[130px]">
                  <p className="text-[8px]">Ponorogo, {formattedDate}</p>
                  <p className="mt-0 font-semibold text-slate-600 text-[7.5px]">Wali Kelas,</p>
                  <div className="h-4"></div>
                  <p className="underline font-black text-slate-900 text-[8px]">
                    {cls.homeroomTeacher || '( .................................... )'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

