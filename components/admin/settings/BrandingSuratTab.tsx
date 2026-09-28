import React from 'react';
import { AppSettings } from '@/types';
import { SchoolLogo } from '@/components/ui/SchoolLogo';
import {
  FileCode,
  Upload,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Compass,
  Settings,
  Database,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface BrandingSuratTabProps {
  formData: AppSettings;
  setFormData: React.Dispatch<React.SetStateAction<AppSettings>>;
  onOpenSqlModal: () => void;
  onResetData: () => void;
  onForceRemoteSync?: () => Promise<void>;
  onClose: () => void;
}

export const BrandingSuratTab: React.FC<BrandingSuratTabProps> = ({
  formData,
  setFormData,
  onOpenSqlModal,
  onResetData,
  onForceRemoteSync,
  onClose,
}) => {
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Ukuran file logo terlalu besar. Maksimal 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData((prev) => ({
          ...prev,
          appLogoUrl: event.target!.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleHeaderLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Ukuran file logo header terlalu besar. Maksimal 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData((prev) => ({
          ...prev,
          headerLogoUrl: event.target!.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTshirtDesignAUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Ukuran file desain A terlalu besar. Maksimal 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData((prev) => ({
          ...prev,
          tshirtDesignAUrl: event.target!.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTshirtDesignBUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Ukuran file desain B terlalu besar. Maksimal 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData((prev) => ({
          ...prev,
          tshirtDesignBUrl: event.target!.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-emerald-600" /> Branding, Desain Kaos & Kop Surat Resmi
        </h4>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
          Visual & Printing
        </span>
      </div>

      {/* Main Brand & App Logo */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
        <h5 className="text-xs font-bold text-slate-800">Identitas Aplikasi & Logo Utama</h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Aplikasi / Brand Title
            </label>
            <input
              type="text"
              value={formData.appName || 'SIM DARMAWISATA'}
              onChange={(e) => setFormData((prev) => ({ ...prev, appName: e.target.value }))}
              placeholder="Contoh: SIM DARMAWISATA"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-slate-500">Tampil pada header & brand navbar.</span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Logo Resmi Sekolah / SIM
            </label>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white border border-slate-300 rounded-xl flex items-center justify-center p-1 shrink-0 shadow-xs relative overflow-hidden group">
                {formData.appLogoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={formData.appLogoUrl}
                    alt="Preview Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <SchoolLogo className="w-full h-full object-contain" />
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah File Logo</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>

                  {formData.appLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, appLogoUrl: '' }))}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={formData.appLogoUrl || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, appLogoUrl: e.target.value }))}
                  placeholder="Atau tempel URL / data:image..."
                  className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-700 truncate"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header Logo for Letterhead (Kop Surat) */}
      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
        <h5 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-amber-600" /> Logo Khusus Header Kop Surat (Sebelah Kiri)
        </h5>
        <p className="text-[11px] text-slate-600">
          File gambar untuk ditempatkan pada posisi <strong>Sebelah Kiri Kop Surat Resmi</strong> (Surat Izin & Surat JTM).
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-16 h-16 bg-white border border-slate-300 rounded-xl flex items-center justify-center p-1.5 shrink-0 shadow-xs relative overflow-hidden group">
            {formData.headerLogoUrl || formData.appLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={formData.headerLogoUrl || formData.appLogoUrl}
                alt="Preview Logo Header"
                className="w-full h-full object-contain"
              />
            ) : (
              <SchoolLogo className="w-full h-full object-contain" />
            )}
          </div>

          <div className="flex-1 space-y-2 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Gambar Header</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                  onChange={handleHeaderLogoFileUpload}
                  className="hidden"
                />
              </label>

              {formData.headerLogoUrl && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, headerLogoUrl: '' }))}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Logo Header</span>
                </button>
              )}
            </div>

            <input
              type="text"
              value={formData.headerLogoUrl || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, headerLogoUrl: e.target.value }))}
              placeholder="Atau tempel URL gambar / data:image..."
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-slate-700 truncate"
            />
          </div>
        </div>
      </div>

      {/* T-Shirt Designs Customization */}
      <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
        <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-600" /> Kustomisasi Desain Kaos Darmawisata
        </h5>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Judul Seksi Kaos (di Angket)
          </label>
          <input
            type="text"
            value={formData.tshirtSectionTitle || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, tshirtSectionTitle: e.target.value }))}
            placeholder="Pilihan Desain Kaos Darmawisata 2026-2027"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Design A */}
          <div className="space-y-2 p-3 bg-white border border-slate-100 rounded-xl">
            <label className="block text-xs font-bold text-slate-800">Desain Kaos Opsi A</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-1 shrink-0 relative overflow-hidden">
                {formData.tshirtDesignAUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={formData.tshirtDesignAUrl}
                    alt="Preview Desain A"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center justify-center text-[9px] font-bold text-center">
                    <ImageIcon className="w-5 h-5 text-slate-300 mb-0.5" />
                    <span>Default A</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Gambar A</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handleTshirtDesignAUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.tshirtDesignAUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, tshirtDesignAUrl: '' }))}
                      className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.tshirtDesignAUrl || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tshirtDesignAUrl: e.target.value }))}
                  placeholder="URL gambar..."
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-700 truncate"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1.5 border-t border-slate-50">
              <div>
                <label className="block text-[10px] font-bold text-slate-500">Judul Opsi A</label>
                <input
                  type="text"
                  value={formData.tshirtDesignATitle || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tshirtDesignATitle: e.target.value }))}
                  placeholder="Desain Minimalis Modern"
                  className="w-full px-2 py-1 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500">Deskripsi Opsi A</label>
                <input
                  type="text"
                  value={formData.tshirtDesignADesc || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tshirtDesignADesc: e.target.value }))}
                  placeholder="Garis seni estetik khas Bali-Jogja"
                  className="w-full px-2 py-1 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Design B */}
          <div className="space-y-2 p-3 bg-white border border-slate-100 rounded-xl">
            <label className="block text-xs font-bold text-slate-800">Desain Kaos Opsi B</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-1 shrink-0 relative overflow-hidden">
                {formData.tshirtDesignBUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={formData.tshirtDesignBUrl}
                    alt="Preview Desain B"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center justify-center text-[9px] font-bold text-center">
                    <ImageIcon className="w-5 h-5 text-slate-300 mb-0.5" />
                    <span>Default B</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Gambar B</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handleTshirtDesignBUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.tshirtDesignBUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, tshirtDesignBUrl: '' }))}
                      className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.tshirtDesignBUrl || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tshirtDesignBUrl: e.target.value }))}
                  placeholder="URL gambar..."
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-700 truncate"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1.5 border-t border-slate-50">
              <div>
                <label className="block text-[10px] font-bold text-slate-500">Judul Opsi B</label>
                <input
                  type="text"
                  value={formData.tshirtDesignBTitle || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tshirtDesignBTitle: e.target.value }))}
                  placeholder="Desain Retro Adventure"
                  className="w-full px-2 py-1 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500">Deskripsi Opsi B</label>
                <input
                  type="text"
                  value={formData.tshirtDesignBDesc || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tshirtDesignBDesc: e.target.value }))}
                  placeholder="Ilustrasi sunset pantai dan candi"
                  className="w-full px-2 py-1 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Surat Izin Opening & Closing Text */}
      <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3">
        <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-indigo-600" /> Redaksi & Kalimat Surat Izin Orang Tua
        </h5>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kalimat Penjelas Penyelenggara (Paragraf Tengah)
            </label>
            <textarea
              rows={2}
              value={
                formData.suratIzinOpeningText ||
                `Yang diselenggarakan oleh ${formData.schoolName || 'SMK PGRI 2 PONOROGO'}, bekerja sama dengan ${formData.travelAgency || 'Biro Fiesta Tour and Travel Kabupaten Ponorogo'}.`
              }
              onChange={(e) => setFormData((prev) => ({ ...prev, suratIzinOpeningText: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kalimat Penutup Surat Izin
            </label>
            <textarea
              rows={2}
              value={
                formData.suratIzinClosingText ||
                'Demikian surat izin ini saya buat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.'
              }
              onChange={(e) => setFormData((prev) => ({ ...prev, suratIzinClosingText: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* School Info Section */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Informasi Instansi & Biro Travel
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Sekolah / Instansi
            </label>
            <input
              type="text"
              value={formData.schoolName ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, schoolName: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Kepala Sekolah
            </label>
            <input
              type="text"
              value={formData.headmasterName ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, headmasterName: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mitra Biro Travel
            </label>
            <input
              type="text"
              value={formData.travelAgency ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, travelAgency: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* Supabase SQL Schema Generator Section */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
              Script SQL Schema Supabase
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Master Schema
              </span>
            </h5>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Generate skema DDL & RLS Supabase untuk siswa, kelas, setting & rundown.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSqlModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 shadow-xs shrink-0 cursor-pointer"
        >
          <FileCode className="w-4 h-4" />
          <span>Buat SQL Supabase</span>
        </button>
      </div>

      {/* Danger Zone: Reset / Clear Cache */}
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <h5 className="font-bold text-xs text-rose-900">Kosongkan/Reset Data Supabase</h5>
            <p className="text-[11px] text-rose-700">
              Mengosongkan cache lokal dan menyegarkan koneksi langsung dari database.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            if (confirm('Yakin ingin mengosongkan cache lokal dan menyegarkan data langsung dari Supabase?')) {
              if (onForceRemoteSync) {
                await onForceRemoteSync();
              } else {
                onResetData();
              }
              onClose();
            }
          }}
          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Bersihkan Cache & Sync
        </button>
      </div>
    </div>
  );
};
