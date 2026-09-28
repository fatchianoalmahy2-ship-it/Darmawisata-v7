import React from 'react';
import { FormFieldWrapper } from './FormFieldWrapper';

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id?: string;
  label?: string;
  sublabel?: string;
  description?: string;
  error?: string;
  icon?: React.ReactNode;
  suffix?: string;
  wrapperClassName?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  id,
  label,
  sublabel,
  description,
  error,
  icon,
  suffix,
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
      <div className="relative">
        <input
          id={id}
          type="number"
          className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-xs placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 ${
            suffix ? 'pr-12' : ''
          } ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''} ${className}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </FormFieldWrapper>
  );
};
