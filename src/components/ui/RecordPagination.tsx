'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const RECORD_PAGE_SIZE = 50;

export function useRecordPagination<T>(rows: T[]) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / RECORD_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice((currentPage - 1) * RECORD_PAGE_SIZE, currentPage * RECORD_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

  return { currentPage, pageCount, pageRows, setPage };
}

export function RecordPagination({
  total,
  currentPage,
  pageCount,
  onPageChange,
}: {
  total: number;
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= RECORD_PAGE_SIZE) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
      <span>
        Showing {(currentPage - 1) * RECORD_PAGE_SIZE + 1}-{Math.min(currentPage * RECORD_PAGE_SIZE, total)} of {total}
      </span>
      <div className="flex items-center gap-2">
        <span>Page {currentPage} of {pageCount}</span>
        <button
          type="button"
          title="Previous page"
          aria-label="Previous page"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="rounded border border-border p-1.5 text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          type="button"
          title="Next page"
          aria-label="Next page"
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          className="rounded border border-border p-1.5 text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}