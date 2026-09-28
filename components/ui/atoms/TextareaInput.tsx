import React from 'react';
import { FormFieldWrapper } from './FormFieldWrapper';

interface TextareaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id?: string;
  label?: string;
  sublabel?: string;
  description?: string;
  error?: string;
  icon?: React.ReactNode;
  wrapperClassName?: string;
}

export const TextareaInput: React.FC<TextareaInputProps> = ({
  id,
  label,
  sublabel,
  description,
  error,
  icon,
  wrapperClassName,
  className = '',
  rows = 4,
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
      <textarea
        id={id}
        rows={rows}
        className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-xs placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 font-mono leading-relaxed ${
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''
        } ${className}`}
        {...props}
      />
    </FormFieldWrapper>
  );
};
