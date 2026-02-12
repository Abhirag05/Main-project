"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FacultySubjectAssignmentTable from "@/components/faculty/FacultySubjectAssignmentTable";
import FacultySubjectAssignmentForm from "@/components/faculty/FacultySubjectAssignmentForm";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { apiClient, FacultyProfile, FacultySubjectAssignment } from "@/lib/api";
import { useToast } from "@/lib/toast";

export default function CentreAdminFacultySubjectAssignmentsPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<{ role: { code: string } } | null>(null);
  const [facultyList, setFacultyList] = useState<FacultyProfile[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(
    null,
  );
  const [assignments, setAssignments] = useState<FacultySubjectAssignment[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [loadingFaculty, setLoadingFaculty] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [assignmentToDeactivate, setAssignmentToDeactivate] =
    useState<FacultySubjectAssignment | null>(null);

  useEffect(() => {
    // Check user role
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);

        // Access control: SUPER_ADMIN and CENTRE_ADMIN can access this page
        if (!["SUPER_ADMIN", "CENTRE_ADMIN"].includes(userData.role.code)) {
          router.push("/dashboards");
        }
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    if (user && ["SUPER_ADMIN", "CENTRE_ADMIN"].includes(user.role.code)) {
      fetchFacultyList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchFacultyList = async () => {
    setLoadingFaculty(true);
    try {
      const data = await apiClient.getFacultyProfiles({ is_active: true });
      if (Array.isArray(data)) {
        setFacultyList(data);
      } else {
        console.error("API returned non-array response:", data);
        setFacultyList([]);
        toast.show("error", "Invalid response format from server");
      }
    } catch (err) {
      const error = err as Error;
      setFacultyList([]);
      toast.show("error", error.message || "Failed to load faculty list");
    } finally {
      setLoadingFaculty(false);
    }
  };

  const fetchAssignments = async (facultyId: number) => {
    setLoading(true);
    try {
      const data = await apiClient.getFacultySubjectAssignments({
        faculty_id: facultyId,
      });
      if (Array.isArray(data)) {
        setAssignments(data);
      } else {
        console.error("API returned non-array response:", data);
        setAssignments([]);
        toast.show("error", "Invalid response format from server");
      }
    } catch (err) {
      const error = err as Error;
      setAssignments([]);
      toast.show("error", error.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleFacultySelect = (facultyId: string) => {
    const id = parseInt(facultyId);
    if (id === 0) {
      setSelectedFacultyId(null);
      setAssignments([]);
    } else {
      setSelectedFacultyId(id);
      fetchAssignments(id);
    }
  };

  const handleAssignSubject = () => {
    if (!selectedFacultyId) {
      toast.show("error", "Please select a faculty member first");
      return;
    }
    setIsModalOpen(true);
  };

  const handleDeactivate = (assignment: FacultySubjectAssignment) => {
    setAssignmentToDeactivate(assignment);
    setIsConfirmOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!assignmentToDeactivate) return;

    const isActive = assignmentToDeactivate.is_active;
    const action = isActive ? "deactivate" : "reactivate";

    try {
      await apiClient.updateFacultySubjectAssignmentStatus(
        assignmentToDeactivate.id,
        !isActive, // Toggle status
      );
      toast.show("success", `Assignment ${action}d successfully`);
      if (selectedFacultyId) {
        fetchAssignments(selectedFacultyId);
      }
    } catch (err) {
      const error = err as Error;
      toast.show("error", error.message || `Failed to ${action} assignment`);
    } finally {
      setIsConfirmOpen(false);
      setAssignmentToDeactivate(null);
    }
  };

  const handleModalSuccess = () => {
    toast.show("success", "Module assigned successfully");
    if (selectedFacultyId) {
      fetchAssignments(selectedFacultyId); // Refresh list
    }
  };

  // Access denied state
  if (user && !["SUPER_ADMIN", "CENTRE_ADMIN"].includes(user.role.code)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Access Denied
            </h2>
            <p className="mt-2 text-gray-600">
              You don&apos;t have permission to access this page.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Loading initial check
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const selectedFaculty = facultyList.find((f) => f.id === selectedFacultyId);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Faculty Module Assignments
          </h1>
          <p className="mt-2 text-gray-600">
            Assign modules to faculty members and manage their teaching
            assignments.
          </p>
        </div>

        {/* Faculty Selector Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Faculty Member
              </label>
              {loadingFaculty ? (
                <div className="flex items-center justify-center py-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <select
                  value={selectedFacultyId || 0}
                  onChange={(e) => handleFacultySelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0} className="text-gray-500">
                    -- Select Faculty --
                  </option>
                  {facultyList.map((faculty) => (
                    <option
                      key={faculty.id}
                      value={faculty.id}
                      className="text-gray-900"
                    >
                      {faculty.employee_code} - {faculty.user.full_name} (
                      {faculty.designation})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedFaculty && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Selected Faculty
                </h3>
                <p className="text-sm text-blue-700">
                  <strong>Name:</strong> {selectedFaculty.user.full_name}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Email:</strong> {selectedFaculty.user.email}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Designation:</strong> {selectedFaculty.designation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Assign Module Button */}
        {selectedFacultyId && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={handleAssignSubject}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Assign Module
            </button>
          </div>
        )}

        {/* Assignments Table */}
        {selectedFacultyId ? (
          <FacultySubjectAssignmentTable
            assignments={assignments}
            loading={loading}
            onDeactivate={handleDeactivate}
          />
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No Faculty Selected
            </h3>
            <p className="mt-2 text-gray-500">
              Please select a faculty member from the dropdown above to view and
              manage their module assignments.
            </p>
          </div>
        )}

        {/* Assignment Modal */}
        <FacultySubjectAssignmentForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
          selectedFacultyId={selectedFacultyId}
        />

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={isConfirmOpen}
          title={
            assignmentToDeactivate?.is_active
              ? "Deactivate Module Assignment"
              : "Reactivate Module Assignment"
          }
          message={
            assignmentToDeactivate
              ? assignmentToDeactivate.is_active
                ? `Are you sure you want to deactivate the assignment of "${assignmentToDeactivate.module?.name || assignmentToDeactivate.subject?.name}" for this faculty member? The assignment will be marked as inactive but not permanently deleted.`
                : `Are you sure you want to reactivate the assignment of "${assignmentToDeactivate.module?.name || assignmentToDeactivate.subject?.name}" for this faculty member?`
              : ""
          }
          confirmText={
            assignmentToDeactivate?.is_active ? "Deactivate" : "Reactivate"
          }
          variant={assignmentToDeactivate?.is_active ? "warning" : "info"}
          onConfirm={confirmDeactivate}
          onCancel={() => {
            setIsConfirmOpen(false);
            setAssignmentToDeactivate(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
