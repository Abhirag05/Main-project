import { ReactNode } from "react";

type AlertVariant = "success" | "error" | "info";

const VARIANT_STYLES: Record<AlertVariant, string> = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

interface FacultyAlertProps {
  variant: AlertVariant;
  children: ReactNode;
  className?: string;
}

export default function FacultyAlert({
  variant,
  children,
  className,
}: FacultyAlertProps) {
  return (
    <div
      className={`border rounded-lg px-4 py-3 text-sm ${
        VARIANT_STYLES[variant]
      } ${className || ""}`}
    >
      {children}
    </div>
  );
}
