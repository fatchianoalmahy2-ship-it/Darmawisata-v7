'use client';

import React from 'react';
import {
  AdminPillarKey,
  ADMIN_NAVIGATION_TREE,
} from '@/lib/navigationMetadata';

interface AdminMobileBottomNavProps {
  activePillar: AdminPillarKey;
  onSelectPillar: (pillar: AdminPillarKey) => void;
}

export const AdminMobileBottomNav: React.FC<AdminMobileBottomNavProps> = ({
  activePillar,
  onSelectPillar,
}) => {
  const normalizedActivePillar = activePillar === 'LAPORAN' ? 'IKHTISAR' : activePillar;

  return (
    <div
      id="admin-mobile-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl md:hidden px-1 py-1 safe-area-bottom select-none"
    >
      <nav className="flex items-center justify-around gap-1 max-w-lg mx-auto">
        {ADMIN_NAVIGATION_TREE.map((node) => {
          const isActive = normalizedActivePillar === node.id;
          const Icon = node.icon;

          return (
            <button
              key={node.id}
              id={`mobile-bottom-nav-${node.id}`}
              onClick={() => onSelectPillar(node.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer relative min-h-[50px] ${
                isActive
                  ? 'text-slate-950 font-black'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-slate-900 text-emerald-400 shadow-xs scale-105' : 'text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
              </div>
              <span
                className={`text-[10px] tracking-tight truncate leading-tight mt-0.5 ${
                  isActive ? 'text-slate-950 font-black' : 'text-slate-500'
                }`}
              >
                {node.shortLabel}
              </span>
              {isActive && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-slate-900"></span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
