import { ReactNode } from "react";

interface FacultyCardProps {
  children: ReactNode;
  className?: string;
}

export default function FacultyCard({ children, className }: FacultyCardProps) {
  return (
    <div
      className={`bg-card border border-border rounded-xl shadow-sm ${
        className || ""
      }`}
    >
      {children}
    </div>
  );
}
