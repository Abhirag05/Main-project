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
  color: string; // tailwind bg class e.g. "bg-blue-500"
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
      <div
        className={`${color} p-3 rounded-lg text-white flex-shrink-0 flex items-center justify-center`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p
          className={`text-2xl font-bold mt-0.5 ${
            highlight && highlightColor ? highlightColor : "text-gray-900"
          }`}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-4 border-b border-gray-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
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
  color = "bg-blue-500",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{clamped}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
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
  Evaluated: "bg-blue-50 text-blue-700 border-blue-200",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style =
    STATUS_STYLES[status] || "bg-gray-50 text-gray-700 border-gray-200";
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
          className="mx-auto h-10 w-10 text-gray-300"
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
      <p className="mt-2 text-sm text-gray-500">{message}</p>
    </div>
  );
}

// ==================== SKELETON LOADERS ====================

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-20" />
          <div className="h-6 bg-gray-200 rounded w-16" />
          <div className="h-2.5 bg-gray-200 rounded w-28" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonSection() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="px-4 py-4 border-b border-gray-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-1.5">
          <div className="h-5 bg-gray-200 rounded w-36" />
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-20" />
      </div>
      <div className="p-6 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  );
}

export function SkeletonWelcome() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="flex gap-4">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-40" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
      </div>
    </div>
  );
}
