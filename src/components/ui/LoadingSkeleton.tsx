import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={`animate-pulse bg-muted rounded-md ${className}`} style={style} />;
}

export function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>
      <div className="mt-3 pt-3 border-t border-border/50">
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={`skel-col-${i}`} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return <Skeleton className={`w-full rounded-lg`} style={{ height }} />;
}