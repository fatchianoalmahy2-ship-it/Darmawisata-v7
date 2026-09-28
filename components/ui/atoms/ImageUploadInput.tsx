import React, { useRef } from 'react';
import { FormFieldWrapper } from './FormFieldWrapper';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';

interface ImageUploadInputProps {
  id?: string;
  label?: string;
  sublabel?: string;
  description?: string;
  value?: string;
  onChange: (value: string) => void;
  aspectRatioLabel?: string;
  className?: string;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  id,
  label,
  sublabel,
  description,
  value,
  onChange,
  aspectRatioLabel = 'PNG / JPG / WEBP (Maks 1MB)',
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 2) {
      alert('Ukuran file maksimal 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <FormFieldWrapper id={id} label={label} sublabel={sublabel} description={description} className={className}>
      <div className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
        <div className="w-16 h-16 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative group">
          {value ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={value} alt="Preview" className="w-full h-full object-contain" />
          ) : (
            <ImageIcon className="w-6 h-6 text-slate-300" />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              Unggah Gambar
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-medium text-red-600 hover:bg-red-100 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-400">{aspectRatioLabel}</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </FormFieldWrapper>
  );
};
