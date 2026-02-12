"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SubjectTable from "@/components/academics/SubjectTable";
import SubjectForm from "@/components/academics/SubjectForm";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { apiClient, AcademicModule } from "@/lib/api";
import { useToast } from "@/lib/toast";

export default function SubjectsPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<{ role: { code: string } } | null>(null);
  const [subjects, setSubjects] = useState<AcademicModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<AcademicModule | null>(
    null,
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [subjectToToggle, setSubjectToToggle] = useState<AcademicModule | null>(
    null,
  );
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<AcademicModule | null>(
    null,
  );

  useEffect(() => {
    // Check user role
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);

        // Access control: only SUPER_ADMIN
        if (userData.role.code !== "SUPER_ADMIN") {
          router.push("/dashboards");
        }
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    if (user?.role.code === "SUPER_ADMIN") {
      fetchSubjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getAcademicModules();
      // Ensure data is an array
      if (Array.isArray(data)) {
        setSubjects(data);
      } else {
        console.error("API returned non-array response:", data);
        setSubjects([]);
        toast.show("error", "Invalid response format from server");
      }
    } catch (err) {
      const error = err as Error;
      setSubjects([]); // Ensure subjects is always an array
      toast.show("error", error.message || "Failed to load modules");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const handleEdit = (subject: AcademicModule) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (subject: AcademicModule) => {
    setSubjectToToggle(subject);
    setIsConfirmOpen(true);
  };

  const confirmToggleStatus = async () => {
    if (!subjectToToggle) return;

    try {
      await apiClient.updateModuleStatus(
        subjectToToggle.id,
        !subjectToToggle.is_active,
      );
      toast.show(
        "success",
        `Module ${
          subjectToToggle.is_active ? "deactivated" : "activated"
        } successfully`,
      );
      fetchSubjects(); // Refresh list
    } catch (err) {
      const error = err as Error;
      toast.show("error", error.message || "Failed to update subject status");
    } finally {
      setIsConfirmOpen(false);
      setSubjectToToggle(null);
    }
  };

  const handleDelete = (subject: AcademicModule) => {
    setSubjectToDelete(subject);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!subjectToDelete) return;

    try {
      await apiClient.deleteSubject(subjectToDelete.id);
      toast.show("success", "Module deleted successfully");
      fetchSubjects(); // Refresh list
    } catch (err) {
      const error = err as Error;
      toast.show("error", error.message || "Failed to delete subject");
    } finally {
      setIsDeleteConfirmOpen(false);
      setSubjectToDelete(null);
    }
  };

  const handleModalSuccess = () => {
    toast.show(
      "success",
      editingSubject
        ? "Module updated successfully"
        : "Module created successfully",
    );
    fetchSubjects(); // Refresh list
  };

  // Access denied state
  if (user && user.role.code !== "SUPER_ADMIN") {
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
              You don&apos;t have permission to access this page. Only Super
              Admins can manage subjects.
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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Module Management
            </h1>
            <p className="mt-1 text-gray-500">
              Manage academic modules across all courses and programs.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
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
            Add Module
          </button>
        </div>

        {/* Table */}
        <SubjectTable
          subjects={subjects}
          loading={loading}
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />

        {/* Modal */}
        <SubjectForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
          subject={editingSubject}
        />

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={isConfirmOpen}
          title={
            subjectToToggle?.is_active ? "Deactivate Module" : "Activate Module"
          }
          message={
            subjectToToggle?.is_active
              ? `Are you sure you want to deactivate "${subjectToToggle?.name}"? This module will no longer be available for course assignments.`
              : `Are you sure you want to activate "${subjectToToggle?.name}"? This module will become available for use.`
          }
          confirmText={subjectToToggle?.is_active ? "Deactivate" : "Activate"}
          variant={subjectToToggle?.is_active ? "warning" : "info"}
          onConfirm={confirmToggleStatus}
          onCancel={() => {
            setIsConfirmOpen(false);
            setSubjectToToggle(null);
          }}
        />

        {/* Delete Confirm Dialog */}
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="Delete Module"
          message={`Are you sure you want to permanently delete "${subjectToDelete?.name}"? This action cannot be undone and will remove all associated data.`}
          confirmText="Delete"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => {
            setIsDeleteConfirmOpen(false);
            setSubjectToDelete(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
