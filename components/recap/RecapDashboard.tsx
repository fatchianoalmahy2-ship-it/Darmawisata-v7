'use client';

import React, { useState, useEffect } from 'react';
import { Student, SchoolClass, AuthUser, AppSettings } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';
import { RecapGeneratorService } from '@/services/recapGenerator';
import { StatusAngketA4Report } from './StatusAngketA4Report';
import { VerifikasiSppReport } from './VerifikasiSppReport';
import { LogistikKaosReport } from './LogistikKaosReport';
import { AutoRecapDispatchModal } from './AutoRecapDispatchModal';
import { StandardTable, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/StandardTable';
import {
  Share2,
  Copy,
  Printer,
  MessageSquare,
  FileText,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  Filter,
  Sparkles,
  Layers,
  ArrowRight,
  Zap,
  Clock,
  Send,
  Settings,
  Bot,
  CheckSquare,
  Shirt,
} from 'lucide-react';

interface RecapDashboardProps {
  classes: SchoolClass[];
  students: Student[];
  currentUser?: AuthUser;
  settings?: AppSettings;
  onSaveSettings?: (newSettings: AppSettings) => void;
  onOpenSettings?: () => void;
}

type SubTabMode =
  | 'REKAP_STATUS'
  | 'VERIFIKASI_SPP'
  | 'LOGISTIK_KAOS'
  | 'REKAP_BELUM'
  | 'REKAP_SUDAH'
  | 'MONITORING_KELAS';

export const RecapDashboard: React.FC<RecapDashboardProps> = ({
  classes,
  students,
  currentUser,
  settings,
  onSaveSettings,
  onOpenSettings,
}) => {
  const isWaliKelas = currentUser?.role === 'WALI_KELAS';
  const isAdmin = currentUser?.role === 'ADMIN';
  const assignedClass = currentUser?.assignedClassName;

  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  const isAngketClosed = (() => {
    if (settings?.isAngketClosed) return true;
    if (settings?.angketDeadline) {
      const deadline = new Date(settings.angketDeadline + 'T23:59:59');
      return new Date() > deadline;
    }
    return false;
  })();

  const [activeSubTab, setActiveSubTab] = useState<SubTabMode>('REKAP_STATUS');

  const [userSelectedClassName, setUserSelectedClassName] = useState<string>('');

  const firstClassName = classes[0]?.name || 'XII TKR 1';
  const resolvedUserClassName = userSelectedClassName === 'ALL' || (userSelectedClassName && classes.some((c) => c.name === userSelectedClassName))
    ? userSelectedClassName
    : firstClassName;

  const [searchQuery, setSearchQuery] = useState('');

  const selectedClassName =
    isWaliKelas && assignedClass ? assignedClass : resolvedUserClassName;

  const [copied, setCopied] = useState(false);

  const activeClass =
    classes.find((c) => c.name === selectedClassName) || classes[0];

  // Class specific or all students
  const classStudents =
    selectedClassName === 'ALL'
      ? students
      : students.filter((s) => s.className === selectedClassName);

  const registeredStudents = classStudents.filter((s) => s.isRegistered);
  const unregisteredStudents = classStudents.filter((s) => !s.isRegistered);

  // Search filter for unregistered students list
  const filteredUnregistered = unregisteredStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.className.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // WA Text for Registered vs Unregistered
  const waTextRegistered = activeClass
    ? RecapGeneratorService.generateWhatsAppRecap(activeClass, classStudents, settings)
    : '';

  const waTextUnregistered =
    selectedClassName === 'ALL'
      ? RecapGeneratorService.generateWhatsAppAllUnregisteredSummary(classes, students, settings)
      : activeClass
      ? RecapGeneratorService.generateWhatsAppUnregisteredReminder(activeClass, classStudents, settings)
      : '';

  const currentWaText =
    activeSubTab === 'REKAP_BELUM' ? waTextUnregistered : waTextRegistered;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentWaText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handlePrintMatrix = () => {
    if (typeof window === 'undefined') return;

    const formattedDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const rowsHtml = classes.map((cls) => {
      const clsStudents = students.filter((s) => s.className === cls.name);
      const total = clsStudents.length || cls.totalStudents;
      const reg = clsStudents.filter((s) => s.isRegistered).length;
      const unreg = total - reg;
      const pct = total > 0 ? Math.round((reg / total) * 100) : 0;
      const isFinished = unreg === 0 && total > 0;
      return `
        <tr>
          <td style="font-weight: 800; color: #0f172a; border: 1px solid #94a3b8; padding: 4px 6px;">${cls.name}</td>
          <td style="font-weight: bold; color: #334155; border: 1px solid #94a3b8; padding: 4px 6px;">${cls.homeroomTeacher || 'Belum diisi'}</td>
          <td style="text-align: center; font-weight: bold; border: 1px solid #94a3b8; padding: 4px 6px;">${total}</td>
          <td style="text-align: center; font-weight: bold; color: #059669; border: 1px solid #94a3b8; padding: 4px 6px;">${reg}</td>
          <td style="text-align: center; font-weight: 800; color: #dc2626; border: 1px solid #94a3b8; padding: 4px 6px;">${unreg > 0 ? `${unreg} Siswa` : '-'}</td>
          <td style="text-align: center; font-weight: 800; color: ${isFinished ? '#047857' : '#be123c'}; border: 1px solid #94a3b8; padding: 4px 6px;">${pct}%</td>
        </tr>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <title>Laporan Matriks Progres Pengisian Angket per Kelas - SMK PGRI 2 Ponorogo</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 4mm 6mm;
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
              color: #0f172a;
              font-size: 8.5px;
              line-height: 1.25;
            }
            .page-container {
              width: 100%;
              max-width: 210mm;
              height: 280mm;
              max-height: 280mm;
              margin: 0 auto;
              padding: 4mm 6mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
              overflow: hidden;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000000;
              padding-bottom: 4px;
              margin-bottom: 8px;
            }
            .header h4 {
              margin: 0;
              font-size: 9.5px;
              font-weight: 800;
              text-transform: uppercase;
              color: #475569;
              letter-spacing: 0.5px;
            }
            .header h2 {
              margin: 1px 0 0 0;
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              color: #0f172a;
            }
            .header p {
              margin: 2px 0 0 0;
              font-size: 8px;
              color: #64748b;
            }
            .title-section {
              text-align: center;
              margin-bottom: 8px;
            }
            .title-section h3 {
              margin: 0;
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
              color: #be123c;
              text-decoration: underline;
              letter-spacing: 0.5px;
            }
            .title-section p {
              margin: 2px 0 0 0;
              font-size: 8px;
              font-weight: bold;
              color: #475569;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 6px;
              margin-bottom: 8px;
            }
            .stat-card {
              border: 1px solid #cbd5e1;
              background-color: #f8fafc;
              padding: 5px 8px;
              border-radius: 4px;
              text-align: center;
            }
            .stat-label {
              font-size: 7.5px;
              text-transform: uppercase;
              font-weight: bold;
              color: #64748b;
              margin-bottom: 1px;
              display: block;
            }
            .stat-val {
              font-size: 11px;
              font-weight: 900;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
            }
            th {
              background-color: #f1f5f9;
              font-weight: 900;
              text-transform: uppercase;
              font-size: 8px;
              color: #334155;
              border: 1px solid #94a3b8;
              padding: 4px 6px;
            }
            .footer-sig {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              padding-top: 6px;
              border-top: 1px solid #e2e8f0;
              font-size: 8px;
              margin-top: auto;
            }
            .sig-block {
              text-align: center;
              width: 120px;
            }
            .sig-title {
              font-size: 7.5px;
              color: #64748b;
              margin-bottom: 25px;
            }
            .sig-name {
              font-weight: bold;
              text-decoration: underline;
              color: #0f172a;
            }
            .sig-nip {
              font-size: 7.5px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div>
              <!-- Kop Surat Header -->
              <div class="header">
                <h4>${schoolMetadata.school.organization}</h4>
                <h2>${schoolMetadata.school.name}</h2>
                <p>${schoolMetadata.school.address} • Website: ${schoolMetadata.school.website}</p>
              </div>

              <!-- Judul Laporan -->
              <div class="title-section">
                <h3>MATRIKS PROGRES PENGISIAN ANGKET PER KELAS</h3>
                <p>Tahun Ajaran 2026/2027 • Tanggal Laporan: ${formattedDate}</p>
              </div>

              <!-- Ringkasan Statistik Sekolah -->
              <div class="stats-grid">
                <div class="stat-card">
                  <span class="stat-label">Total Pengisian Sekolah</span>
                  <span class="stat-val">${totalAllRegistered} / ${totalAllStudents} Siswa (${overallPercentage}%)</span>
                </div>
                <div class="stat-card" style="border-left: 3px solid #059669;">
                  <span class="stat-label">Sudah Mengisi</span>
                  <span class="stat-val" style="color: #059669;">${totalAllRegistered} Siswa</span>
                </div>
                <div class="stat-card" style="border-left: 3px solid #dc2626;">
                  <span class="stat-label">Belum Mengisi</span>
                  <span class="stat-val" style="color: #dc2626;">${totalAllUnregistered} Siswa</span>
                </div>
              </div>

              <!-- Tabel Matriks Progres -->
              <table>
                <thead>
                  <tr>
                    <th style="text-align: left; width: 20%;">Nama Kelas</th>
                    <th style="text-align: left; width: 35%;">Wali Kelas</th>
                    <th style="text-align: center; width: 12%;">Total Siswa</th>
                    <th style="text-align: center; width: 12%;">Sudah Mengisi</th>
                    <th style="text-align: center; width: 12%;">Belum Mengisi</th>
                    <th style="text-align: center; width: 9%;">Progres %</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>

            <!-- Tanda Tangan / Verifikasi Kelulusan Laporan -->
            <div class="footer-sig">
              <div>
                <span style="color: #64748b; font-size: 7.5px;">Laporan sistemik otomatis — ${schoolMetadata.school.name}</span>
              </div>
              <div style="display: flex; gap: 20px;">
                <div class="sig-block">
                  <div class="sig-title">Mengetahui,<br/>Panitia Darmawisata</div>
                  <div class="sig-name">Wali Kelas & Panitia</div>
                  <div class="sig-nip">SMK PGRI 2 Ponorogo</div>
                </div>
                <div class="sig-block">
                  <div class="sig-title">Ponorogo, ${formattedDate}<br/>Kepala Sekolah</div>
                  <div class="sig-name">Syamasul Arifin, S.E., S.Pd.</div>
                  <div class="sig-nip">NIP. -</div>
                </div>
              </div>
            </div>
          </div>

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

  // Overall Statistics across all classes
  const totalAllStudents = students.length;
  const totalAllRegistered = students.filter((s) => s.isRegistered).length;
  const totalAllUnregistered = totalAllStudents - totalAllRegistered;
  const overallPercentage =
    totalAllStudents > 0
      ? ((totalAllRegistered / totalAllStudents) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Sub-Tab Navigation Header (Standardized Segmented Control) */}
      <div className="no-print p-1 bg-slate-100/80 rounded-xl flex gap-1 overflow-x-auto scrollbar-none items-center">
        <button
          type="button"
          onClick={() => setActiveSubTab('REKAP_STATUS')}
          className={`h-9 px-4 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeSubTab === 'REKAP_STATUS'
              ? 'bg-white text-slate-900 shadow-xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Laporan <span className="hidden sm:inline">Status Angket </span>(PDF)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('REKAP_BELUM')}
          className={`h-9 px-4 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeSubTab === 'REKAP_BELUM'
              ? 'bg-white text-slate-900 shadow-xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span>Belum <span className="hidden sm:inline">Mengisi </span>({unregisteredStudents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('REKAP_SUDAH')}
          className={`h-9 px-4 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeSubTab === 'REKAP_SUDAH'
              ? 'bg-white text-slate-900 shadow-xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Sudah <span className="hidden sm:inline">Terdaftar </span>({registeredStudents.length})</span>
        </button>

        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => setActiveSubTab('VERIFIKASI_SPP')}
              className={`h-9 px-4 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeSubTab === 'VERIFIKASI_SPP'
                  ? 'bg-slate-900 text-emerald-400 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>Rekap SPP (Admin)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('LOGISTIK_KAOS')}
              className={`h-9 px-4 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeSubTab === 'LOGISTIK_KAOS'
                  ? 'bg-slate-900 text-blue-400 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shirt className="w-3.5 h-3.5 text-blue-500" />
              <span>Pengambilan Kaos (Admin)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('MONITORING_KELAS')}
              className={`h-9 px-4 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeSubTab === 'MONITORING_KELAS'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              <span>Monitoring <span className="hidden sm:inline">Semua </span>Kelas ({classes.length})</span>
            </button>
          </>
        )}
      </div>

      {/* Header Banner & Filter Kelas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
            <Share2 className="w-3.5 h-3.5" /> Portal Laporan & Broadcast WA / PDF
          </div>
          <h2 className="text-sm sm:text-lg font-extrabold text-slate-900 tracking-tight">
            Rekapitulasi & Pemantauan Pengisian
          </h2>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Merekap siswa terdaftar maupun siswa yang belum mengisi angket peminatan.
          </p>
        </div>

        {/* Class Selector Dropdown */}
        {activeSubTab !== 'MONITORING_KELAS' && (
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
              {isWaliKelas ? 'Kelas Anda:' : 'Filter Kelas:'}
            </label>
            {isWaliKelas ? (
              <div className="px-3 py-1.5 bg-slate-900 text-emerald-400 font-bold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 border border-slate-700 shadow-sm">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>{selectedClassName}</span>
              </div>
            ) : (
              <select
                value={selectedClassName || 'ALL'}
                onChange={(e) => setUserSelectedClassName(e.target.value)}
                className="w-full sm:w-56 px-3 py-1.5 bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm text-ellipsis overflow-hidden whitespace-nowrap"
              >
                <option value="ALL">🌟 Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* AUTOMATION & INSTANT DISPATCH BANNER (Hanya untuk Admin Panitia) */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-5 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white">Center Otomatisasi & Dispatch Rekap WhatsApp</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-extrabold">
                  {settings?.autoRecapEnabled !== false ? `🟢 AUTO ${settings?.autoRecapTime || '13:00'} AKTIF` : '🔴 MANUAL'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Sistem siap mengirim laporan rincian siswa belum mengisi angket ke <strong>{settings?.autoRecapTargetGroup || 'Grup Panitia Darmawisata'}</strong> pada pukul <strong>{settings?.autoRecapTime || '13:00'} WIB</strong> atau secara langsung sewaktu-waktu.
              </p>
              {settings?.lastAutoRecapSentAt && (
                <p className="text-[10px] text-emerald-400 font-bold mt-1">
                  ⏱️ Terakhir dikirim: {settings.lastAutoRecapSentAt}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Format Template</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDispatchModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Kirim Rekap Sewaktu-Waktu</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 0: LAPORAN REKAP STATUS ANGKET (FORMAT A4 PER KELAS) */}
      {activeSubTab === 'REKAP_STATUS' && (
        <StatusAngketA4Report
          selectedClassName={selectedClassName}
          classes={classes}
          students={students}
          settings={settings}
        />
      )}

      {/* SUB-TAB VERIFIKASI SPP (KHUSUS ADMIN) */}
      {activeSubTab === 'VERIFIKASI_SPP' && (
        <VerifikasiSppReport
          classes={classes}
          students={students}
          currentUser={currentUser}
          settings={settings}
        />
      )}

      {/* SUB-TAB PENERIMAAN KAOS (KHUSUS ADMIN) */}
      {activeSubTab === 'LOGISTIK_KAOS' && (
        <LogistikKaosReport
          classes={classes}
          students={students}
          currentUser={currentUser}
          settings={settings}
        />
      )}

      {/* SUB-TAB 1: REKAP SISWA BELUM MENGISI */}
      {activeSubTab === 'REKAP_BELUM' && (
        <div className="space-y-6">
          {/* Top KPI Cards (Standardized 2-Column Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Scope Rekap</span>
                <h4 className="text-lg font-black text-slate-900 mt-1 truncate">
                  {selectedClassName === 'ALL' ? 'Seluruh Kelas' : activeClass?.name}
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                {selectedClassName === 'ALL'
                  ? `${classes.length} Kelas Terdaftar`
                  : `Wali Kelas: ${activeClass?.homeroomTeacher || '-'}`}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa Scope</span>
                <h4 className="text-2xl font-black text-slate-900 mt-1">{classStudents.length} Siswa</h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">Basis data siswa saat ini</p>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs bg-emerald-50/30 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Sudah Mengisi Angket</span>
                <h4 className="text-2xl font-black text-emerald-600 mt-1">
                  {registeredStudents.length} Siswa
                </h4>
              </div>
              <p className="text-[11px] text-emerald-700 font-bold mt-2 pt-2 border-t border-emerald-100">
                Progres:{' '}
                {classStudents.length > 0
                  ? ((registeredStudents.length / classStudents.length) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </div>

            <div className="bg-rose-50 rounded-2xl border border-rose-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">⚠️ Belum Mengisi Angket</span>
                <h4 className="text-2xl font-black text-rose-600 mt-1">
                  {unregisteredStudents.length} Siswa
                </h4>
              </div>
              <p className="text-[11px] text-rose-700 font-bold mt-2 pt-2 border-t border-rose-200/60">Perlu perhatian / reminder panitia</p>
            </div>
          </div>

          {/* Main Content Grid: WA Broadcast Text & Printable Official PDF */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Broadcast WhatsApp Text for Unregistered Students (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 no-print">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
                  <MessageSquare className="w-4 h-4 text-rose-600" /> Broadcast Reminder WA (Belum Mengisi)
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Tersalin!' : 'Salin Teks WA'}
                </button>
              </div>

              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto border border-slate-800 shadow-inner">
                {waTextUnregistered}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium">
                💡 <strong>Tips:</strong> Salin teks di atas dan bagikan langsung ke Grup WhatsApp Kelas atau Wali Murid untuk mempercepat pengisian angket.
              </div>
            </div>

            {/* Right: Printable Official Document & Interactive Table (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                  <FileText className="w-4 h-4 text-rose-600" /> Laporan Resmi Cetak (PDF / Print)
                </div>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-400" /> Cetak / Download PDF
                </button>
              </div>

              {/* Printable Document Layout */}
              <div id="printable-recap" className="printable-area p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-slate-900 font-sans">
                {/* Kop Surat Header */}
                <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                  <h5 className="text-[10px] font-extrabold uppercase tracking-tight text-slate-700">
                    {schoolMetadata.school.organization}
                  </h5>
                  <h3 className="text-base font-black tracking-tight text-slate-900">
                    {schoolMetadata.school.name}
                  </h3>
                  <p className="text-[9px] text-slate-600">
                    {schoolMetadata.school.address} • Website: {schoolMetadata.school.website}
                  </p>
                </div>

                {/* Document Title */}
                <div className="text-center pt-1">
                  <h4 className="font-black text-sm uppercase tracking-wide text-rose-800 underline">
                    DAFTAR SISWA BELUM MENGISI ANGKET PEMINATAN DARMAWISATA
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {selectedClassName === 'ALL'
                      ? 'SEKOLAH: SMK PGRI 2 PONOROGO (SEMUA KELAS)'
                      : `KELAS: ${activeClass?.name} • Wali Kelas: ${activeClass?.homeroomTeacher}`}
                    {' '}• Tanggal Laporan: {new Date().toLocaleDateString('id-ID')}
                  </p>
                </div>

                {/* Search Bar for Screen View */}
                <div className="no-print pt-1">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama atau NIS siswa belum mengisi..."
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Unregistered Table */}
                <div className="overflow-x-auto pt-2 max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-rose-100 text-rose-950 font-bold border-b border-slate-300">
                        <th className="p-2 border border-slate-300 text-center w-8">No</th>
                        <th className="p-2 border border-slate-300">NIS / NISN</th>
                        <th className="p-2 border border-slate-300">Nama Siswa</th>
                        <th className="p-2 border border-slate-300">Kelas</th>
                        <th className="p-2 border border-slate-300">Wali Kelas</th>
                        <th className="p-2 border border-slate-300 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUnregistered.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-emerald-700 font-extrabold bg-emerald-50">
                            🎉 {unregisteredStudents.length === 0 ? 'Luar biasa! Seluruh siswa pada scope ini telah 100% mengisi angket!' : 'Tidak ada siswa yang sesuai pencarian.'}
                          </td>
                        </tr>
                      ) : (
                        filteredUnregistered.map((st, idx) => {
                          const clsObj = classes.find((c) => c.name === st.className);
                          return (
                            <tr key={st.id} className="border-b border-slate-200 hover:bg-rose-50/50">
                              <td className="p-2 border border-slate-200 text-center font-bold text-slate-600">
                                {idx + 1}
                              </td>
                              <td className="p-2 border border-slate-200 font-mono font-bold text-slate-800">
                                {st.nis}
                              </td>
                              <td className="p-2 border border-slate-200 font-extrabold text-slate-900">
                                {st.name}
                              </td>
                              <td className="p-2 border border-slate-200 font-bold text-slate-800">
                                {st.className}
                              </td>
                              <td className="p-2 border border-slate-200 text-slate-600 text-[10px]">
                                {clsObj?.homeroomTeacher || '-'}
                              </td>
                              <td className="p-2 border border-slate-200 text-center font-black text-rose-700 bg-rose-50">
                                BELUM MENGISI
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Summary */}
                <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Dicetak otomatis dari Sistem Informasi Darmawisata SMK PGRI 2 Ponorogo</span>
                  <span className="font-bold text-rose-700">
                    Total Belum Mengisi: {unregisteredStudents.length} Siswa
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REKAP SISWA TERDAFTAR (EXISTING VIEW) */}
      {activeSubTab === 'REKAP_SUDAH' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: WhatsApp Text Box (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 no-print">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <MessageSquare className="w-4 h-4 text-emerald-600" /> Format Broadcast WhatsApp
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Tersalin!' : 'Salin Teks WA'}
              </button>
            </div>

            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[550px] overflow-y-auto border border-slate-800">
              {waTextRegistered}
            </div>
          </div>

          {/* Right: Printable PDF Layout (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <FileText className="w-4 h-4 text-emerald-600" /> Tampilan Cetak Laporan
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" /> Cetak / Download PDF
              </button>
            </div>

            {/* Printable Document View */}
            <div id="printable-recap" className="printable-area p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-slate-900 font-sans">
              {/* Kop Surat Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                <h5 className="text-[10px] font-extrabold uppercase tracking-tight text-slate-700">
                  {schoolMetadata.school.organization}
                </h5>
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  {schoolMetadata.school.name}
                </h3>
                <p className="text-[9px] text-slate-600">
                  {schoolMetadata.school.address} • Website: {schoolMetadata.school.website}
                </p>
              </div>

              {/* Document Title */}
              <div className="text-center pt-1">
                <h4 className="font-black text-sm uppercase tracking-wide underline">
                  REKAP HARIAN PEMINATAN DARMAWISATA KELAS {activeClass?.name}
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Wali Kelas: {activeClass?.homeroomTeacher} • Tanggal Laporan: {new Date().toLocaleDateString('id-ID')}
                </p>
              </div>

              {/* Student Table */}
              <div className="overflow-x-auto pt-2 max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                      <th className="p-2 border border-slate-300 text-center w-8">No</th>
                      <th className="p-2 border border-slate-300">NIS</th>
                      <th className="p-2 border border-slate-300">Nama Siswa</th>
                      <th className="p-2 border border-slate-300">Tujuan</th>
                      <th className="p-2 border border-slate-300">Kaos</th>
                      <th className="p-2 border border-slate-300">Bus/Kmr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500 font-medium">
                          Belum ada siswa terdaftar untuk kelas ini.
                        </td>
                      </tr>
                    ) : (
                      registeredStudents.map((st, idx) => (
                        <tr key={st.id} className="border-b border-slate-200">
                          <td className="p-2 border border-slate-200 text-center font-bold">{idx + 1}</td>
                          <td className="p-2 border border-slate-200 font-mono font-bold">{st.nis}</td>
                          <td className="p-2 border border-slate-200 font-bold">{st.name}</td>
                          <td className="p-2 border border-slate-200 font-semibold">{isAngketClosed ? (st.wave || 'Belum') : 'Menunggu Angket Ditutup'}</td>
                          <td className="p-2 border border-slate-200 font-bold">{st.tShirtSize || '-'} {st.tShirtDesign ? `(${st.tShirtDesign})` : ''}</td>
                          <td className="p-2 border border-slate-200">
                            {isAngketClosed ? (
                              `${st.busNumber ? `B${st.busNumber}` : '-'}/${st.roomNumber ? `K${st.roomNumber}` : '-'}`
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Summary */}
              <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Laporan sistemik otomatis — {schoolMetadata.school.name}</span>
                <span>Total Terdaftar: {registeredStudents.length} / {classStudents.length} Siswa</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MONITORING PROGRES SELURUH KELAS */}
      {activeSubTab === 'MONITORING_KELAS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" /> Matriks Progres Pengisian Angket per Kelas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau progres pengisian angket seluruh kelas secara realtime dan kirim reminder secara presisi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="px-3.5 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
                Sekolah: <strong className="text-slate-900">{totalAllRegistered} / {totalAllStudents} Siswa ({overallPercentage}%)</strong>
              </div>
              <div className="px-3 py-1.5 bg-rose-100 text-rose-800 rounded-xl text-xs font-extrabold">
                Belum Mengisi: {totalAllUnregistered} Siswa
              </div>
              <button
                type="button"
                onClick={handlePrintMatrix}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer no-print"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Bagikan PDF</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <StandardTable>
            <TableHeader>
              <tr>
                <TableCell isHeader className="rounded-l-xl">Nama Kelas</TableCell>
                <TableCell isHeader>Wali Kelas</TableCell>
                <TableCell isHeader className="text-center">Total Siswa</TableCell>
                <TableCell isHeader className="text-center">Sudah Mengisi</TableCell>
                <TableCell isHeader className="text-center">Belum Mengisi</TableCell>
                <TableCell isHeader className="text-center">Progres %</TableCell>
                <TableCell isHeader className="text-right rounded-r-xl no-print">Aksi Reminder</TableCell>
              </tr>
            </TableHeader>
            <TableBody className="font-medium">
              {classes.map((cls) => {
                const clsStudents = students.filter((s) => s.className === cls.name);
                const total = clsStudents.length || cls.totalStudents;
                const reg = clsStudents.filter((s) => s.isRegistered).length;
                const unreg = total - reg;
                const pct = total > 0 ? Math.round((reg / total) * 100) : 0;
                const isFinished = unreg === 0 && total > 0;
                return (
                  <TableRow key={cls.id}>
                    <TableCell className="font-black text-slate-900">{cls.name}</TableCell>
                    <TableCell className="font-bold text-slate-700">
                      {cls.homeroomTeacher || 'Belum diisi'}
                    </TableCell>
                    <TableCell className="text-center font-extrabold text-slate-800">{total}</TableCell>
                    <TableCell className="text-center font-bold text-emerald-600">{reg}</TableCell>
                    <TableCell className="text-center font-black text-rose-600">
                      {unreg > 0 ? `${unreg} Siswa` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${isFinished ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`font-black text-[11px] ${isFinished ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {pct}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right no-print">
                        <button
                          type="button"
                          onClick={() => {
                            setUserSelectedClassName(cls.name);
                            setActiveSubTab('REKAP_BELUM');
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <span>Reminder WA ({unreg})</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </StandardTable>
        </div>
      </div>
    )}

      {/* Auto Recap Dispatch Modal */}
      <AutoRecapDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        classes={classes}
        students={students}
        settings={settings}
        onSaveSettings={(newSettings) => {
          if (onSaveSettings) onSaveSettings(newSettings);
        }}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
};

