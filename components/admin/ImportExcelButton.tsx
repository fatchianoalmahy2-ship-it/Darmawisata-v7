import React, { useRef, useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { ExcelService } from '@/services/excelService';

interface ImportExcelButtonProps<T> {
  onDataImported: (data: T[]) => void;
  label?: string;
  className?: string;
}

export function ImportExcelButton<T>({
  onDataImported,
  label = 'Import Excel',
  className = 'px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer'
}: ImportExcelButtonProps<T>) {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await ExcelService.importExcel<T>(file);
      onDataImported(data);
    } catch (error) {
      console.error('Error importing Excel:', error);
      alert('Gagal mengimpor file Excel.');
    } finally {
      setIsImporting(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <label className={className}>
      {isImporting ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 shrink-0" />}
      <span>{isImporting ? 'Importing...' : label}</span>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
        disabled={isImporting}
      />
    </label>
  );
}
