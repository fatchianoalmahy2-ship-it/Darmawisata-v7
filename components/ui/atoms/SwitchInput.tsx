import React from 'react';

interface SwitchInputProps {
  id?: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  badge?: string;
  badgeColor?: string;
  className?: string;
}

export const SwitchInput: React.FC<SwitchInputProps> = ({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  badge,
  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200',
  className = '',
}) => {
  return (
    <label
      id={id}
      className={`flex items-start justify-between gap-4 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
        checked
          ? 'bg-emerald-50/40 border-emerald-200/80 shadow-xs'
          : 'bg-white border-slate-200 hover:border-slate-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${checked ? 'text-emerald-900' : 'text-slate-800'}`}>
            {label}
          </span>
          {badge && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="relative inline-flex items-center shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
      </div>
    </label>
  );
};
