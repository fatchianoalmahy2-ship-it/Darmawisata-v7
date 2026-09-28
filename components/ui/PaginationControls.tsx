'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  itemName?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemName = 'data',
}: PaginationControlsProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1 w-full" id="pagination-controls">
      {/* Informative Label */}
      <div className="text-[11px] sm:text-xs text-slate-500 font-medium" id="pagination-text">
        Menampilkan <span className="font-extrabold text-slate-800">{startItem}</span> -{' '}
        <span className="font-extrabold text-slate-800">{endItem}</span> dari{' '}
        <span className="font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{totalItems}</span> {itemName}
      </div>

      {/* Pagination Action Controls */}
      <div className="flex items-center flex-wrap gap-2.5 justify-between sm:justify-end">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5" id="pagination-page-size">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tampil:</span>
            <select
              className="block pl-2 pr-6 py-1 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="relative z-0 inline-flex rounded-xl shadow-xs -space-x-px" aria-label="Pagination">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-2 py-1.5 rounded-l-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 focus:z-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all active:bg-slate-100"
            id="pagination-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Numbers */}
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="relative inline-flex items-center px-2.5 py-1.5 border border-slate-200 bg-slate-50 text-xs font-bold text-slate-400 select-none"
                >
                  ...
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <button
                key={`page-${page}`}
                onClick={() => onPageChange(Number(page))}
                aria-current={isActive ? 'page' : undefined}
                className={`relative inline-flex items-center px-3 py-1.5 border text-xs font-extrabold focus:z-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer ${
                  isActive
                    ? 'z-10 bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100'
                }`}
              >
                {page}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="relative inline-flex items-center px-2 py-1.5 rounded-r-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 focus:z-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all active:bg-slate-100"
            id="pagination-next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}

