import { ReactNode } from "react";

interface FacultyEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function FacultyEmptyState({
  icon,
  title,
  description,
  action,
}: FacultyEmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon ? (
        <div className="mx-auto h-12 w-12 text-gray-400">{icon}</div>
      ) : null}
      <h3 className="mt-3 text-sm font-semibold text-gray-900">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
