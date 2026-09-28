'use client';

import React from 'react';
import { Modal } from '../ui/Modal';
import { Button, ButtonVariant } from '../ui/Button';
import { AlertTriangle, CheckCircle2, HelpCircle, Trash2, Edit3, PlusCircle } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'primary' | 'info';

export interface ConfirmDataField {
  label: string;
  value: string | number | React.ReactNode;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode | string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  dataSummary?: ConfirmDataField[];
  actionType?: 'create' | 'update' | 'delete' | 'generic';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Batal',
  variant = 'primary',
  isLoading = false,
  dataSummary,
  actionType = 'generic',
}) => {
  const getIcon = () => {
    if (actionType === 'delete' || variant === 'danger') {
      return (
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
          <Trash2 className="w-6 h-6" />
        </div>
      );
    }
    if (actionType === 'create') {
      return (
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <PlusCircle className="w-6 h-6" />
        </div>
      );
    }
    if (actionType === 'update') {
      return (
        <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
          <Edit3 className="w-6 h-6" />
        </div>
      );
    }
    if (variant === 'warning') {
      return (
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-6 h-6" />
      </div>
    );
  };

  const getConfirmButtonVariant = (): ButtonVariant => {
    if (actionType === 'delete' || variant === 'danger') return 'danger';
    if (actionType === 'create' || variant === 'primary') return 'primary';
    if (actionType === 'update') return 'accent';
    if (variant === 'warning') return 'accent';
    return 'primary';
  };

  const defaultConfirmLabel = () => {
    if (confirmLabel) return confirmLabel;
    if (actionType === 'delete') return 'Ya, Hapus';
    if (actionType === 'create') return 'Ya, Simpan';
    if (actionType === 'update') return 'Ya, Perbarui';
    return 'Ya, Konfirmasi';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          {getIcon()}
          <div className="flex-1">
            <div className="text-sm text-slate-600 leading-relaxed">{message}</div>
          </div>
        </div>

        {dataSummary && dataSummary.length > 0 && (
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 max-h-48 overflow-y-auto">
            {dataSummary.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                <span className="font-medium text-slate-500">{item.label}:</span>
                <span className="font-bold text-slate-800 text-right">{item.value || '-'}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={getConfirmButtonVariant()}
            onClick={async () => {
              await onConfirm();
            }}
            isLoading={isLoading}
          >
            {defaultConfirmLabel()}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
