'use client';

import React, { useState, useEffect } from 'react';
import { MasterTableSchema, MasterFormField } from '@/types/masterCore';
import { X, Save, PlusCircle, Edit3 } from 'lucide-react';

export interface MasterCrudModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  schema: MasterTableSchema<T>;
  initialData?: Partial<T> | null;
  onSave: (data: Partial<T>) => Promise<void> | void;
}

export function MasterCrudModal<T extends Record<string, any>>({
  isOpen,
  onClose,
  schema,
  initialData,
  onSave,
}: MasterCrudModalProps<T>) {
  const [formData, setFormData] = useState<Partial<T>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!(initialData && initialData[schema.primaryKey as string]);

  // Derive form fields from schema fields or columns
  const fields: MasterFormField<T>[] = React.useMemo(() => {
    return schema.fields && schema.fields.length > 0
      ? schema.fields
      : schema.columns
          .filter((col) => !col.hidden)
          .map((col) => ({
            key: col.key,
            label: col.label,
            type: col.type || 'text',
            options: col.options,
          }));
  }, [schema.fields, schema.columns]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        const defaults: Record<string, any> = {};
        fields.forEach((f) => {
          if (f.defaultValue !== undefined) {
            defaults[f.key as string] = f.defaultValue;
          }
        });
        setFormData(defaults as Partial<T>);
      }
      setErrors({});
    }
  }, [isOpen, initialData, fields]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    fields.forEach((f) => {
      const val = formData[f.key as string];
      if (f.required && (val === undefined || val === null || String(val).trim() === '')) {
        newErrors[f.key as string] = `${f.label} wajib diisi`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error saving data:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden transform scale-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              {isEditing ? <Edit3 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                {isEditing ? `Edit ${schema.entityTitle || schema.entityName}` : `Tambah ${schema.entityTitle || schema.entityName} Baru`}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-none mt-0.5">
                Isi rincian data di bawah ini secara lengkap
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

        {/* Modal Body / Form Fields */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => {
              const fieldKey = String(field.key);
              const val = formData[fieldKey] ?? '';
              const error = errors[fieldKey];
              const isFullWidth = field.colSpan === 2 || field.type === 'textarea';

              return (
                <div
                  key={fieldKey}
                  className={`flex flex-col gap-1.5 ${isFullWidth ? 'md:col-span-2' : ''}`}
                >
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>
                      {field.label}
                      {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                    </span>
                    {field.helpText && (
                      <span className="text-[10px] text-slate-400 font-normal">{field.helpText}</span>
                    )}
                  </label>

                  {field.type === 'select' || field.type === 'badge' ? (
                    <select
                      value={String(val)}
                      onChange={(e) => handleChange(fieldKey, e.target.value)}
                      disabled={field.disabled}
                      className={`px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all ${
                        error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                      }`}
                    >
                      <option value="">-- Pilih {field.label} --</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'boolean' ? (
                    <select
                      value={val === true ? 'true' : val === false ? 'false' : ''}
                      onChange={(e) => handleChange(fieldKey, e.target.value === 'true')}
                      disabled={field.disabled}
                      className={`px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all ${
                        error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                      }`}
                    >
                      <option value="">-- Pilih Status --</option>
                      <option value="true">Ya / Aktif</option>
                      <option value="false">Tidak / Non-Aktif</option>
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      rows={field.rows || 3}
                      value={val}
                      placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}...`}
                      onChange={(e) => handleChange(fieldKey, e.target.value)}
                      disabled={field.disabled}
                      className={`px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all ${
                        error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                      }`}
                    />
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={val}
                      min={field.min}
                      max={field.max}
                      placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}...`}
                      onChange={(e) =>
                        handleChange(
                          fieldKey,
                          field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
                        )
                      }
                      disabled={field.disabled}
                      className={`px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all ${
                        error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                      }`}
                    />
                  )}

                  {error && <span className="text-[11px] font-semibold text-rose-500">{error}</span>}
                </div>
              );
            })}
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
