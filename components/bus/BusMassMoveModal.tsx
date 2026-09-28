'use client';

import React, { useState } from 'react';
import { MoveRight, X, Sparkles, UserMinus } from 'lucide-react';

interface BusMassMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudentCount: number;
  availableBuses: number[];
  onConfirmMove: (targetBusNumber: number, strategy: 'AUTO_FILL' | 'TRANSIT') => Promise<void>;
}

export const BusMassMoveModal: React.FC<BusMassMoveModalProps> = ({
  isOpen,
  onClose,
  selectedStudentCount,
  availableBuses,
  onConfirmMove,
}) => {
  const [targetBus, setTargetBus] = useState<number>(availableBuses[0] || 1);
  const [strategy, setStrategy] = useState<'AUTO_FILL' | 'TRANSIT'>('AUTO_FILL');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirmMove(targetBus, strategy);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <MoveRight className="w-5 h-5 text-indigo-600" />
            <span>Pindahkan {selectedStudentCount} Siswa Terpilih</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
            aria-label="Tutup Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-black text-slate-700 block mb-1">
              Pilih Bus Tujuan:
            </label>
            <select
              value={targetBus}
              onChange={(e) => setTargetBus(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {availableBuses.map((num) => (
                <option key={num} value={num}>
                  Bus {num}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 block">
              Metode Penempatan di Bus Tujuan:
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="massStrategy"
                checked={strategy === 'AUTO_FILL'}
                onChange={() => setStrategy('AUTO_FILL')}
                className="mt-0.5 text-indigo-600 cursor-pointer"
              />
              <div>
                <div className="text-xs font-black text-slate-900">Isi Kursi Kosong Terdepan</div>
                <div className="text-[11px] text-slate-500 leading-snug">
                  Menempati nomor kursi kosong yang tersedia secara berurutan di bus tujuan.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="massStrategy"
                checked={strategy === 'TRANSIT'}
                onChange={() => setStrategy('TRANSIT')}
                className="mt-0.5 text-indigo-600 cursor-pointer"
              />
              <div>
                <div className="text-xs font-black text-slate-900">Masuk Daftar Belum Dapat Kursi</div>
                <div className="text-[11px] text-slate-500 leading-snug">
                  Siswa masuk ke bus tujuan tanpa nomor kursi (ditata manual nanti).
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-black rounded-xl text-xs transition-colors cursor-pointer shadow-md"
          >
            {isProcessing ? 'Memproses...' : 'Konfirmasi Pindahkan'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
