'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { AppSettings, Student, SchoolClass } from '@/types';
import { SupabaseSqlModal } from '@/components/admin/SupabaseSqlModal';
import { SettingsTabsNavigation } from '@/components/admin/settings/SettingsTabsNavigation';
import { AllocationParamTab } from '@/components/admin/settings/AllocationParamTab';
import { ChaperoneSettingsTab } from '@/components/admin/settings/ChaperoneSettingsTab';
import { AngketDeadlineTab } from '@/components/admin/settings/AngketDeadlineTab';
import { WaveDestinationTab } from '@/components/admin/settings/WaveDestinationTab';
import { WhatsAppTemplateTab } from '@/components/admin/settings/WhatsAppTemplateTab';
import { BrandingSuratTab } from '@/components/admin/settings/BrandingSuratTab';
import { Save } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onForceRemoteSync?: () => Promise<void>;
  onResetData: () => void;
  students?: Student[];
  classesList?: SchoolClass[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onForceRemoteSync,
  onResetData,
  students = [],
  classesList = [],
}) => {
  const [prevSettings, setPrevSettings] = useState(settings);
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [activeMainTab, setActiveMainTab] = useState<
    | 'PARAM_ALOKASI'
    | 'PENDAMPING'
    | 'BATAS_ANGKET'
    | 'GELOMBANG_DESTINASI'
    | 'WA_TEMPLATE'
    | 'BRANDING_SURAT'
  >('PARAM_ALOKASI');
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  if (settings !== prevSettings) {
    setPrevSettings(settings);
    setFormData({ ...settings });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan Sistem & Master Parameter"
      subtitle="Kelola kapasitas, batas angket, serta format rekap & otomatisasi WhatsApp 16:00 WIB"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Navigation Tabs Header */}
        <SettingsTabsNavigation
          activeTab={activeMainTab}
          onSelectTab={(tabId) => setActiveMainTab(tabId)}
        />

        {/* Tab 1: Parameter & Aturan Alokasi */}
        {activeMainTab === 'PARAM_ALOKASI' && (
          <AllocationParamTab formData={formData} setFormData={setFormData} />
        )}

        {/* Tab 2: Master Pendamping & Guru */}
        {activeMainTab === 'PENDAMPING' && (
          <ChaperoneSettingsTab
            formData={formData}
            setFormData={setFormData}
            classesList={classesList}
          />
        )}

        {/* Tab 3: Batas Waktu & Buka/Tutup Angket */}
        {activeMainTab === 'BATAS_ANGKET' && (
          <AngketDeadlineTab formData={formData} setFormData={setFormData} />
        )}

        {/* Tab 4: Gelombang & Destinasi */}
        {activeMainTab === 'GELOMBANG_DESTINASI' && (
          <WaveDestinationTab
            formData={formData}
            setFormData={setFormData}
            students={students}
          />
        )}

        {/* Tab 5: Template & Bot WhatsApp */}
        {activeMainTab === 'WA_TEMPLATE' && (
          <WhatsAppTemplateTab
            formData={formData}
            setFormData={setFormData}
            onSaveSettings={onSaveSettings}
          />
        )}

        {/* Tab 6: Branding, Desain Kaos & Kop Surat */}
        {activeMainTab === 'BRANDING_SURAT' && (
          <BrandingSuratTab
            formData={formData}
            setFormData={setFormData}
            onOpenSqlModal={() => setIsSqlModalOpen(true)}
            onResetData={onResetData}
            onForceRemoteSync={onForceRemoteSync}
            onClose={onClose}
          />
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Save className="w-4 h-4" /> Simpan Pengaturan
          </button>
        </div>
      </form>

      {/* Supabase SQL Generator Modal */}
      <SupabaseSqlModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />
    </Modal>
  );
};
