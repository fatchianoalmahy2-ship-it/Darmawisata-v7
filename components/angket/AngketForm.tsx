'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Student, DestinationType, WaveType, TShirtSize, WaiverType, AppSettings, GenderType } from '@/types';
import schoolMetadata from '@/config/schoolMetadata.json';
import tshirtDesignA from '@/src/assets/images/tshirt_design_a_1785842351713.jpg';
import tshirtDesignB from '@/src/assets/images/tshirt_design_b_1785842364932.jpg';
import { NisLookupModal } from './NisLookupModal';
import { saveSingleStudent } from '@/services/firebaseService';
import { dbService } from '@/services/dbService';
import { getDepartmentFromClassName, getAbbreviationFromDepartment, getStudentWave } from '@/lib/utils';
import { SchoolLogo } from '@/components/ui/SchoolLogo';
import {
  Search,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  AlertTriangle,
  Shirt,
  Sparkles,
  Lock,
  Calendar,
  Compass,
  Bus,
  BedDouble,
  Info,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';

interface AngketFormProps {
  students: Student[];
  classes: any[];
  settings?: AppSettings;
  onSaveStudent: (updatedStudent: Student, isAlreadySynced?: boolean) => void;
  onNavigateToSurat: (student: Student) => void;
}

export const AngketForm: React.FC<AngketFormProps> = ({
  students,
  classes,
  settings,
  onSaveStudent,
  onNavigateToSurat,
}) => {
  const [inputNis, setInputNis] = useState('');
  const [seg1, setSeg1] = useState('');
  const [seg2, setSeg2] = useState('');
  const [seg3, setSeg3] = useState('');

  const seg1Ref = React.useRef<HTMLInputElement>(null);
  const seg2Ref = React.useRef<HTMLInputElement>(null);
  const seg3Ref = React.useRef<HTMLInputElement>(null);
  const searchDebounceRef = React.useRef<NodeJS.Timeout | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Secure identity verification states for Lookup Modal selection
  const [pendingStudent, setPendingStudent] = useState<Student | null>(null);
  const [verifSeg2, setVerifSeg2] = useState('');
  const [verifError, setVerifError] = useState('');

  // Submit verification states
  const [showSubmitVerification, setShowSubmitVerification] = useState(false);
  const [submitVerifSeg2, setSubmitVerifSeg2] = useState('');
  const [submitVerifError, setSubmitVerifError] = useState('');
  const [pendingUpdateData, setPendingUpdateData] = useState<Student | null>(null);

  // Syncing states
  const [isSavingAndSyncing, setIsSavingAndSyncing] = useState(false);
  const [isVerifyingAndSyncing, setIsVerifyingAndSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  React.useEffect(() => {
    setLogoError(false);
  }, [settings?.appLogoUrl, settings?.headerLogoUrl]);

  // Form State
  const [destination, setDestination] = useState<DestinationType>('BALI');
  const [wave, setWave] = useState<WaveType>('BALI_GEL_1');
  const [tShirtSize, setTShirtSize] = useState<TShirtSize>('L');
  const [tShirtDesign, setTShirtDesign] = useState<'A' | 'B'>('A');
  const [parentName, setParentName] = useState('');
  const [parentAddress, setParentAddress] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [gender, setGender] = useState<GenderType>('LAKI-LAKI');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [waiverType, setWaiverType] = useState<WaiverType>('NONE');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check if Angket is Closed
  const isAngketClosed = useMemo(() => {
    if (settings?.isAngketClosed) return true;
    if (settings?.angketDeadline) {
      const deadline = new Date(settings.angketDeadline + 'T23:59:59');
      return new Date() > deadline;
    }
    return false;
  }, [settings]);

  // Formatted Deadline String
  const formattedDeadline = useMemo(() => {
    if (!settings?.angketDeadline) return '15 Agustus 2026';
    try {
      const d = new Date(settings.angketDeadline);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return settings.angketDeadline;
    }
  }, [settings]);

  // Helper for Wave Details
  const getWaveInfo = (waveId?: WaveType) => {
    const gel1Dates = settings?.baliGel1Dates || '07 – 11 November 2025';
    const gel2Dates = settings?.baliGel2Dates || '14 – 18 November 2025';
    const yogyaDates = settings?.yogyaGel1Dates || '15 – 16 November 2025';
    const baliPrice = settings?.baliPrice || 1600000;
    const yogyaPrice = settings?.yogyaPrice || 850000;

    const formatPrice = (val: number) => {
      return `Rp ${val.toLocaleString('id-ID')},-`;
    };

    if (waveId === 'BALI_GEL_1') {
      return {
        id: 'BALI_GEL_1' as WaveType,
        destination: 'BALI' as DestinationType,
        name: 'Bali Gelombang I',
        dates: gel1Dates,
        price: baliPrice,
        formattedPrice: formatPrice(baliPrice),
      };
    } else if (waveId === 'BALI_GEL_2') {
      return {
        id: 'BALI_GEL_2' as WaveType,
        destination: 'BALI' as DestinationType,
        name: 'Bali Gelombang II',
        dates: gel2Dates,
        price: baliPrice,
        formattedPrice: formatPrice(baliPrice),
      };
    } else if (waveId === 'YOGYA_GEL_1') {
      return {
        id: 'YOGYA_GEL_1' as WaveType,
        destination: 'YOGYAKARTA' as DestinationType,
        name: 'Yogyakarta Gelombang I',
        dates: yogyaDates,
        price: yogyaPrice,
        formattedPrice: formatPrice(yogyaPrice),
      };
    }

    const isBali = waveId ? (waveId as string).includes('BALI') : false;
    return {
      id: (waveId || 'BALI_GEL_1') as WaveType,
      destination: (isBali ? 'BALI' : 'YOGYAKARTA') as DestinationType,
      name: isBali ? 'Bali Gelombang I' : 'Yogyakarta Gelombang I',
      dates: isBali ? gel1Dates : yogyaDates,
      price: isBali ? baliPrice : yogyaPrice,
      formattedPrice: isBali ? formatPrice(baliPrice) : formatPrice(yogyaPrice),
    };
  };

  // Helper to normalize NIS for flexible matching (removes spaces, slashes, dots, hyphens)
  const normalizeNis = (val: string) => val.replace(/[^0-9a-zA-Z]/g, '').toLowerCase();

  // Parse any NIS string into 3 segments
  const parseNisToSegments = (nisStr: string): { seg1: string; seg2: string; seg3: string } => {
    if (!nisStr) return { seg1: '', seg2: '', seg3: '' };

    // Split by /, ., spaces, hyphens
    const parts = nisStr.split(/[/\.\s\-]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return { seg1: parts[0], seg2: parts[1], seg3: parts[2] };
    }

    const digits = nisStr.replace(/\D/g, '');
    if (digits.length >= 10) {
      return {
        seg1: digits.slice(0, 5),
        seg2: digits.slice(5, 9),
        seg3: digits.slice(9),
      };
    }

    return { seg1: parts[0] || digits || nisStr, seg2: parts[1] || '', seg3: parts[2] || '' };
  };

  const populateStudentData = (found: Student) => {
    setSelectedStudent(found);
    setInputNis(found.nis);

    const { seg1: s1, seg2: s2, seg3: s3 } = parseNisToSegments(found.nis);
    setSeg1(s1);
    setSeg2(s2);
    setSeg3(s3);

    const defaultTour = settings?.defaultTourDestination || 'BALI';
    const isDestLocked = settings?.lockDestinationForStudents !== false; // Default true: siswa tidak bisa ubah tujuan
    const dest = isDestLocked ? (found.destination || defaultTour) : (found.destination || defaultTour);
    setDestination(dest);
    const derivedWave = getStudentWave({ destination: dest, className: found.className }, settings, classes);
    setWave(derivedWave);
    setTShirtSize(found.tShirtSize || 'L');
    setTShirtDesign(found.tShirtDesign || 'A');
    setGender(found.gender || 'LAKI-LAKI');
    setParentName((found.parentName || '').toUpperCase());
    setParentAddress((found.parentAddress || found.address || '').toUpperCase());
    setParentPhone(found.parentPhone || '');
    setStudentPhone(found.studentPhone || '');
    setMedicalHistory(found.medicalHistory || '');
    setWaiverType(found.waiverType || 'NONE');
    setAgreeTerms(true);

    // BAPAK/IBU RESTRICTION: Apabila siswa sudah pernah mengisi angket (isRegistered = true)
    // siswa tidak bisa mengedit data lagi di angket. Langsung alihkan (redirect) ke Surat Izin.
    if (found.isRegistered) {
      onNavigateToSurat(found);
    }
  };

  const [isSearching, setIsSearching] = useState(false);

  // Strict and Fast NIS Search Trigger (Matching 5-digit NIS Bagian 1)
  const triggerNisSearch = async (
    s1: string,
    s2?: string,
    s3?: string,
    rawFallback?: string,
    isTypeChange = false
  ) => {
    let queryTerm = s1.trim();
    if (!queryTerm && rawFallback) {
      queryTerm = rawFallback.trim();
    }

    if (!queryTerm) {
      setSelectedStudent(null);
      setErrorMessage('');
      return;
    }

    // Require at least 5 digits to perform a search
    const cleanDigits = queryTerm.replace(/\D/g, '');
    if (cleanDigits.length < 5 && !rawFallback) {
      return;
    }

    setErrorMessage('');
    setIsSearching(true);
    try {
      // 1. First search in local memory cache
      let found = students.find((s) => {
        if (!s.nis) return false;
        const { seg1: s1Part } = parseNisToSegments(s.nis);
        return normalizeNis(s1Part) === normalizeNis(queryTerm) || normalizeNis(s.nis) === normalizeNis(queryTerm);
      });

      if (found) {
        populateStudentData(found);
        setErrorMessage('');
        return;
      }

      // 2. Fetch via dbService (checks memory cache, Supabase if configured, or Firebase fallback)
      const remoteStudent = await dbService.getStudentByNis(queryTerm);

      if (remoteStudent) {
        populateStudentData(remoteStudent);
        setErrorMessage('');
      } else {
        setSelectedStudent(null);
        setErrorMessage(
          `Siswa dengan NIS "${queryTerm}" tidak ditemukan. Pastikan 5 digit awal NIS pada Bagian 1 sudah sesuai.`
        );
      }
    } catch (err) {
      console.error('Error fetching student from Supabase:', err);
      setErrorMessage('Terjadi kesalahan koneksi saat mencari data siswa. Silakan coba lagi.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSeg1Change = (val: string) => {
    if (/[^0-9]/.test(val)) {
      setErrorMessage('⚠️ NIS Bagian 1 hanya boleh berisi 5 digit ANGKA.');
      setTimeout(() => setErrorMessage(''), 3500);
    }
    const clean = val.replace(/[^0-9]/g, '').slice(0, 5);
    setSeg1(clean);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (clean.length === 5) {
      searchDebounceRef.current = setTimeout(() => {
        triggerNisSearch(clean);
      }, 300);
    } else if (clean.length < 5 && selectedStudent) {
      setSelectedStudent(null);
    }
  };

  const handleSeg2Change = (val: string) => {
    if (/[^0-9]/.test(val)) {
      setErrorMessage('⚠️ NIS hanya boleh berisi ANGKA.');
      setTimeout(() => setErrorMessage(''), 3500);
    }
    const clean = val.replace(/[^0-9]/g, '').slice(0, 4);
    setSeg2(clean);
  };

  const handleSeg3Change = (val: string) => {
    if (/[^0-9]/.test(val)) {
      setErrorMessage('⚠️ NIS hanya boleh berisi ANGKA.');
      setTimeout(() => setErrorMessage(''), 3500);
    }
    const clean = val.replace(/[^0-9]/g, '').slice(0, 3);
    setSeg3(clean);
  };

  const handlePasteSegment = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    const parsed = parseNisToSegments(pasted);
    setSeg1(parsed.seg1);
    setSeg2(parsed.seg2);
    setSeg3(parsed.seg3);
    triggerNisSearch(parsed.seg1, parsed.seg2, parsed.seg3, pasted, false);
  };

  const handleSeg2KeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !seg2) {
      seg1Ref.current?.focus();
    }
  };

  const handleSeg3KeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !seg3) {
      seg2Ref.current?.focus();
    }
  };

  const handleSelectFromLookup = (st: Student) => {
    setPendingStudent(st);
    setVerifSeg2('');
    setVerifError('');
  };

  // Handle Destination Change
  const handleDestinationSelect = (selectedDest: DestinationType) => {
    setDestination(selectedDest);
    if (selectedStudent) {
      const calculatedWave = getStudentWave(
        { destination: selectedDest, className: selectedStudent.className },
        settings,
        classes
      );
      setWave(calculatedWave);
    } else {
      setWave(selectedDest === 'BALI' ? 'BALI_GEL_1' : 'YOGYA_GEL_1');
    }
  };

  // Handle Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAngketClosed) {
      setErrorMessage('Pengisian angket telah ditutup. Anda tidak dapat mengubah data angket.');
      return;
    }

    if (!selectedStudent) {
      setErrorMessage('Silakan masukkan atau pilih NIS siswa terlebih dahulu.');
      return;
    }

    if (!parentName || !parentPhone || !parentAddress) {
      setErrorMessage('Mohon lengkapi data Orang Tua / Wali murid.');
      return;
    }

    if (!studentPhone) {
      setErrorMessage('Mohon lengkapi No. WhatsApp Aktif Siswa.');
      return;
    }

    if (!medicalHistory) {
      setErrorMessage('Mohon lengkapi Riwayat Penyakit (isi "Tidak Ada" jika sehat).');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Anda harus menyetujui pernyataan izin orang tua.');
      return;
    }

    const deterministicWave = getStudentWave(
      { destination, className: selectedStudent.className },
      settings,
      classes
    );

    const updated: Student = {
      ...selectedStudent,
      destination,
      wave: deterministicWave,
      tShirtSize,
      tShirtDesign,
      gender,
      parentName: parentName.trim().toUpperCase(),
      parentAddress: parentAddress.trim().toUpperCase(),
      address: parentAddress.trim().toUpperCase(),
      parentPhone,
      studentPhone,
      medicalHistory,
      waiverType,
      isRegistered: true,
      updatedAt: new Date().toISOString(),
    };

    setPendingUpdateData(updated);
    setSubmitVerifSeg2('');
    setSubmitVerifError('');
    setShowSubmitVerification(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner Intro & Deadline Status */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Pengisian Angket Resmi Peminatan Tour
            </div>

            {/* Connectivity & Deadline Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                }`}
                title={isOnline ? 'Terhubung ke server Supabase' : 'Koneksi terputus. Beralih ke offline mode.'}
              >
                {isOnline ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span>Database Terhubung</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-rose-400" />
                    <span>Offline (Koneksi Terputus)</span>
                  </>
                )}
              </div>

              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                  isAngketClosed
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {isAngketClosed ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    Angket Ditutup (Batas Akhir: {formattedDeadline})
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Batas Akhir Pengisian: {formattedDeadline}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Angket Peminatan Darmawisata Kelas XII
            </h2>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isAngketClosed
                ? 'Pengisian angket peminatan telah ditutup secara resmi. Masukkan NIS siswa untuk mengecek Gelombang Keberangkatan, Bus, Kamar, dan Cetak Surat Izin Orang Tua.'
                : 'Masukkan NIS siswa untuk memilih tujuan tour (Bali / Yogyakarta), ukuran kaos, serta data izin orang tua. Gelombang keberangkatan akan muncul secara otomatis ketika angket resmi ditutup.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Step 1: NIS Input / Lookup */}
        <div className="space-y-4 pb-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Langkah 1: Masukkan NIS / NISN Siswa
            </label>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Segmented Input Wrapper */}
            <div className="flex-1 bg-slate-50 border border-slate-300 rounded-xl p-3 flex items-center justify-center gap-1.5 sm:gap-2 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all shadow-xs">
              {/* Segment 1 */}
              <div className="relative flex-1 min-w-[70px] max-w-[130px]">
                <input
                  ref={seg1Ref}
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="25082"
                  value={seg1}
                  onChange={(e) => handleSeg1Change(e.target.value)}
                  onPaste={handlePasteSegment}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full text-center py-2.5 px-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-950 text-base sm:text-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                />
                <span className="block text-[10px] text-center text-emerald-800 font-bold mt-0.5 whitespace-nowrap">
                  Bagian 1 (5 Digit)
                </span>
              </div>

              {/* Symbol / */}
              <span className="text-slate-400 font-black text-xl sm:text-2xl px-0.5 select-none font-mono pb-4">/</span>

              {/* Segment 2 (Disabled / Auto-filled) */}
              <div className="relative flex-1 min-w-[60px] max-w-[110px]">
                <input
                  ref={seg2Ref}
                  type="text"
                  disabled
                  readOnly
                  placeholder="----"
                  value={seg2}
                  className="w-full text-center py-2.5 px-1.5 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-500 text-xs sm:text-sm cursor-not-allowed select-none shadow-none"
                />
                <span className="block text-[10px] text-center text-slate-400 font-semibold mt-0.5 flex items-center justify-center gap-0.5 whitespace-nowrap">
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                  Bagian 2
                </span>
              </div>

              {/* Symbol . */}
              <span className="text-slate-400 font-black text-2xl sm:text-3xl px-0.5 select-none font-mono pb-4">.</span>

              {/* Segment 3 (Disabled / Auto-filled) */}
              <div className="relative flex-1 min-w-[50px] max-w-[100px]">
                <input
                  ref={seg3Ref}
                  type="text"
                  disabled
                  readOnly
                  placeholder="---"
                  value={seg3}
                  className="w-full text-center py-2.5 px-1.5 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-500 text-xs sm:text-sm cursor-not-allowed select-none shadow-none"
                />
                <span className="block text-[10px] text-center text-slate-400 font-semibold mt-0.5 flex items-center justify-center gap-0.5 whitespace-nowrap">
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                  Bagian 3
                </span>
              </div>
            </div>

            {/* Cek NIS Button - Pindah ke bawah input NIS pada smartphone */}
            <button
              type="button"
              onClick={() => triggerNisSearch(seg1)}
              disabled={isSearching || !seg1}
              className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors shrink-0 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isSearching ? 'Mencari...' : 'Cek NIS'}
            </button>

            {settings?.showAngketSearchButton === true && (
              <button
                type="button"
                onClick={() => setIsLookupOpen(true)}
                className="w-full sm:w-auto px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                {students.length > 0 ? `Cari dari Daftar (${students.length} Siswa)` : 'Cari dari Daftar Siswa'}
              </button>
            )}
          </div>

          <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200/60 p-2.5 rounded-xl">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-ping"></span>
            <span>
              <strong>Petunjuk:</strong> Cukup masukkan <strong>5 digit angka NIS</strong> pada Bagian 1. Bagian 2 & 3 akan terisi secara <strong>otomatis</strong> dari database.
            </span>
          </p>

          {/* Interactive Searching Banner */}
          {isSearching && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              <span>Memeriksa database Supabase untuk NIS <strong>{seg1 || inputNis}</strong>...</span>
            </div>
          )}

          {/* Student Matched Box */}
          {selectedStudent ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    {selectedStudent.name}
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      ✓ Bagian 2 & 3 Terisi Otomatis
                    </span>
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-0.5">
                    <span className="font-bold text-emerald-900">
                      NIS: {selectedStudent.nis}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-slate-800 bg-white border border-emerald-200 px-2 py-0.5 rounded">
                      Kelas: {selectedStudent.className}
                    </span>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700">Jenis Kelamin:</span>
                      <select
                        value={gender || selectedStudent.gender || 'LAKI-LAKI'}
                        onChange={(e) => {
                          const newGender = e.target.value as GenderType;
                          setGender(newGender);
                          const updated = { ...selectedStudent, gender: newGender };
                          setSelectedStudent(updated);
                          onSaveStudent(updated);
                        }}
                        className="bg-white border border-emerald-300 rounded px-2 py-0.5 text-xs font-bold text-emerald-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                      >
                        <option value="LAKI-LAKI">LAKI-LAKI</option>
                        <option value="PEREMPUAN">PEREMPUAN</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <span className="text-xs font-bold text-emerald-800 bg-emerald-200/60 px-3 py-1 rounded-full border border-emerald-300">
                Terhubung dengan Supabase
              </span>
            </div>
          ) : !isSearching && !errorMessage ? (
            <p className="text-xs text-slate-500 italic">
              *Masukkan 5 digit NIS Anda untuk menampilkan data siswa secara otomatis.
            </p>
          ) : null}

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* ANGKET CLOSED VIEW WHEN STUDENT MATCHED */}
        {selectedStudent && isAngketClosed && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Official Gelombang Result Banner */}
            <div className="p-6 bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 text-white rounded-2xl border border-emerald-500/40 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-700/50 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="font-black text-base text-white tracking-tight uppercase">
                    Hasil Gelombang Keberangkatan Resmi
                  </h3>
                </div>
                <span className="px-3 py-1 bg-emerald-500/30 text-emerald-200 font-extrabold text-xs rounded-full border border-emerald-400/40">
                  Angket Ditutup
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/10 backdrop-blur-xs rounded-xl border border-white/10 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                    Gelombang Keberangkatan:
                  </span>
                  <h4 className="text-xl font-black text-amber-300">
                    {getWaveInfo(selectedStudent.wave).name}
                  </h4>
                  <p className="text-xs text-slate-200 font-medium">
                    📅 Tanggal: <strong>{getWaveInfo(selectedStudent.wave).dates}</strong>
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    📍 Tujuan: <strong>Tour {selectedStudent.destination || 'BALI'}</strong> ({getWaveInfo(selectedStudent.wave).formattedPrice})
                  </p>
                </div>

                <div className="p-4 bg-white/10 backdrop-blur-xs rounded-xl border border-white/10 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                    Fasilitas & Penempatan:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-900/60 rounded-lg flex items-center gap-2">
                      <Bus className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Armada Bus</span>
                        <strong className="text-white">
                          {selectedStudent.busNumber ? `Bus ${selectedStudent.busNumber}` : 'Diatur Panitia'}
                        </strong>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-900/60 rounded-lg flex items-center gap-2">
                      <BedDouble className="w-4 h-4 text-teal-400" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Kamar Hotel</span>
                        <strong className="text-white">
                          {selectedStudent.roomNumber ? `Kamar ${selectedStudent.roomNumber}` : 'Diatur Panitia'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1 text-[11px] text-slate-300 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <Shirt className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ukuran Kaos Peserta: <strong>{selectedStudent.tShirtSize || 'L'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Pilihan Desain: <strong>Opsi {selectedStudent.tShirtDesign || 'A'}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button to Print PDF */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-300">
                  Surat Izin Orang Tua & Surat Pernyataan sudah dapat dicetak resmi.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToSurat(selectedStudent)}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  Cetak Surat Izin Orang Tua (PDF)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ANGKET OPEN VIEW (FORM) */}
        {selectedStudent && !isAngketClosed && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
            {/* Step 2: Destination Display / Selection */}
            {settings?.lockDestinationForStudents !== false ? (
              /* Single Fixed Destination Card (Readonly / Locked for Students) */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Langkah 2: Tujuan Tour Resmi Sekolah
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    <Lock className="w-3 h-3 text-slate-500" />
                    Tujuan Ditetapkan Sekolah
                  </span>
                </div>

                <div className="p-5 rounded-2xl border-2 border-emerald-600 bg-emerald-50/50 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                      {destination === 'YOGYAKARTA'
                        ? (settings?.yogyaBadge || '🏛️ TOUR YOGYAKARTA')
                        : (settings?.baliBadge || '🌴 TOUR BALI (5 HARI)')}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Destinasi Terpilih</span>
                    </div>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-base">
                    {destination === 'YOGYAKARTA'
                      ? (settings?.yogyaTitle || 'Kota Istimewa & Petualangan Merapi')
                      : (settings?.baliTitle || 'Pulau Dewata Bali & Sunset Jimbaran')}
                  </h4>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {destination === 'YOGYAKARTA'
                      ? (settings?.yogyaDesc || 'Wisata Cave Tubing Gua Pindul, Pantai Sepanjang Gunungkidul, Lava Tour Merapi Jeep, Malioboro, & Pusat Oleh-oleh Jogja.')
                      : (settings?.baliDesc || 'Kunjungan objek GWK Cultural Park, Pantai Melasti, Pantai Pandawa, Bedugul, Kuta Beach, Joger, Tari Barong, & Sunset Dinner.')}
                  </p>

                  <div className="pt-2 flex flex-col gap-1 text-xs border-t border-slate-200/60 pb-1">
                    {destination === 'YOGYAKARTA' ? (
                      <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Jadwal Keberangkatan: {settings?.yogyaGel1Dates || '15 – 16 November 2025'}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Gelombang I: {settings?.baliGel1Dates || '07 – 11 November 2025'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Gelombang II: {settings?.baliGel2Dates || '14 – 18 November 2025'}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Biaya Investasi Resmi:</span>
                    <span className="text-sm font-black text-slate-900">
                      Rp {(destination === 'YOGYAKARTA' ? (settings?.yogyaPrice || 850000) : (settings?.baliPrice || 1600000)).toLocaleString('id-ID')},-
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    Tujuan tour ditetapkan secara seragam oleh sekolah untuk seluruh siswa kelas XII. Penentuan armada bus dan nomor kursi akan dibagikan saat batas angket ditutup.
                  </p>
                </div>
              </div>
            ) : (
              /* Two-Option Selection if Admin explicitly enabled destination picking */
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Langkah 2: Pilih Tujuan Tour
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bali Option */}
                  <div
                    onClick={() => handleDestinationSelect('BALI')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                      destination === 'BALI'
                        ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                        {settings?.baliBadge || '🌴 TOUR BALI (5 HARI)'}
                      </span>
                      {destination === 'BALI' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-base">
                      {settings?.baliTitle || 'Pulau Dewata Bali & Sunset Jimbaran'}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {settings?.baliDesc || 'Kunjungan objek GWK Cultural Park, Pantai Melasti, Pantai Pandawa, Bedugul, Kuta Beach, Joger, Tari Barong, & Sunset Dinner.'}
                    </p>

                    <div className="pt-2 flex flex-col gap-1 text-xs border-t border-slate-200/60 pb-1">
                      <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Gelombang I: {settings?.baliGel1Dates || '07 – 11 November 2025'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Gelombang II: {settings?.baliGel2Dates || '14 – 18 November 2025'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Biaya Investasi:</span>
                      <span className="text-sm font-black text-slate-900">
                        Rp {(settings?.baliPrice || 1600000).toLocaleString('id-ID')},-
                      </span>
                    </div>
                  </div>

                  {/* Yogyakarta Option */}
                  <div
                    onClick={() => handleDestinationSelect('YOGYAKARTA')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                      destination === 'YOGYAKARTA'
                        ? 'border-amber-600 bg-amber-50/60 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-md">
                        {settings?.yogyaBadge || '🏛️ TOUR YOGYAKARTA (2 HARI)'}
                      </span>
                      {destination === 'YOGYAKARTA' && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-base">
                      {settings?.yogyaTitle || 'Kota Istimewa & Petualangan Merapi'}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {settings?.yogyaDesc || 'Wisata Cave Tubing Gua Pindul, Pantai Sepanjang Gunungkidul, Lava Tour Merapi Jeep, Malioboro, & Pusat Oleh-oleh Jogja.'}
                    </p>

                    <div className="pt-2 flex flex-col gap-1 text-xs border-t border-slate-200/60 pb-1">
                      <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Jadwal Keberangkatan: {settings?.yogyaGel1Dates || '15 – 16 November 2025'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Biaya Investasi:</span>
                      <span className="text-sm font-black text-slate-900">
                        Rp {(settings?.yogyaPrice || 850000).toLocaleString('id-ID')},-
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Notice regarding Gelombang */}
                <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong>Informasi Gelombang Keberangkatan:</strong> Pilihan Gelombang I atau Gelombang II tidak lagi dipilih saat pengisian angket. Gelombang akan ditetapkan secara resmi oleh panitia sekolah dan akan langsung tampil begitu batas waktu angket selesai (ditutup).
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: T-Shirt Size Selection */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Langkah 3: Ukuran Kaos Peserta
                </label>
                <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                  <Shirt className="w-3.5 h-3.5 text-slate-400" /> Panduan Ukuran Kaos Resmi
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {schoolMetadata.tShirtSizes.map((sz) => {
                  const isSelected = tShirtSize === sz.size;
                  return (
                    <button
                      key={sz.size}
                      type="button"
                      onClick={() => setTShirtSize(sz.size as TShirtSize)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-black border-emerald-600 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold border-slate-200'
                      }`}
                    >
                      <div className="text-sm">{sz.size}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{sz.chest}</div>
                    </button>
                  );
                })}
              </div>

              {/* T-Shirt Design Selection */}
              <div className="space-y-3 pt-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {settings?.tshirtSectionTitle || "Pilihan Desain Kaos Darmawisata Sterida 2026-2027"}
                </label>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {/* Option A */}
                  <div
                    onClick={() => setTShirtDesign('A')}
                    className={`relative p-2.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center space-y-2 sm:space-y-3 ${
                      tShirtDesign === 'A'
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="relative w-full aspect-square max-w-[130px] sm:max-w-[180px] rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                      <Image
                        src={settings?.tshirtDesignAUrl || tshirtDesignA}
                        alt="Desain Kaos A"
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                        unoptimized={!!settings?.tshirtDesignAUrl?.startsWith('data:')}
                      />
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-emerald-600 text-white font-black text-[9px] sm:text-[10px] rounded-lg shadow-sm">
                        OPSI A
                      </div>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                        {settings?.tshirtDesignATitle || "Desain Minimalis Modern"}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-tight">
                        {settings?.tshirtDesignADesc || "Garis seni estetik siluet candi & kelapa khas Bali-Jogja"}
                      </p>
                    </div>
                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center ${
                      tShirtDesign === 'A'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {tShirtDesign === 'A' && <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-white" />}
                    </div>
                  </div>

                  {/* Option B */}
                  <div
                    onClick={() => setTShirtDesign('B')}
                    className={`relative p-2.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center space-y-2 sm:space-y-3 ${
                      tShirtDesign === 'B'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="relative w-full aspect-square max-w-[130px] sm:max-w-[180px] rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                      <Image
                        src={settings?.tshirtDesignBUrl || tshirtDesignB}
                        alt="Desain Kaos B"
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                        unoptimized={!!settings?.tshirtDesignBUrl?.startsWith('data:')}
                      />
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-indigo-600 text-white font-black text-[9px] sm:text-[10px] rounded-lg shadow-sm">
                        OPSI B
                      </div>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                        {settings?.tshirtDesignBTitle || "Desain Retro Adventure"}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-tight">
                        {settings?.tshirtDesignBDesc || "Palet warna matahari terbenam dengan ilustrasi gunung & ombak"}
                      </p>
                    </div>
                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center ${
                      tShirtDesign === 'B'
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {tShirtDesign === 'B' && <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Parent Info & Consent */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Langkah 4: Data Orang Tua / Wali Murid
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Orang Tua / Wali *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap Orang Tua"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 uppercase focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Telepon / WhatsApp Orang Tua *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0812xxxxxxx"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Alamat rumah lengkap"
                    value={parentAddress}
                    onChange={(e) => setParentAddress(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 uppercase focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. WhatsApp Aktif Siswa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="08xxxxxxxxxx"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Riwayat Sakit / Riwayat Penyakit (Tulis &apos;Tidak Ada&apos; jika sehat) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Asma, Maag, Alergi Dingin, atau 'Tidak Ada'"
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Terms Agreement Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded-xs border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-700 leading-snug">
                    <strong>Pernyataan Izin:</strong> Dengan ini Orang Tua/Wali memberikan izin
                    sepenuhnya kepada siswa untuk mengikuti kegiatan Darmawisata SMK PGRI 2 Ponorogo
                    dan menyetujui seluruh ketentuan yang berlaku.
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                *Data akan disimpan langsung ke database Firebase/Sistem terpadu sekolah.
              </p>

              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Simpan Angket Peminatan
              </button>
            </div>
          </form>
        )}
      </div>

      {/* NIS Search Modal */}
      <NisLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        classes={classes}
        onSelectStudent={handleSelectFromLookup}
      />

      {/* Verification Modal for List Lookup */}
      {pendingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">
                Verifikasi Identitas Siswa
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Anda memilih <strong className="text-slate-800">{pendingStudent.name}</strong> dari kelas <strong className="text-slate-800">{pendingStudent.className}</strong>.
              </p>
              <p className="text-[11px] text-slate-500 bg-amber-50 border border-amber-100 p-2.5 rounded-xl mt-3 leading-relaxed">
                Untuk keamanan dan mencegah pengisian data oleh pihak lain, silakan masukkan <strong>Bagian 2</strong> (3 atau 4 digit) dari NIS Anda.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="max-w-[200px] mx-auto">
                <label className="block text-center text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Bagian 2 (3-4 Digit)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Contoh: 0324"
                  value={verifSeg2}
                  onChange={(e) => setVerifSeg2(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full text-center py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs text-lg"
                />
              </div>

              {verifError && (
                <p className="text-[11px] font-semibold text-rose-600 text-center bg-rose-50 p-2 rounded-lg border border-rose-100">
                  {verifError}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isVerifyingAndSyncing}
                onClick={() => setPendingStudent(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isVerifyingAndSyncing}
                onClick={() => {
                  const { seg2: realSeg2 } = parseNisToSegments(pendingStudent.nis);
                  if (verifSeg2.trim() === realSeg2.trim()) {
                    if (pendingStudent.isRegistered) {
                      setIsVerifyingAndSyncing(true);
                      setVerifError('');
                      saveSingleStudent(pendingStudent)
                        .then(async () => {
                          await dbService.removeStudentFromSyncQueue(pendingStudent.id);
                          populateStudentData(pendingStudent);
                          setPendingStudent(null);
                          setVerifSeg2('');
                          setVerifError('');
                        })
                        .catch((err) => {
                          console.error('Failed to sync student lookup:', err);
                          setVerifError('⚠️ Gagal mensinkronkan data Anda ke server online Supabase. Surat izin tidak dapat dicetak jika data belum ter-upload. Silakan periksa koneksi internet dan coba lagi.');
                        })
                        .finally(() => {
                          setIsVerifyingAndSyncing(false);
                        });
                    } else {
                      populateStudentData(pendingStudent);
                      setPendingStudent(null);
                      setVerifSeg2('');
                      setVerifError('');
                    }
                  } else {
                    setVerifError('⚠️ Bagian 2 NIS tidak sesuai dengan data terdaftar.');
                  }
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-80 disabled:cursor-not-allowed"
              >
                {isVerifyingAndSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mensinkronkan...</span>
                  </>
                ) : (
                  <span>Verifikasi & Masuk</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal for Submitting Form (Save Questionnaire) */}
      {showSubmitVerification && pendingUpdateData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">
                Konfirmasi & Verifikasi Angket
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Siswa: <strong className="text-slate-800">{pendingUpdateData.name}</strong> ({pendingUpdateData.className})
              </p>
              <div className="text-[11px] text-slate-500 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl mt-3 leading-relaxed text-left space-y-1">
                <strong className="text-emerald-950">Rincian Pilihan:</strong>
                <span className="block">• Tujuan: {pendingUpdateData.destination === 'BALI' ? '🌴 BALI' : '🏛️ YOGYAKARTA'}</span>
                <span className="block">• Kaos: {pendingUpdateData.tShirtSize} (Desain {pendingUpdateData.tShirtDesign})</span>
                <span className="block">• Orang Tua: {pendingUpdateData.parentName}</span>
              </div>
              <p className="text-[11px] text-slate-500 bg-amber-50 border border-amber-100 p-2.5 rounded-xl mt-3 leading-relaxed">
                Silakan masukkan <strong>Bagian 2</strong> (3 atau 4 digit) dari NIS Anda untuk menyimpan data secara aman.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="max-w-[180px] mx-auto">
                <label className="block text-center text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Bagian 2 (3-4 Digit)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Contoh: 0324"
                  value={submitVerifSeg2}
                  onChange={(e) => setSubmitVerifSeg2(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full text-center py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs text-lg"
                />
              </div>

              {submitVerifError && (
                <div className="space-y-2 text-center bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <div className="flex items-center justify-center gap-1.5 text-rose-700 font-extrabold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Gagal Menyimpan Data</span>
                  </div>
                  <p className="text-[11px] font-medium text-rose-700 leading-relaxed text-left">
                    {submitVerifError}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const { seg2: realSeg2 } = parseNisToSegments(pendingUpdateData.nis);
                      if (submitVerifSeg2.trim() === realSeg2.trim()) {
                        setIsSavingAndSyncing(true);
                        setSubmitVerifError('');
                        saveSingleStudent(pendingUpdateData)
                          .then(async () => {
                            await dbService.triggerSync();
                            await onSaveStudent(pendingUpdateData, true);
                            setSelectedStudent(pendingUpdateData);
                            setShowSubmitVerification(false);
                            setPendingUpdateData(null);
                            setSubmitVerifSeg2('');
                            setSubmitVerifError('');
                            setShowSuccessModal(true);
                          })
                          .catch((err) => {
                            console.error('Failed to sync student questionnaire submission:', err);
                            setSubmitVerifError('⚠️ Gagal menyimpan data ke Cloud Database: ' + (err?.message || 'Masalah koneksi jaringan.') + '. Pastikan koneksi internet stabil lalu klik Coba Simpan Ulang.');
                          })
                          .finally(() => {
                            setIsSavingAndSyncing(false);
                          });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Coba Simpan Ulang Sekarang</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isSavingAndSyncing}
                onClick={() => {
                  setShowSubmitVerification(false);
                  setPendingUpdateData(null);
                  setSubmitVerifSeg2('');
                  setSubmitVerifError('');
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingAndSyncing}
                onClick={() => {
                  const { seg2: realSeg2 } = parseNisToSegments(pendingUpdateData.nis);
                  if (submitVerifSeg2.trim() === realSeg2.trim()) {
                    if (typeof navigator !== 'undefined' && !navigator.onLine) {
                      setSubmitVerifError('⚠️ Perangkat Anda sedang OFFLINE. Sambungkan internet agar data dapat diverifikasi dan disimpan langsung ke database online.');
                      return;
                    }
                    setIsSavingAndSyncing(true);
                    setSubmitVerifError('');
                    saveSingleStudent(pendingUpdateData)
                      .then(async () => {
                        await dbService.triggerSync();
                        await onSaveStudent(pendingUpdateData, true);
                        setSelectedStudent(pendingUpdateData);
                        setShowSubmitVerification(false);
                        setPendingUpdateData(null);
                        setSubmitVerifSeg2('');
                        setSubmitVerifError('');
                        setShowSuccessModal(true);
                      })
                      .catch((err) => {
                        console.error('Failed to sync student questionnaire submission:', err);
                        setSubmitVerifError('⚠️ Gagal menyimpan data ke database online: ' + (err?.message || 'Koneksi terputus') + '. Surat izin tidak dapat diterbitkan jika data belum ter-upload. Pastikan koneksi internet stabil dan coba lagi.');
                      })
                      .finally(() => {
                        setIsSavingAndSyncing(false);
                      });
                  } else {
                    setSubmitVerifError('⚠️ Bagian 2 NIS tidak sesuai dengan data terdaftar.');
                  }
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-80 disabled:cursor-not-allowed"
              >
                {isSavingAndSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <span>Simpan & Verifikasi</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Angket Berhasil Disimpan!
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Data peminatan untuk <strong>{selectedStudent.name}</strong> ({selectedStudent.className}) telah tersimpan secara resmi.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1.5 font-medium text-slate-700">
              <p>• Tujuan Tour: <strong>{selectedStudent.destination || 'BALI'}</strong></p>
              <p>• Ukuran Kaos: <strong>{selectedStudent.tShirtSize}</strong></p>
              <p>• Pilihan Desain: <strong>Opsi {selectedStudent.tShirtDesign || 'A'}</strong></p>
              <p>• Wali Murid: <strong>{selectedStudent.parentName}</strong></p>
              <p className="text-emerald-700 font-bold pt-1 border-t border-slate-200">
                * Gelombang keberangkatan akan ditampilkan otomatis begitu pengisian angket resmi ditutup pada {formattedDeadline}.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  onNavigateToSurat(selectedStudent);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                Cetak Surat Izin & Surat Pernyataan PDF
              </button>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Tutup & Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
