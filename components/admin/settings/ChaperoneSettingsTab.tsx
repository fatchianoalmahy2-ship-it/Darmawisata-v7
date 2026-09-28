import React, { useState } from 'react';
import { AppSettings, SchoolClass, Chaperone, ChaperoneRole } from '@/types';
import { Users, Search, Plus, Edit2, Trash2, Phone, RotateCcw, UserPlus } from 'lucide-react';

interface ChaperoneSettingsTabProps {
  formData: AppSettings;
  setFormData: React.Dispatch<React.SetStateAction<AppSettings>>;
  classesList?: SchoolClass[];
}

export const ChaperoneSettingsTab: React.FC<ChaperoneSettingsTabProps> = ({
  formData,
  setFormData,
  classesList = [],
}) => {
  const [chaperoneSearch, setChaperoneSearch] = useState('');
  const [chaperoneRoleFilter, setChaperoneRoleFilter] = useState<string>('ALL');
  const [editingChaperoneId, setEditingChaperoneId] = useState<string | null>(null);
  const [isAddingChaperone, setIsAddingChaperone] = useState(false);
  const [chapForm, setChapForm] = useState<{
    name: string;
    role: ChaperoneRole;
    department: string;
    phone: string;
    notes: string;
  }>({
    name: '',
    role: 'WALI_KELAS',
    department: 'Umum',
    phone: '',
    notes: '',
  });

  const handleAutoPopulateChaperones = () => {
    const existing = formData.masterChaperones || [];
    const existingNames = new Set(existing.map((c) => c.name.toLowerCase().trim()));
    const newItems: Chaperone[] = [...existing];

    (classesList || []).forEach((cls) => {
      if (cls.homeroomTeacher && cls.homeroomTeacher !== 'Belum Ditentukan') {
        const trimmed = cls.homeroomTeacher.trim();
        if (!existingNames.has(trimmed.toLowerCase())) {
          existingNames.add(trimmed.toLowerCase());
          newItems.push({
            id: `chap-wali-${cls.id || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: trimmed,
            role: 'WALI_KELAS',
            department: cls.department || cls.name,
            phone: cls.teacherPhone || '',
            notes: `Wali Kelas ${cls.name}`,
          });
        }
      }
    });

    const ALL_DEPT_LIST = ['TSM', 'TKJ', 'DKV', 'RPL', 'TKR', 'TPM', 'TPL', 'TBKR', 'TAB'];
    ALL_DEPT_LIST.forEach((dept) => {
      const kakomliName = `Kakomli ${dept}`;
      if (!existingNames.has(kakomliName.toLowerCase())) {
        existingNames.add(kakomliName.toLowerCase());
        newItems.push({
          id: `chap-kakomli-${dept}`,
          name: `Bpk/Ibu ${kakomliName}`,
          role: 'KAKOMLI',
          department: dept,
          notes: `Ketua Kompetensi Keahlian ${dept}`,
        });
      }
    });

    const defaultStaff = [
      { name: 'Tim Kesiswaan / Pembina', role: 'STAFF' as ChaperoneRole, dept: 'Kesiswaan' },
      { name: 'Tim Medis & PMR', role: 'MEDIS' as ChaperoneRole, dept: 'Kesehatan' },
      { name: 'Panitia Utama Sekolah', role: 'PANITIA' as ChaperoneRole, dept: 'Panitia' },
    ];
    defaultStaff.forEach((stf, idx) => {
      if (!existingNames.has(stf.name.toLowerCase())) {
        existingNames.add(stf.name.toLowerCase());
        newItems.push({
          id: `chap-staff-${idx}`,
          name: stf.name,
          role: stf.role,
          department: stf.dept,
          notes: 'Pendamping Resmi Sekolah',
        });
      }
    });

    setFormData((prev) => ({
      ...prev,
      masterChaperones: newItems,
    }));
  };

  const handleSaveChaperone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapForm.name.trim()) return;

    const list = formData.masterChaperones || [];
    if (editingChaperoneId) {
      const updated = list.map((c) =>
        c.id === editingChaperoneId
          ? {
              ...c,
              name: chapForm.name.trim(),
              role: chapForm.role,
              department: chapForm.department.trim(),
              phone: chapForm.phone.trim(),
              notes: chapForm.notes.trim(),
            }
          : c
      );
      setFormData((prev) => ({ ...prev, masterChaperones: updated }));
      setEditingChaperoneId(null);
    } else {
      const newChap: Chaperone = {
        id: `chap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: chapForm.name.trim(),
        role: chapForm.role,
        department: chapForm.department.trim() || 'Umum',
        phone: chapForm.phone.trim(),
        notes: chapForm.notes.trim(),
      };
      setFormData((prev) => ({ ...prev, masterChaperones: [newChap, ...list] }));
    }

    setChapForm({ name: '', role: 'WALI_KELAS', department: 'Umum', phone: '', notes: '' });
    setIsAddingChaperone(false);
  };

  const handleEditChaperone = (chap: Chaperone) => {
    setEditingChaperoneId(chap.id);
    setIsAddingChaperone(true);
    setChapForm({
      name: chap.name,
      role: chap.role,
      department: chap.department || 'Umum',
      phone: chap.phone || '',
      notes: chap.notes || '',
    });
  };

  const handleDeleteChaperone = (chapId: string) => {
    const list = formData.masterChaperones || [];
    setFormData((prev) => ({
      ...prev,
      masterChaperones: list.filter((c) => c.id !== chapId),
    }));
  };

  const allChaperones = formData.masterChaperones || [];
  const filteredChaperones = allChaperones.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(chaperoneSearch.toLowerCase()) ||
      (c.department && c.department.toLowerCase().includes(chaperoneSearch.toLowerCase())) ||
      (c.phone && c.phone.includes(chaperoneSearch));
    const matchesRole = chaperoneRoleFilter === 'ALL' || c.role === chaperoneRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" /> Master Data Guru & Pendamping Resmi
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Daftar ini digunakan untuk pengalokasian kursi depan bus, kamar hotel, dan grup WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoPopulateChaperones}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Sinkron dari Kelas
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingChaperoneId(null);
              setChapForm({ name: '', role: 'WALI_KELAS', department: 'Umum', phone: '', notes: '' });
              setIsAddingChaperone(!isAddingChaperone);
            }}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Pendamping
          </button>
        </div>
      </div>

      {/* Form Add / Edit */}
      {isAddingChaperone && (
        <form onSubmit={handleSaveChaperone} className="p-4 bg-white rounded-xl border border-emerald-200 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
              {editingChaperoneId ? 'Edit Data Pendamping' : 'Tambah Pendamping Baru'}
            </span>
            <button
              type="button"
              onClick={() => setIsAddingChaperone(false)}
              className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
            >
              Tutup
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
              <input
                type="text"
                required
                value={chapForm.name}
                onChange={(e) => setChapForm({ ...chapForm, name: e.target.value })}
                placeholder="Contoh: Dra. Hj. Siti Rohmah, M.Pd"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Peran / Kategori *</label>
              <select
                value={chapForm.role}
                onChange={(e) => setChapForm({ ...chapForm, role: e.target.value as ChaperoneRole })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="WALI_KELAS">Wali Kelas</option>
                <option value="KAKOMLI">Kakomli / Ketua Jurusan</option>
                <option value="STAFF">Staff / Guru Kesiswaan</option>
                <option value="KARYAWAN">Karyawan / TU</option>
                <option value="PANITIA">Panitia Darmawisata</option>
                <option value="MEDIS">Tim Medis / PMR</option>
                <option value="TOUR_LEADER">Tour Leader Travel</option>
                <option value="LAINNYA">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit / Jurusan</label>
              <input
                type="text"
                value={chapForm.department}
                onChange={(e) => setChapForm({ ...chapForm, department: e.target.value })}
                placeholder="Contoh: XII TKJ 1 / DKV"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor WhatsApp</label>
              <input
                type="text"
                value={chapForm.phone}
                onChange={(e) => setChapForm({ ...chapForm, phone: e.target.value })}
                placeholder="08123456789"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingChaperone(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
            >
              Simpan Data
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={chaperoneSearch}
            onChange={(e) => setChaperoneSearch(e.target.value)}
            placeholder="Cari nama guru, peran, jurusan, atau no HP..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={chaperoneRoleFilter}
          onChange={(e) => setChaperoneRoleFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
        >
          <option value="ALL">Semua Peran ({allChaperones.length})</option>
          <option value="WALI_KELAS">Wali Kelas</option>
          <option value="KAKOMLI">Kakomli</option>
          <option value="STAFF">Staff / Kesiswaan</option>
          <option value="MEDIS">Tim Medis</option>
          <option value="PANITIA">Panitia</option>
          <option value="TOUR_LEADER">Tour Leader</option>
        </select>
      </div>

      {/* Chaperones Table / List */}
      <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {filteredChaperones.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Belum ada data pendamping yang sesuai. Klik tombol &ldquo;Sinkron dari Kelas&rdquo; atau &ldquo;Tambah Pendamping&rdquo;.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
              <tr>
                <th className="p-2.5">No</th>
                <th className="p-2.5">Nama Pendamping</th>
                <th className="p-2.5">Peran</th>
                <th className="p-2.5">Unit/Jurusan</th>
                <th className="p-2.5">No. WhatsApp</th>
                <th className="p-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredChaperones.map((chap, idx) => (
                <tr key={chap.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                  <td className="p-2.5 font-bold text-slate-800">{chap.name}</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {chap.role}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-600">{chap.department || '-'}</td>
                  <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                    {chap.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {chap.phone}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEditChaperone(chap)}
                        className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteChaperone(chap.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
