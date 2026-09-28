'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { SchoolClass, Student, AppSettings } from '@/types';
import { RecapGeneratorService } from '@/services/recapGenerator';
import {
  Send,
  Copy,
  CheckCircle2,
  Settings,
  Sparkles,
  MessageSquare,
  Clock,
  ExternalLink,
  Users,
  Building2,
  Zap,
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface AutoRecapDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: SchoolClass[];
  students: Student[];
  settings?: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onOpenSettings?: () => void;
}

export const AutoRecapDispatchModal: React.FC<AutoRecapDispatchModalProps> = ({
  isOpen,
  onClose,
  classes,
  students,
  settings,
  onSaveSettings,
  onOpenSettings,
}) => {
  const [dispatchTarget, setDispatchTarget] = useState<'ALL' | string>('ALL'); // 'ALL' or className
  const [copied, setCopied] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);
  const [dispatchResultMsg, setDispatchResultMsg] = useState('');

  // Live WhatsApp Status states
  const [waStatus, setWaStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED' | 'ERROR'>('DISCONNECTED');
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [waError, setWaError] = useState<string>('');
  const [isConnectingBackend, setIsConnectingBackend] = useState(false);
  const [isTriggeringCron, setIsTriggeringCron] = useState(false);

  // Poll WhatsApp status when the modal is open
  const fetchWhatsAppStatus = React.useCallback(async () => {
    if (settings?.whatsappMode !== 'direct') return;
    try {
      const res = await fetch('/api/whatsapp/config');
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data.status);
        setQrCodeData(data.qr);
        setWaError(data.error);
      }
    } catch (err) {
      console.warn('Failed to fetch WhatsApp Web status:', err);
    }
  }, [settings?.whatsappMode]);

  useEffect(() => {
    if (isOpen && settings?.whatsappMode === 'direct') {
      fetchWhatsAppStatus();
      const interval = setInterval(fetchWhatsAppStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, settings?.whatsappMode, fetchWhatsAppStatus]);

  if (!isOpen) return null;

  const targetClassObj =
    dispatchTarget !== 'ALL'
      ? classes.find((c) => c.name === dispatchTarget) || classes[0]
      : null;

  const targetStudents =
    dispatchTarget === 'ALL'
      ? students
      : students.filter((s) => s.className === dispatchTarget);

  const generatedText =
    dispatchTarget === 'ALL'
      ? RecapGeneratorService.generateWhatsAppAllUnregisteredSummary(classes, students, settings)
      : targetClassObj
      ? RecapGeneratorService.generateWhatsAppUnregisteredReminder(targetClassObj, targetStudents, settings)
      : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleInitializeClient = async () => {
    setIsConnectingBackend(true);
    try {
      await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' }),
      });
      fetchWhatsAppStatus();
    } catch (err) {
      console.error('Failed to initialize WhatsApp client:', err);
    } finally {
      setIsConnectingBackend(false);
    }
  };

  const handleDisconnectClient = async () => {
    setIsConnectingBackend(true);
    try {
      await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      setQrCodeData('');
      fetchWhatsAppStatus();
    } catch (err) {
      console.error('Failed to disconnect WhatsApp client:', err);
    } finally {
      setIsConnectingBackend(false);
    }
  };

  const handleOpenWhatsApp = async () => {
    const encodedText = encodeURIComponent(generatedText);
    const targetPhone = settings?.autoRecapTargetPhone?.trim();

    // If HTTP Gateway mode is active, attempt direct send via Gateway API first
    if (settings?.whatsappMode === 'gateway') {
      setIsTriggeringCron(true);
      try {
        const res = await fetch('/api/cron/send-recap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ simulate: false, isManual: true }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setDispatchResultMsg(`Berhasil dikirim langsung ke WhatsApp Group / Target via Fonnte Gateway!`);
          setIsDispatched(true);
          if (settings) {
            onSaveSettings({
              ...settings,
              lastAutoRecapSentAt: `${data.timestamp} (Gateway API)`,
              lastAutoRecapSentStatus: 'BERHASIL',
            });
          }
          setTimeout(() => setIsDispatched(false), 4000);
          return;
        } else {
          throw new Error(data.error || 'Gagal mengirim via Gateway');
        }
      } catch (err: any) {
        console.warn('Gateway API send failed, falling back to browser URL:', err);
        setDispatchResultMsg(`Gateway Error: ${err.message || err}. Membuka aplikasi WhatsApp...`);
        setIsDispatched(true);
      } finally {
        setIsTriggeringCron(false);
      }
    }

    // Fallback or Web Mode: Open WhatsApp URL
    let waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    if (targetPhone && !targetPhone.includes('@g.us')) {
      const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
      if (cleanPhone) {
        waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
      }
    }

    window.open(waUrl, '_blank');

    const nowStr = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    if (settings) {
      onSaveSettings({
        ...settings,
        lastAutoRecapSentAt: `${nowStr} WIB (Manual Web)`,
        lastAutoRecapSentStatus: 'BERHASIL',
      });
    }

    setDispatchResultMsg('Rekap manual dialihkan ke aplikasi WhatsApp Web!');
    setIsDispatched(true);
    setTimeout(() => setIsDispatched(false), 3000);
  };

  const handleSimulateAutoDispatch = async () => {
    setIsTriggeringCron(true);
    setDispatchResultMsg('');

    try {
      const res = await fetch('/api/cron/send-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulate: true, isManual: true }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Callback parent update settings
        if (settings) {
          onSaveSettings({
            ...settings,
            lastAutoRecapSentAt: data.lastAutoRecapSentAt || `${data.timestamp} (${data.method})`,
            lastAutoRecapSentStatus: 'BERHASIL',
          });
        }

        setDispatchResultMsg(`Sukses menjalankan Cron Otomatis! Laporan dikirim via ${data.method}.`);
        setIsDispatched(true);
        setTimeout(() => {
          setIsDispatched(false);
          onClose();
        }, 2200);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error.');
      }
    } catch (err: any) {
      setDispatchResultMsg(`Gagal: ${err.message || err}`);
      setIsDispatched(true);
      setTimeout(() => setIsDispatched(false), 3500);
    } finally {
      setIsTriggeringCron(false);
    }
  };

  const totalUnregistered = students.filter((s) => !s.isRegistered).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⚡ Center Dispatch & Automation Rekap WhatsApp"
      subtitle={`Kirim rekap harian siswa belum mengisi angket sewaktu-waktu atau atur jadwal otomatis Pukul ${settings?.autoRecapTime || '13:00'} WIB`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Banner Status Jadwal Otomatis */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-emerald-950 text-sm flex items-center gap-1.5">
                <span>Jadwal Auto-Send: {settings?.autoRecapTime || '13:00'} WIB</span>
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full text-[10px] font-black">
                  {settings?.autoRecapEnabled !== false ? '🟢 AKTIF' : '🔴 NON-AKTIF'}
                </span>
              </p>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                Target: <strong>{settings?.autoRecapTargetGroup || 'Grup Panitia Darmawisata'}</strong> • Status:{' '}
                {settings?.lastAutoRecapSentAt
                  ? `Terakhir dikirim pada ${settings.lastAutoRecapSentAt}`
                  : 'Belum pernah dikirim'}
              </p>
            </div>
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-700" />
              <span>Edit Format & Jadwal</span>
            </button>
          )}
        </div>

        {/* Selection Target Dispatch */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
            Pilih Target Penerima Rekap WA:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setDispatchTarget('ALL')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                dispatchTarget === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              <Building2 className={`w-5 h-5 shrink-0 ${dispatchTarget === 'ALL' ? 'text-emerald-400' : 'text-slate-500'}`} />
              <div>
                <p className="font-extrabold text-xs">Grup Panitia Utama (Seluruh Sekolah)</p>
                <p className={`text-[10px] mt-0.5 ${dispatchTarget === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Laporan rekap rincian {classes.length} kelas ({totalUnregistered} siswa belum)
                </p>
              </div>
            </button>

            <div className="flex flex-col justify-center">
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={dispatchTarget === 'ALL' ? '' : dispatchTarget}
                  onChange={(e) => setDispatchTarget(e.target.value || 'ALL')}
                  className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">🏫 Pilih Grup Wali Kelas / Per Kelas...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                      Kelas {c.name} ({c.homeroomTeacher || 'Wali Kelas'})
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 pl-1">
                Kirim pesan khusus reminder untuk siswa di kelas terpilih.
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic WhatsApp Live Preview Box */}
        {settings?.whatsappMode === 'direct' && (
          <div className="p-4 bg-slate-900 text-white border border-slate-800 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <span className="font-black text-xs uppercase tracking-wider text-emerald-400">
                  📱 Status Sesi WhatsApp Web (Self-Hosted)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {waStatus === 'CONNECTED' ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black border border-emerald-500/30 flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> CONNECTED
                  </span>
                ) : waStatus === 'QR_READY' ? (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-black border border-amber-500/30 flex items-center gap-1 animate-pulse">
                    <QrCode className="w-3 h-3" /> SCAN QR CODE
                  </span>
                ) : waStatus === 'CONNECTING' ? (
                  <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded-full text-[10px] font-black border border-sky-500/30 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> CONNECTING...
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[10px] font-black border border-slate-700 flex items-center gap-1">
                    <WifiOff className="w-3 h-3" /> DISCONNECTED
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-2 text-xs">
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Sesi lokal berjalan di server menggunakan browser tersemat (headless). Silakan inisialisasi dan pindai untuk mengirim laporan otomatis tanpa intervensi.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {waStatus === 'DISCONNECTED' || waStatus === 'ERROR' ? (
                    <button
                      type="button"
                      disabled={isConnectingBackend}
                      onClick={handleInitializeClient}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-extrabold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isConnectingBackend ? 'animate-spin' : ''}`} />
                      <span>Hubungkan WA Web</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isConnectingBackend}
                      onClick={handleDisconnectClient}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 text-white font-extrabold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <WifiOff className="w-3.5 h-3.5" />
                      <span>Putus Koneksi WA</span>
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={fetchWhatsAppStatus}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                    title="Refresh Status"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                {waError && (
                  <p className="text-rose-400 font-medium text-[10px] mt-2 flex items-start gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{waError}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                {waStatus === 'QR_READY' && qrCodeData ? (
                  <div className="text-center space-y-1.5">
                    <img
                      src={qrCodeData}
                      alt="WhatsApp Web QR Code"
                      className="w-32 h-32 bg-white p-1.5 rounded-lg border border-slate-700 inline-block shadow-lg"
                    />
                    <p className="text-[10px] font-bold text-amber-300 animate-pulse">
                      Pindai via WA &gt; Perangkat Tertaut
                    </p>
                  </div>
                ) : waStatus === 'CONNECTED' ? (
                  <div className="text-center py-5 space-y-2">
                    <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-300">Siap & Terhubung!</p>
                      <p className="text-[9px] text-slate-400">Pesan otomatis akan terkirim via browser ini.</p>
                    </div>
                  </div>
                ) : waStatus === 'CONNECTING' ? (
                  <div className="text-center py-5 space-y-2">
                    <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                    <p className="text-[9px] text-slate-400 font-bold">Menyiapkan Mesin Puppeteer...</p>
                  </div>
                ) : (
                  <div className="text-center py-5 text-slate-500 text-xs font-bold space-y-1">
                    <WifiOff className="w-5 h-5 text-slate-600 mx-auto" />
                    <p>WhatsApp Belum Terhubung</p>
                    <p className="text-[9px] text-slate-600 font-medium">Klik &apos;Hubungkan WA Web&apos; di kiri.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-600" /> Preview Format Pesan WhatsApp:
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
            </button>
          </div>

          <div className="p-4 bg-slate-950 text-emerald-400 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto border border-slate-800 shadow-inner">
            {generatedText}
          </div>
        </div>

        {/* Dispatched Toast Alert */}
        {isDispatched && (
          <div className="p-3 bg-emerald-600 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{dispatchResultMsg || 'Rekapitulasi WhatsApp berhasil diproses & log waktu pengiriman diperbarui!'}</span>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isTriggeringCron}
              onClick={handleSimulateAutoDispatch}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-950 text-slate-200 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              title="Simulasi Trigger Gateway Pukul 16:00"
            >
              {isTriggeringCron ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isTriggeringCron ? 'Mengirim...' : 'Simulasi Gateway 16:00'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Kirim via WhatsApp (Sekarang)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
