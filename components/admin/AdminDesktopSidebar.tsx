'use client';

import React, { useState, useEffect } from 'react';
import {
  AdminPillarKey,
  AdminSubTabKey,
  ADMIN_NAVIGATION_TREE,
  DEFAULT_SUBTAB_FOR_PILLAR,
} from '@/lib/navigationMetadata';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';

interface AdminDesktopSidebarProps {
  activePillar: AdminPillarKey;
  activeSubTab: AdminSubTabKey;
  onSelectPillar: (pillar: AdminPillarKey) => void;
  onSelectSubTab: (subTab: AdminSubTabKey) => void;
  dbStatus: 'checking' | 'connected' | 'offline' | 'error';
  studentCount?: number;
  busCount?: number;
  roomCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const AdminDesktopSidebar: React.FC<AdminDesktopSidebarProps> = ({
  activePillar,
  activeSubTab,
  onSelectPillar,
  onSelectSubTab,
  dbStatus,
  studentCount,
  busCount,
  roomCount,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  // Normalize pillar for tree matching
  const normalizedActivePillar = activePillar === 'LAPORAN' ? 'IKHTISAR' : activePillar;

  // Track expanded accordion state per pillar
  const [expandedPillars, setExpandedPillars] = useState<Record<string, boolean>>({
    [normalizedActivePillar]: true,
  });

  // Keep active pillar auto-expanded
  useEffect(() => {
    setExpandedPillars((prev) => ({
      ...prev,
      [normalizedActivePillar]: true,
    }));
  }, [normalizedActivePillar]);

  const togglePillarExpand = (pillarId: AdminPillarKey, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPillars((prev) => ({
      ...prev,
      [pillarId]: !prev[pillarId],
    }));
  };

  const handlePillarClick = (pillarId: AdminPillarKey) => {
    onSelectPillar(pillarId);
    // If not expanded, expand it
    setExpandedPillars((prev) => ({
      ...prev,
      [pillarId]: true,
    }));
  };

  const handleSubTabClick = (pillarId: AdminPillarKey, subTabId: AdminSubTabKey) => {
    if (activePillar !== pillarId) {
      onSelectPillar(pillarId);
    }
    onSelectSubTab(subTabId);
  };

  return (
    <aside
      id="admin-desktop-sidebar"
      className={`hidden md:flex flex-col bg-white border-r border-slate-200/90 z-20 shrink-0 transition-all duration-300 select-none ${
        isCollapsed ? 'w-20' : 'w-64 lg:w-72'
      }`}
    >
      {/* Sidebar Header / Branding */}
      <div className="p-4.5 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
            <span className="tracking-tight">DW</span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-black tracking-wider text-slate-900 uppercase truncate">
                  Admin Hub
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold truncate">
                Enterprise Management
              </p>
            </div>
          )}
        </div>

        {/* Database Real-time Status Indicator */}
        {!isCollapsed && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200/60 shrink-0"
            title={`Status Database: ${dbStatus}`}
          >
            {dbStatus === 'connected' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
                <span className="text-[10px] font-bold text-slate-600">Online</span>
              </>
            )}
            {dbStatus === 'offline' && (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span className="text-[10px] font-bold text-slate-400">Offline</span>
              </>
            )}
            {dbStatus === 'error' && (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-rose-600">Reconnecting</span>
              </>
            )}
            {dbStatus === 'checking' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span className="text-[10px] font-bold text-amber-600">Sync...</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation Tree (Accordion List) */}
      <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
        {ADMIN_NAVIGATION_TREE.map((node) => {
          const isNodeActive = normalizedActivePillar === node.id;
          const isExpanded = !!expandedPillars[node.id];
          const Icon = node.icon;
          const hasMultipleSubMenus = node.subMenus.length > 1;

          return (
            <div key={node.id} className="space-y-1">
              {/* Pillar Header Item */}
              <button
                id={`sidebar-pillar-${node.id}`}
                onClick={() => handlePillarClick(node.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left group cursor-pointer ${
                  isNodeActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
                title={node.label}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isNodeActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate tracking-tight font-extrabold text-[13px]">
                      {node.label}
                    </span>
                  )}
                </div>

                {!isCollapsed && hasMultipleSubMenus && (
                  <div
                    onClick={(e) => togglePillarExpand(node.id, e)}
                    className={`p-1 rounded-md transition-all hover:bg-white/10 ${
                      isNodeActive ? 'text-slate-300' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </div>
                )}
              </button>

              {/* Sub-Menus Accordion Panel */}
              {!isCollapsed && isExpanded && (
                <div className="pl-3.5 pr-1 py-0.5 space-y-0.5 border-l-2 border-slate-200/80 ml-4 animate-in slide-in-from-top-1 duration-150">
                  {node.subMenus.map((sub) => {
                    const isSubActive = isNodeActive && activeSubTab === sub.id;
                    const SubIcon = sub.icon;

                    return (
                      <button
                        key={sub.id}
                        id={`sidebar-subtab-${sub.id}`}
                        onClick={() => handleSubTabClick(node.id, sub.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left group cursor-pointer ${
                          isSubActive
                            ? 'bg-emerald-50 text-emerald-900 font-extrabold border border-emerald-200/80'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                        title={sub.description || sub.label}
                      >
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <SubIcon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSubActive
                                ? 'text-emerald-600'
                                : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                          />
                          <span className="truncate text-[12px]">{sub.label}</span>
                        </div>

                        {isSubActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer: Collapse Toggle & System Meta */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-800 truncate">Super Administrator</p>
              <p className="text-[9px] text-slate-400 font-medium">SMK Negeri 1</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto" title="Super Administrator">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
          </div>
        )}

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </aside>
  );
};
