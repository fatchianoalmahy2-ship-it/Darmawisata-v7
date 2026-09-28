'use client';

import React, { useState } from 'react';
import { MasterTableSchema, MasterFormField } from '@/types/masterCore';
import { CheckSquare, X, Save, AlertCircle } from 'lucide-react';

export interface MasterBulkEditModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  schema: MasterTableSchema<T>;
  selectedIds: string[];
  onBulkUpdate: (selectedIds: string[], updates: Partial<T>) => Promise<void> | void;
}

export function MasterBulkEditModal<T extends Record<string, any>>({
  isOpen,
  onClose,
  schema,
  selectedIds,
  onBulkUpdate,
}: MasterBulkEditModalProps<T>) {
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>('');
  const [fieldValue, setFieldValue] = useState<any>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive bulk editable fields from schema or default to all editable fields
  const availableFields: MasterFormField<T>[] =
    schema.bulkEditableFields && schema.bulkEditableFields.length > 0
      ? schema.bulkEditableFields
      : schema.fields && schema.fields.length > 0
      ? schema.fields.filter((f) => !f.disabled)
      : schema.columns
          .filter((col) => !col.hidden)
          .map((col) => ({
            key: col.key,
            label: col.label,
            type: col.type || 'text',
            options: col.options,
          }));

  if (!isOpen) return null;

  const currentFieldDef = availableFields.find(
    (f) => String(f.key) === selectedFieldKey
  );

  const handleFieldSelect = (key: string) => {
    setSelectedFieldKey(key);
    const fieldDef = availableFields.find((f) => String(f.key) === key);
    if (fieldDef?.defaultValue !== undefined) {
      setFieldValue(fieldDef.defaultValue);
    } else {
      setFieldValue('');
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFieldKey) {
      setError('Silakan pilih kolom yang ingin diubah secara massal.');
      return;
    }
    if (fieldValue === '' || fieldValue === undefined || fieldValue === null) {
      setError('Silakan masukkan nilai baru untuk kolom ini.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onBulkUpdate(selectedIds, { [selectedFieldKey]: fieldValue } as Partial<T>);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menerapkan perubahan massal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden transform scale-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                Edit Massal {schema.entityTitle || schema.entityName}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-none mt-0.5">
                Mengubah <strong className="text-slate-900 font-bold">{selectedIds.length}</strong> data terpilih secara serempak
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Select Field to Update */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Pilih Kolom / Field yang Ingin Diubah <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedFieldKey}
              onChange={(e) => handleFieldSelect(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
            >
              <option value="">-- Pilih Kolom Target --</option>
              {availableFields.map((f) => (
                <option key={String(f.key)} value={String(f.key)}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Enter/Select New Value */}
          {currentFieldDef && (
            <div className="flex flex-col gap-1.5 pt-2 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-slate-700">
                Nilai Baru untuk &quot;{currentFieldDef.label}&quot; <span className="text-rose-500">*</span>
              </label>

              {currentFieldDef.type === 'select' || currentFieldDef.type === 'badge' ? (
                <select
                  value={String(fieldValue)}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
                >
                  <option value="">-- Pilih Nilai Baru --</option>
                  {currentFieldDef.options?.map((opt) => (
                    <option key={String(opt.value)} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : currentFieldDef.type === 'boolean' ? (
                <select
                  value={fieldValue === true ? 'true' : fieldValue === false ? 'false' : ''}
                  onChange={(e) => setFieldValue(e.target.value === 'true')}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
                >
                  <option value="">-- Pilih Status --</option>
                  <option value="true">Ya / Aktif</option>
                  <option value="false">Tidak / Non-Aktif</option>
                </select>
              ) : currentFieldDef.type === 'textarea' ? (
                <textarea
                  rows={3}
                  value={fieldValue}
                  placeholder={`Masukkan ${currentFieldDef.label.toLowerCase()} baru...`}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              ) : (
                <input
                  type={currentFieldDef.type === 'number' ? 'number' : currentFieldDef.type === 'date' ? 'date' : 'text'}
                  value={fieldValue}
                  placeholder={`Masukkan ${currentFieldDef.label.toLowerCase()} baru...`}
                  onChange={(e) =>
                    setFieldValue(
                      currentFieldDef.type === 'number'
                        ? e.target.value === ''
                          ? ''
                          : Number(e.target.value)
                        : e.target.value
                    )
                  }
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              )}

              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Semua {selectedIds.length} baris yang terpilih akan diubah nilainya menjadi nilai ini.
              </p>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFieldKey}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSubmitting ? 'Menerapkan...' : `Terapkan ke ${selectedIds.length} Data`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
