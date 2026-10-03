'use client';

import React from 'react';
import { RECORD_PAGE_SIZE, RecordPagination, useRecordPagination } from '@/components/ui/RecordPagination';

export type RecordCardRole = 'title' | 'subtitle' | 'meta' | 'field' | 'actions';

export type RecordColumn<T> = {
  key: string;
  header: React.ReactNode;
  render: (row: T, index: number) => React.ReactNode;
  /** How this column is placed on mobile cards. Defaults to `field`. */
  card?: RecordCardRole;
  /** Extra classes on desktop table cells (e.g. truncate). Not applied on cards. */
  tableCellClassName?: string;
  /** Span both columns in the mobile field grid. */
  cardSpan?: 1 | 2;
};

interface ResponsiveRecordListProps<T> {
  rows: T[];
  getRowId: (row: T, index: number) => string;
  columns: RecordColumn<T>[];
  loading?: boolean;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
  skeletonRows?: number;
}

function RecordCard<T>({
  row,
  index,
  columns,
}: {
  row: T;
  index: number;
  columns: RecordColumn<T>[];
}) {
  const titleCol = columns.find((c) => c.card === 'title');
  const subtitleCol = columns.find((c) => c.card === 'subtitle');
  const metaCols = columns.filter((c) => c.card === 'meta');
  const fieldCols = columns.filter((c) => !c.card || c.card === 'field');
  const actionsCol = columns.find((c) => c.card === 'actions');

  return (
    <article className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {titleCol && (
            <div className="font-600 text-foreground text-sm break-words">{titleCol.render(row, index)}</div>
          )}
          {subtitleCol && (
            <div className="mt-0.5 text-xs text-muted-foreground break-words">{subtitleCol.render(row, index)}</div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {metaCols.map((col) => (
            <div key={col.key}>{col.render(row, index)}</div>
          ))}
          {actionsCol && <div className="relative">{actionsCol.render(row, index)}</div>}
        </div>
      </div>
      {fieldCols.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {fieldCols.map((col) => (
            <div key={col.key} className={`min-w-0 ${col.cardSpan === 2 ? 'col-span-2' : ''}`}>
              {col.header ? (
                <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">{col.header}</dt>
              ) : null}
              <dd className="mt-0.5 text-sm text-foreground break-words [overflow-wrap:anywhere]">{col.render(row, index)}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}

export default function ResponsiveRecordList<T>({
  rows,
  getRowId,
  columns,
  loading = false,
  empty,
  footer,
  skeletonRows = 6,
}: ResponsiveRecordListProps<T>) {
  const visibleColumns = columns.length;
  const { currentPage, pageCount, pageRows, setPage } = useRecordPagination(rows);
  const pageOffset = (currentPage - 1) * RECORD_PAGE_SIZE;

  return (
    <div>
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: Math.min(skeletonRows, 4) }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
              <div className="grid grid-cols-2 gap-3 pt-1">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="bg-card border border-border rounded-xl">{empty}</div>
        ) : (
          pageRows.map((row, index) => (
            <RecordCard key={getRowId(row, pageOffset + index)} row={row} index={pageOffset + index} columns={columns} />
          ))
        )}
      </div>

      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-600 text-muted-foreground ${col.card === 'actions' ? '' : 'text-left'}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: visibleColumns }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded animate-pulse w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns}>{empty}</td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
                  <tr
                    key={getRowId(row, pageOffset + index)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 ${col.card === 'actions' ? 'relative' : ''} ${col.tableCellClassName ?? ''}`}
                      >
                        {col.render(row, pageOffset + index)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && footer ? (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">{footer}</div>
        ) : null}
        {!loading ? (
          <RecordPagination total={rows.length} currentPage={currentPage} pageCount={pageCount} onPageChange={setPage} />
        ) : null}
      </div>

      {!loading && footer ? (
        <div className="md:hidden mt-3 px-1 text-xs text-muted-foreground">{footer}</div>
      ) : null}
      <div className="md:hidden">
        {!loading ? (
          <RecordPagination total={rows.length} currentPage={currentPage} pageCount={pageCount} onPageChange={setPage} />
        ) : null}
      </div>
    </div>
  );
}
