/**
 * Reusable Student Dashboard Components
 * Stat cards, progress bars, section wrappers, and skeleton loaders.
 */

import Link from "next/link";

// ==================== STAT CARD ====================

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string; // tailwind bg class e.g. "bg-primary/80"
  highlight?: boolean;
  highlightColor?: string; // e.g. "text-red-600"
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  color,
  highlight,
  highlightColor,
}: StatCardProps) {
  return (
    <div className="group relative bg-card rounded-2xl shadow-sm border border-border overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Top accent gradient strip */}
      <div className={`h-1 ${color}`} />
      <div className="p-5 flex items-start gap-4">
        <div
          className={`${color} bg-opacity-15 p-3 rounded-xl text-white flex-shrink-0 flex items-center justify-center shadow-sm`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              highlight && highlightColor ? highlightColor : "text-foreground"
            }`}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== SECTION WRAPPER ====================

interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  children: React.ReactNode;
}

export function DashboardSection({
  title,
  subtitle,
  actionLabel,
  actionHref,
  children,
}: DashboardSectionProps) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="px-4 py-4 border-b border-border flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="text-sm font-medium text-primary hover:text-primary transition-colors flex items-center gap-1"
          >
            {actionLabel}
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ==================== PROGRESS BAR ====================

interface ProgressBarProps {
  label: string;
  value: number; // 0-100
  color?: string; // tailwind bg class for the filled portion
}

export function ProgressBar({
  label,
  value,
  color = "bg-primary/80",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground/80">{label}</span>
        <span className="text-sm font-semibold text-foreground">{clamped}%</span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2.5">
        <div
          className={`${color} h-2.5 rounded-full transition-all duration-500`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

// ==================== STATUS BADGE ====================

interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  Completed: "bg-green-50 text-green-700 border-green-200",
  Submitted: "bg-green-50 text-green-700 border-green-200",
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Overdue: "bg-red-50 text-red-700 border-red-200",
  Evaluated: "bg-primary/10 text-primary border-primary/20",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style =
    STATUS_STYLES[status] || "bg-secondary/50 text-foreground/80 border-border";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${style}`}
    >
      {status}
    </span>
  );
}

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="text-center py-8">
      {icon || (
        <svg
          className="mx-auto h-10 w-10 text-muted-foreground/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      )}
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ==================== SKELETON LOADERS ====================

export function SkeletonCard() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-muted rounded w-20" />
          <div className="h-6 bg-muted rounded w-16" />
          <div className="h-2.5 bg-muted rounded w-28" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonSection() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden animate-pulse">
      <div className="px-4 py-4 border-b border-border flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-1.5">
          <div className="h-5 bg-muted rounded w-36" />
          <div className="h-3 bg-muted rounded w-24" />
        </div>
        <div className="h-4 bg-muted rounded w-20" />
      </div>
      <div className="p-6 space-y-4">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-5/6" />
      </div>
    </div>
  );
}

export function SkeletonWelcome() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="flex gap-4">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-4 bg-muted rounded w-40" />
          <div className="h-4 bg-muted rounded w-24" />
        </div>
      </div>
    </div>
  );
}
