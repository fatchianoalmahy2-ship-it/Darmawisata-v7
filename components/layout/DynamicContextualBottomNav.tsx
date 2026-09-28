'use client';

import React, { useState } from 'react';
import { AppTab } from '@/components/ui/Header';
import { AuthUser, AppSettings } from '@/types';
import {
  ADMIN_NAVIGATION_TREE,
  PAGE_NAVIGATION_REGISTRY,
  AdminPillarKey,
  AdminSubTabKey,
} from '@/lib/navigationMetadata';
import {
  Menu,
  X,
  ChevronUp,
  Sparkles,
  ChevronRight,
  UserCheck,
  Compass,
  Bus,
  FileText,
  Building,
  Printer,
  ArrowRight,
  Layers,
  Settings as SettingsIcon,
  Share2,
  BedDouble,
} from 'lucide-react';

interface DynamicContextualBottomNavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  currentUser: AuthUser;
  activePillar: AdminPillarKey;
  onSelectPillar: (pillar: AdminPillarKey) => void;
  activeSubTab: AdminSubTabKey;
  onSelectSubTab: (subTab: AdminSubTabKey) => void;
  onOpenSettings?: () => void;
  onOpenProfileSettings?: () => void;
  onOpenLoginModal?: (targetTabName?: string, initialRole?: 'ADMIN' | 'WALI_KELAS' | 'PUBLIC_SISWA') => void;
  settings?: AppSettings;
}

export const DynamicContextualBottomNav: React.FC<DynamicContextualBottomNavProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  activePillar,
  onSelectPillar,
  activeSubTab,
  onSelectSubTab,
  onOpenSettings,
  onOpenProfileSettings,
  onOpenLoginModal,
  settings,
}) => {
  const [isSubMenuDrawerOpen, setIsSubMenuDrawerOpen] = useState(false);
  const [selectedDrawerPillar, setSelectedDrawerPillar] = useState<AdminPillarKey>(activePillar);

  const isAdmin = currentUser.role === 'ADMIN';
  const isWaliKelas = currentUser.role === 'WALI_KELAS';
  const isPublic = currentUser.role === 'PUBLIC_SISWA';

  const isAngketClosed = settings ? (settings.isAngketClosed || false) : false;
  const isLockedForWali = settings?.lockBusAndRoomForWali && !isAngketClosed && isWaliKelas;

  // Wali Kelas specific bottom navigation items
  const waliKelasBottomItems = [
    { id: 'WALI_KELAS' as AppTab, shortLabel: 'Kelas Saya', label: `Portal ${currentUser.assignedClassName || 'Kelas'}`, icon: UserCheck },
    { id: 'REKAP_HARIAN' as AppTab, shortLabel: 'Rekap WA', label: 'Rekapitulasi WA & PDF', icon: Share2 },
    ...(!isLockedForWali && !(settings?.hideBusMenu && !isAdmin) ? [
      { id: 'DENAH_BUS' as AppTab, shortLabel: 'Denah Bus', label: 'Denah Bus Kelas', icon: Bus }
    ] : []),
    ...(!isLockedForWali && !(settings?.hideKamarMenu && !isAdmin) ? [
      { id: 'PEMBAGIAN_KAMAR' as AppTab, shortLabel: 'Kamar Hotel', label: 'Kamar Hotel Kelas', icon: BedDouble }
    ] : []),
  ];
  const allowedWaliTabs = new Set(waliKelasBottomItems.map((item) => item.id));

  // Metadata-driven registry resolution for the currently active page
  const pageRegistry = PAGE_NAVIGATION_REGISTRY[activeTab] || PAGE_NAVIGATION_REGISTRY['ANGKET'];
  const filteredQuickActionChips = isWaliKelas
    ? pageRegistry.quickActionChips.filter((chip) => !chip.targetTab || allowedWaliTabs.has(chip.targetTab))
    : pageRegistry.quickActionChips;

  const currentPillarNode = ADMIN_NAVIGATION_TREE.find((p) => p.id === activePillar) || ADMIN_NAVIGATION_TREE[0];
  const drawerPillarNode = ADMIN_NAVIGATION_TREE.find((p) => p.id === selectedDrawerPillar) || currentPillarNode;

  const handlePillarClick = (pillarId: AdminPillarKey) => {
    if (activeTab !== 'ADMIN') {
      setActiveTab('ADMIN');
    }
    onSelectPillar(pillarId);
    setSelectedDrawerPillar(pillarId);
  };

  const handleSubMenuClick = (subId: AdminSubTabKey) => {
    if (activeTab !== 'ADMIN') {
      setActiveTab('ADMIN');
    }
    onSelectSubTab(subId);
    setIsSubMenuDrawerOpen(false);
  };

  return (
    <>
      {/* Multi-Tier Bottom Navigation Bar for Mobile */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-xl no-print"
        id="dynamic-mobile-bottom-nav"
      >
        {/* TIER 1: Category Pillar Chips (Scrollable) */}
        {isAdmin && activeTab === 'ADMIN' ? (
          <div className="bg-slate-50/95 border-b border-slate-200/80 px-2.5 py-1.5 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-black uppercase text-slate-400 shrink-0 px-1">
                Kategori:
              </span>
              {ADMIN_NAVIGATION_TREE.map((pillar) => {
                const PilIcon = pillar.icon;
                const isPillarActive = activePillar === pillar.id;
                return (
                  <button
                    key={pillar.id}
                    type="button"
                    onClick={() => handlePillarClick(pillar.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all active:scale-95 cursor-pointer shrink-0 ${
                      isPillarActive
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <PilIcon className="w-3 h-3 shrink-0" />
                    <span>{pillar.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Drawer trigger */}
            <button
              type="button"
              onClick={() => {
                setSelectedDrawerPillar(activePillar);
                setIsSubMenuDrawerOpen(true);
              }}
              className="p-1 text-slate-500 hover:text-slate-900 bg-white rounded-lg border border-slate-200 shrink-0 ml-1.5 active:scale-95 cursor-pointer"
              title="Buka Menu Lengkap"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          // Page-Specific Quick Action Chips
          filteredQuickActionChips.length > 0 && (
            <div className="bg-slate-50/95 border-b border-slate-200/80 px-2.5 py-1 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-black uppercase text-slate-400 shrink-0 px-1">
                  Pintas:
                </span>
                {filteredQuickActionChips.map((chip) => {
                  const ChipIcon = chip.icon;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        if (chip.targetTab) {
                          setActiveTab(chip.targetTab);
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      <ChipIcon className="w-3 h-3 shrink-0 text-emerald-600" />
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>

              {!isWaliKelas && (
                <button
                  type="button"
                  onClick={() => setIsSubMenuDrawerOpen(true)}
                  className="p-1 text-slate-500 hover:text-slate-900 bg-white rounded-lg border border-slate-200 shrink-0 ml-1.5 active:scale-95 cursor-pointer"
                  title="Menu Lengkap"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        )}

        {/* TIER 2: Dynamic Primary Bottom Navigation Icons */}
        <div
          className={`grid gap-0.5 items-center px-1.5 py-1 max-w-md mx-auto ${
            isAdmin && activeTab === 'ADMIN'
              ? 'grid-cols-5'
              : isWaliKelas
              ? waliKelasBottomItems.length === 4
                ? 'grid-cols-4'
                : waliKelasBottomItems.length === 3
                ? 'grid-cols-3'
                : 'grid-cols-2'
              : 'grid-cols-5'
          }`}
        >
          {isAdmin && activeTab === 'ADMIN' ? (
            // Admin Mode Sub-Menu Contextual Navigation
            <>
              {currentPillarNode.subMenus.slice(0, 3).map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = activeSubTab === sub.id;

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubMenuClick(sub.id)}
                    className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all active:scale-95 cursor-pointer min-h-[44px] ${
                      isSubActive
                        ? 'text-slate-900 font-black'
                        : 'text-slate-500 hover:text-slate-800 font-semibold'
                    }`}
                  >
                    <div
                      className={`p-1 rounded-lg transition-all ${
                        isSubActive
                          ? 'bg-slate-100 text-slate-900 shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <SubIcon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[9px] tracking-tight truncate mt-0.5 leading-tight">
                      {sub.shortLabel || sub.label}
                    </span>
                  </button>
                );
              })}

              {/* Category Switcher Drawer Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedDrawerPillar(activePillar);
                  setIsSubMenuDrawerOpen(true);
                }}
                className="flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-slate-500 font-semibold min-h-[44px] active:scale-95 cursor-pointer"
              >
                <div className="p-1 rounded-lg text-slate-500">
                  <Layers className="w-4.5 h-4.5" />
                </div>
                <span className="text-[9px] tracking-tight truncate mt-0.5">Kategori</span>
              </button>

              {/* Full Menu / Drawer Button */}
              <button
                type="button"
                onClick={() => setIsSubMenuDrawerOpen(true)}
                className="flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-slate-500 font-semibold min-h-[44px] active:scale-95 cursor-pointer"
              >
                <div className="p-1 rounded-lg text-slate-500">
                  <Menu className="w-4.5 h-4.5" />
                </div>
                <span className="text-[9px] tracking-tight truncate mt-0.5">Lainnya</span>
              </button>
            </>
          ) : isWaliKelas ? (
            // Wali Kelas Strictly Controlled Navigation
            waliKelasBottomItems.map((item) => {
              const ItemIcon = item.icon;
              const isItemActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all active:scale-95 cursor-pointer min-h-[44px] ${
                    isItemActive
                      ? 'text-emerald-700 font-black'
                      : 'text-slate-500 hover:text-slate-800 font-semibold'
                  }`}
                >
                  <div
                    className={`p-1 rounded-lg transition-all ${
                      isItemActive
                        ? 'bg-emerald-100 text-emerald-800 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    <ItemIcon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[9px] tracking-tight truncate mt-0.5">
                    {item.shortLabel}
                  </span>
                </button>
              );
            })
          ) : (
            // General Page-Driven Dynamic Bottom Items
            <>
              {pageRegistry.bottomNavItems.map((item) => {
                const ItemIcon = item.icon;
                const isItemActive = activeTab === item.id;
                const isLocked = isLockedForWali && (item.id === 'DENAH_BUS' || item.id === 'PEMBAGIAN_KAMAR');

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (isLocked) return;
                      setActiveTab(item.id);
                    }}
                    disabled={isLocked}
                    className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all active:scale-95 cursor-pointer min-h-[44px] ${
                      isLocked
                        ? 'opacity-40 cursor-not-allowed'
                        : isItemActive
                        ? 'text-emerald-700 font-black'
                        : 'text-slate-500 hover:text-slate-800 font-semibold'
                    }`}
                  >
                    <div
                      className={`p-1 rounded-lg transition-all ${
                        isItemActive
                          ? 'bg-emerald-100 text-emerald-800 shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <ItemIcon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[9px] tracking-tight truncate mt-0.5">
                      {item.shortLabel}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsSubMenuDrawerOpen(true)}
                className="flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-slate-500 font-semibold min-h-[44px] active:scale-95 cursor-pointer"
              >
                <div className="p-1 rounded-lg text-slate-500">
                  <Menu className="w-4.5 h-4.5" />
                </div>
                <span className="text-[9px] tracking-tight truncate mt-0.5">Lainnya</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* SUB-MENU DRAWER (BOTTOM SHEET) */}
      {isSubMenuDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print"
          onClick={() => setIsSubMenuDrawerOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-lg p-5 shadow-2xl border-t border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Indicator */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto shrink-0 -mt-1" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    {pageRegistry.title}
                  </h3>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {pageRegistry.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSubMenuDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg active:scale-95 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isAdmin && activeTab === 'ADMIN' ? (
              <>
                {/* Pilar Switcher Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none shrink-0">
                  {ADMIN_NAVIGATION_TREE.map((pil) => {
                    const PilIcon = pil.icon;
                    const isPilActive = selectedDrawerPillar === pil.id;
                    return (
                      <button
                        key={pil.id}
                        type="button"
                        onClick={() => setSelectedDrawerPillar(pil.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all shrink-0 active:scale-95 cursor-pointer ${
                          isPilActive
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <PilIcon className="w-3.5 h-3.5" />
                        <span>{pil.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Menus of Selected Pillar & Full Accordion List */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[50vh] pr-1">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Modul {drawerPillarNode.label}</span>
                    <span className="text-slate-400 font-semibold">{drawerPillarNode.subMenus.length} menu</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {drawerPillarNode.subMenus.map((sub) => {
                      const SubIcon = sub.icon;
                      const isCurrentlyActive =
                        activeTab === 'ADMIN' &&
                        activePillar === selectedDrawerPillar &&
                        activeSubTab === sub.id;

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            onSelectPillar(selectedDrawerPillar);
                            handleSubMenuClick(sub.id);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer ${
                            isCurrentlyActive
                              ? 'bg-blue-50 border-blue-600 text-blue-900 font-extrabold shadow-xs'
                              : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`p-2 rounded-xl shrink-0 ${
                                isCurrentlyActive
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-slate-600 border border-slate-200'
                              }`}
                            >
                              <SubIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-black text-slate-900 truncate">{sub.label}</h4>
                              {sub.description && (
                                <p className="text-[10px] text-slate-500 truncate">{sub.description}</p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 shrink-0 ml-2 ${isCurrentlyActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              /* Page-Specific Drawer Links */
              <div className="grid grid-cols-1 gap-2 flex-1 overflow-y-auto max-h-[45vh]">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Tautan Terkait Halaman Ini
                </div>
                {(isWaliKelas
                  ? pageRegistry.drawerItems.filter((item) => allowedWaliTabs.has(item.id))
                  : pageRegistry.drawerItems
                ).map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsSubMenuDrawerOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl border bg-slate-50 border-slate-200 text-left hover:bg-slate-100 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-white text-emerald-600 border border-slate-200 shrink-0">
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-black text-slate-900">{item.label}</h4>
                          <p className="text-[10px] text-slate-500 truncate">{item.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Drawer Quick Actions Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              {onOpenProfileSettings && !isPublic && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSubMenuDrawerOpen(false);
                    onOpenProfileSettings();
                  }}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold text-center active:scale-95 cursor-pointer"
                >
                  Profil Akun
                </button>
              )}
              {isAdmin && onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSubMenuDrawerOpen(false);
                    onOpenSettings();
                  }}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold text-center active:scale-95 cursor-pointer"
                >
                  Pengaturan
                </button>
              )}
              {isPublic && onOpenLoginModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSubMenuDrawerOpen(false);
                    onOpenLoginModal();
                  }}
                  className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold text-center active:scale-95 shadow-sm cursor-pointer"
                >
                  Login Portal Panitia
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

