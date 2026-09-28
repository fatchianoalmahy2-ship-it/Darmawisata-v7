'use client';

import React, { useState, useEffect } from 'react';
import { EntitySchema } from '@/config/schemas/studentSchema';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';

interface DynamicFormModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  schema: EntitySchema | any;
  initialData?: Partial<T> | null;
  onSave: (data: Partial<T>) => void;
}

export function DynamicFormModal<T extends Record<string, any>>({
  isOpen,
  onClose,
  schema,
  initialData,
  onSave
}: DynamicFormModalProps<T>) {
  const [formData, setFormData] = useState<Partial<T>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
      setIsConfirmOpen(false);
    }
  }, [isOpen, initialData]);

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmedSave = () => {
    onSave(formData);
    setIsConfirmOpen(false);
  };

  const isEditing = !!(initialData && (initialData as any).id);
  const rawFields = schema.fields || schema.columns || [];
  const entityTitle = schema.entityTitle || schema.entityName || 'Data';

  const normalizedFields = rawFields.map((f: any) => ({
    name: f.name || f.key || '',
    label: f.label || f.name || f.key || '',
    type: f.type || 'text',
    options: f.options || [],
    required: !!f.required,
    placeholder: f.placeholder || `Masukkan ${f.label || f.name || f.key}...`,
    colSpan: f.colSpan || 1,
    min: f.min,
    max: f.max,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit ${entityTitle}` : `Tambah ${entityTitle}`}
      subtitle={`Formulir data ${entityTitle.toLowerCase()}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {normalizedFields.map((field: any) => {
            const val = formData[field.name as keyof T] ?? '';
            const isFullWidth = field.colSpan === 2 || field.type === 'textarea';
            
            return (
              <div key={field.name} className={`flex flex-col gap-1 ${isFullWidth ? 'md:col-span-2' : ''}`}>
                <label className="text-xs font-bold text-slate-700">
                  {field.label} {field.required && <span className="text-rose-500">*</span>}
                </label>
                
                {field.type === 'enum' || field.type === 'select' ? (
                  <select
                    value={val as string}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih {field.label} --</option>
                    {field.options?.map((opt: any) => {
                      const optVal = typeof opt === 'object' ? opt.value : opt;
                      const optLabel = typeof opt === 'object' ? opt.label : opt;
                      return (
                        <option key={String(optVal)} value={String(optVal)}>{optLabel}</option>
                      );
                    })}
                  </select>
                ) : field.type === 'boolean' ? (
                  <select
                    value={val === true ? 'true' : val === false ? 'false' : ''}
                    onChange={(e) => handleChange(field.name, e.target.value === 'true')}
                    required={field.required}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih {field.label} --</option>
                    <option value="true">Ya</option>
                    <option value="false">Tidak</option>
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={val as string}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    placeholder={field.placeholder}
                    rows={3}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    min={field.min}
                    max={field.max}
                    value={val as string | number}
                    onChange={(e) => handleChange(field.name, field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                    required={field.required}
                    placeholder={field.placeholder}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm cursor-pointer"
          >
            Simpan
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmedSave}
        title={isEditing ? `Konfirmasi Perubahan ${entityTitle}` : `Konfirmasi Penambahan ${entityTitle}`}
        message={`Apakah Anda yakin ingin ${isEditing ? 'memperbarui' : 'menyimpan'} data ${entityTitle.toLowerCase()} ini?`}
        actionType={isEditing ? 'update' : 'create'}
        dataSummary={normalizedFields.slice(0, 5).map(f => ({
          label: f.label,
          value: String(formData[f.name as keyof T] ?? '-')
        }))}
      />
    </Modal>
  );
}
