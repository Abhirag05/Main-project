import { ReactNode } from "react";

interface FacultyCardProps {
  children: ReactNode;
  className?: string;
}

export default function FacultyCard({ children, className }: FacultyCardProps) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl shadow-sm ${
        className || ""
      }`}
    >
      {children}
    </div>
  );
}
