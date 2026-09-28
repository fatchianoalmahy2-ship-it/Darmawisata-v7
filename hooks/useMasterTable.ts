import { useState, useMemo, useCallback } from 'react';
import { MasterTableSchema, MasterColumn } from '@/types/masterCore';
import { ExcelService } from '@/services/excelService';

export interface UseMasterTableOptions<T> {
  schema: MasterTableSchema<T>;
  data: T[];
  initialPageSize?: number;
  onDataChange?: (data: T[]) => void;
}

export function useMasterTable<T extends Record<string, any>>({
  schema,
  data,
  initialPageSize,
}: UseMasterTableOptions<T>) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sort, setSort] = useState<{
    field: string;
    direction: 'asc' | 'desc';
  }>({
    field: (schema.defaultSort?.field as string) || '',
    direction: schema.defaultSort?.direction || 'asc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(
    initialPageSize || schema.defaultPageSize || 10
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Searchable column keys
  const searchableKeys = useMemo(() => {
    return schema.columns
      .filter((col) => col.searchable !== false)
      .map((col) => String(col.key));
  }, [schema.columns]);

  // Primary key accessor
  const pk = String(schema.primaryKey || 'id');

  // Handle Sort Toggle
  const handleSort = useCallback((field: string) => {
    setSort((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { field, direction: 'asc' };
    });
  }, []);

  // Handle Filter Change
  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === '' || value === undefined || value === null || value === 'ALL') {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
    setCurrentPage(1);
  }, []);

  // Reset Filters
  const handleResetFilters = useCallback(() => {
    setSearch('');
    setFilters({});
    setCurrentPage(1);
  }, []);

  // Filtered & Sorted Dataset
  const filteredData = useMemo(() => {
    let result = [...data];

    // 1. Search Query
    if (search.trim()) {
      const searchTerms = search.toLowerCase().trim().split(/\s+/);
      result = result.filter((item) => {
        return searchTerms.every((term) =>
          searchableKeys.some((k) => {
            const val = item[k];
            if (val === null || val === undefined) return false;
            return String(val).toLowerCase().includes(term);
          })
        );
      });
    }

    // 2. Applied Filters
    const filterEntries = Object.entries(filters);
    if (filterEntries.length > 0) {
      result = result.filter((item) => {
        return filterEntries.every(([fKey, fVal]) => {
          const itemVal = item[fKey];
          if (itemVal === undefined || itemVal === null) return false;
          if (typeof itemVal === 'boolean') {
            return String(itemVal) === String(fVal);
          }
          return String(itemVal).toLowerCase() === String(fVal).toLowerCase();
        });
      });
    }

    // 3. Sorting
    if (sort.field) {
      result.sort((a, b) => {
        const aVal = a[sort.field];
        const bVal = b[sort.field];

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return sort.direction === 'asc'
          ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
          : String(bVal).localeCompare(String(aVal), undefined, { numeric: true });
      });
    }

    return result;
  }, [data, search, filters, sort, searchableKeys]);

  // Total Pages
  const totalItems = filteredData.length;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;

  // Paginated Data
  const paginatedData = useMemo(() => {
    if (pageSize <= 0) return filteredData;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Selection helpers
  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.length === paginatedData.length && paginatedData.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedData.map((item) => String(item[pk])));
    }
  }, [selectedIds, paginatedData, pk]);

  const handleToggleSelectRow = useCallback(
    (id: string) => {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    },
    []
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Export filtered data to Excel
  const exportToExcel = useCallback(
    async (fileName?: string) => {
      const exportName =
        fileName || `${schema.entityName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;

      // Format data according to schema columns
      const formatted = filteredData.map((item, index) => {
        const rowObj: Record<string, any> = { No: index + 1 };
        schema.columns.forEach((col) => {
          if (!col.hidden) {
            rowObj[col.label] = item[col.key as string] ?? '';
          }
        });
        return rowObj;
      });

      await ExcelService.exportToExcel(formatted, exportName, schema.entityName);
    },
    [filteredData, schema]
  );

  return {
    search,
    setSearch,
    filters,
    handleFilterChange,
    handleResetFilters,
    sort,
    handleSort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    filteredData,
    paginatedData,
    selectedIds,
    handleToggleSelectAll,
    handleToggleSelectRow,
    clearSelection,
    exportToExcel,
  };
}
