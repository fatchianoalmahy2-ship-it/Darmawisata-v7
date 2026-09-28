export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms
}

export type MasterFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'radio'
  | 'textarea'
  | 'date'
  | 'boolean'
  | 'phone'
  | 'badge';

export interface MasterColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  hidden?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  type?: MasterFieldType;
  options?: { value: string | number; label: string; color?: string }[];
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

export interface MasterFormField<T> {
  key: keyof T | string;
  label: string;
  type: MasterFieldType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
  rows?: number;
  colSpan?: 1 | 2;
  helpText?: string;
  disabled?: boolean;
}

export interface MasterFilterOption {
  key: string;
  label: string;
  placeholder?: string;
  options: { value: string | number; label: string }[];
}

export interface MasterTableSchema<T> {
  entityName: string;
  entityTitle?: string;
  description?: string;
  primaryKey: keyof T | string;
  columns: MasterColumn<T>[];
  fields?: MasterFormField<T>[];
  filters?: MasterFilterOption[];
  bulkEditableFields?: MasterFormField<T>[];
  defaultSort?: {
    field: keyof T | string;
    direction: 'asc' | 'desc';
  };
  defaultPageSize?: number;
  customComponentPlugin?: string;
  features?: {
    enableSearch?: boolean;
    enableSort?: boolean;
    enablePagination?: boolean;
    enableSelection?: boolean;
    enableCreate?: boolean;
    enableEdit?: boolean;
    enableDelete?: boolean;
    enableBulkDelete?: boolean;
    enableBulkEdit?: boolean;
    enableImportExcel?: boolean;
    enableExportExcel?: boolean;
    enablePrintPdf?: boolean;
  };
}

export interface IRepository<T> {
  getAll(): Promise<T[]>;
  getById?(id: string): Promise<T | null>;
  create(item: Omit<T, 'id'> | Partial<T>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  bulkDelete?(ids: string[]): Promise<boolean>;
  bulkUpdate?(ids: string[], updateData: Partial<T>): Promise<boolean>;
}

