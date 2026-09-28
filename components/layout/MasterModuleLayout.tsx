'use client';

import React from 'react';
import { LucideIcon, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginationControls } from '@/components/ui/PaginationControls';

export interface StatItemConfig {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'teal' | 'amber' | 'rose' | 'purple' | 'indigo';
  onClick?: () => void;
  actionText?: string;
}

export interface SubTabConfig {
  key: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
  isActive: boolean;
  onClick: () => void;
}

export interface MasterModuleLayoutProps {
  id?: string;
  badge?: {
    text: string;
    icon?: LucideIcon;
    color?: 'blue' | 'emerald' | 'teal' | 'amber' | 'purple' | 'indigo' | 'fuchsia';
  };
  title: string;
  subtitle?: string;
  stats?: StatItemConfig[];
  subTabs?: SubTabConfig[];
  toolbar?: {
    searchPlaceholder?: string;
    search: string;
    onSearchChange: (value: string) => void;
    filters?: Array<{
      key: string;
      label: string;
      placeholder: string;
      options: Array<{ value: string; label: string }>;
    }>;
    activeFilters?: Record<string, any>;
    onFilterChange?: (key: string, val: any) => void;
    onClearFilters?: () => void;
    onPrint?: () => void;
    onExportExcel?: () => void;
    extraActions?: React.ReactNode;
  };
  pagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];
  };
  children: React.ReactNode;
}

const colorStyles = {
  blue: {
    bgLight: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    badgeText: 'text-blue-700',
  },
  emerald: {
    bgLight: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    badgeText: 'text-emerald-700',
  },
  teal: {
    bgLight: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-200',
    badgeText: 'text-teal-700',
  },
  amber: {
    bgLight: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    badgeText: 'text-amber-700',
  },
  rose: {
    bgLight: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    badgeText: 'text-rose-700',
  },
  purple: {
    bgLight: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    badgeText: 'text-purple-700',
  },
  indigo: {
    bgLight: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    badgeText: 'text-indigo-700',
  },
  fuchsia: {
    bgLight: 'bg-fuchsia-50',
    text: 'text-fuchsia-600',
    border: 'border-fuchsia-200',
    badgeText: 'text-fuchsia-700',
  },
};

export const MasterModuleLayout: React.FC<MasterModuleLayoutProps> = ({
  id,
  badge,
  title,
  subtitle,
  stats,
  subTabs,
  toolbar,
  pagination,
  children,
}) => {
  const badgeColor = badge?.color ? colorStyles[badge.color] : colorStyles.blue;
  const BadgeIcon = badge?.icon;

  return (
    <div className="space-y-4 sm:space-y-6" id={id}>
      {/* 1. Standardized Module Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {badge && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeColor.bgLight} ${badgeColor.badgeText} border ${badgeColor.border} mb-1`}
            >
              {BadgeIcon && <BadgeIcon className="w-3.5 h-3.5" />}
              <span>{badge.text}</span>
            </div>
          )}
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* 2. Standardized Bento Metric Cards Grid (Executive Dashboard Gold Standard) */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {stats.map((st, idx) => {
            const Icon = st.icon;
            const cStyle = colorStyles[st.color || 'blue'];
            return (
              <div
                key={idx}
                onClick={st.onClick}
                className={`bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all group ${
                  st.onClick ? 'cursor-pointer active:scale-[0.98]' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span
                      className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wider truncate ${
                        st.color ? cStyle.text : 'text-slate-500'
                      }`}
                    >
                      {st.label}
                    </span>
                    <div
                      className={`p-1.5 sm:p-2.5 rounded-xl ${cStyle.bgLight} ${cStyle.text} group-hover:scale-110 transition-transform shrink-0`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 sm:gap-2">
                    <h3 className="text-xl sm:text-3xl font-black text-slate-900">
                      {st.value}
                    </h3>
                  </div>
                  {st.subtext && (
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">
                      {st.subtext}
                    </p>
                  )}
                </div>
                {st.actionText && (
                  <div
                    className={`mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs font-bold ${cStyle.text}`}
                  >
                    <span>{st.actionText}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Sub-Navigation Tabs Switcher (Pill Layout with Horizontal Scroll on Mobile) */}
      {subTabs && subTabs.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-print">
          {subTabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={tab.onClick}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer active:scale-95 ${
                  tab.isActive
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      tab.isActive
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Unified 1-Row Toolbar (Search + Responsive Filter + Extra Actions) */}
      {toolbar && (
        <SearchFilterBar
          searchPlaceholder={toolbar.searchPlaceholder || 'Cari data...'}
          search={toolbar.search}
          onSearchChange={toolbar.onSearchChange}
          filters={toolbar.filters || []}
          activeFilters={toolbar.activeFilters || {}}
          onFilterChange={toolbar.onFilterChange || (() => {})}
          onClearFilters={toolbar.onClearFilters || (() => {})}
          onPrint={toolbar.onPrint}
          onExportExcel={toolbar.onExportExcel}
          extraActions={toolbar.extraActions}
        />
      )}

      {/* 5. Main Content Container (Table & Mobile Cards Slot) */}
      <div className="space-y-4">
        {children}
      </div>

      {/* 6. Standardized Unified Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
          <div className="text-xs text-slate-500 font-semibold text-center sm:text-left">
            Menampilkan halaman{' '}
            <span className="font-bold text-slate-900">{pagination.currentPage}</span> dari{' '}
            <span className="font-bold text-slate-900">{pagination.totalPages}</span>{' '}
            (Total {pagination.totalItems} Data)
          </div>
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
            pageSize={pagination.pageSize}
            onPageSizeChange={pagination.onPageSizeChange}
            pageSizeOptions={pagination.pageSizeOptions || [10, 25, 50, 100]}
            totalItems={pagination.totalItems}
          />
        </div>
      )}
    </div>
  );
};
