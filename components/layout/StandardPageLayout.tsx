'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { MetricKpiStrip, MetricKpiItem } from '@/components/common/MetricKpiStrip';

export interface StandardPageLayoutProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  kpis?: MetricKpiItem[];
  kpiColumns?: 2 | 3 | 4 | 5;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
  className?: string;
}

export const StandardPageLayout: React.FC<StandardPageLayoutProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  kpis,
  kpiColumns = 4,
  headerActions,
  children,
  footerActions,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-5 max-w-7xl mx-auto w-full p-4 sm:p-6 ${className}`}>
      {/* LAYER 1: UNIFIED PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none">
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className="text-xs text-slate-500 font-medium leading-none mt-1.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Optional Right Header Actions */}
        {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
      </div>

      {/* LAYER 2: METRIC KPI STRIP */}
      {kpis && kpis.length > 0 && (
        <MetricKpiStrip items={kpis} columns={kpiColumns} />
      )}

      {/* LAYER 3 & 4: PRIMARY WORKSPACE */}
      <div className="flex-1 min-w-0">{children}</div>

      {/* LAYER 5: DEDICATED STICKY/ACTION FOOTER */}
      {footerActions && (
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between gap-3">
          {footerActions}
        </div>
      )}
    </div>
  );
};
