'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Upload,
  Printer,
  RotateCcw,
  SlidersHorizontal,
  X,
  Layers,
  Users,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

export interface SortOption {
  value: string;
  label: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface StandardActionToolbarProps {
  id?: string;
  className?: string;

  // Search
  search?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;

  // Wave filter
  wave?: string;
  onWaveChange?: (wave: string) => void;
  showWave?: boolean;
  waveOptions?: FilterOption[];

  // Class/Group filter
  selectedClass?: string;
  onClassChange?: (cls: string) => void;
  showClass?: boolean;
  classList?: string[];

  // Gender filter
  gender?: string;
  onGenderChange?: (gender: string) => void;
  showGender?: boolean;

  // Status / Custom filter
  status?: string;
  onStatusChange?: (status: string) => void;
  showStatus?: boolean;
  statusOptions?: FilterOption[];

  // Sorting
  sortValue?: string;
  onSortChange?: (val: string) => void;
  sortOptions?: SortOption[];

  // Action Handlers
  onImport?: () => void;
  importLabel?: string;
  onExport?: () => void;
  exportLabel?: string;
  isExporting?: boolean;
  onPrintPdf?: () => void;
  printPdfLabel?: string;
  isPrinting?: boolean;

  // Primary Add / Custom Action
  onAddNew?: () => void;
  addNewLabel?: string;
  customActions?: React.ReactNode;

  // Reset
  onReset?: () => void;
  totalRecords?: number;
  filteredCount?: number;
}

export const StandardActionToolbar: React.FC<StandardActionToolbarProps> = ({
  id = 'standard-action-toolbar',
  className = '',

  search = '',
  onSearchChange,
  searchPlaceholder = 'Cari data...',
  showSearch = true,

  wave = 'ALL',
  onWaveChange,
  showWave = false,
  waveOptions = [
    { value: 'ALL', label: 'Semua Gelombang' },
    { value: 'BALI_GEL_1', label: 'Gel 1 (Bali)' },
    { value: 'BALI_GEL_2', label: 'Gel 2 (Bali)' },
    { value: 'YOGYA_GEL_1', label: 'Gelombang Yogya' },
  ],

  selectedClass = 'ALL',
  onClassChange,
  showClass = false,
  classList = [],

  gender = 'ALL',
  onGenderChange,
  showGender = false,

  status = 'ALL',
  onStatusChange,
  showStatus = false,
  statusOptions = [
    { value: 'ALL', label: 'Semua Status' },
    { value: 'REGISTERED', label: 'Sudah Registrasi' },
    { value: 'UNREGISTERED', label: 'Belum Registrasi' },
  ],

  sortValue,
  onSortChange,
  sortOptions = [],

  onImport,
  importLabel = 'Impor Excel',
  onExport,
  exportLabel = 'Ekspor Excel',
  isExporting = false,
  onPrintPdf,
  printPdfLabel = 'Cetak PDF',
  isPrinting = false,

  onAddNew,
  addNewLabel = 'Tambah Data',
  customActions,

  onReset,
  totalRecords,
  filteredCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const hasActiveFilters =
    (wave && wave !== 'ALL') ||
    (selectedClass && selectedClass !== 'ALL') ||
    (gender && gender !== 'ALL') ||
    (status && status !== 'ALL') ||
    (search && search.trim() !== '');

  return (
    <div id={id} className={`space-y-3 ${className}`}>
      {/* Main Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left Side: Search & Primary Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          {showSearch && onSearchChange && (
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id={`${id}-search-input`}
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-400/20 focus:border-slate-800 dark:focus:border-slate-600 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Desktop Filter Dropdowns */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Wave Selector */}
            {showWave && onWaveChange && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  id={`${id}-wave-select`}
                  value={wave}
                  onChange={(e) => onWaveChange(e.target.value)}
                  aria-label="Filter Gelombang"
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  {waveOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Class Selector */}
            {showClass && onClassChange && classList.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  id={`${id}-class-select`}
                  value={selectedClass}
                  onChange={(e) => onClassChange(e.target.value)}
                  aria-label="Filter Kelas"
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[130px] truncate"
                >
                  <option value="ALL" className="dark:bg-slate-900">Semua Kelas</option>
                  {classList.map((cls) => (
                    <option key={cls} value={cls} className="dark:bg-slate-900">
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Gender Selector */}
            {showGender && onGenderChange && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  id={`${id}-gender-select`}
                  value={gender}
                  onChange={(e) => onGenderChange(e.target.value)}
                  aria-label="Filter Gender"
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="dark:bg-slate-900">Semua Gender</option>
                  <option value="LAKI-LAKI" className="dark:bg-slate-900">Laki-Laki</option>
                  <option value="PEREMPUAN" className="dark:bg-slate-900">Perempuan</option>
                </select>
              </div>
            )}

            {/* Status Selector */}
            {showStatus && onStatusChange && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  id={`${id}-status-select`}
                  value={status}
                  onChange={(e) => onStatusChange(e.target.value)}
                  aria-label="Filter Status"
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Selector */}
            {sortOptions.length > 0 && onSortChange && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  id={`${id}-sort-select`}
                  value={sortValue}
                  onChange={(e) => onSortChange(e.target.value)}
                  aria-label="Urutkan Data"
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reset Button */}
            {hasActiveFilters && onReset && (
              <button
                id={`${id}-reset-filter-btn`}
                type="button"
                onClick={onReset}
                title="Reset Filter"
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Filter Trigger Button */}
          <div className="flex lg:hidden items-center gap-1.5">
            <button
              id={`${id}-mobile-filter-toggle`}
              type="button"
              onClick={() => setFilterDrawerOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                hasActiveFilters
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2 justify-end shrink-0">
          {/* Custom Action Slot */}
          {customActions}

          {/* Primary Add Button */}
          {onAddNew && (
            <button
              id={`${id}-add-new-btn`}
              type="button"
              onClick={onAddNew}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white rounded-xl shadow-xs transition-all cursor-pointer select-none"
            >
              <span>+</span>
              <span>{addNewLabel}</span>
            </button>
          )}

          {/* Desktop Direct Action Buttons */}
          <div className="hidden sm:flex items-center gap-1.5">
            {onImport && (
              <button
                id={`${id}-import-excel-btn`}
                type="button"
                onClick={onImport}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
                title={importLabel}
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>{importLabel}</span>
              </button>
            )}

            {onExport && (
              <button
                id={`${id}-export-excel-btn`}
                type="button"
                onClick={onExport}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                title={exportLabel}
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isExporting ? 'Mengekspor...' : exportLabel}</span>
              </button>
            )}

            {onPrintPdf && (
              <button
                id={`${id}-print-pdf-btn`}
                type="button"
                onClick={onPrintPdf}
                disabled={isPrinting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                title={printPdfLabel}
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>{isPrinting ? 'Menyiapkan...' : printPdfLabel}</span>
              </button>
            )}
          </div>

          {/* Mobile More Actions Dropdown Trigger */}
          <div className="flex sm:hidden items-center">
            <button
              id={`${id}-mobile-actions-toggle`}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              aria-label="Aksi Lainnya"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Actions Dropdown Card */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-md space-y-2">
          {onImport && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onImport();
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>{importLabel}</span>
            </button>
          )}
          {onExport && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onExport();
              }}
              disabled={isExporting}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>{isExporting ? 'Mengekspor...' : exportLabel}</span>
            </button>
          )}
          {onPrintPdf && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onPrintPdf();
              }}
              disabled={isPrinting}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>{isPrinting ? 'Menyiapkan...' : printPdfLabel}</span>
            </button>
          )}
        </div>
      )}

      {/* Mobile Filter Modal / Drawer */}
      {filterDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <span>Filter & Urutkan Data</span>
              </div>
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Wave */}
              {showWave && onWaveChange && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Gelombang Acara
                  </label>
                  <select
                    value={wave}
                    onChange={(e) => onWaveChange(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {waveOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Class */}
              {showClass && onClassChange && classList.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Rombongan Belajar (Kelas)
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => onClassChange(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="ALL">Semua Kelas</option>
                    {classList.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Gender */}
              {showGender && onGenderChange && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Jenis Kelamin
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => onGenderChange(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="ALL">Semua Gender</option>
                    <option value="LAKI-LAKI">Laki-Laki</option>
                    <option value="PEREMPUAN">Perempuan</option>
                  </select>
                </div>
              )}

              {/* Status */}
              {showStatus && onStatusChange && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Status Registrasi
                  </label>
                  <select
                    value={status}
                    onChange={(e) => onStatusChange(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort */}
              {sortOptions.length > 0 && onSortChange && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Urutkan Berdasarkan
                  </label>
                  <select
                    value={sortValue}
                    onChange={(e) => onSortChange(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {onReset && (
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    setFilterDrawerOpen(false);
                  }}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(false)}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Counter Info Strip (Optional) */}
      {(totalRecords !== undefined || filteredCount !== undefined) && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
          <span>
            Menampilkan{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {filteredCount ?? totalRecords ?? 0}
            </strong>{' '}
            data {hasActiveFilters && totalRecords ? `(dari total ${totalRecords})` : ''}
          </span>
          {hasActiveFilters && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Filter aktif
            </span>
          )}
        </div>
      )}
    </div>
  );
};
