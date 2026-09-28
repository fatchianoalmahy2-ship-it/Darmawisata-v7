import React from 'react';
import { FormFieldWrapper } from './FormFieldWrapper';

interface ColorPickerInputProps {
  id?: string;
  label?: string;
  sublabel?: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  presets?: string[];
  className?: string;
}

export const ColorPickerInput: React.FC<ColorPickerInputProps> = ({
  id,
  label,
  sublabel,
  description,
  value,
  onChange,
  presets = ['#059669', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0f172a'],
  className = '',
}) => {
  return (
    <FormFieldWrapper id={id} label={label} sublabel={sublabel} description={description} className={className}>
      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          <input
            type="color"
            value={value || '#059669'}
            onChange={(e) => onChange(e.target.value)}
            className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white shadow-xs"
          />
        </div>
        <input
          type="text"
          value={value || '#059669'}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <div className="flex items-center gap-1.5 ml-auto">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              style={{ backgroundColor: preset }}
              className={`w-6 h-6 rounded-lg transition-transform hover:scale-110 cursor-pointer border ${
                value === preset ? 'ring-2 ring-slate-800 scale-105 border-white' : 'border-black/10'
              }`}
            />
          ))}
        </div>
      </div>
    </FormFieldWrapper>
  );
};
