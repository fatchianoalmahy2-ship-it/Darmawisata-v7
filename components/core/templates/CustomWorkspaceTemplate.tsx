'use client';

import React from 'react';
import { MasterTableSchema } from '@/types/masterCore';

export interface CustomWorkspaceTemplateProps<T = any> {
  schema?: Partial<MasterTableSchema<T>>;
  title?: string;
  description?: string;
  headerMetrics?: React.ReactNode;
  toolbarActions?: React.ReactNode;
  children?: React.ReactNode;
  pluginComponent?: React.ComponentType<any>;
  pluginProps?: Record<string, any>;
  className?: string;
}

export function CustomWorkspaceTemplate<T = any>({
  schema,
  title,
  description,
  headerMetrics,
  toolbarActions,
  children,
  pluginComponent: PluginComponent,
  pluginProps = {},
  className = '',
}: CustomWorkspaceTemplateProps<T>) {
  const displayTitle = title || schema?.entityTitle || schema?.entityName || 'Workspace';
  const displayDesc = description || schema?.description || 'Area kerja khusus dengan kontrol interaktif.';

  return (
    <div className={`flex flex-col gap-4 w-full h-full ${className}`}>
      {/* Workspace Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {displayTitle}
          </h2>
          {displayDesc && (
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {displayDesc}
            </p>
          )}
        </div>

        {toolbarActions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {toolbarActions}
          </div>
        )}
      </div>

      {/* Header Metrics Slot */}
      {headerMetrics && (
        <div className="animate-in fade-in duration-150">
          {headerMetrics}
        </div>
      )}

      {/* Main Plug-in Body Slot */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 overflow-auto">
        {PluginComponent ? (
          <PluginComponent {...pluginProps} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
