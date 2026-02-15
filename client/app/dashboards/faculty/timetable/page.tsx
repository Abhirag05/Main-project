"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FacultyBatchTimetable from "@/components/faculty/FacultyBatchTimetable";
import { useFacultyGuard } from "@/components/faculty/hooks/useFacultyGuard";
import FacultyAlert from "@/components/faculty/ui/FacultyAlert";
import FacultyPageHeader from "@/components/faculty/ui/FacultyPageHeader";
import FacultyToast from "@/components/faculty/ui/FacultyToast";
import { apiClient, FacultyBatchAssignment } from "@/lib/api";
import { useToast } from "@/lib/toast";

export default function FacultyTimetablePage() {
  const { isAllowed } = useFacultyGuard();
  const [batchAssignments, setBatchAssignments] = useState<
    FacultyBatchAssignment[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (isAllowed) {
      fetchBatchAssignments();
    }
  }, [isAllowed]);

  const fetchBatchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getFacultyBatchAssignments({
        faculty: "me",
        is_active: true,
      });
      setBatchAssignments(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load batch assignments");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (!isAllowed) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Toast Notification */}
        {toast && <FacultyToast message={toast.message} type={toast.type} />}

        <FacultyPageHeader
          title="Batch Timetable"
          description="View timetables for your assigned batches"
        />

        {error && (
          <FacultyAlert variant="error" className="mb-6">
            {error}
          </FacultyAlert>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <FacultyBatchTimetable
            batchAssignments={batchAssignments}
            onError={(msg) => setToast({ type: "error", message: msg })}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
