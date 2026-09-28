'use client';

import React from 'react';
import {
  AdminPillarKey,
  AdminSubTabKey,
  ADMIN_NAVIGATION_TREE,
} from '@/lib/navigationMetadata';

interface AdminMobileSubNavPillsProps {
  activePillar: AdminPillarKey;
  activeSubTab: AdminSubTabKey;
  onSelectSubTab: (subTab: AdminSubTabKey) => void;
}

export const AdminMobileSubNavPills: React.FC<AdminMobileSubNavPillsProps> = ({
  activePillar,
  activeSubTab,
  onSelectSubTab,
}) => {
  const normalizedActivePillar = activePillar === 'LAPORAN' ? 'IKHTISAR' : activePillar;

  const currentPillarNode = ADMIN_NAVIGATION_TREE.find(
    (node) => node.id === normalizedActivePillar
  );

  if (!currentPillarNode || currentPillarNode.subMenus.length <= 1) {
    return null;
  }

  return (
    <div
      id="admin-mobile-subnav-pills"
      className="md:hidden w-full bg-white border-b border-slate-200/80 px-3 py-2 shrink-0 select-none shadow-2xs"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        {currentPillarNode.subMenus.map((sub) => {
          const isActive = activeSubTab === sub.id;
          const Icon = sub.icon;

          return (
            <button
              key={sub.id}
              id={`mobile-subpill-${sub.id}`}
              onClick={() => onSelectSubTab(sub.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  isActive ? 'text-emerald-400' : 'text-slate-500'
                }`}
              />
              <span>{sub.shortLabel || sub.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
