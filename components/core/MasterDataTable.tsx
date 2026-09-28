'use client';

import React, { useState, useRef } from 'react';
import { MasterTableSchema } from '@/types/masterCore';
import { useMasterTable } from '@/hooks/useMasterTable';
import { useToast } from '@/hooks/useToast';
import { MasterCrudModal } from './MasterCrudModal';
import { MasterDeleteModal } from './MasterDeleteModal';
import { MasterBulkEditModal } from './MasterBulkEditModal';
import { ExcelService } from '@/services/excelService';
import { PrintEngineService } from '@/services/printEngine';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Upload,
  Printer,
  Trash2,
  Edit2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Layers,
  Inbox,
  Filter,
  LayoutGrid,
  List,
  MoreVertical,
} from 'lucide-react';

export interface MasterDataTableProps<T extends Record<string, any>> {
  schema: MasterTableSchema<T>;
  data: T[];
  onInsert?: (item: Partial<T>) => Promise<void> | void;
  onUpdate?: (item: Partial<T>) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onBulkDelete?: (ids: string[]) => Promise<void> | void;
  onBulkUpdate?: (ids: string[], updates: Partial<T>) => Promise<void> | void;
  onImportExcel?: (importedData: any[]) => Promise<void> | void;
  customActions?: React.ReactNode;
  headerMetrics?: React.ReactNode;
  className?: string;
}

export function MasterDataTable<T extends Record<string, any>>({
  schema,
  data,
  onInsert,
  onUpdate,
  onDelete,
  onBulkDelete,
  onBulkUpdate,
  onImportExcel,
  customActions,
  headerMetrics,
  className = '',
}: MasterDataTableProps<T>) {
  const { showSuccess, showError, showInfo } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Table state hook
  const {
    search,
    setSearch,
    filters,
    handleFilterChange,
    handleResetFilters,
    sort,
    handleSort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    filteredData,
    paginatedData,
    selectedIds,
    handleToggleSelectAll,
    handleToggleSelectRow,
    clearSelection,
    exportToExcel,
  } = useMasterTable({
    schema,
    data,
  });

  // Modal states
  const [crudModalOpen, setCrudModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<T> | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>('');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pk = String(schema.primaryKey || 'id');
  const features = {
    enableSearch: true,
    enableSort: true,
    enablePagination: true,
    enableSelection: true,
    enableCreate: true,
    enableEdit: true,
    enableDelete: true,
    enableBulkDelete: true,
    enableBulkEdit: true,
    enableImportExcel: true,
    enableExportExcel: true,
    enablePrintPdf: true,
    ...schema.features,
  };

  // Handlers
  const handleOpenCreate = () => {
    setEditingItem(null);
    setCrudModalOpen(true);
  };

  const handleOpenEdit = (item: T) => {
    setEditingItem(item);
    setCrudModalOpen(true);
  };

  const handleOpenDelete = (id: string, name?: string) => {
    setDeletingId(id);
    setDeletingName(name || '');
    setIsBulkDeleting(false);
    setDeleteModalOpen(true);
  };

  const handleOpenBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    setDeleteModalOpen(true);
  };

  const handleOpenBulkEdit = () => {
    if (selectedIds.length === 0) return;
    setBulkEditModalOpen(true);
  };

  const handleSaveBulkEdit = async (targetIds: string[], updates: Partial<T>) => {
    try {
      if (onBulkUpdate) {
        await onBulkUpdate(targetIds, updates);
        showSuccess(
          'Edit Massal Berhasil',
          `Sebanyak ${targetIds.length} data ${schema.entityTitle || schema.entityName} berhasil diperbarui.`
        );
        clearSelection();
      }
    } catch (err: any) {
      showError('Gagal Edit Massal', err.message || 'Terjadi kesalahan saat memperbarui data massal.');
      throw err;
    }
  };

  const handleSaveData = async (formData: Partial<T>) => {
    try {
      if (editingItem && editingItem[pk]) {
        if (onUpdate) {
          await onUpdate(formData);
          showSuccess(
            'Perubahan Disimpan',
            `Data ${schema.entityTitle || schema.entityName} berhasil diperbarui.`
          );
        }
      } else {
        if (onInsert) {
          await onInsert(formData);
          showSuccess(
            'Berhasil Ditambahkan',
            `Data ${schema.entityTitle || schema.entityName} baru berhasil disimpan.`
          );
        }
      }
    } catch (err: any) {
      showError('Gagal Menyimpan', err.message || 'Terjadi kesalahan saat menyimpan data.');
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    try {
      if (isBulkDeleting) {
        if (onBulkDelete) {
          await onBulkDelete(selectedIds);
          showInfo(
            'Hapus Massal Berhasil',
            `${selectedIds.length} data ${schema.entityName.toLowerCase()} telah dihapus.`
          );
          clearSelection();
        }
      } else if (deletingId) {
        if (onDelete) {
          await onDelete(deletingId);
          showInfo(
            'Data Dihapus',
            `Data ${deletingName ? `"${deletingName}"` : schema.entityName} telah dihapus.`
          );
        }
      }
    } catch (err: any) {
      showError('Gagal Menghapus', err.message || 'Terjadi kesalahan saat menghapus data.');
    }
  };

  const handleExportExcelClick = async () => {
    try {
      await exportToExcel();
      showSuccess(
        'Ekspor Berhasil',
        `File Excel untuk ${schema.entityTitle || schema.entityName} berhasil diunduh.`
      );
    } catch (err: any) {
      showError('Gagal Ekspor', err.message || 'Gagal mengekspor file Excel.');
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await ExcelService.importExcel(file);
      if (onImportExcel) {
        await onImportExcel(imported);
        showSuccess(
          'Impor Berhasil',
          `${imported.length} data berhasil dibaca dari file Excel.`
        );
      }
    } catch (err: any) {
      showError('Gagal Impor Excel', err.message || 'Format file tidak sesuai.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePrintClick = () => {
    PrintEngineService.printDocument();
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFileChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Header Metrics Slot if provided */}
      {headerMetrics && <div>{headerMetrics}</div>}

      {/* Top Controls Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Search & Dynamic Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          {features.enableSearch && (
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Cari ${schema.entityTitle || schema.entityName}...`}
                className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-800"
              />
            </div>
          )}

          {/* Dynamic Schema Filters */}
          {schema.filters?.map((filter) => (
            <div
              key={filter.key}
              className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5"
            >
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={filters[filter.key] ?? 'ALL'}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">{filter.placeholder || `Semua ${filter.label}`}</option>
                {filter.options.map((opt) => (
                  <option key={String(opt.value)} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Reset Filters */}
          {(search || Object.keys(filters).length > 0) && (
            <button
              onClick={handleResetFilters}
              title="Reset Filter"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              title="Tampilan Tabel"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              title="Tampilan Kartu"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Density Toggle (for Table View) */}
          {viewMode === 'table' && (
            <button
              onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
              title={density === 'comfortable' ? 'Ubah ke Mode Padat' : 'Ubah ke Mode Renggang'}
              className="hidden lg:flex px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{density === 'comfortable' ? 'Renggang' : 'Padat'}</span>
            </button>
          )}

          {/* Bulk Edit Button */}
          {features.enableBulkEdit && onBulkUpdate && selectedIds.length > 0 && (
            <button
              onClick={handleOpenBulkEdit}
              className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Edit ({selectedIds.length})</span>
            </button>
          )}

          {/* Bulk Delete Button */}
          {features.enableBulkDelete && selectedIds.length > 0 && (
            <button
              onClick={handleOpenBulkDelete}
              className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedIds.length})</span>
            </button>
          )}

          {/* Desktop Direct Buttons */}
          <div className="hidden md:flex items-center gap-2">
            {/* Excel Import */}
            {features.enableImportExcel && onImportExcel && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Impor</span>
              </button>
            )}

            {/* Excel Export */}
            {features.enableExportExcel && (
              <button
                onClick={handleExportExcelClick}
                className="px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Ekspor</span>
              </button>
            )}

            {/* Print PDF */}
            {features.enablePrintPdf && (
              <button
                onClick={handlePrintClick}
                className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak</span>
              </button>
            )}
          </div>

          {/* Mobile Secondary Menu Dropdown */}
          <div className="relative md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 z-30 flex flex-col gap-1 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setViewMode(viewMode === 'table' ? 'cards' : 'table');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl text-left flex items-center gap-2"
                >
                  {viewMode === 'table' ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                  <span>{viewMode === 'table' ? 'Mode Kartu' : 'Mode Tabel'}</span>
                </button>
                {features.enableImportExcel && onImportExcel && (
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl text-left flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Impor Excel</span>
                  </button>
                )}
                {features.enableExportExcel && (
                  <button
                    onClick={() => {
                      handleExportExcelClick();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl text-left flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Ekspor Excel</span>
                  </button>
                )}
                {features.enablePrintPdf && (
                  <button
                    onClick={() => {
                      handlePrintClick();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl text-left flex items-center gap-2"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak PDF</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Custom Action Slot */}
          {customActions}

          {/* Add New Record */}
          {features.enableCreate && onInsert && (
            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah {schema.entityTitle || schema.entityName}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View Container (Adaptive Cards or Table) */}
      {viewMode === 'cards' ? (
        /* ADAPTIVE MOBILE / CARDS VIEW */
        <div className="flex flex-col gap-3">
          {paginatedData.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                <Inbox className="w-8 h-8 stroke-1" />
                <p className="text-xs font-semibold text-slate-500">Tidak ada data yang sesuai</p>
                {(search || Object.keys(filters).length > 0) && (
                  <button
                    onClick={handleResetFilters}
                    className="mt-1 text-xs font-bold text-slate-900 underline"
                  >
                    Bersihkan Filter
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedData.map((item, index) => {
                const itemId = String(item[pk]);
                const isSelected = selectedIds.includes(itemId);
                const visibleCols = schema.columns.filter((c) => !c.hidden);
                const primaryCol = visibleCols[0];
                const secondaryCols = visibleCols.slice(1);

                return (
                  <div
                    key={itemId || index}
                    className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-slate-900 ring-2 ring-slate-900/10 bg-slate-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Card Header: Checkbox + Primary Info */}
                    <div className="flex items-start justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {features.enableSelection && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(itemId)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer w-4 h-4"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {primaryCol?.render
                              ? primaryCol.render(item[primaryCol.key as string], item, index)
                              : String(item[primaryCol?.key as string] || '-')}
                          </p>
                          {item.nis && (
                            <span className="text-[11px] text-slate-500 font-medium">NIS: {item.nis}</span>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {features.enableEdit && onUpdate && (
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {features.enableDelete && onDelete && (
                          <button
                            onClick={() =>
                              handleOpenDelete(itemId, item.name || item.title || item.label || '')
                            }
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Content Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {secondaryCols.map((col) => {
                        const val = item[col.key as string];
                        return (
                          <div key={String(col.key)} className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                              {col.label}
                            </span>
                            <span className="font-semibold text-slate-800 truncate mt-0.5">
                              {col.render
                                ? col.render(val, item, index)
                                : col.type === 'badge'
                                ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{String(val || '-')}</span>
                                : col.type === 'boolean'
                                ? val ? 'Ya' : 'Tidak'
                                : String(val ?? '-')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD DESKTOP / TABLET DATA TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Sticky Table Header */}
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 font-bold tracking-tight shadow-2xs">
                <tr>
                  {/* Select All Checkbox */}
                  {features.enableSelection && (
                    <th className="py-3 px-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          paginatedData.length > 0 && selectedIds.length === paginatedData.length
                        }
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                      />
                    </th>
                  )}

                  {/* Number Index Column */}
                  <th className="py-3 px-3 w-12 text-center text-slate-400 font-medium">#</th>

                  {/* Dynamic Columns */}
                  {schema.columns
                    .filter((c) => !c.hidden)
                    .map((col) => {
                      const isSorted = sort.field === col.key;
                      const canSort = features.enableSort && col.sortable !== false;

                      return (
                        <th
                          key={String(col.key)}
                          style={{ width: col.width }}
                          className={`py-3 px-3.5 ${
                            col.align === 'center'
                              ? 'text-center'
                              : col.align === 'right'
                              ? 'text-right'
                              : 'text-left'
                          } ${canSort ? 'cursor-pointer select-none hover:bg-slate-100/60' : ''}`}
                          onClick={() => canSort && handleSort(String(col.key))}
                        >
                          <div
                            className={`inline-flex items-center gap-1.5 ${
                              col.align === 'center'
                                ? 'justify-center'
                                : col.align === 'right'
                                ? 'justify-end'
                                : 'justify-start'
                            }`}
                          >
                            <span>{col.label}</span>
                            {canSort && (
                              <span className="text-slate-400">
                                {isSorted ? (
                                  sort.direction === 'asc' ? (
                                    <ArrowUp className="w-3.5 h-3.5 text-slate-900" />
                                  ) : (
                                    <ArrowDown className="w-3.5 h-3.5 text-slate-900" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-40" />
                                )}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}

                  {/* Actions Column */}
                  {(features.enableEdit || features.enableDelete) && (
                    <th className="py-3 px-3.5 text-right w-24">Aksi</th>
                  )}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        schema.columns.filter((c) => !c.hidden).length +
                        (features.enableSelection ? 1 : 0) +
                        (features.enableEdit || features.enableDelete ? 2 : 1)
                      }
                      className="py-12 text-center"
                    >
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Inbox className="w-8 h-8 stroke-1" />
                        <p className="text-xs font-semibold text-slate-500">
                          Tidak ada data yang sesuai
                        </p>
                        {(search || Object.keys(filters).length > 0) && (
                          <button
                            onClick={handleResetFilters}
                            className="mt-1 text-xs font-bold text-slate-900 underline"
                          >
                            Bersihkan Filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, index) => {
                    const itemId = String(item[pk]);
                    const isSelected = selectedIds.includes(itemId);
                    const rowIndex = (currentPage - 1) * pageSize + index + 1;
                    const rowPadding = density === 'compact' ? 'py-1.5' : 'py-2.5';

                    return (
                      <tr
                        key={itemId || index}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? 'bg-slate-50' : ''
                        }`}
                      >
                        {/* Row Checkbox */}
                        {features.enableSelection && (
                          <td className={`${rowPadding} px-3.5 text-center`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(itemId)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                            />
                          </td>
                        )}

                        {/* Number Index */}
                        <td className={`${rowPadding} px-3 text-center text-slate-400 font-medium`}>
                          {rowIndex}
                        </td>

                        {/* Dynamic Columns Render */}
                        {schema.columns
                          .filter((c) => !c.hidden)
                          .map((col) => {
                            const val = item[col.key as string];

                            let content: React.ReactNode = val ?? '-';

                            if (col.render) {
                              content = col.render(val, item, index);
                            } else if (col.type === 'badge') {
                              content = (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                                  {String(val || '-')}
                                </span>
                              );
                            } else if (col.type === 'boolean') {
                              content = val ? (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Ya
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600">
                                  Tidak
                                </span>
                              );
                            }

                            return (
                              <td
                                key={String(col.key)}
                                className={`${rowPadding} px-3.5 ${
                                  col.align === 'center'
                                    ? 'text-center'
                                    : col.align === 'right'
                                    ? 'text-right'
                                    : 'text-left'
                                }`}
                              >
                                {content}
                              </td>
                            );
                          })}

                        {/* Row Action Buttons */}
                        {(features.enableEdit || features.enableDelete) && (
                          <td className={`${rowPadding} px-3.5 text-right`}>
                            <div className="inline-flex items-center gap-1 justify-end">
                              {features.enableEdit && onUpdate && (
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  title="Edit Data"
                                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {features.enableDelete && onDelete && (
                                <button
                                  onClick={() =>
                                    handleOpenDelete(
                                      itemId,
                                      item.name || item.title || item.label || ''
                                    )
                                  }
                                  title="Hapus Data"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        {/* Pagination Bar */}
        {features.enablePagination && (
          <div className="p-3.5 bg-slate-50/50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Info & Page Size */}
            <div className="flex items-center gap-3 text-slate-500 font-medium">
              <span>
                Menampilkan{' '}
                <strong className="text-slate-900 font-bold">
                  {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </strong>
                -
                <strong className="text-slate-900 font-bold">
                  {Math.min(currentPage * pageSize, totalItems)}
                </strong>{' '}
                dari <strong className="text-slate-900 font-bold">{totalItems}</strong> data
              </span>

              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <span>Baris:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={-1}>Semua</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2.5 py-1 font-bold text-slate-800 bg-white border border-slate-200 rounded-lg shadow-2xs">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* CRUD Form Modal */}
      <MasterCrudModal
        isOpen={crudModalOpen}
        onClose={() => setCrudModalOpen(false)}
        schema={schema}
        initialData={editingItem}
        onSave={handleSaveData}
      />

      {/* Delete Confirmation Modal */}
      <MasterDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        itemCount={isBulkDeleting ? selectedIds.length : 1}
        itemName={deletingName}
      />

      {/* Bulk Edit Modal */}
      <MasterBulkEditModal
        isOpen={bulkEditModalOpen}
        onClose={() => setBulkEditModalOpen(false)}
        schema={schema}
        selectedIds={selectedIds}
        onBulkUpdate={handleSaveBulkEdit}
      />
    </div>
  );
}
