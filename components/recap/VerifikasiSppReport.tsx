'use client';

import React, { useState } from 'react';
import { Student, SchoolClass, AppSettings, AuthUser } from '@/types';
import { Printer, CheckSquare, Filter, ShieldAlert, Lock } from 'lucide-react';
import { AuthService } from '@/services/authService';

interface VerifikasiSppReportProps {
  classes: SchoolClass[];
  students: Student[];
  currentUser?: AuthUser;
  settings?: AppSettings;
}

export const VerifikasiSppReport: React.FC<VerifikasiSppReportProps> = ({
  classes,
  students,
  currentUser,
  settings,
}) => {
  const activeUser = currentUser || (typeof window !== 'undefined' ? AuthService.getCurrentUser() : undefined);
  const isPublicUser = activeUser?.role === 'PUBLIC_SISWA';
  const [selectedClassName, setSelectedClassName] = useState<string>('ALL');

  if (isPublicUser) {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-4 max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900">Akses Terkunci (Perlu Login)</h3>
          <p className="text-xs text-slate-500 mt-1">
            Laporan Verifikasi SPP dan administrasi keuangan murni merupakan lembar kontrol internal panitia dan hanya dapat diakses serta dicetak oleh Administrator atau Wali Kelas.
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
            <Lock className="w-3.5 h-3.5" /> Silakan Login terlebih dahulu
          </span>
        </div>
      </div>
    );
  }

  const activeClasses =
    selectedClassName === 'ALL'
      ? classes
      : classes.filter((c) => c.name === selectedClassName);

  const handlePrint = () => {
    if (typeof window === 'undefined') return;

    const reportElement = document.getElementById('printable-spp-report');
    if (!reportElement) {
      window.print();
      return;
    }

    const htmlContent = reportElement.innerHTML;
    const stylesHtml = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');

    const printDocContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Rekap Verifikasi SPP</title>
          ${stylesHtml}
          <style>
            @media print {
              @page { size: A4 portrait; margin: 8mm 8mm 6mm 8mm; }
              html, body { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; font-family: system-ui, -apple-system, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              
              /* Ensure each class-sheet is treated as a single isolated A4 page */
              .class-sheet {
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                width: 100% !important;
                max-width: none !important;
              }
              .class-sheet:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }

              /* High-Density Typography & Layout Scaling */
              .kop-surat {
                padding-bottom: 4px !important;
                margin-bottom: 6px !important;
                border-bottom-width: 1.5px !important;
                border-bottom-color: #000000 !important;
              }
              .kop-surat h4 { font-size: 8px !important; margin: 0 !important; }
              .kop-surat h2 { font-size: 13px !important; margin: 2px 0 !important; }
              .kop-surat p { font-size: 8px !important; margin: 0 !important; }

              .doc-title {
                margin-bottom: 6px !important;
              }
              .doc-title h3 {
                font-size: 11px !important;
                margin: 0 0 2px 0 !important;
              }
              .doc-title-info {
                font-size: 9px !important;
                margin-top: 1px !important;
                gap: 8px !important;
              }

              /* Micro-Density Table */
              table.student-table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin-top: 4px !important;
              }
              table.student-table th, table.student-table td {
                padding: 2.5px 4px !important;
                font-size: 8.5px !important;
                line-height: 1.15 !important;
                border: 1px solid #000000 !important;
              }
              table.student-table th {
                background-color: #f1f5f9 !important;
              }

              /* Micro Signature Footer */
              .signature-footer {
                margin-top: 8px !important;
                padding-top: 4px !important;
              }
              .signature-footer p {
                font-size: 8px !important;
                margin: 0 !important;
              }
              .signature-box {
                width: 180px !important;
              }
              .signature-box .role-title {
                margin-bottom: 24px !important;
              }
            }
            body { background: white; color: black; margin: 0; padding: 15px; font-family: system-ui, -apple-system, sans-serif; }
            .break-after-page { page-break-after: always; break-after: page; }
          </style>
        </head>
        <body>
          <div style="max-width: 210mm; margin: 0 auto;">
            ${htmlContent}
          </div>
        </body>
      </html>
    `;

    // Try popup window first (Option A)
    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printDocContent);
      printWindow.document.close();
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) {
          console.error('Print window error:', e);
        }
      }, 500);
    } else {
      // Hidden Iframe Fallback if popup is blocked inside iframe
      let iframe = document.getElementById('print-iframe-spp') as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'print-iframe-spp';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(printDocContent);
        doc.close();
        setTimeout(() => {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        }, 500);
      } else {
        window.print();
      }
    }
  };

  const schoolName = settings?.schoolName || 'SMK PGRI 2 PONOROGO';
  const appName = settings?.appName || 'SIM DARMAWISATA';
  const academicYear = settings?.academicYear || '2025/2026';
  const formattedDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Control Banner & Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Lembar Verifikasi SPP (Khusus Admin/Panitia)
          </div>
          <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
            Rekapitulasi Verifikasi SPP & Administrasi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar checklist verifikasi bebas tunggakan SPP siswa untuk keperluan syarat keikutsertaan darmawisata.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedClassName}
              onChange={(e) => setSelectedClassName(e.target.value)}
              className="px-3 py-2 bg-slate-900 text-white font-extrabold text-xs sm:text-sm rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
            >
              <option value="ALL">🌟 Cetak Seluruh Kelas ({classes.length} Kelas)</option>
              {classes.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>
              {selectedClassName === 'ALL'
                ? `Cetak Seluruh Kelas (${classes.length} Kelas)`
                : `Cetak Kelas ${selectedClassName}`}
            </span>
          </button>
        </div>
      </div>

      {/* Printable Document Sheet Container */}
      <div id="printable-spp-report" className="space-y-8">
        {activeClasses.flatMap((cls, classIndex) => {
          const classStudents = students.filter((s) => s.className === cls.name);

          // Chunk students into pages of 40 students each for clean 1-page A4 fitting
          const CHUNK_SIZE = 40;
          const studentChunks: Student[][] = [];
          if (classStudents.length === 0) {
            studentChunks.push([]);
          } else {
            for (let i = 0; i < classStudents.length; i += CHUNK_SIZE) {
              studentChunks.push(classStudents.slice(i, i + CHUNK_SIZE));
            }
          }

          const isTotalLastClass = classIndex === activeClasses.length - 1;

          return studentChunks.map((chunk, chunkIdx) => {
            const isLastChunkOfClass = chunkIdx === studentChunks.length - 1;
            const isAbsoluteLastPage = isTotalLastClass && isLastChunkOfClass;

            return (
              <div
                key={`${cls.id || cls.name}-page-${chunkIdx}`}
                className={`bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-md print:shadow-none print:border-none print:p-0 max-w-[210mm] mx-auto text-slate-900 font-sans ${
                  !isAbsoluteLastPage ? 'break-after-page' : ''
                } class-sheet`}
                style={{
                  pageBreakAfter: !isAbsoluteLastPage ? 'always' : 'auto',
                  breakAfter: !isAbsoluteLastPage ? 'page' : 'auto',
                }}
              >
                {/* Printable Header Kop Surat */}
                <div className="text-center border-b-2 border-slate-900 pb-3 mb-4 kop-surat">
                  <h4 className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                    PANITIA DARMAWISATA {academicYear}
                  </h4>
                  <h2 className="text-lg sm:text-xl font-black uppercase text-slate-900 tracking-tight">
                    {schoolName}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Alamat: Jl. Soekarno Hatta No. 50 Ponorogo | SIM Darmawisata - {appName}
                  </p>
                </div>

                {/* Report Document Title */}
                <div className="text-center mb-5 doc-title">
                  <h3 className="text-base font-black uppercase text-slate-900 underline tracking-wide">
                    LEMBAR KONTROL VERIFIKASI SPP &amp; ADMINISTRASI
                  </h3>
                  <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-700 mt-1 doc-title-info">
                    <span>KELAS: <strong className="text-slate-900 font-black">{cls.name}</strong></span>
                    <span>|</span>
                    <span>WALI KELAS: {cls.homeroomTeacher || '-'}</span>
                    <span>|</span>
                    <span>JUMLAH: {classStudents.length} SISWA</span>
                    {studentChunks.length > 1 && (
                      <>
                        <span>|</span>
                        <span className="text-emerald-700 font-black">(Hal {chunkIdx + 1}/{studentChunks.length})</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Table of Students */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-900 text-xs student-table">
                    <thead>
                      <tr className="bg-slate-100 print:bg-slate-200 text-slate-900 font-black uppercase text-[11px]">
                        <th className="border border-slate-900 px-2 py-1.5 text-center w-10">No</th>
                        <th className="border border-slate-900 px-3 py-1.5 text-left w-24">NIS</th>
                        <th className="border border-slate-900 px-3 py-1.5 text-left">Nama Siswa</th>
                        <th className="border border-slate-900 px-3 py-1.5 text-center w-32">Tujuan Wisata</th>
                        <th className="border border-slate-900 px-3 py-1.5 text-center w-36">
                          Centang Verifikasi Petugas
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="border border-slate-900 p-4 text-center text-slate-500 italic">
                            Belum ada data siswa untuk kelas ini.
                          </td>
                        </tr>
                      ) : (
                        chunk.map((student, idx) => {
                          const globalIdx = chunkIdx * CHUNK_SIZE + idx + 1;

                          return (
                            <tr key={student.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                              <td className="border border-slate-900 px-2 py-1 text-center font-bold">
                                {globalIdx}
                              </td>
                              <td className="border border-slate-900 px-3 py-1 font-mono text-slate-700">
                                {student.nis}
                              </td>
                              <td className="border border-slate-900 px-3 py-1 font-bold text-slate-900">
                                {student.name}
                              </td>
                              <td className="border border-slate-900 px-3 py-1 text-center font-semibold text-slate-800">
                                {student.destination || 'BALI'}
                              </td>
                              <td className="border border-slate-900 px-3 py-1 text-center">
                                <div className="w-5 h-5 border-2 border-slate-800 rounded-sm mx-auto flex items-center justify-center">
                                  {/* Box centang manual petugas */}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signature Footer with Single-Line Parentheses */}
                <div className="mt-6 pt-3 flex justify-between items-end text-xs font-semibold signature-footer">
                  <div>
                    <p className="text-slate-500 text-[10px]">Dicetak pada: {formattedDate}</p>
                    <p className="text-slate-500 text-[10px]">SIM Darmawisata — Lembar Kontrol Bebas SPP</p>
                  </div>
                  <div className="text-center w-64 shrink-0 signature-box">
                    <p className="mb-12 text-slate-900 font-bold role-title">Petugas Verifikasi SPP</p>
                    <div className="flex items-center justify-center font-bold text-slate-900 whitespace-nowrap">
                      <span>(</span>
                      <span className="inline-block w-44 border-b border-slate-900 border-dotted mx-1"></span>
                      <span>)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">NIP / NPY.</p>
                  </div>
                </div>
              </div>
            );
          });
        })}
      </div>
    </div>
  );
};

export default VerifikasiSppReport;
