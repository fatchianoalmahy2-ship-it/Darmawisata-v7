'use client';

import React, { useState } from 'react';
import { EntitySchema, EntitySchemaField } from '@/config/schemas/studentSchema';
import { useTableQuery } from '@/hooks/useTableQuery';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { StandardTable, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/StandardTable';
import { Edit, Trash2 } from 'lucide-react';
import { UserRole } from '@/types';
import { ConfirmModal } from '@/components/modals/ConfirmModal';

interface MasterDataTemplateProps<T> {
  schema: EntitySchema | any;
  data: T[];
  currentUserRole?: UserRole;
  onAdd?: (item: T) => void;
  onUpdate?: (item: T) => void;
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onImport?: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  customActions?: React.ReactNode;
  CustomMobileCard?: React.FC<{ item: T; onEdit?: () => void; onDelete?: () => void }>;
}

export function MasterDataTemplate<T extends { id?: string }>({
  schema,
  data = [],
  currentUserRole = 'ADMIN',
  onAdd,
  onUpdate,
  onDelete,
  onImport,
  onExport,
  onPrint,
  customActions,
  CustomMobileCard
}: MasterDataTemplateProps<T>) {
  // Normalize fields across EntitySchema and MasterTableSchema
  const rawFields = schema.fields || schema.columns || [];
  const normalizedFields: EntitySchemaField[] = rawFields.map((f: any) => ({
    name: f.name || f.key || '',
    label: f.label || f.name || f.key || '',
    type: f.type || 'string',
    options: f.options || [],
    required: !!f.required,
    searchable: f.searchable !== false,
    filterable: !!f.filterable,
    sortable: f.sortable !== false,
    hidden: !!f.hidden,
  }));

  // Extract configuration from schema
  const searchFields = normalizedFields.filter(f => f.searchable).map(f => f.name as keyof T);
  
  const filterOptions = (schema.filters || normalizedFields.filter(f => f.filterable && (f.type === 'enum' || f.type === 'boolean' || f.type === 'string' || (f.type as string) === 'select')))
    .map((f: any) => {
      let options = f.options || [];
      if (f.type === 'boolean' && options.length === 0) {
        options = [{ value: 'true', label: 'Ya' }, { value: 'false', label: 'Tidak' }];
      }
      return {
        key: f.name || f.key,
        label: f.label,
        placeholder: f.placeholder || `Semua ${f.label}`,
        options
      };
    });

  // Use the generic pipeline hook
  const {
    search, setSearch,
    sort, handleSort,
    filters, setFilters, handleClearFilters,
    pagination, setPagination,
    paginatedData, totalPages
  } = useTableQuery<T>(data, {
    searchFields,
    initialPageSize: schema.defaultPageSize || 10,
    filterFn: (item, activeFilters) => {
      for (const [key, val] of Object.entries(activeFilters)) {
        if (!val) continue;
        const itemVal = item[key as keyof T];
        // Handle boolean vs string matching (including undefined/null for false)
        if (val === 'true' || val === 'false') {
          const expectedBool = val === 'true';
          const actualBool = Boolean(itemVal);
          if (actualBool !== expectedBool) return false;
        } else if (typeof itemVal === 'boolean') {
          if (String(itemVal) !== val) return false;
        } else if (String(itemVal ?? '') !== val) {
          return false;
        }
      }
      return true;
    }
  });

  const canCreate = schema.permissions?.create ? schema.permissions.create.includes(currentUserRole) : true;
  const canDelete = schema.permissions?.delete ? schema.permissions.delete.includes(currentUserRole) : true;
  const canUpdate = schema.permissions?.update ? schema.permissions.update.includes(currentUserRole) : true;
  const canExport = schema.permissions?.export ? schema.permissions.export.includes(currentUserRole) : true;
  const canPrint = schema.permissions?.print ? schema.permissions.print.includes(currentUserRole) : true;

  const entityTitle = schema.entityTitle || schema.entityName || 'Data';
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  const handleConfirmDelete = () => {
    if (itemToDelete && itemToDelete.id && onDelete) {
      onDelete(itemToDelete.id as string);
    }
    setItemToDelete(null);
  };

  const getFieldValue = (item: T, field: EntitySchemaField) => {
    const val = item[field.name as keyof T];
    if (field.type === 'boolean') {
      return val ? 'Ya' : 'Tidak';
    }
    if (val === undefined || val === null) {
      return '-';
    }
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return val as React.ReactNode;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Dynamic Command Bar */}
      <div className="px-3 py-3 md:px-6 md:py-4 bg-white border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base md:text-xl font-black text-slate-900 tracking-tight">{entityTitle}</h2>
            <p className="hidden md:block text-sm font-medium text-slate-500 mt-1">
              {schema.description || `Kelola data ${entityTitle.toLowerCase()} dengan mudah.`}
            </p>
          </div>
          <div className="flex gap-2">
            {canCreate && onAdd && (
              <button onClick={() => onAdd({} as T)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors">
                + Tambah
              </button>
            )}
            {canExport && onImport && (
              <button onClick={onImport} className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold shadow-xs transition-colors">
                Import
              </button>
            )}
            {customActions}
          </div>
        </div>

        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={`Cari ${entityTitle}...`}
          filters={filterOptions}
          activeFilters={filters}
          onFilterChange={setFilters}
          onClearFilters={handleClearFilters}
          onExportExcel={canExport ? onExport : undefined}
          onPrint={canPrint ? onPrint : undefined}
        />
      </div>

      {/* Dynamic Data Grid */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="hidden md:block">
          <StandardTable>
            <TableHeader>
              <tr>
                {normalizedFields.filter(f => !f.hidden).map(f => (
                  <TableCell key={f.name} isHeader className={f.sortable ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}>
                    <div onClick={() => f.sortable && handleSort(f.name)} className="flex items-center gap-1">
                      {f.label}
                      {sort.field === f.name && (sort.direction === 'asc' ? ' ↑' : ' ↓')}
                    </div>
                  </TableCell>
                ))}
                {(canUpdate || canDelete) && <TableCell isHeader className="text-right">Aksi</TableCell>}
              </tr>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={normalizedFields.filter(f => !f.hidden).length + 1} className="text-center py-8 text-slate-500">
                    Tidak ada data {entityTitle.toLowerCase()} ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item, idx) => (
                  <TableRow key={item.id || idx}>
                    {normalizedFields.filter(f => !f.hidden).map(f => (
                      <TableCell key={f.name}>
                        {getFieldValue(item, f)}
                      </TableCell>
                    ))}
                    {(canUpdate || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canUpdate && onUpdate && (
                            <button onClick={() => onUpdate(item)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && onDelete && item.id && (
                            <button onClick={() => setItemToDelete(item)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </StandardTable>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-3">
          {paginatedData.length === 0 ? (
            <div className="text-center py-8 text-slate-500 bg-white rounded-xl border border-slate-200">
              Tidak ada data {entityTitle.toLowerCase()} ditemukan.
            </div>
          ) : (
            paginatedData.map((item, idx) => {
              if (CustomMobileCard) {
                return (
                  <CustomMobileCard 
                    key={item.id || idx} 
                    item={item} 
                    onEdit={canUpdate && onUpdate ? () => onUpdate(item) : undefined}
                    onDelete={canDelete && onDelete && item.id ? () => onDelete(item.id as string) : undefined}
                  />
                );
              }
              // Generic fallback card
              return (
                <div key={item.id || idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2">
                  {normalizedFields.filter(f => !f.hidden).slice(0, 3).map((f, i) => (
                    <div key={f.name} className={i === 0 ? "font-bold text-slate-900" : "text-sm text-slate-600"}>
                      {i !== 0 && <span className="font-medium mr-1">{f.label}:</span>}
                      {getFieldValue(item, f)}
                    </div>
                  ))}
                  {(canUpdate || canDelete) && (
                    <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100">
                      {canUpdate && onUpdate && (
                        <button onClick={() => onUpdate(item)} className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-lg">
                          Edit
                        </button>
                      )}
                      {canDelete && onDelete && item.id && (
                        <button onClick={() => setItemToDelete(item)} className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 rounded-lg">
                          Hapus
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="px-4 py-3 bg-white border-t border-slate-200 shrink-0">
        <PaginationControls 
          currentPage={pagination.currentPage} 
          totalPages={totalPages} 
          pageSize={pagination.pageSize}
          totalItems={data.length}
          onPageChange={(page) => setPagination({ ...pagination, currentPage: page })} 
        />
      </div>

      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={`Konfirmasi Hapus ${entityTitle}`}
        message={`Apakah Anda yakin ingin menghapus data ${entityTitle.toLowerCase()} ini? Tindakan ini tidak dapat dibatalkan.`}
        actionType="delete"
        dataSummary={itemToDelete ? normalizedFields.filter(f => !f.hidden).slice(0, 4).map(f => ({
          label: f.label,
          value: String((itemToDelete as any)[f.name] ?? '-')
        })) : undefined}
      />
    </div>
  );
}
