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
        <div className="mx-auto h-12 w-12 text-muted-foreground/70">{icon}</div>
      ) : null}
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
