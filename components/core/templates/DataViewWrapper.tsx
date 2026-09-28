'use client';

import React, { useState } from 'react';
import { EntitySchema } from '@/config/schemas/studentSchema';
import { MasterDataTemplate } from './MasterDataTemplate';
import { DynamicFormModal } from './DynamicFormModal';
import { UserRole } from '@/types';

interface DataViewWrapperProps<T> {
  schema: EntitySchema | any;
  data: T[];
  currentUserRole?: UserRole;
  onSave: (item: Partial<T>) => void;
  onDelete: (id: string) => void;
  onImport?: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  customActions?: React.ReactNode;
  customFormModal?: (props: {
    isOpen: boolean;
    onClose: () => void;
    initialData: Partial<T> | null;
    onSave: (formData: Partial<T>) => void;
  }) => React.ReactNode;
}

export function DataViewWrapper<T extends { id?: string }>({
  schema,
  data,
  currentUserRole = 'ADMIN',
  onSave,
  onDelete,
  onImport,
  onExport,
  onPrint,
  customActions,
  customFormModal
}: DataViewWrapperProps<T>) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<T> | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: T) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleSave = (formData: Partial<T>) => {
    onSave(formData);
    setIsFormOpen(false);
  };

  return (
    <>
      <MasterDataTemplate<T>
        schema={schema}
        data={data}
        currentUserRole={currentUserRole}
        onAdd={handleAdd}
        onUpdate={handleEdit}
        onDelete={onDelete}
        onImport={onImport}
        onExport={onExport}
        onPrint={onPrint}
        customActions={customActions}
      />
      {customFormModal ? (
        customFormModal({
          isOpen: isFormOpen,
          onClose: () => setIsFormOpen(false),
          initialData: editingItem,
          onSave: handleSave,
        })
      ) : (
        <DynamicFormModal<T>
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          schema={schema}
          initialData={editingItem}
          onSave={handleSave}
        />
      )}
    </>
  );
}
