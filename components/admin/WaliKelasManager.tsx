'use client';

import React, { useState, useMemo } from 'react';
import { SchoolClass, Student, AppSettings } from '@/types';
import { motion } from 'motion/react';
import { Modal } from '@/components/ui/Modal';
import { 
  UserCheck, 
  Edit3, 
  KeyRound, 
  Phone, 
  ExternalLink, 
  CheckCircle2, 
  RefreshCw, 
  AlertTriangle,
  Send,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Upload,
  AlertCircle
} from 'lucide-react';
import { formatWhatsAppLink, normalizeClassName, getFullDepartmentFromClassName } from '@/lib/utils';
import { useTableQuery } from '@/hooks/useTableQuery';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { WaliAllocationManager } from './WaliAllocationManager';

interface WaliKelasManagerProps {
  classes: SchoolClass[];
  students: Student[];
  settings: AppSettings;
  onUpdateClass: (updatedClass: SchoolClass) => void;
  onAddClass: (newClass: SchoolClass) => void;
  onUpdateSettings?: (updatedSettings: AppSettings) => void;
}

export const WaliKelasManager: React.FC<WaliKelasManagerProps> = ({
  classes,
  students,
  settings,
  onUpdateClass,
  onAddClass,
  onUpdateSettings,
}) => {
  // Modals
  const [activeSubTab, setActiveSubTab] = useState<'CREDENTIALS' | 'ALLOCATION'>('CREDENTIALS');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);

  // Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importStatus, setImportStatus] = useState({ type: '', msg: '' });
  
  // Form state
  const [formTeacherName, setFormTeacherName] = useState('');
  const [formTeacherPhone, setFormTeacherPhone] = useState('');
  const [formTeacherPassword, setFormTeacherPassword] = useState('');
  const [formClassName, setFormClassName] = useState('');
  const [formDepartment, setFormDepartment] = useState('Teknik Otomotif');
  
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  const threshold = settings?.waliKelasParticipationThreshold || 75;

  // Toggle password visibility
  const togglePasswordVisibility = (classId: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [classId]: !prev[classId]
    }));
  };

  // Open edit modal
  const handleOpenEdit = (cls: SchoolClass) => {
    setSelectedClass(cls);
    setFormTeacherName(cls.homeroomTeacher);
    setFormTeacherPhone(cls.teacherPhone || '');
    setFormTeacherPassword(cls.teacherPassword || '');
    setFormClassName(cls.name);
    setFormDepartment(cls.department);
    setIsEditModalOpen(true);
  };

  // Handle edit submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !formTeacherName) return;

    const normalizedName = normalizeClassName(formClassName);

    const updated: SchoolClass = {
      ...selectedClass,
      homeroomTeacher: formTeacherName,
      teacherPhone: formTeacherPhone,
      teacherPassword: formTeacherPassword || undefined,
      name: normalizedName,
      department: formDepartment,
    };

    onUpdateClass(updated);
    setIsEditModalOpen(false);
  };

  // Reset password to default
  const handleResetPassword = (cls: SchoolClass) => {
    if (confirm(`Reset password Wali Kelas untuk kelas ${cls.name} ke default?`)) {
      const updated: SchoolClass = {
        ...cls,
        teacherPassword: '', // empty means fallback to default 'wali123'
      };
      onUpdateClass(updated);
    }
  };

  // Generate WA share link with credentials
  const handleShareCredentials = (cls: SchoolClass) => {
    const username = `wali_${cls.name.replace(/\s+/g, '_').toLowerCase()}`;
    const password = cls.teacherPassword || 'wali123';
    
    const message = `Yth. Bapak/Ibu Wali Kelas ${cls.name} (${cls.homeroomTeacher}),\n\nBerikut adalah info akses (kredensial) login Anda ke SIM Darmawisata ${settings.schoolName || 'SMK PGRI 2 Ponorogo'}:\n\n- Kelas: ${cls.name}\n- Username: ${username}\n- Password: ${password}\n\nSilakan gunakan akun ini untuk masuk ke dashboard, memonitor keaktifan angket siswa, dan mengunduh berkas laporan.\n\nLink Dashboard: ${typeof window !== 'undefined' ? window.location.origin : ''}\n\nTerima kasih.`;
    
    const formattedPhone = cls.teacherPhone ? cls.teacherPhone.replace(/[^0-9]/g, '') : '';
    const phoneWithCountry = formattedPhone.startsWith('0') 
      ? '62' + formattedPhone.slice(1) 
      : formattedPhone;

    if (!phoneWithCountry) {
      alert('Nomor HP Wali Kelas tidak valid atau belum diset.');
      return;
    }

    const waLink = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(waLink, '_blank');
  };

  // Calculate stats
  const totalWaliKelas = classes.length;
  
  const classStatsList = useMemo(() => {
    return classes.map(cls => {
      const classStudents = students.filter(s => s.className === cls.name);
      const registeredCount = classStudents.filter(s => s.isRegistered).length;
      const totalCount = cls.totalStudents || classStudents.length || 1;
      const percentage = parseFloat(((registeredCount / totalCount) * 100).toFixed(1));
      const isCompleted = percentage >= threshold;
      
      return {
        ...cls,
        registeredCount,
        totalCount,
        percentage,
        isCompleted
      };
    });
  }, [classes, students, threshold]);

  const completedCount = classStatsList.filter(c => c.isCompleted).length;
  const incompleteCount = totalWaliKelas - completedCount;
  const withPhoneCount = classes.filter(c => c.teacherPhone).length;

  // Unified Query Hook
  const {
    search,
    setSearch,
    filters,
    setFilters,
    handleClearFilters,
    pagination,
    processedData: filteredList,
    paginatedData,
    totalPages,
    handlePageChange,
  } = useTableQuery<any>(classStatsList, {
    searchFields: ['homeroomTeacher', 'name', 'teacherPhone', 'department'],
    initialPageSize: 6,
    filterFn: (item, activeFilters) => {
      const statusVal = activeFilters.status;
      if (!statusVal) return true;
      if (statusVal === 'COMPLETED') return item.isCompleted;
      if (statusVal === 'INCOMPLETE') return !item.isCompleted;
      return true;
    },
  });

  const handleExportExcel = () => {
    const exportData = filteredList.map((item, idx) => ({
      No: idx + 1,
      'Nama Wali Kelas': item.homeroomTeacher,
      Kelas: item.name,
      Kejuruan: item.department,
      'No Kontak': item.teacherPhone || '',
      Username: `wali_${item.name.replace(/\s+/g, '_').toLowerCase()}`,
      Password: item.teacherPassword || 'wali123',
      'Persentase Partisipasi': `${item.percentage}%`,
      'Jumlah Siswa Terdaftar': item.registeredCount,
      'Total Siswa': item.totalCount,
      Status: item.isCompleted ? 'Tuntas' : 'Belum Tuntas',
    }));
    import('@/services/excelService').then(({ ExcelService }) => {
      ExcelService.exportToExcel(exportData, 'Data_Kredensial_Wali_Kelas', 'Wali Kelas');
    });
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus({ type: 'info', msg: 'Membaca file...' });

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

          if (jsonData.length === 0) {
            setImportStatus({ type: 'error', msg: 'File Excel kosong atau tidak valid.' });
            return;
          }

          let updatedCount = 0;
          let addedCount = 0;

          jsonData.forEach((row: any, idx: number) => {
            const keys = Object.keys(row);
            const findKeyVal = (searchTerms: string[]) => {
              const matchedKey = keys.find(k => searchTerms.some(term => k.toLowerCase().includes(term)));
              return matchedKey ? String(row[matchedKey]).trim() : '';
            };

            const className = normalizeClassName(findKeyVal(['kelas', 'rombel', 'nama kelas']));
            if (!className) return;

            const teacher = findKeyVal(['wali kelas', 'guru', 'nama wali']) || 'Belum Diisi';
            const phone = findKeyVal(['no hp', 'no wa', 'telepon', 'kontak', 'hp', 'phone']);
            const password = findKeyVal(['password', 'sandi', 'pass']);
            const rawDept = findKeyVal(['kejuruan', 'departemen', 'kompetensi', 'jurusan']);
            const department = getFullDepartmentFromClassName(className) || getFullDepartmentFromClassName(rawDept) || rawDept || 'TKR (Teknik Kendaraan Ringan)';

            const existing = classes.find(c => normalizeClassName(c.name) === normalizeClassName(className));

            if (existing) {
              const updated: SchoolClass = {
                ...existing,
                homeroomTeacher: teacher,
                teacherPhone: phone || existing.teacherPhone,
                teacherPassword: password || existing.teacherPassword,
                department: department || existing.department,
              };
              onUpdateClass(updated);
              updatedCount++;
            } else {
              const newCls: SchoolClass = {
                id: `class-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
                name: className,
                department,
                homeroomTeacher: teacher,
                teacherPhone: phone || undefined,
                teacherPassword: password || undefined,
                totalStudents: 0,
              };
              onAddClass(newCls);
              addedCount++;
            }
          });

          setImportStatus({
            type: 'success',
            msg: `Impor berhasil! Ditambahkan: ${addedCount} rombel baru, Diperbarui: ${updatedCount} akun wali kelas.`
          });
        } catch (err: any) {
          setImportStatus({ type: 'error', msg: `Gagal membaca Excel: ${err.message}` });
        }
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      setImportStatus({ type: 'error', msg: `Gagal memuat modul excel: ${err.message}` });
    }
  };

  return (
    <div className="space-y-6" id="wali-kelas-manager-section">
      {/* Upper Information Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Management Wali Kelas & Pembagian Tour
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">Kontrol Akun, Kredensial & Pembagian Wali Kelas</h2>
          <p className="text-xs text-slate-500">
            Kelola kredensial akun wali kelas, pantau progres verifikasi angket, serta lihat ranking otomatis kepesertaan wali kelas ke Bali / Jogja.
          </p>
        </div>
      </div>

      {/* Sub-Tab Navigation Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 no-print">
        <button
          type="button"
          onClick={() => setActiveSubTab('CREDENTIALS')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'CREDENTIALS'
              ? 'bg-emerald-600 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Akses & Kredensial Akun Wali</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ALLOCATION')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'ALLOCATION'
              ? 'bg-emerald-600 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Pembagian Wali Ke Bali / Jogja & Ranking</span>
        </button>
      </div>

      {/* Sub Tab 2: ALLOCATION */}
      {activeSubTab === 'ALLOCATION' && (
        <WaliAllocationManager
          classes={classes}
          students={students}
          settings={settings}
          onUpdateClass={onUpdateClass}
          onUpdateSettings={onUpdateSettings}
        />
      )}

      {/* Sub Tab 1: CREDENTIALS */}
      {activeSubTab === 'CREDENTIALS' && (
        <>

      {/* Print only Header */}
      <div className="p-4 border-b border-slate-100 hidden print:block">
        <h3 className="font-extrabold text-lg text-slate-900">REKAP KREDENSIAL DAN PARTISIPASI WALI KELAS</h3>
        <p className="text-xs text-slate-600">TOTAL DATA: {filteredList.length} WALI KELAS</p>
      </div>

      {/* Stats Cards - Standard 2-Col Mobile / 4-Col Desktop Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 truncate">Total Wali Kelas</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-3xl font-black text-slate-900">{totalWaliKelas}</span>
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold">Rombel</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 sm:mt-3 overflow-hidden">
            <div className="bg-blue-600 h-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-600 truncate">Tuntas (≥{threshold}%)</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-3xl font-black text-emerald-600">{completedCount}</span>
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold">Wali</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 sm:mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full" 
              style={{ width: `${totalWaliKelas > 0 ? (completedCount / totalWaliKelas) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-600 truncate">Belum (&lt;{threshold}%)</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-3xl font-black text-amber-600">{incompleteCount}</span>
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold">Wali</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 sm:mt-3 overflow-hidden">
            <div 
              className="bg-amber-500 h-full" 
              style={{ width: `${totalWaliKelas > 0 ? (incompleteCount / totalWaliKelas) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 truncate">Kontak WA Ada</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-3xl font-black text-slate-800">{withPhoneCount}</span>
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold truncate">({totalWaliKelas > 0 ? Math.round((withPhoneCount / totalWaliKelas) * 100) : 0}%)</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 sm:mt-3 overflow-hidden">
            <div 
              className="bg-slate-700 h-full" 
              style={{ width: `${totalWaliKelas > 0 ? (withPhoneCount / totalWaliKelas) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Control Filters */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama wali kelas, kelas diampu, atau nomor HP..."
        activeFilters={filters}
        onFilterChange={setFilters}
        onClearFilters={handleClearFilters}
        onPrint={handlePrint}
        onExportExcel={handleExportExcel}
        filters={[
          {
            key: 'status',
            label: 'Status Verifikasi',
            placeholder: 'Semua Status',
            options: [
              { value: 'COMPLETED', label: 'Tuntas Verifikasi' },
              { value: 'INCOMPLETE', label: 'Belum Tuntas' },
            ],
          },
        ]}
        extraActions={
          <button
            type="button"
            onClick={() => {
              setImportStatus({ type: '', msg: '' });
              setIsImportOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 whitespace-nowrap active:scale-[0.98]"
            title="Import Kredensial Akun Wali Kelas dari File Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Import Excel</span>
          </button>
        }
      />

      {/* Wali Kelas Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4" id="wali-kelas-grid">
        {paginatedData.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">Tidak ada Wali Kelas yang cocok</p>
            <p className="text-xs text-slate-400">Cobalah menyesuaikan kata kunci pencarian atau filter status Anda.</p>
          </div>
        ) : (
          paginatedData.map((item) => {
            const username = `wali_${item.name.replace(/\s+/g, '_').toLowerCase()}`;
            const isPasswordCustom = !!item.teacherPassword;
            const password = item.teacherPassword || 'wali123';
            const isShow = !!showPasswordMap[item.id];

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all group relative"
              >
                {/* Header info */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm leading-snug">
                        {item.homeroomTeacher}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        Wali Kelas {item.name}
                      </p>
                    </div>

                    {/* Status Badge */}
                    {item.isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> TUNTAS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" /> BELUM TUNTAS
                      </span>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 pt-3 space-y-2.5 text-xs">
                    {/* Class Info */}
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-semibold">Kelas yang Diampu:</span>
                      <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-xs border border-slate-200">
                        {item.name}
                      </span>
                    </div>

                    {/* Department Info */}
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-semibold">Kompetensi Keahlian:</span>
                      <span className="font-bold text-slate-800 text-[11px]">
                        {item.department}
                      </span>
                    </div>

                    {/* Phone Info */}
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-semibold">No. Kontak WA:</span>
                      {item.teacherPhone ? (
                        <a
                          href={formatWhatsAppLink(item.teacherPhone, `Halo Pak/Bu ${item.homeroomTeacher}`)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{item.teacherPhone}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-rose-500 font-bold italic text-[11px]">Belum Diisi</span>
                      )}
                    </div>

                    {/* Authentication details */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 mt-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-bold">Username:</span>
                        <code className="bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-mono text-[10px] font-semibold">
                          {username}
                        </code>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-bold">Password:</span>
                        <div className="flex items-center gap-1.5">
                          <code className="bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-mono text-[10px] font-semibold">
                            {isShow ? password : '••••••••'}
                          </code>
                          <button
                            onClick={() => togglePasswordVisibility(item.id)}
                            className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer no-print"
                            title={isShow ? 'Sembunyikan' : 'Tampilkan'}
                          >
                            {isShow ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-400 pt-0.5 border-t border-slate-200/60 flex items-center justify-between">
                        <span>Sifat Password:</span>
                        <span className={`font-black ${isPasswordCustom ? 'text-indigo-600' : 'text-slate-500'}`}>
                          {isPasswordCustom ? 'Kustom (Admin)' : 'Default (wali123)'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Partisipasi Angket:</span>
                        <span className={`${item.isCompleted ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {item.registeredCount} / {item.totalCount} Siswa ({item.percentage}% )
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/80">
                        <div 
                          className={`h-full transition-all duration-500 ${item.isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 no-print">
                  <button
                    onClick={() => handleResetPassword(item)}
                    disabled={!isPasswordCustom}
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 cursor-pointer text-[11px] font-bold flex items-center gap-1"
                    title="Reset Password ke default (wali123)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Pass</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-slate-200 flex items-center gap-1 cursor-pointer text-[11px] font-bold"
                      title="Edit Akun & Kelas"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleShareCredentials(item)}
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all flex items-center gap-1 cursor-pointer text-[11px] font-bold shadow-xs"
                      title="Kirim kredensial login via WhatsApp"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim WA</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pt-2">
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={totalPages}
            totalItems={filteredList.length}
            pageSize={pagination.pageSize}
            onPageChange={handlePageChange}
            itemName="wali kelas"
          />
        </div>
      )}
      </>
      )}

      {/* Modal Edit Account & Class */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profil & Akses Wali Kelas"
        subtitle={`Mengelola kredensial dan kelas diampu untuk ${selectedClass?.homeroomTeacher}`}
        maxWidth="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap Wali Kelas *
            </label>
            <input
              type="text"
              required
              value={formTeacherName}
              onChange={(e) => setFormTeacherName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Siti Aminah, S.Pd."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rombel / Kelas Diampu *
              </label>
              <input
                type="text"
                required
                value={formClassName}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormClassName(val);
                  const autoDept = getFullDepartmentFromClassName(val);
                  if (autoDept) {
                    setFormDepartment(autoDept);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: XII TKR 1"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kejuruan / Departemen</label>
              <select
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
              >
                <option value="TKR (Teknik Kendaraan Ringan)">TKR (Teknik Kendaraan Ringan)</option>
                <option value="TAB (Teknik Alat Berat)">TAB (Teknik Alat Berat)</option>
                <option value="TPM (Teknik Pemesinan)">TPM (Teknik Pemesinan)</option>
                <option value="TPL (Teknik Pengelasan)">TPL (Teknik Pengelasan)</option>
                <option value="TBSM (Teknik Bisnis Sepeda Motor)">TBSM (Teknik Bisnis Sepeda Motor)</option>
                <option value="TBKR (Teknik Bodi Kendaraan Ringan)">TBKR (Teknik Bodi Kendaraan Ringan)</option>
                <option value="TKJ (Teknik Komputer Jaringan)">TKJ (Teknik Komputer Jaringan)</option>
                <option value="RPL (Rekayasa Perangkat Lunak)">RPL (Rekayasa Perangkat Lunak)</option>
                <option value="DKV (Desain Komunikasi Visual)">DKV (Desain Komunikasi Visual)</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              No. HP / WA Aktif
            </label>
            <input
              type="text"
              value={formTeacherPhone}
              onChange={(e) => setFormTeacherPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
              placeholder="0812xxxxxxxx"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Digunakan untuk pengiriman otomatis kredensial via tombol WA share.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Password Akun (Kosongkan untuk Default: wali123)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={formTeacherPassword}
                onChange={(e) => setFormTeacherPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="Misal: passwordrahasia, waliXII1"
              />
            </div>
            <p className="text-[10px] text-indigo-500 mt-1 font-medium">
              *Jika diisi, wali kelas terkait login menggunakan password kustom ini. Jika dikosongkan, login kembali menggunakan password default &apos;wali123&apos;.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Simpan Perubahan Akun
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Import Excel */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Akun Wali Kelas"
        subtitle="Unduh/unggah spreadsheet data akun wali kelas untuk integrasi cepat"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-extrabold">Panduan Kolom Import:</p>
              <p className="font-medium leading-relaxed">
                Spreadsheet harus memuat header baris pertama berikut:
                <strong> Kelas </strong>, 
                <strong> Wali Kelas </strong>, 
                <strong> No HP </strong> / <strong> Kontak </strong> (opsional), 
                <strong> Password </strong> (opsional).
                <br />
                Jika nama kelas sudah terdaftar, sistem akan melakukan <strong>sinkronisasi & update</strong> data nomor HP serta custom password baru.
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 transition-colors relative flex flex-col items-center justify-center text-center cursor-pointer">
            <input
              type="file"
              accept=".xlsx,.xls,.ods"
              onChange={handleImportExcel}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-xs font-extrabold text-slate-800">Seret file Excel kredensial di sini</p>
            <p className="text-[10px] text-slate-400 mt-1">XLSX, XLS, ODS up to 10MB</p>
          </div>

          {importStatus.type && (
            <div className={`p-3.5 rounded-xl text-xs font-bold border ${
              importStatus.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
              importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              {importStatus.msg}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsImportOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
