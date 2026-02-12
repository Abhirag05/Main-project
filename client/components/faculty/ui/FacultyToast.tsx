type ToastType = "success" | "error";

interface FacultyToastProps {
  message: string;
  type: ToastType;
}

export default function FacultyToast({ message, type }: FacultyToastProps) {
  return (
    <div
      className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg border ${
        type === "success"
          ? "bg-green-600 text-white border-green-600"
          : "bg-red-600 text-white border-red-600"
      }`}
    >
      {message}
    </div>
  );
}
