import React, { useMemo } from 'react';
import { AppSettings, Student } from '@/types';
import { Compass, Calendar, DollarSign, Sparkles, Bus, Users } from 'lucide-react';
import { ALL_MAJORS_LIST } from '@/config/settingsMetadata';

interface WaveDestinationTabProps {
  formData: AppSettings;
  setFormData: React.Dispatch<React.SetStateAction<AppSettings>>;
  students?: Student[];
}

export const WaveDestinationTab: React.FC<WaveDestinationTabProps> = ({
  formData,
  setFormData,
  students = [],
}) => {
  const busCap = formData.defaultBusCapacity || 50;
  const vacantOption = formData.busVacantSeats || (formData.busReserveFront === false ? 'none' : '1-2');
  const chaperoneSeats = vacantOption === 'none' ? 0 : vacantOption === '1-4' ? 4 : 2;
  const effectiveStudentCap = Math.max(1, busCap - chaperoneSeats);

  const extractMajorCode = (className?: string) => {
    if (!className) return 'LAIN';
    const upper = className.toUpperCase();
    if (upper.includes('TBKR')) return 'TBKR';
    if (upper.includes('TKR')) return 'TKR';
    if (upper.includes('TBSM')) return 'TBSM';
    if (upper.includes('TSM')) return 'TBSM';
    if (upper.includes('TKJ')) return 'TKJ';
    if (upper.includes('DKV')) return 'DKV';
    if (upper.includes('RPL')) return 'RPL';
    if (upper.includes('TAB')) return 'TAB';
    if (upper.includes('TPM')) return 'TPM';
    if (upper.includes('TPL')) return 'TPL';
    return 'LAIN';
  };

  const majorStats = useMemo(() => {
    const stats: Record<string, number> = {};
    ALL_MAJORS_LIST.forEach((m) => (stats[m] = 0));
    (students || []).forEach((s) => {
      if (s.isRegistered && (!s.destination || s.destination === 'BALI')) {
        const major = extractMajorCode(s.className);
        stats[major] = (stats[major] || 0) + 1;
      }
    });
    return stats;
  }, [students]);

  const gel1Selected = useMemo(
    () => formData.waveBaliGel1Majors || ['TKJ', 'RPL', 'DKV'],
    [formData.waveBaliGel1Majors]
  );
  const gel2Selected = useMemo(
    () => formData.waveBaliGel2Majors || ['TBKR', 'TBSM', 'TAB', 'TKR', 'TPM', 'TPL'],
    [formData.waveBaliGel2Majors]
  );

  const gel1StudentCount = useMemo(() => {
    return Object.entries(majorStats).reduce((sum, [major, cnt]) => {
      return gel1Selected.includes(major) ? sum + cnt : sum;
    }, 0);
  }, [majorStats, gel1Selected]);

  const gel2StudentCount = useMemo(() => {
    return Object.entries(majorStats).reduce((sum, [major, cnt]) => {
      return gel2Selected.includes(major) ? sum + cnt : sum;
    }, 0);
  }, [majorStats, gel2Selected]);

  const gel1Buses = Math.ceil(gel1StudentCount / effectiveStudentCap) || 0;
  const gel2Buses = Math.ceil(gel2StudentCount / effectiveStudentCap) || 0;

  const handleApplyOptimumDistribution = () => {
    const activeMajors = Object.keys(majorStats).filter((m) => majorStats[m] > 0);
    const majorsToUse = activeMajors.length > 0 ? activeMajors : ALL_MAJORS_LIST;
    const sorted = [...majorsToUse].sort((a, b) => (majorStats[b] || 0) - (majorStats[a] || 0));

    const g1: string[] = [];
    const g2: string[] = [];
    let c1 = 0;
    let c2 = 0;

    sorted.forEach((m) => {
      const cnt = majorStats[m] || 1;
      if (c1 <= c2) {
        g1.push(m);
        c1 += cnt;
      } else {
        g2.push(m);
        c2 += cnt;
      }
    });

    setFormData((prev) => ({
      ...prev,
      waveDistributionMode: 'major-based',
      waveBaliGel1Majors: g1,
      waveBaliGel2Majors: g2,
    }));
  };

  const toggleMajorGelombang = (major: string, targetGel: 1 | 2) => {
    let newG1 = [...gel1Selected];
    let newG2 = [...gel2Selected];

    if (targetGel === 1) {
      if (!newG1.includes(major)) newG1.push(major);
      newG2 = newG2.filter((m) => m !== major);
    } else {
      if (!newG2.includes(major)) newG2.push(major);
      newG1 = newG1.filter((m) => m !== major);
    }

    setFormData((prev) => ({
      ...prev,
      waveDistributionMode: 'major-based',
      waveBaliGel1Majors: newG1,
      waveBaliGel2Majors: newG2,
    }));
  };

  return (
    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-600" /> Tanggal, Tarif & Gelombang Keberangkatan
        </h4>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
          Tour & Pricing
        </span>
      </div>

      {/* Tour Dates & Pricing Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Bali Package */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            🌴 Paket Tur Bali (Gelombang 1 & 2)
          </span>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Tanggal Pelaksanaan Gelombang 1
              </label>
              <input
                type="text"
                value={formData.baliGel1Dates || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, baliGel1Dates: e.target.value }))}
                placeholder="Contoh: 18 - 22 Desember 2026"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Tanggal Pelaksanaan Gelombang 2
              </label>
              <input
                type="text"
                value={formData.baliGel2Dates || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, baliGel2Dates: e.target.value }))}
                placeholder="Contoh: 22 - 26 Desember 2026"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Biaya Partisipasi Bali (Rp)
              </label>
              <input
                type="number"
                value={formData.baliPrice || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, baliPrice: parseInt(e.target.value) || 0 }))
                }
                placeholder="2100000"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Yogyakarta Package */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            🏛️ Paket Tur Yogyakarta
          </span>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Tanggal Pelaksanaan Yogya
              </label>
              <input
                type="text"
                value={formData.yogyaGel1Dates || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, yogyaGel1Dates: e.target.value }))}
                placeholder="Contoh: 10 - 13 Januari 2027"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Biaya Partisipasi Yogyakarta (Rp)
              </label>
              <input
                type="number"
                value={formData.yogyaPrice || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, yogyaPrice: parseInt(e.target.value) || 0 }))
                }
                placeholder="1350000"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Wave Balancing / Distribution Simulator */}
      <div className="border-t border-slate-200/80 pt-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Bus className="w-3.5 h-3.5 text-emerald-600" /> Distribusi Jurusan Gelombang 1 vs Gelombang 2
            </h5>
            <span className="text-[11px] text-slate-500">
              Keseimbangan armada bus dan jumlah peserta antar gelombang.
            </span>
          </div>

          <button
            type="button"
            onClick={handleApplyOptimumDistribution}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Auto-Balance Optimum
          </button>
        </div>

        {/* Live Simulation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-xl border border-emerald-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">Gelombang 1 (Bali)</span>
              <span className="text-xs font-black text-emerald-700 font-mono">{gel1StudentCount} Siswa</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Armada Diperlukan:</span>
              <span className="font-bold text-slate-900">{gel1Buses} Bus</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ALL_MAJORS_LIST.map((m) => {
                const isSelected = gel1Selected.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMajorGelombang(m, 1)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {m} ({majorStats[m] || 0})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-blue-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900">Gelombang 2 (Bali)</span>
              <span className="text-xs font-black text-blue-700 font-mono">{gel2StudentCount} Siswa</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Armada Diperlukan:</span>
              <span className="font-bold text-slate-900">{gel2Buses} Bus</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ALL_MAJORS_LIST.map((m) => {
                const isSelected = gel2Selected.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMajorGelombang(m, 2)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {m} ({majorStats[m] || 0})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
