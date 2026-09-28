'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface MetricKpiItem {
  id: string;
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  variant?: 'slate' | 'emerald' | 'blue' | 'amber' | 'purple' | 'rose';
}

export interface MetricKpiStripProps {
  items: MetricKpiItem[];
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

export const MetricKpiStrip: React.FC<MetricKpiStripProps> = ({
  items,
  columns = 4,
  className = '',
}) => {
  const colClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-5',
  }[columns];

  const variantStyles = {
    slate: {
      bg: 'bg-white border-slate-200',
      iconBg: 'bg-slate-100 text-slate-700',
      valueText: 'text-slate-900',
    },
    emerald: {
      bg: 'bg-emerald-50/50 border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-700',
      valueText: 'text-emerald-950',
    },
    blue: {
      bg: 'bg-blue-50/50 border-blue-200',
      iconBg: 'bg-blue-100 text-blue-700',
      valueText: 'text-blue-950',
    },
    amber: {
      bg: 'bg-amber-50/50 border-amber-200',
      iconBg: 'bg-amber-100 text-amber-700',
      valueText: 'text-amber-950',
    },
    purple: {
      bg: 'bg-purple-50/50 border-purple-200',
      iconBg: 'bg-purple-100 text-purple-700',
      valueText: 'text-purple-950',
    },
    rose: {
      bg: 'bg-rose-50/50 border-rose-200',
      iconBg: 'bg-rose-100 text-rose-700',
      valueText: 'text-rose-950',
    },
  };

  return (
    <div className={`grid ${colClass} gap-3 ${className}`}>
      {items.map((item) => {
        const Icon = item.icon;
        const style = variantStyles[item.variant || 'slate'];

        return (
          <div
            key={item.id}
            className={`p-3.5 rounded-2xl border ${style.bg} shadow-xs flex items-center gap-3 transition-all hover:shadow-sm`}
          >
            <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500 truncate">{item.label}</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`text-lg font-black tracking-tight ${style.valueText}`}>
                  {item.value}
                </span>
                {item.subValue && (
                  <span className="text-[11px] font-medium text-slate-400 truncate">
                    {item.subValue}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
