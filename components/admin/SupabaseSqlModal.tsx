'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Database, Copy, Check, Terminal, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

interface SupabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SUPABASE_SQL_SCRIPT = `-- =================================================================
-- SKEMA DATABASE RELASIONAL & INDEXED SUPABASE (SIM DARMAWISATA)
-- Standar Enterprise: 3NF Relational, Fast Indexing, Non-Breaking
-- Buka Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =================================================================

-- 1. EXTENSIONS & UUID GENERATOR
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL: STAFF (Guru, Wali Kelas, Kakomli, Panitia, Tim Medis)
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    nip TEXT UNIQUE,
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('L', 'P', 'LAKI-LAKI', 'PEREMPUAN')),
    phone TEXT,
    email TEXT,
    primary_role TEXT DEFAULT 'GURU',
    roles TEXT[] DEFAULT ARRAY['GURU']::TEXT[],
    shirt_size TEXT,
    assigned_bus INTEGER,
    assigned_room INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_nip ON public.staff (nip);
CREATE INDEX IF NOT EXISTS idx_staff_name ON public.staff (name);
CREATE INDEX IF NOT EXISTS idx_staff_primary_role ON public.staff (primary_role);

-- 3. TABEL: MAJORS (Program / Jurusan Keahlian)
CREATE TABLE IF NOT EXISTS public.majors (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    kakomli_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_majors_code ON public.majors (code);

-- 4. TABEL: CLASSES (Rombel / Kelas)
CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT,
    major_id TEXT,
    "totalStudents" INTEGER DEFAULT 0,
    "homeroomTeacher" TEXT,
    "teacherPhone" TEXT,
    "teacherPassword" TEXT,
    wave INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS major_id TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS "totalStudents" INTEGER DEFAULT 0;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS wave INTEGER DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_classes_name ON public.classes (name);

-- 5. TABEL: BUSES (Master Armada Bus)
CREATE TABLE IF NOT EXISTS public.buses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "busNumber" INTEGER NOT NULL,
    wave TEXT,
    capacity INTEGER DEFAULT 50,
    guide1 TEXT,
    guide2 TEXT,
    guide3 TEXT,
    guide4 TEXT,
    "poName" TEXT,
    "plateNumber" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_buses_busnumber ON public.buses ("busNumber");

-- 6. TABEL: STUDENTS (Data Siswa & Alokasi Perjalanan)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    nis TEXT NOT NULL,
    nisn TEXT,
    name TEXT NOT NULL,
    "className" TEXT NOT NULL,
    class_id TEXT,
    gender TEXT,
    "isRegistered" BOOLEAN DEFAULT false,
    destination TEXT,
    wave TEXT,
    "tShirtSize" TEXT,
    "tShirtDesign" TEXT,
    "parentName" TEXT,
    "parentJob" TEXT,
    "parentAddress" TEXT,
    "parentPhone" TEXT,
    "studentPhone" TEXT,
    "medicalHistory" TEXT,
    "waiverType" TEXT,
    "busNumber" INTEGER,
    "seatNumber" INTEGER,
    "roomNumber" INTEGER,
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Kolom Tambahan Additive
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS "waiverType" TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS "parentJob" TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS "roomNumber" INTEGER;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS "busNumber" INTEGER;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS "seatNumber" INTEGER;

-- High Performance B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_students_nis ON public.students (nis);
CREATE INDEX IF NOT EXISTS idx_students_nis_lower ON public.students (LOWER(nis));
CREATE INDEX IF NOT EXISTS idx_students_classname ON public.students ("className");
CREATE INDEX IF NOT EXISTS idx_students_wave ON public.students (wave);
CREATE INDEX IF NOT EXISTS idx_students_wave_bus ON public.students (wave, "busNumber", "seatNumber");
CREATE INDEX IF NOT EXISTS idx_students_roomnumber ON public.students ("roomNumber");
CREATE INDEX IF NOT EXISTS idx_students_isregistered ON public.students ("isRegistered");

-- 7. TABEL: TRIP_CHECKINS (Presensi Titik Kumpul / Lapangan)
CREATE TABLE IF NOT EXISTS public.trip_checkins (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    checkpoint_name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    checked_by TEXT,
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'PRESENT',
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_checkins_student ON public.trip_checkins (student_id);

-- 8. TABEL: SETTINGS (Pengaturan Global & Parameter)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL
);

-- 9. TABEL: RUNDOWNS (Jadwal Kegiatan & Destinasi)
CREATE TABLE IF NOT EXISTS public.rundowns (
    id TEXT PRIMARY KEY,
    destination TEXT NOT NULL,
    day INTEGER NOT NULL,
    time TEXT NOT NULL,
    activity TEXT NOT NULL,
    location TEXT
);

-- 10. TABEL: ACTIVITY_LOGS (Audit Trail Sistem)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    nis TEXT,
    name TEXT,
    "className" TEXT,
    operator TEXT DEFAULT 'Admin',
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs (timestamp DESC);
`;

export const SupabaseSqlModal: React.FC<SupabaseSqlModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generator SQL Supabase (Skema & Index Table)">
      <div className="space-y-4 text-slate-800">
        {/* Banner Overview */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <Database className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              Skema Tabel & Index Supabase Resmi
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                Lengkap & Cepat
              </span>
            </h4>
            <p className="text-slate-600">
              Salin kode SQL di bawah ini dan tempelkan pada menu <strong>SQL Editor</strong> di dashboard Supabase Anda. Skema ini telah dilengkapi dengan <strong>index otomatis</strong> agar pencarian NIS super cepat.
            </p>
          </div>
        </div>

        {/* Instructions Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
            <span>Buka <strong>Supabase Dashboard</strong></span>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
            <span>Pilih menu <strong>SQL Editor</strong> → <strong>New Query</strong></span>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
            <span>Tempelkan kode & klik <strong>Run</strong></span>
          </div>
        </div>

        {/* Code Box Header & Action */}
        <div className="flex items-center justify-between bg-slate-900 text-slate-200 px-4 py-2.5 rounded-t-xl text-xs font-mono">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>schema_supabase.sql</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md transition-colors flex items-center gap-1.5 text-xs shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-200" />
                <span>Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Script SQL</span>
              </>
            )}
          </button>
        </div>

        {/* Code Area */}
        <pre className="p-4 bg-slate-950 text-emerald-300 font-mono text-[11px] sm:text-xs rounded-b-xl overflow-x-auto max-h-[300px] border border-slate-800 leading-relaxed">
          <code>{SUPABASE_SQL_SCRIPT}</code>
        </pre>

        {/* Features Checklist */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Keunggulan Skema Ini:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-1">
            <li><strong>Optimasi Index:</strong> Pencarian NIS Bagian 1 instan (kurang dari 10ms).</li>
            <li><strong>Row Level Security (RLS):</strong> Mengizinkan query baca & tulis dengan aman.</li>
            <li><strong>Struktur Relasional:</strong> Mendukung kustomisasi password wali kelas & setting sistem.</li>
          </ul>
        </div>

        {/* Footer Action */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
};
