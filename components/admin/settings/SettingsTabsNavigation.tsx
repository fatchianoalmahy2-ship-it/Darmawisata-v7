import React from 'react';
import { SETTINGS_MAIN_TABS, SettingsTabMetadata } from '@/config/settingsMetadata';
import { Bus, Users, Clock, Compass, MessageSquare, FileCode } from 'lucide-react';

interface SettingsTabsNavigationProps {
  activeTab: string;
  onSelectTab: (tabId: any) => void;
}

const TAB_ICONS: Record<string, React.FC<{ className?: string }>> = {
  PARAM_ALOKASI: Bus,
  PENDAMPING: Users,
  BATAS_ANGKET: Clock,
  GELOMBANG_DESTINASI: Compass,
  WA_TEMPLATE: MessageSquare,
  BRANDING_SURAT: FileCode,
};

export const SettingsTabsNavigation: React.FC<SettingsTabsNavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2 gap-1.5 overflow-x-auto no-scrollbar shrink-0">
      {SETTINGS_MAIN_TABS.map((tab) => {
        const IconComponent = TAB_ICONS[tab.id] || Bus;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all border-t border-x cursor-pointer ${
              isActive
                ? 'bg-white text-emerald-700 border-slate-200 border-b-white -mb-px shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
