import React, { useState } from 'react';
import { AppSettings } from '@/types';
import { MessageSquare, Bot, Sparkles, Tag, RotateCcw, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { WA_PANITIA_VARS, WA_WALI_VARS } from '@/config/settingsMetadata';
import schoolMetadata from '@/config/schoolMetadata.json';
import { SwitchInput } from '@/components/ui/atoms';

interface WhatsAppTemplateTabProps {
  formData: AppSettings;
  setFormData: React.Dispatch<React.SetStateAction<AppSettings>>;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export const WhatsAppTemplateTab: React.FC<WhatsAppTemplateTabProps> = ({
  formData,
  setFormData,
  onSaveSettings,
}) => {
  const [activeTemplateTab, setActiveTemplateTab] = useState<'PANITIA' | 'WALI_KELAS'>('PANITIA');
  const [isTestingWa, setIsTestingWa] = useState(false);
  const [testWaStatus, setTestWaStatus] = useState<string | null>(null);

  const handleResetTemplate = () => {
    const defaultMeta = schoolMetadata.defaultSettings;
    if (activeTemplateTab === 'PANITIA') {
      setFormData((prev) => ({
        ...prev,
        templateUnregisteredSummary: defaultMeta.templateUnregisteredSummary,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        templateClassReminder: defaultMeta.templateClassReminder,
      }));
    }
  };

  const insertTag = (tag: string) => {
    if (activeTemplateTab === 'PANITIA') {
      setFormData((prev) => ({
        ...prev,
        templateUnregisteredSummary: (prev.templateUnregisteredSummary || '') + ` ${tag} `,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        templateClassReminder: (prev.templateClassReminder || '') + ` ${tag} `,
      }));
    }
  };

  const handleTestWhatsApp = async () => {
    setIsTestingWa(true);
    setTestWaStatus(null);
    try {
      onSaveSettings(formData);

      const res = await fetch('/api/cron/send-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulate: false, isManual: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestWaStatus(`✅ BERHASIL: Pesan rekap berhasil terkirim ke WhatsApp! ${data.detail || ''}`);
      } else {
        setTestWaStatus(`❌ GAGAL: ${data.error || 'Gagal mengirim pesan ke WhatsApp'}`);
      }
    } catch (err: any) {
      setTestWaStatus(`❌ ERROR: ${err.message || 'Tidak dapat terhubung ke server'}`);
    } finally {
      setIsTestingWa(false);
    }
  };

  return (
    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-600" /> Otomatisasi & Format Pesan WhatsApp
        </h4>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
          WhatsApp Gateway & Bot
        </span>
      </div>

      {/* Auto Recap Scheduling Settings */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-emerald-600" /> Jadwal Kirim Rekap Otomatis Harian
          </span>
          <span className="text-[11px] font-medium text-slate-500">Pukul 16:00 WIB</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SwitchInput
            label="Aktifkan Kirim Rekap Otomatis"
            description="Bot otomatis mengirim ringkasan siswa yang belum mengisi angket setiap sore hari."
            checked={formData.autoRecapEnabled ?? true}
            onChange={(checked) => setFormData((prev) => ({ ...prev, autoRecapEnabled: checked }))}
            badge={formData.autoRecapEnabled ? 'Aktif' : 'Mati'}
          />

          <SwitchInput
            label="Hentikan Jika Semua Sudah Terdaftar"
            description="Otomatis jeda pengiriman saat 100% siswa seluruh kelas telah mengisi angket."
            checked={formData.stopAutoRecapWhenComplete ?? true}
            onChange={(checked) =>
              setFormData((prev) => ({ ...prev, stopAutoRecapWhenComplete: checked }))
            }
            badge={formData.stopAutoRecapWhenComplete ? 'Aktif' : 'Terus Kirim'}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Nomor WhatsApp Tujuan Panitia / Grup
            </label>
            <input
              type="text"
              value={formData.autoRecapTargetPhone || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, autoRecapTargetPhone: e.target.value }))
              }
              placeholder="08123456789 atau ID Group WA"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={isTestingWa}
              onClick={handleTestWhatsApp}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              {isTestingWa ? (
                <span>Sedang Mengirim Test...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Uji Kirim Pesan Sekarang
                </>
              )}
            </button>
          </div>
        </div>

        {testWaStatus && (
          <div
            className={`p-3 rounded-xl text-xs font-medium border ${
              testWaStatus.includes('BERHASIL')
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {testWaStatus}
          </div>
        )}
      </div>

      {/* Template Message Editor */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTemplateTab('PANITIA')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTemplateTab === 'PANITIA'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Template Rekap Panitia
            </button>
            <button
              type="button"
              onClick={() => setActiveTemplateTab('WALI_KELAS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTemplateTab === 'WALI_KELAS'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Template Reminder Wali Kelas
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetTemplate}
            className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 font-bold cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset ke Default
          </button>
        </div>

        {/* Variable Tags Chips */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1">
            <Tag className="w-3 h-3 text-emerald-600" /> Klik Tag Variabel untuk Menyisipkan:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(activeTemplateTab === 'PANITIA' ? WA_PANITIA_VARS : WA_WALI_VARS).map((v) => (
              <button
                key={v.tag}
                type="button"
                onClick={() => insertTag(v.tag)}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 text-[10px] font-mono font-bold transition cursor-pointer"
              >
                {v.tag} <span className="text-slate-400 font-sans font-normal">({v.label})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          rows={6}
          value={
            activeTemplateTab === 'PANITIA'
              ? formData.templateUnregisteredSummary || ''
              : formData.templateClassReminder || ''
          }
          onChange={(e) => {
            const val = e.target.value;
            if (activeTemplateTab === 'PANITIA') {
              setFormData((prev) => ({ ...prev, templateUnregisteredSummary: val }));
            } else {
              setFormData((prev) => ({ ...prev, templateClassReminder: val }));
            }
          }}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 leading-relaxed"
        />
      </div>
    </div>
  );
};
