'use client';

import React from 'react';
import { Student, SchoolClass, AppSettings, AuthUser } from '@/types';
import { RecapDashboard } from '@/components/recap/RecapDashboard';
import { VerifikasiSppReport } from '@/components/recap/VerifikasiSppReport';
import { LogistikKaosReport } from '@/components/recap/LogistikKaosReport';
import { SuratIzinView } from '@/components/surat/SuratIzinView';
import { FileSpreadsheet, FileText, CheckSquare, Shirt } from 'lucide-react';

interface DocumentWorkspaceProps {
  activeSubTab?: string;
  onSelectSubTab?: (subTab: string) => void;
  classes: SchoolClass[];
  students: Student[];
  settings: AppSettings;
  currentUser?: AuthUser;
  onSaveSettings?: (settings: AppSettings) => Promise<void> | void;
  onOpenSettings?: () => void;
}

export const DocumentWorkspace: React.FC<DocumentWorkspaceProps> = ({
  activeSubTab = 'REKAP_ANGKET',
  onSelectSubTab,
  classes,
  students,
  settings,
  currentUser,
  onSaveSettings,
  onOpenSettings,
}) => {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Horizontal Sub-Tab Switcher */}
      {onSelectSubTab && (
        <div className="hidden sm:flex flex-wrap items-center gap-2 border-b border-slate-200/90 pb-3">
          <button
            onClick={() => onSelectSubTab('REKAP_ANGKET')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'REKAP_ANGKET'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <FileSpreadsheet className={`w-4 h-4 ${activeSubTab === 'REKAP_ANGKET' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>1. Rekapitulasi Angket & Pembayaran</span>
          </button>

          <button
            onClick={() => onSelectSubTab('VERIFIKASI_SPP')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'VERIFIKASI_SPP'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <CheckSquare className={`w-4 h-4 ${activeSubTab === 'VERIFIKASI_SPP' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>2. Laporan Rekap Verifikasi SPP</span>
          </button>

          <button
            onClick={() => onSelectSubTab('LOGISTIK_KAOS')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'LOGISTIK_KAOS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Shirt className={`w-4 h-4 ${activeSubTab === 'LOGISTIK_KAOS' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>3. Laporan Rekap Pengambilan Kaos</span>
          </button>

          <button
            onClick={() => onSelectSubTab('SURAT_IZIN')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'SURAT_IZIN'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <FileText className={`w-4 h-4 ${activeSubTab === 'SURAT_IZIN' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>4. Generator Surat Izin Orang Tua</span>
          </button>
        </div>
      )}

      {/* Content Rendering */}
      {activeSubTab === 'REKAP_ANGKET' && (
        <RecapDashboard
          classes={classes}
          students={students}
          currentUser={currentUser}
          settings={settings}
          onSaveSettings={onSaveSettings}
          onOpenSettings={onOpenSettings}
        />
      )}

      {activeSubTab === 'VERIFIKASI_SPP' && (
        <VerifikasiSppReport
          classes={classes}
          students={students}
          currentUser={currentUser}
          settings={settings}
        />
      )}

      {activeSubTab === 'LOGISTIK_KAOS' && (
        <LogistikKaosReport
          classes={classes}
          students={students}
          currentUser={currentUser}
          settings={settings}
        />
      )}

      {activeSubTab === 'SURAT_IZIN' && (
        <SuratIzinView
          students={students}
          settings={settings}
          onSaveSettings={onSaveSettings}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default DocumentWorkspace;

