"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CourseTable from "@/components/academics/CourseTable";
import CourseForm from "@/components/academics/CourseForm";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { apiClient, AcademicCourse } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { isAdminRole } from "@/lib/roles";

export default function CoursesPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<{ role: { code: string } } | null>(null);
  const [courses, setCourses] = useState<AcademicCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<AcademicCourse | null>(
    null
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [courseToToggle, setCourseToToggle] = useState<AcademicCourse | null>(
    null
  );
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<AcademicCourse | null>(
    null
  );

  useEffect(() => {
    // Check user role
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);

        // Access control: only SUPER_ADMIN
        if (!isAdminRole(userData.role.code)) {
          router.push("/dashboards");
        }
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    if (isAdminRole(user?.role.code)) {
      fetchCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getAcademicCourses();
      // Ensure data is an array
      if (Array.isArray(data)) {
        setCourses(data);
      } else {
        console.error("API returned non-array response:", data);
        setCourses([]);
        toast.show("error", "Invalid response format from server");
      }
    } catch (err) {
      const error = err as Error;
      setCourses([]); // Ensure courses is always an array
      toast.show("error", error.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCourse(null);
    setIsModalOpen(true);
  };

  const handleEdit = (course: AcademicCourse) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (course: AcademicCourse) => {
    setCourseToToggle(course);
    setIsConfirmOpen(true);
  };

  const confirmToggleStatus = async () => {
    if (!courseToToggle) return;

    try {
      await apiClient.updateCourseStatus(
        courseToToggle.id,
        !courseToToggle.is_active
      );
      toast.show(
        "success",
        `Course ${
          courseToToggle.is_active ? "deactivated" : "activated"
        } successfully`
      );
      fetchCourses(); // Refresh list
    } catch (err) {
      const error = err as Error;
      toast.show("error", error.message || "Failed to update course status");
    } finally {
      setIsConfirmOpen(false);
      setCourseToToggle(null);
    }
  };

  const handleDelete = (course: AcademicCourse) => {
    setCourseToDelete(course);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;

    try {
      await apiClient.deleteCourse(courseToDelete.id);
      toast.show("success", "Course deleted successfully");
      fetchCourses(); // Refresh list
    } catch (err) {
      const error = err as Error;
      toast.show("error", error.message || "Failed to delete course");
    } finally {
      setIsDeleteConfirmOpen(false);
      setCourseToDelete(null);
    }
  };

  const handleModalSuccess = () => {
    toast.show(
      "success",
      editingCourse
        ? "Course updated successfully"
        : "Course created successfully"
    );
    fetchCourses(); // Refresh list
  };

  // Access denied state
  if (user && !isAdminRole(user.role.code)) {
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
              Admins can manage courses.
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
              Course Management
            </h1>
            <p className="mt-1 text-gray-500">
              Manage academic courses including programs, degrees, and
              certifications.
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
            Add Course
          </button>
        </div>

        {/* Table */}
        <CourseTable
          courses={courses}
          loading={loading}
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />

        {/* Modal */}
        <CourseForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
          course={editingCourse}
        />

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={isConfirmOpen}
          title={
            courseToToggle?.is_active ? "Deactivate Course" : "Activate Course"
          }
          message={
            courseToToggle?.is_active
              ? `Are you sure you want to deactivate "${courseToToggle?.name}"? This course will no longer be available for new batch templates.`
              : `Are you sure you want to activate "${courseToToggle?.name}"? This course will become available for use.`
          }
          confirmText={courseToToggle?.is_active ? "Deactivate" : "Activate"}
          variant={courseToToggle?.is_active ? "warning" : "info"}
          onConfirm={confirmToggleStatus}
          onCancel={() => {
            setIsConfirmOpen(false);
            setCourseToToggle(null);
          }}
        />

        {/* Delete Confirm Dialog */}
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="Delete Course"
          message={`Are you sure you want to permanently delete "${courseToDelete?.name}"? This action cannot be undone and will remove all associated data.`}
          confirmText="Delete"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => {
            setIsDeleteConfirmOpen(false);
            setCourseToDelete(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
