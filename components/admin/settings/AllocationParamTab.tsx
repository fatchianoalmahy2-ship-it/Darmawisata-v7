import React from 'react';
import { AppSettings } from '@/types';
import { Settings, Bus, ShieldCheck, ListOrdered, Users } from 'lucide-react';
import { ALL_MAJORS_LIST } from '@/config/settingsMetadata';

interface AllocationParamTabProps {
  formData: AppSettings;
  setFormData: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export const AllocationParamTab: React.FC<AllocationParamTabProps> = ({
  formData,
  setFormData,
}) => {
  const currentCustomMajorOrder =
    formData.customMajorOrderBali || formData.customMajorOrder || ALL_MAJORS_LIST;

  const handleMoveMajor = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...currentCustomMajorOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setFormData((prev) => ({
      ...prev,
      customMajorOrderBali: newOrder,
      customMajorOrderYogya: newOrder,
      customMajorOrder: newOrder,
      busMajorSortModeBali: 'custom',
      busMajorSortModeYogya: 'custom',
    }));
  };

  return (
    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-600" /> Parameter Kapasitas & Rules Alokasi Otomatis
        </h4>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
          Dinamis & Otomatis
        </span>
      </div>

      {/* Basic Capacities */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Kapasitas Kursi Bus</label>
          <input
            type="number"
            min={30}
            max={60}
            required
            value={formData.defaultBusCapacity ?? ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                defaultBusCapacity: parseInt(e.target.value) || 50,
              }))
            }
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-[10px] text-slate-500">Standar: 50 Kursi per Armada</span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Kapasitas Isi Kamar Hotel</label>
          <input
            type="number"
            min={2}
            max={8}
            required
            value={formData.defaultRoomCapacity ?? ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                defaultRoomCapacity: parseInt(e.target.value) || 4,
              }))
            }
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-[10px] text-slate-500">Standar: 4 Orang per Kamar</span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Threshold Kuota Wali Kelas (%)
          </label>
          <input
            type="number"
            min={10}
            max={100}
            required
            value={formData.waliKelasParticipationThreshold ?? ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                waliKelasParticipationThreshold: parseInt(e.target.value) || 75,
              }))
            }
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-[10px] text-slate-500">Standar: 75% partisipasi kelas</span>
        </div>
      </div>

      {/* Bus Seating Rules */}
      <div className="border-t border-slate-200/80 pt-4 space-y-4">
        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Bus className="w-3.5 h-3.5 text-emerald-600" /> Pengaturan Kursi Bus & Pendamping
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kursi Depan untuk Pendamping / Tour Leader
            </label>
            <select
              value={formData.busVacantSeats || (formData.busReserveFront === false ? 'none' : '1-2')}
              onChange={(e) => {
                const val = e.target.value as 'none' | '1-2' | '1-4';
                setFormData((prev) => ({
                  ...prev,
                  busVacantSeats: val,
                  busReserveFront: val !== 'none',
                }));
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="none">Tidak ada reservasi depan (Semua untuk siswa)</option>
              <option value="1-2">Reservasi Kursi 1-2 (Standar 2 Pendamping)</option>
              <option value="1-4">Reservasi Kursi 1-4 (4 Pendamping / Medis)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Prioritas Penempatan Gender di Bus
            </label>
            <select
              value={formData.busGenderPriority || 'female-front'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  busGenderPriority: e.target.value as any,
                }))
              }
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="female-front">Siswa Perempuan di Depan, Laki-laki di Belakang</option>
              <option value="male-front">Siswa Laki-laki di Depan, Perempuan di Belakang</option>
              <option value="none">Bebas / Berdasarkan Urutan Kelas</option>
            </select>
          </div>
        </div>

        {/* Safety Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-emerald-300 transition">
            <input
              type="checkbox"
              checked={formData.busGendersNoMixBench ?? true}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  busGendersNoMixBench: e.target.checked,
                  preventMixedGenderBench: e.target.checked,
                }))
              }
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-800 block">Cegah Bangku Campur Gender</span>
              <span className="text-[10px] text-slate-500">
                1 bangku (2 kursi) tidak boleh diisi siswa putra & putri bersamaan
              </span>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-emerald-300 transition">
            <input
              type="checkbox"
              checked={formData.busStrictOddPairing ?? true}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  busStrictOddPairing: e.target.checked,
                }))
              }
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-800 block">Strict Pairing (Ganjil & Genap)</span>
              <span className="text-[10px] text-slate-500">
                Otomatis mengelompokkan sisa ganjil per kelas ke bangku sejenis
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Major Ordering Section */}
      <div className="border-t border-slate-200/80 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-emerald-600" /> Urutan Prioritas Jurusan dalam Bus
          </h5>
          <span className="text-[10px] text-slate-500">Geser urutan naik/turun</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {currentCustomMajorOrder.map((major, idx) => (
            <div
              key={major}
              className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs"
            >
              <span className="font-bold text-slate-700">
                {idx + 1}. {major}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveMajor(idx, 'up')}
                  className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 text-[10px] font-bold cursor-pointer"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={idx === currentCustomMajorOrder.length - 1}
                  onClick={() => handleMoveMajor(idx, 'down')}
                  className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 text-[10px] font-bold cursor-pointer"
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
