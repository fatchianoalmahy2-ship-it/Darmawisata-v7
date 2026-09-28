import React, { useState, useMemo } from 'react';
import { SchoolClass, Student, Bus, AppSettings, Chaperone, ChaperoneRole } from '@/types';
import { calculateWaliAllocation } from '@/lib/waliAllocation';
import { autoAssignChaperonesToBuses } from '@/lib/chaperoneAllocator';
import { 
  Users, 
  PieChart as PieChartIcon, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  Sparkles,
  Phone,
  Search,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  Upload,
  Download
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getAllDerivedChaperones } from '@/lib/utils';

interface ChaperoneManagerProps {
  students: Student[];
  classes: SchoolClass[];
  buses: Bus[];
  settings: AppSettings;
  onSaveSettings?: (settings: AppSettings) => Promise<void>;
}

export const ChaperoneManager: React.FC<ChaperoneManagerProps> = ({
  students,
  classes,
  buses,
  settings,
  onSaveSettings
}) => {
  const [activeTab, setActiveTab] = useState<'ALLOCATION' | 'MASTER_DATA' | 'ANALYTICS'>('ALLOCATION');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  
  // Modal State for CRUD Chaperones
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChaperoneId, setEditingChaperoneId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<ChaperoneRole>('PANITIA');
  const [formDept, setFormDept] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formGender, setFormGender] = useState<'LAKI-LAKI' | 'PEREMPUAN'>('LAKI-LAKI');
  const [isSaving, setIsSaving] = useState(false);

  // Calculate Wali Allocation Analytics
  const waliAlloc = useMemo(() => calculateWaliAllocation(classes, students, settings, 'PERCENTAGE'), [classes, students, settings]);
  const busesToProcess = buses.filter((b) => b.wave.startsWith('BALI'));
  
  const totalBuses = busesToProcess.length;
  const vacantOption = settings.busVacantSeats || (settings.busReserveFront === false ? 'none' : '1-2');
  const chaperoneSeats = vacantOption === 'none' ? 0 : vacantOption === '1-4' ? 4 : 2;
  const prioritySeatsPerBus = 2;
  const manualSeatsPerBus = Math.max(0, chaperoneSeats - prioritySeatsPerBus);

  const masterChaperones = useMemo(() => settings.masterChaperones || [], [settings.masterChaperones]);

  // Dynamically merge masterChaperones with any homeroom teachers from classes that are not in masterChaperones
  const allChaperones = useMemo(() => {
    return getAllDerivedChaperones(masterChaperones, classes);
  }, [masterChaperones, classes]);

  // Map of chaperone ID / Name to Bus Assignment
  const chaperoneAssignmentMap = useMemo(() => {
    const map: { [chaperoneIdOrName: string]: string } = {};
    const guides = settings.customBusGuides || {};
    Object.entries(guides).forEach(([busId, g]) => {
      const bus = buses.find(b => b.id === busId);
      const label = bus ? `Bus ${bus.busNumber}` : busId;
      if (g.guide1) {
        map[g.guide1] = label;
        const chap = allChaperones.find(c => c.id === g.guide1);
        if (chap) map[chap.name] = label;
      }
      if (g.guide2) {
        map[g.guide2] = label;
        const chap = allChaperones.find(c => c.id === g.guide2);
        if (chap) map[chap.name] = label;
      }
      if (g.guide3) {
        map[g.guide3] = label;
        const chap = allChaperones.find(c => c.id === g.guide3);
        if (chap) map[chap.name] = label;
      }
      if (g.guide4) {
        map[g.guide4] = label;
        const chap = allChaperones.find(c => c.id === g.guide4);
        if (chap) map[chap.name] = label;
      }
    });

    // Also include customChaperoneSeats
    const customSeats = settings.customChaperoneSeats || {};
    Object.entries(customSeats).forEach(([key, chapVal]) => {
      if (!chapVal || chapVal === '__STUDENT__' || chapVal === '__NONE__' || chapVal === '') return;
      const busMatch = key.match(/bus-(\d+)/i);
      const label = busMatch ? `Bus ${busMatch[1]}` : 'Bus';
      map[chapVal] = label;
      const chap = allChaperones.find(c => c.id === chapVal);
      if (chap) map[chap.name] = label;
    });

    return map;
  }, [settings.customBusGuides, settings.customChaperoneSeats, buses, allChaperones]);

  // --- SAVE UPDATED SETTINGS HELPER ---
  const saveSettingsUpdate = async (updates: Partial<AppSettings>) => {
    setIsSaving(true);
    try {
      const newSettings = { ...settings, ...updates };
      if (onSaveSettings) {
        await onSaveSettings(newSettings);
      } else {
        throw new Error('onSaveSettings function is not provided.');
      }
    } catch (err) {
      console.error('Gagal menyimpan perubahan:', err);
      alert('Gagal menyimpan data ke server. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- IMPORT & EXPORT HANDLERS ---
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportChaperones = async () => {
    try {
      const dataToExport = masterChaperones.map((c, idx) => ({
        No: idx + 1,
        'Nama Lengkap': c.name,
        'Peran/Jabatan': c.role,
        'Unit/Jurusan/Kelas': c.department || '',
        'No WhatsApp': c.phone || '',
        'Catatan Khusus': c.notes || ''
      }));
      const { ExcelService } = await import('@/services/excelService');
      await ExcelService.exportToExcel(dataToExport, 'Daftar_Pendamping_Wisata', 'Pendamping');
    } catch (err) {
      console.error(err);
      alert('Gagal mengekspor data.');
    }
  };

  const handleImportChaperonesExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { ExcelService } = await import('@/services/excelService');
      const rawData = await ExcelService.importExcel<any>(file);

      if (!rawData || rawData.length === 0) {
        alert('File Excel kosong atau format tidak sesuai.');
        return;
      }

      const validRoles: ChaperoneRole[] = ['WALI_KELAS', 'KAKOMLI', 'STAFF', 'PANITIA', 'MEDIS', 'TOUR_LEADER', 'LAINNYA'];
      const newChaps: Chaperone[] = [];

      rawData.forEach((row, idx) => {
        const nameVal = row['Nama Lengkap'] || row['Nama'] || row['nama'] || row['name'] || '';
        if (!nameVal || typeof nameVal !== 'string' || !nameVal.trim()) return;

        let rawRole = (row['Peran/Jabatan'] || row['Peran'] || row['Jabatan'] || row['role'] || 'PANITIA') as string;
        rawRole = rawRole.trim().toUpperCase().replace(' ', '_');
        
        let roleVal: ChaperoneRole = 'PANITIA';
        if (rawRole.includes('WALI') || rawRole.includes('HOMEROOM')) {
          roleVal = 'WALI_KELAS';
        } else if (rawRole.includes('KAKOMLI') || rawRole.includes('KEPALA')) {
          roleVal = 'KAKOMLI';
        } else if (rawRole.includes('MEDIS') || rawRole.includes('P3K') || rawRole.includes('DOKTER') || rawRole.includes('PERAWAT')) {
          roleVal = 'MEDIS';
        } else if (rawRole.includes('TOUR') || rawRole.includes('TL') || rawRole.includes('GUIDE')) {
          roleVal = 'TOUR_LEADER';
        } else if (rawRole.includes('STAFF') || rawRole.includes('KARYAWAN') || rawRole.includes('GURU') || rawRole.includes('TATA')) {
          roleVal = 'STAFF';
        } else if (validRoles.includes(rawRole as ChaperoneRole)) {
          roleVal = rawRole as ChaperoneRole;
        }

        const deptVal = row['Unit/Jurusan/Kelas'] || row['Unit'] || row['Jurusan'] || row['Kelas'] || row['department'] || '';
        const phoneVal = row['No WhatsApp'] || row['No HP'] || row['Telepon'] || row['phone'] || '';
        const notesVal = row['Catatan Khusus'] || row['Catatan'] || row['Notes'] || row['notes'] || '';

        newChaps.push({
          id: `chap-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          name: nameVal.trim(),
          role: roleVal,
          department: String(deptVal).trim(),
          phone: String(phoneVal).trim(),
          notes: String(notesVal).trim()
        });
      });

      if (newChaps.length === 0) {
        alert('Tidak ditemukan data pendamping yang valid di dalam file Excel. Pastikan terdapat kolom "Nama Lengkap" atau "Nama".');
        return;
      }

      if (confirm(`Ditemukan ${newChaps.length} data pendamping dari file Excel. Gabungkan ke data yang sudah ada?`)) {
        const updatedList = [...masterChaperones, ...newChaps];
        await saveSettingsUpdate({ masterChaperones: updatedList });
        alert(`Berhasil mengimpor ${newChaps.length} pendamping baru!`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengimpor file Excel: ' + err.message);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // --- CRUD HANDLERS FOR MASTER CHAPERONES ---
  const handleOpenAddModal = () => {
    setEditingChaperoneId(null);
    setFormName('');
    setFormRole('PANITIA');
    setFormDept('');
    setFormPhone('');
    setFormNotes('');
    setFormGender('LAKI-LAKI');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (chap: Chaperone) => {
    setEditingChaperoneId(chap.id);
    setFormName(chap.name);
    setFormRole(chap.role);
    setFormDept(chap.department || '');
    setFormPhone(chap.phone || '');
    setFormNotes(chap.notes || '');
    setFormGender((chap.gender as 'LAKI-LAKI' | 'PEREMPUAN') || 'LAKI-LAKI');
    setIsModalOpen(true);
  };

  const handleSaveChaperone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Nama pendamping wajib diisi!');
      return;
    }

    let updatedList: Chaperone[];
    if (editingChaperoneId) {
      updatedList = masterChaperones.map(c => 
        c.id === editingChaperoneId
          ? { ...c, name: formName.trim(), role: formRole, department: formDept.trim(), phone: formPhone.trim(), notes: formNotes.trim(), gender: formGender }
          : c
      );
    } else {
      const newChap: Chaperone = {
        id: `chap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: formName.trim(),
        role: formRole,
        department: formDept.trim(),
        phone: formPhone.trim(),
        notes: formNotes.trim(),
        gender: formGender
      };
      updatedList = [...masterChaperones, newChap];
    }

    await saveSettingsUpdate({ masterChaperones: updatedList });
    setIsModalOpen(false);
  };

  const handleDeleteChaperone = async (id: string, name: string) => {
    if (!confirm(`Hapus pendamping "${name}" dari Master Data?`)) return;
    const updatedList = masterChaperones.filter(c => c.id !== id);
    await saveSettingsUpdate({ masterChaperones: updatedList });
  };

  // Import Homeroom Teachers from Classes
  const handleImportHomeroomTeachers = async () => {
    if (!classes || classes.length === 0) {
      alert('Gagal Sinkronisasi: Tidak ditemukan data kelas di Data Induk. Silakan unggah/buat data kelas terlebih dahulu di tab Data Induk > Manajemen Kelas.');
      return;
    }

    const classesWithTeacher = classes.filter(cls => cls.homeroomTeacher && cls.homeroomTeacher.trim());
    if (classesWithTeacher.length === 0) {
      alert(`Ditemukan ${classes.length} kelas di Data Induk, tetapi seluruh kolom "Wali Kelas" masih kosong.\n\nSilakan atur atau impor nama Wali Kelas di menu "Data Induk" > tab "Manajemen Kelas" terlebih dahulu sebelum melakukan sinkronisasi.`);
      return;
    }

    const existingNames = new Set(masterChaperones.map(c => c.name.toLowerCase().trim()));
    const newChaperones: Chaperone[] = [];

    classesWithTeacher.forEach(cls => {
      const teacherName = cls.homeroomTeacher!.trim();
      if (!existingNames.has(teacherName.toLowerCase())) {
        existingNames.add(teacherName.toLowerCase());
        newChaperones.push({
          id: `chap-wali-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: teacherName,
          role: 'WALI_KELAS',
          department: cls.name,
          phone: cls.teacherPhone || '',
          notes: `Wali Kelas ${cls.name}`
        });
      }
    });

    if (newChaperones.length === 0) {
      alert(`Semua Wali Kelas (${classesWithTeacher.length} orang) dari Data Induk sudah terdaftar di Master Pendamping!`);
      return;
    }

    if (confirm(`Berhasil memindai Data Induk:\n- Total Kelas: ${classes.length}\n- Kelas terisi Wali Kelas: ${classesWithTeacher.length}\n- Wali Kelas baru ditemukan: ${newChaperones.length}\n\nTambahkan ${newChaperones.length} Wali Kelas baru ini ke Master Pendamping?`)) {
      const updatedList = [...masterChaperones, ...newChaperones];
      await saveSettingsUpdate({ masterChaperones: updatedList });
      alert(`Berhasil menyinkronkan ${newChaperones.length} Wali Kelas baru!`);
    }
  };

  // Helper to format chaperone option with wave status and current assignment
  const getChaperoneOptionLabel = (chap: Chaperone, busWave: WaveType, currentBusNumber: number) => {
    const assignedToOther = chaperoneAssignmentMap[chap.id] || chaperoneAssignmentMap[chap.name];
    const isThisBus = assignedToOther === `Bus ${currentBusNumber}`;
    const isWaveMatch = !chap.assignedWave || chap.assignedWave === 'ALL' || chap.assignedWave === busWave;

    let prefix = '';
    if (chap.assignedWave && chap.assignedWave !== 'ALL') {
      prefix = isWaveMatch ? '✓ ' : '⚠️ ';
    }

    const roleText = `[${chap.role.replace('_', ' ')}]`;
    const deptText = chap.department ? ` - ${chap.department}` : '';
    const assignedText = assignedToOther && !isThisBus ? ` (${assignedToOther})` : '';
    const waveText = !isWaveMatch && chap.assignedWave ? ` [Beda Gel: ${chap.assignedWave === 'BALI_GEL_1' ? 'Gel 1' : chap.assignedWave === 'BALI_GEL_2' ? 'Gel 2' : 'Jogja'}]` : '';

    return `${prefix}${chap.name} ${roleText}${deptText}${waveText}${assignedText}`;
  };

  // --- DIRECT GUIDE ASSIGNMENT IN BUS CARDS ---
  const handleGuideSelect = async (busId: string, seatKey: 'guide1' | 'guide2' | 'guide3' | 'guide4', val: string) => {
    if (val) {
      const bus = buses.find(b => b.id === busId);
      const selectedChap = allChaperones.find(c => c.id === val || c.name === val);
      if (bus && selectedChap && selectedChap.assignedWave && selectedChap.assignedWave !== 'ALL' && selectedChap.assignedWave !== bus.wave) {
        const waveLabel = selectedChap.assignedWave === 'BALI_GEL_1' ? 'Bali Gelombang 1' : selectedChap.assignedWave === 'BALI_GEL_2' ? 'Bali Gelombang 2' : 'Yogyakarta';
        const busWaveLabel = bus.wave === 'BALI_GEL_1' ? 'Bali Gelombang 1' : bus.wave === 'BALI_GEL_2' ? 'Bali Gelombang 2' : 'Yogyakarta';
        if (!confirm(`⚠️ Perhatian Bentrok Gelombang:\n\n${selectedChap.name} terdaftar pada alokasi: ${waveLabel},\nsedangkan Bus ${bus.busNumber} berada pada: ${busWaveLabel}.\n\nTetap tugaskan pendamping ini ke Bus ${bus.busNumber}?`)) {
          return;
        }
      }
    }

    const currentGuides = settings.customBusGuides || {};
    const busGuides = currentGuides[busId] || { guide1: '', guide2: '' };
    
    const updatedBusGuides = {
      ...currentGuides,
      [busId]: {
        ...busGuides,
        [seatKey]: val
      }
    };

    await saveSettingsUpdate({ customBusGuides: updatedBusGuides });
  };

  const handleClearBusGuides = async (busId: string, busNum: number) => {
    if (!confirm(`Bersihkan penugasan pendamping untuk Bus ${busNum}?`)) return;
    const currentGuides = { ...(settings.customBusGuides || {}) };
    delete currentGuides[busId];
    await saveSettingsUpdate({ customBusGuides: currentGuides });
  };

  // --- AUTO ASSIGNMENT HANDLER ---
  const handleAutoAssign = async () => {
    if (confirm('Jalankan pembagian pendamping otomatis berdasarkan jurusan dan kelas terbanyak di tiap bus? Lanjutkan?')) {
      const results = autoAssignChaperonesToBuses(buses, students, classes, settings);
      const newCustomBusGuides = { ...(settings.customBusGuides || {}) };
      
      for (const res of results) {
        newCustomBusGuides[res.busId] = {
          ...newCustomBusGuides[res.busId],
          guide1: res.guide1 || '',
          guide2: res.guide2 || '',
        };
      }
      
      await saveSettingsUpdate({ customBusGuides: newCustomBusGuides });
      alert('Berhasil mengalokasikan pendamping ke setiap armada bus secara otomatis!');
    }
  };

  // Filtered chaperones (including dynamic auto-synced)
  const filteredChaperones = useMemo(() => {
    return allChaperones.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (c.department && c.department.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole = roleFilter === 'ALL' || c.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [allChaperones, searchQuery, roleFilter]);

  return (
    <div className="space-y-6 animate-fade-in" id="chaperone-manager-section">
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 mb-1">
            <Users className="w-3.5 h-3.5 text-fuchsia-600" /> Manajemen Pendamping & Tim Lapangan
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-800">
            Alokasi & Master SDM Pendamping Bus
          </h2>
          <p className="text-xs text-slate-500">
            Kelola data induk pendamping, Kakomli, Wali Kelas, serta atur penempatan kursi pendamping bus secara langsung.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'ALLOCATION' && (
            <button
              onClick={handleAutoAssign}
              disabled={isSaving}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              title="Otomatis tempatkan Kakomli & Wali Kelas ke bus siswanya"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>⚡ Auto-Assign Pendamping</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tambah Pendamping</span>
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setActiveTab('ALLOCATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ALLOCATION' ? 'bg-white text-fuchsia-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Penugasan Bus
            </button>
            <button
              onClick={() => setActiveTab('MASTER_DATA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'MASTER_DATA' ? 'bg-white text-fuchsia-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Master Data ({masterChaperones.length})
            </button>
            <button
              onClick={() => setActiveTab('ANALYTICS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ANALYTICS' ? 'bg-white text-fuchsia-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Analitik Wali Kelas
            </button>
          </div>
        </div>
      </div>

      {/* --- TAB 1: ALLOCATION & DIRECT DROPDOWN ASSIGNMENT --- */}
      {activeTab === 'ALLOCATION' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-fuchsia-500/20 text-fuchsia-300 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-fuchsia-300">
                  Penugasan Kursi Pendamping Bus (Direct Interactive CRUD)
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Pilih pendamping dari dropdown di tiap kartu bus. Perubahan langsung tersimpan ke sistem & dokumen cetak!
                </p>
              </div>
            </div>
            <button
              onClick={handleImportHomeroomTeachers}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Impor Wali Kelas ke Master</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {busesToProcess.map(bus => {
              const customGuide = settings.customBusGuides?.[bus.id] || { guide1: '', guide2: '' };
              const g1 = customGuide.guide1 || '';
              const g2 = customGuide.guide2 || '';
              const g3 = customGuide.guide3 || '';
              const g4 = customGuide.guide4 || '';

              const hasAnyGuide = g1 || g2 || g3 || g4;

              return (
                <div key={bus.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-3 hover:border-fuchsia-200 transition-all">
                  <div>
                    {/* Bus Card Top Info */}
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-2xs">
                          {bus.busNumber}
                        </span>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm">Bus {bus.busNumber}</h4>
                          <span className="text-[10px] font-bold text-fuchsia-600 bg-fuchsia-50 px-2 py-0.5 rounded-md border border-fuchsia-100">
                            {bus.wave.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Siswa Terisi</span>
                        <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                          {(bus as any).studentCount || bus.assignedStudentIds?.length || 0} / {bus.capacity}
                        </span>
                      </div>
                    </div>

                    {/* Guide Dropdowns Section */}
                    <div className="space-y-2.5 pt-3">
                      {/* Kursi 1 */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                            Kursi 1 (Pendamping Utama / Kakomli)
                          </label>
                        </div>
                        <select
                          value={g1}
                          onChange={(e) => handleGuideSelect(bus.id, 'guide1', e.target.value)}
                          disabled={isSaving}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-fuchsia-500 focus:bg-white cursor-pointer"
                        >
                          <option value="">-- Kosong (Belum Ditentukan) --</option>
                          {allChaperones.map((chap) => (
                            <option key={chap.id} value={chap.id}>
                              {getChaperoneOptionLabel(chap, bus.wave, bus.busNumber)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Kursi 2 */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                            Kursi 2 (Wali Kelas / Pendamping)
                          </label>
                        </div>
                        <select
                          value={g2}
                          onChange={(e) => handleGuideSelect(bus.id, 'guide2', e.target.value)}
                          disabled={isSaving}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-fuchsia-500 focus:bg-white cursor-pointer"
                        >
                          <option value="">-- Kosong (Belum Ditentukan) --</option>
                          {allChaperones.map((chap) => (
                            <option key={chap.id} value={chap.id}>
                              {getChaperoneOptionLabel(chap, bus.wave, bus.busNumber)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Kursi 3 & 4 (If Manual Seats > 0) */}
                      {manualSeatsPerBus > 0 && (
                        <>
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                              Kursi 3 (Pendamping Tambahan)
                            </label>
                            <select
                              value={g3}
                              onChange={(e) => handleGuideSelect(bus.id, 'guide3', e.target.value)}
                              disabled={isSaving}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-fuchsia-500 focus:bg-white cursor-pointer"
                            >
                              <option value="">-- Kosong --</option>
                              {allChaperones.map((chap) => (
                                <option key={chap.id} value={chap.id}>
                                  {getChaperoneOptionLabel(chap, bus.wave, bus.busNumber)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                              Kursi 4 (Pendamping Tambahan)
                            </label>
                            <select
                              value={g4}
                              onChange={(e) => handleGuideSelect(bus.id, 'guide4', e.target.value)}
                              disabled={isSaving}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-fuchsia-500 focus:bg-white cursor-pointer"
                            >
                              <option value="">-- Kosong --</option>
                              {allChaperones.map((chap) => (
                                <option key={chap.id} value={chap.id}>
                                  {getChaperoneOptionLabel(chap, bus.wave, bus.busNumber)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Quick Actions */}
                  {hasAnyGuide && (
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleClearBusGuides(bus.id, bus.busNumber)}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Bersihkan Penugasan Bus Ini</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 2: MASTER DATA CRUD MANAGEMENT --- */}
      {activeTab === 'MASTER_DATA' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-1 items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama pendamping atau jurusan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-fuchsia-500 cursor-pointer"
              >
                <option value="ALL">Semua Peran / Role</option>
                <option value="KAKOMLI">Kakomli (Kepala Kompetensi)</option>
                <option value="WALI_KELAS">Wali Kelas</option>
                <option value="PANITIA">Panitia Lapangan</option>
                <option value="MEDIS">Tim Medis / P3K</option>
                <option value="STAFF">Staff / Karyawan</option>
                <option value="TOUR_LEADER">Tour Leader</option>
                <option value="LAINNYA">Lainnya</option>
              </select>

              <button
                onClick={handleImportHomeroomTeachers}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Impor Wali Kelas dari Data Induk ke Master"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Impor Wali Kelas</span>
                <span className="sm:hidden">Sync Wali</span>
              </button>

              {/* Import Excel */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Impor Pendamping dari file Excel (.xlsx)"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Impor Excel</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleImportChaperonesExcel}
              />

              {/* Export Excel */}
              <button
                onClick={handleExportChaperones}
                disabled={masterChaperones.length === 0}
                className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                title="Ekspor Pendamping ke file Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Excel</span>
              </button>
            </div>
          </div>

          {/* Master List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChaperones.map((chap) => {
              const assignedBus = chaperoneAssignmentMap[chap.id] || chaperoneAssignmentMap[chap.name];
              const isAutoSynced = chap.isAutoSynced || chap.id.startsWith('chap-wali-auto-');

              return (
                <div key={chap.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-all">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{chap.name}</h4>
                        <div className="flex flex-wrap gap-1 items-center mt-1">
                          <span className="inline-block px-2 py-0.5 bg-fuchsia-50 text-fuchsia-700 text-[10px] font-extrabold rounded-md border border-fuchsia-100">
                            {chap.role.replace('_', ' ')}
                          </span>
                          {isAutoSynced && (
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black rounded-md border border-indigo-100">
                              Sinkron Otomatis (Data Induk)
                            </span>
                          )}
                        </div>
                      </div>
                      {assignedBus ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          {assignedBus}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-md border border-slate-200 shrink-0">
                          Standby
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 mt-2">
                      {chap.department && (
                        <p className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-400 text-[10px] uppercase">Unit/Kelas:</span>
                          <span className="font-bold text-slate-700">{chap.department}</span>
                        </p>
                      )}
                      {chap.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span className="font-semibold text-slate-700">{chap.phone}</span>
                        </p>
                      )}
                      {chap.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg mt-1 border border-slate-100">
                          &quot;{chap.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">ID: {chap.id.substring(0, 8)}</span>
                    {isAutoSynced ? (
                      <span className="text-[10px] text-indigo-600 font-extrabold italic bg-indigo-50/50 px-2 py-0.5 rounded-md border border-indigo-100/50">
                        Ubah di Data Induk Kelas
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(chap)}
                          className="p-1.5 text-slate-600 hover:text-fuchsia-600 hover:bg-fuchsia-50 rounded-lg transition-all cursor-pointer"
                          title="Edit Data Pendamping"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteChaperone(chap.id, chap.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Hapus Pendamping"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredChaperones.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
                <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Tidak ada pendamping ditemukan</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Klik &quot;+ Tambah Pendamping&quot;, &quot;Impor Wali Kelas&quot;, atau &quot;Impor Excel&quot; untuk mengisi data.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: ANALYTICS WALI KELAS LEADERBOARD --- */}
      {activeTab === 'ANALYTICS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-slate-500" />
                Parameter Kuota
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-600">Total Bus (Bali)</span>
                  <span className="text-sm font-bold text-slate-900">{totalBuses} Armada</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-600">Total Kursi Prioritas</span>
                  <span className="text-sm font-bold text-slate-900">{totalBuses * prioritySeatsPerBus} Kursi</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-600">Total Kakomli (VIP)</span>
                  <span className="text-sm font-bold text-fuchsia-600">
                    {masterChaperones.filter(c => c.role === 'KAKOMLI').length} Orang
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-600">Kuota Wali Kelas Bali</span>
                  <span className="text-sm font-bold text-emerald-600">{waliAlloc.totalQuotaWaliBali} Kursi</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-600">Status Kursi Extra (Manual)</span>
                  <span className="text-sm font-bold text-slate-900">{manualSeatsPerBus} Kursi / Bus</span>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-xs text-amber-900">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Catatan Sistem Penataan
              </h3>
              <p className="text-xs leading-relaxed">
                Penempatan Kakomli diprioritaskan di bus dengan jumlah siswa jurusan terbanyak. Wali Kelas ditempatkan di bus dengan jumlah siswa kelasnya terbanyak.
              </p>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Leaderboard Partisipasi Wali Kelas (Ranking)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase">
                    <tr>
                      <th className="p-3 rounded-tl-lg">Kelas</th>
                      <th className="p-3">Wali Kelas</th>
                      <th className="p-3 text-center">Partisipasi</th>
                      <th className="p-3">Status Dropdown</th>
                      <th className="p-3 rounded-tr-lg">Keputusan Sistem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {waliAlloc.items.map((w) => (
                      <tr key={w.classId} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">{w.className}</td>
                        <td className="p-3 font-medium">{w.homeroomTeacher}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full font-bold ${w.baliPercentage >= settings.waliKelasParticipationThreshold ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {w.baliPercentage}%
                          </span>
                        </td>
                        <td className="p-3">
                          {w.manualWaliDestination === 'NOT_PARTICIPATING' ? (
                            <span className="text-red-500 font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" /> Izin / Tidak Ikut</span>
                          ) : w.manualWaliDestination === 'YOGYAKARTA' ? (
                            <span className="text-amber-600 font-semibold flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Jogja</span>
                          ) : w.manualWaliDestination === 'BALI_GEL_1' || w.manualWaliDestination === 'BALI_GEL_2' ? (
                            <span className="text-blue-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Kunci Bali</span>
                          ) : (
                            <span className="text-slate-500">AUTO</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`font-bold ${w.finalStatus.startsWith('BALI') ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {w.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT CHAPERONE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingChaperoneId ? '✏️ Edit Data Pendamping' : '➕ Tambah Pendamping Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveChaperone} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Indah Setyaningrum, S.Pd"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-fuchsia-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                <select
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value as 'LAKI-LAKI' | 'PEREMPUAN')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-fuchsia-500 cursor-pointer outline-none"
                >
                  <option value="LAKI-LAKI">Laki-Laki</option>
                  <option value="PEREMPUAN">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Peran / Jabatan</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as ChaperoneRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-fuchsia-500 cursor-pointer outline-none"
                >
                  <option value="KAKOMLI">Kakomli (Kepala Kompetensi Keahlian)</option>
                  <option value="WALI_KELAS">Wali Kelas</option>
                  <option value="PANITIA">Panitia Lapangan</option>
                  <option value="MEDIS">Tim Medis / P3K</option>
                  <option value="STAFF">Staff / Karyawan</option>
                  <option value="TOUR_LEADER">Tour Leader</option>
                  <option value="LAINNYA">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unit / Jurusan / Kelas</label>
                <input
                  type="text"
                  placeholder="Misal: TAB, XII TKJ 1, Kesiswaan"
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-fuchsia-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                <input
                  type="text"
                  placeholder="Misal: 081234567890"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-fuchsia-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Khusus</label>
                <textarea
                  rows={2}
                  placeholder="Misal: Membawa perlengkapan P3K / Penanggung jawab Bus 1"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-fuchsia-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-fuchsia-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Simpan Pendamping</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
