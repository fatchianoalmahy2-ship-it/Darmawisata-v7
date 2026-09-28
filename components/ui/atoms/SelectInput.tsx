import React from 'react';
import { FormFieldWrapper } from './FormFieldWrapper';

export interface SelectOption {
  value: string | number;
  label: string;
  description?: string;
}

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id?: string;
  label?: string;
  sublabel?: string;
  description?: string;
  error?: string;
  icon?: React.ReactNode;
  options: SelectOption[];
  wrapperClassName?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  id,
  label,
  sublabel,
  description,
  error,
  icon,
  options,
  wrapperClassName,
  className = '',
  ...props
}) => {
  return (
    <FormFieldWrapper
      id={id ? `${id}-wrapper` : undefined}
      label={label}
      sublabel={sublabel}
      description={description}
      error={error}
      required={props.required}
      icon={icon}
      className={wrapperClassName}
    >
      <select
        id={id}
        className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-xs cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 ${
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormFieldWrapper>
  );
};
