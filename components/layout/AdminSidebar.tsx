'use client';

import React, { useState, useEffect } from 'react';
import { AppTab } from '@/components/ui/Header';
import { AuthUser, AppSettings } from '@/types';
import {
  AdminPillarKey,
  AdminSubTabKey,
  ADMIN_NAVIGATION_TREE,
} from '@/lib/navigationMetadata';
import {
  ShieldCheck,
  Compass,
  LogOut,
  User,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface AdminSidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  currentUser: AuthUser;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenProfileSettings?: () => void;
  totalStudentsCount: number;
  registeredStudentsCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  settings?: AppSettings;
  activePillar?: AdminPillarKey;
  onSelectPillar?: (pillar: AdminPillarKey) => void;
  activeSubTab?: AdminSubTabKey;
  onSelectSubTab?: (subTab: AdminSubTabKey) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  onOpenSettings,
  onOpenProfileSettings,
  totalStudentsCount,
  registeredStudentsCount,
  isMobileOpen = false,
  onCloseMobile,
  settings,
  activePillar = 'IKHTISAR',
  onSelectPillar = () => {},
  activeSubTab = 'OVERVIEW',
  onSelectSubTab = () => {},
}) => {
  const percentage = totalStudentsCount > 0
    ? ((registeredStudentsCount / totalStudentsCount) * 100).toFixed(0)
    : '0';

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

  const handleSubMenuClick = (pillarId: AdminPillarKey, subTabId: AdminSubTabKey) => {
    if (activeTab !== 'ADMIN') {
      setActiveTab('ADMIN');
    }
    onSelectPillar(pillarId);
    onSelectSubTab(subTabId);
    if (onCloseMobile) onCloseMobile();
  };

  const handlePillarHeaderClick = (pillarId: AdminPillarKey, defaultSubTab: AdminSubTabKey) => {
    if (activeTab !== 'ADMIN') {
      setActiveTab('ADMIN');
    }
    onSelectPillar(pillarId);
    onSelectSubTab(defaultSubTab);
    setExpandedPillars((prev) => ({
      ...prev,
      [pillarId]: true,
    }));
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-slate-900 text-slate-100 w-72 shrink-0 border-r border-slate-800 shadow-2xl overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-600/30 shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black tracking-widest text-blue-400 bg-blue-500/20 px-1.5 py-0.2 rounded border border-blue-500/30">
                Super Admin
              </span>
            </div>
            <h2 className="text-xs font-extrabold text-white tracking-tight mt-0.5 truncate">
              Control Center
            </h2>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Scrollable Middle Body */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4 px-3 scrollbar-thin scrollbar-thumb-slate-700">
        {/* User Card & Sync Indicator */}
        <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-white truncate max-w-[170px]" title={currentUser.name}>
              {currentUser.name}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Online
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Progres Angket:</span>
              <span className="font-extrabold text-emerald-400">{registeredStudentsCount} / {totalStudentsCount}</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-700/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, Number(percentage)))}%` }}
              />
            </div>
            <p className="text-[10px] text-right text-slate-400 font-semibold">{percentage}% Terisi</p>
          </div>
        </div>

        {/* User Account Profile & Password */}
        {onOpenProfileSettings && (
          <button
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              onOpenProfileSettings();
            }}
            className="w-full py-2 px-2.5 bg-blue-900/30 hover:bg-blue-800/50 text-blue-200 hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-blue-700/40 transition-colors cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span>Profil & Password</span>
          </button>
        )}

        {/* 7-Pillar Navigation Tree (Direct Accordion) */}
        <div className="space-y-1.5">
          <p className="px-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Menu Operasional
          </p>

          {ADMIN_NAVIGATION_TREE.map((node, nodeIdx) => {
            const isPillarActive = activeTab === 'ADMIN' && normalizedActivePillar === node.id;
            const isExpanded = !!expandedPillars[node.id];
            const Icon = node.icon;
            const defaultSub = node.subMenus[0]?.id || 'OVERVIEW';

            return (
              <div key={node.id} className="rounded-xl overflow-hidden transition-colors">
                {/* Pillar Header Bar */}
                <div
                  onClick={() => handlePillarHeaderClick(node.id, defaultSub)}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all group cursor-pointer ${
                    isPillarActive
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isPillarActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold truncate leading-tight">
                        {nodeIdx + 1}. {node.label}
                      </p>
                    </div>
                  </div>

                  {node.subMenus.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => togglePillarExpand(node.id, e)}
                      className={`p-1 rounded-lg transition-transform ${
                        isPillarActive ? 'text-white hover:bg-blue-700' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Sub-menu Accordion Tree */}
                {isExpanded && node.subMenus.length > 0 && (
                  <div className="mt-1 ml-3 pl-2.5 border-l border-slate-800 space-y-1 py-1">
                    {node.subMenus.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive =
                        activeTab === 'ADMIN' &&
                        normalizedActivePillar === node.id &&
                        activeSubTab === sub.id;

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleSubMenuClick(node.id, sub.id)}
                          className={`w-full py-1.5 px-2 rounded-lg text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                            isSubActive
                              ? 'bg-slate-800 text-emerald-400 font-extrabold border-l-2 border-emerald-400 shadow-2xs'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                            <span className="truncate">{sub.label}</span>
                          </div>
                          {isSubActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer & System Settings */}
      <div className="p-3 border-t border-slate-800 space-y-1.5 bg-slate-950/60 shrink-0">
        <button
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            setActiveTab('ANGKET');
          }}
          className="w-full py-2 px-2.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-700/60 transition-colors cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>Lihat Tampilan Siswa</span>
        </button>

        <button
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            onLogout();
          }}
          className="w-full py-2 px-2.5 bg-red-950/30 hover:bg-red-900/50 text-red-300 hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-red-800/40 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar (Switch Role)</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Sticky */}
      <div className="hidden lg:block h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
