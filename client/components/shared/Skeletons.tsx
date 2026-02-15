/**
 * Shared skeleton / shimmer loading placeholders.
 *
 * Usage:
 *   import { TableSkeleton, CardSkeleton, PageSkeleton } from "@/components/shared/Skeletons";
 *
 *   {loading ? <TableSkeleton rows={5} cols={4} /> : <ActualTable />}
 */

// ─── Primitives ──────────────────────────────────────────────

/** A single rectangular shimmer bar. */
export function ShimmerBar({
  className = "h-4 w-full",
}: {
  className?: string;
}) {
  return <div className={`bg-muted rounded ${className}`} />;
}

// ─── Table skeleton ──────────────────────────────────────────

interface TableSkeletonProps {
  /** Number of body rows (default 5) */
  rows?: number;
  /** Number of columns (default 4) */
  cols?: number;
  /** Show a header row (default true) */
  showHeader?: boolean;
}

export function TableSkeleton({
  rows = 5,
  cols = 4,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div className="bg-card rounded-lg shadow overflow-hidden animate-pulse">
      {showHeader && <div className="h-12 bg-muted" />}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 px-4 items-center h-14 border-t border-border"
        >
          {Array.from({ length: cols }).map((_, j) => (
            <ShimmerBar
              key={j}
              className={`h-4 rounded ${j === 0 ? "w-1/3" : "w-1/4"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Card skeleton ───────────────────────────────────────────

interface CardSkeletonProps {
  /** Show an icon/avatar circle on the left (default true) */
  showIcon?: boolean;
  /** Number of text lines after the title (default 2) */
  lines?: number;
}

export function CardSkeleton({ showIcon = true, lines = 2 }: CardSkeletonProps) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-5 animate-pulse">
      <div className="flex items-start gap-4">
        {showIcon && (
          <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0" />
        )}
        <div className="flex-1 space-y-2">
          <ShimmerBar className="h-4 w-24" />
          <ShimmerBar className="h-6 w-16" />
          {Array.from({ length: lines }).map((_, i) => (
            <ShimmerBar key={i} className="h-3 w-28" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stat cards row ──────────────────────────────────────────

interface StatSkeletonProps {
  /** Number of stat cards (default 4) */
  count?: number;
}

export function StatsSkeleton({ count = 4 }: StatSkeletonProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={1} />
      ))}
    </div>
  );
}

// ─── Page / content area skeleton ────────────────────────────

interface PageSkeletonProps {
  /** Show title bar shimmer (default true) */
  showTitle?: boolean;
  /** Number of content blocks (default 3) */
  blocks?: number;
}

export function PageSkeleton({ showTitle = true, blocks = 3 }: PageSkeletonProps) {
  return (
    <div className="animate-pulse space-y-6">
      {showTitle && (
        <div className="space-y-2">
          <ShimmerBar className="h-8 w-1/3" />
          <ShimmerBar className="h-4 w-1/2" />
        </div>
      )}
      {Array.from({ length: blocks }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-lg shadow-md p-6 space-y-4"
        >
          <ShimmerBar className="h-5 w-1/4" />
          <ShimmerBar className="h-4 w-full" />
          <ShimmerBar className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// ─── Section skeleton (header + body) ────────────────────────

export function SectionSkeleton() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="space-y-1.5">
          <ShimmerBar className="h-5 w-36" />
          <ShimmerBar className="h-3 w-24" />
        </div>
        <ShimmerBar className="h-4 w-20" />
      </div>
      <div className="p-6 space-y-4">
        <ShimmerBar className="h-4 w-full" />
        <ShimmerBar className="h-4 w-3/4" />
        <ShimmerBar className="h-4 w-5/6" />
      </div>
    </div>
  );
}

// ─── Full-page centered spinner ──────────────────────────────

export function FullPageSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
