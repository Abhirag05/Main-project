"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FacultyModuleList from "@/components/faculty/FacultyModuleList";
import { useFacultyGuard } from "@/components/faculty/hooks/useFacultyGuard";
import FacultyAlert from "@/components/faculty/ui/FacultyAlert";
import FacultyPageHeader from "@/components/faculty/ui/FacultyPageHeader";
import { apiClient, FacultyModuleAssignment } from "@/lib/api";

export default function FacultyModulesPage() {
  const { isAllowed } = useFacultyGuard();
  const [moduleAssignments, setModuleAssignments] = useState<
    FacultyModuleAssignment[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAllowed) {
      fetchModuleAssignments();
    }
  }, [isAllowed]);

  const fetchModuleAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getFacultyModuleAssignments({
        faculty: "me",
        is_active: true,
      });
      setModuleAssignments(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load module assignments");
    } finally {
      setLoading(false);
    }
  };

  if (!isAllowed) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <FacultyPageHeader
          title="Assigned Modules"
          description="View all modules assigned to you"
        />

        {error && (
          <FacultyAlert variant="error" className="mb-6">
            {error}
          </FacultyAlert>
        )}

        <FacultyModuleList assignments={moduleAssignments} loading={loading} />
      </div>
    </DashboardLayout>
  );
}
