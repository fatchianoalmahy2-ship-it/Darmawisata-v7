import React from 'react';

interface FormFieldWrapperProps {
  id?: string;
  label?: string;
  sublabel?: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
  id,
  label,
  sublabel,
  description,
  error,
  required,
  className = '',
  children,
  icon,
}) => {
  return (
    <div id={id} className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            {icon && <span className="text-slate-400">{icon}</span>}
            {label}
            {required && <span className="text-red-500 font-bold">*</span>}
          </label>
          {sublabel && <span className="text-[11px] text-slate-400">{sublabel}</span>}
        </div>
      )}
      {children}
      {description && <p className="text-[11px] text-slate-500 leading-relaxed">{description}</p>}
      {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
    </div>
  );
};
