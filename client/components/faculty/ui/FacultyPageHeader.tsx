import { ReactNode } from "react";

interface FacultyPageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function FacultyPageHeader({
  title,
  description,
  action,
}: FacultyPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
