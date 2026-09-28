import React from 'react';
import { AppSettings } from '@/types';
import { Clock, Calendar, Lock, AlertCircle, Search } from 'lucide-react';
import { SwitchInput } from '@/components/ui/atoms';

interface AngketDeadlineTabProps {
  formData: AppSettings;
  setFormData: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export const AngketDeadlineTab: React.FC<AngketDeadlineTabProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" /> Pengaturan Batas Waktu & Form Angket
        </h4>
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            formData.isAngketClosed
              ? 'bg-red-100 text-red-800 border-red-200'
              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
          }`}
        >
          {formData.isAngketClosed ? 'Angket Ditutup' : 'Angket Aktif'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Toggle Closed */}
        <SwitchInput
          label="Tutup Pengisian Angket Sekarang"
          description="Jika aktif, siswa/wali murid tidak dapat mengisi atau mengubah data formulir angket darmawisata."
          checked={formData.isAngketClosed ?? false}
          onChange={(checked) => setFormData((prev) => ({ ...prev, isAngketClosed: checked }))}
          badge={formData.isAngketClosed ? 'Terkunci' : 'Terbuka'}
          badgeColor={
            formData.isAngketClosed
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }
        />

        {/* Toggle Search Button */}
        <SwitchInput
          label="Tampilkan Tombol Pencarian NIS / Siswa"
          description="Memungkinkan siswa mencari nama dan NIS mereka secara langsung di formulir publik."
          checked={formData.showAngketSearchButton ?? true}
          onChange={(checked) =>
            setFormData((prev) => ({ ...prev, showAngketSearchButton: checked }))
          }
          badge={formData.showAngketSearchButton ? 'Tampil' : 'Sembunyi'}
        />
      </div>

      {/* Deadline Date */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <label className="block text-xs font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" /> Batas Tanggal & Waktu Angket (Deadline)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={formData.angketDeadline || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, angketDeadline: e.target.value }))}
            placeholder="Contoh: 15 November 2026, Pukul 23:59 WIB"
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-[11px] text-slate-500 flex items-center">
            Teks ini akan ditampilkan di header dan footer formulir angket online siswa.
          </p>
        </div>
      </div>

      {/* Access Controls for Wali & Destination Locking */}
      <div className="border-t border-slate-200/80 pt-4 space-y-3">
        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600" /> Kontrol Akses & Kunci Destinasi
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SwitchInput
            label="Kunci Destinasi Tunggal (Single Destination)"
            description="Kunci pilihan destinasi siswa dan wali kelas ke destinasi default tanpa opsi memilih kota lain."
            checked={formData.lockDestinationForStudents ?? false}
            onChange={(checked) =>
              setFormData((prev) => ({ ...prev, lockDestinationForStudents: checked }))
            }
            badge={formData.lockDestinationForStudents ? 'Terkunci' : 'Fleksibel'}
          />

          <SwitchInput
            label="Kunci Modul Bus & Kamar untuk Wali Kelas"
            description="Wali kelas hanya dapat melihat data siswa tanpa mengubah penugasan bus dan kamar."
            checked={formData.lockBusAndRoomForWali ?? false}
            onChange={(checked) =>
              setFormData((prev) => ({ ...prev, lockBusAndRoomForWali: checked }))
            }
            badge={formData.lockBusAndRoomForWali ? 'Terkunci' : 'Diizinkan'}
          />
        </div>
      </div>
    </div>
  );
};
