"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {
  apiClient,
  AcademicCourse,
  AcademicModule,
  CourseSubject,
} from "@/lib/api";
import { useToast } from "@/lib/toast";
import { isAdminRole } from "@/lib/roles";

export default function CourseBuilderPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<{ role: { code: string } } | null>(null);

  // Data state
  const [courses, setCourses] = useState<AcademicCourse[]>([]);
  const [modules, setModules] = useState<AcademicModule[]>([]);
  const [courseSubjects, setCourseSubjects] = useState<CourseSubject[]>([]);

  // Selection state
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  // Loading states
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFormData, setModalFormData] = useState({
    subject_id: 0,
    sequence_order: 1,
  });
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // Confirm dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [subjectToToggle, setSubjectToToggle] = useState<CourseSubject | null>(
    null
  );
  // Delete confirmation state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<CourseSubject | null>(
    null
  );

  // Auth check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        if (!isAdminRole(userData.role.code)) {
          router.push("/dashboards");
        }
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  // Fetch courses on mount
  useEffect(() => {
    if (isAdminRole(user?.role.code)) {
      fetchCourses();
      fetchAllModules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch course subjects when course is selected
  useEffect(() => {
    if (selectedCourseId) {
      fetchCourseSubjects(selectedCourseId);
    } else {
      setCourseSubjects([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const data = await apiClient.getAcademicCourses();
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      const error = err as Error;
      toast.show("error", error.message || "Failed to load courses");
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchAllModules = async () => {
    try {
      const data = await apiClient.getAcademicModules();
      setModules(Array.isArray(data) ? data.filter((s) => s.is_active) : []);
    } catch (err) {
      console.error("Failed to load modules:", err);
      setModules([]);
    }
  };

  const fetchCourseSubjects = async (courseId: number) => {
    setLoadingSubjects(true);
    try {
      const response = await apiClient.getCourseSubjects(courseId);
      setCourseSubjects(
        Array.isArray(response.subjects) ? response.subjects : []
      );
    } catch (err) {
      const error = err as Error;
      toast.show("error", error.message || "Failed to load course subjects");
      setCourseSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleCourseSelect = (courseId: string) => {
    const id = parseInt(courseId);
    setSelectedCourseId(id === 0 ? null : id);
  };

  const handleAddSubject = () => {
    if (!selectedCourseId) {
      toast.show("error", "Please select a course first");
      return;
    }
    // Calculate next sequence order
    const nextSequence =
      courseSubjects.length > 0
        ? Math.max(...courseSubjects.map((cs) => cs.sequence_order)) + 1
        : 1;
    setModalFormData({ subject_id: 0, sequence_order: nextSequence });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!modalFormData.subject_id) {
      setModalError("Please select a module");
      return;
    }
    if (modalFormData.sequence_order < 1) {
      setModalError("Sequence order must be at least 1");
      return;
    }

    setModalLoading(true);
    try {
      await apiClient.addSubjectToCourse({
        course_id: selectedCourseId!,
        subject_id: modalFormData.subject_id,
        sequence_order: modalFormData.sequence_order,
      });
      toast.show("success", "Module added to course successfully");
      setIsModalOpen(false);
      fetchCourseSubjects(selectedCourseId!);
    } catch (err) {
      const error = err as Error;
      if (
        error.message.includes("already assigned") ||
        error.message.includes("already exists")
      ) {
        setModalError("This module is already assigned to this course");
      } else {
        setModalError(error.message || "Failed to add module");
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleMoveUp = async (cs: CourseSubject) => {
    const currentIndex = courseSubjects.findIndex((s) => s.id === cs.id);
    if (currentIndex <= 0) return;

    const prevSubject = courseSubjects[currentIndex - 1];
    try {
      // Swap sequence orders
      await apiClient.updateCourseSubject(cs.id, {
        sequence_order: prevSubject.sequence_order,
      });
      await apiClient.updateCourseSubject(prevSubject.id, {
        sequence_order: cs.sequence_order,
      });
      fetchCourseSubjects(selectedCourseId!);
    } catch (err) {
      const error = err as Error;
      toast.show("error", error.message || "Failed to reorder");
    }
  };

  const handleMoveDown = async (cs: CourseSubject) => {
    const currentIndex = courseSubjects.findIndex((s) => s.id === cs.id);
    if (currentIndex >= courseSubjects.length - 1) return;

    const nextSubject = courseSubjects[currentIndex + 1];
    try {
      // Swap sequence orders
      await apiClient.updateCourseSubject(cs.id, {
        sequence_order: nextSubject.sequence_order,
      });
      await apiClient.updateCourseSubject(nextSubject.id, {
        sequence_order: cs.sequence_order,
      });
      fetchCourseSubjects(selectedCourseId!);
    } catch (err) {
      const error = err as Error;
      toast.show("error", error.message || "Failed to reorder");
    }
  };

  const handleToggleStatus = (cs: CourseSubject) => {
    setSubjectToToggle(cs);
    setIsConfirmOpen(true);
  };

  const handleDelete = (cs: CourseSubject) => {
    setSubjectToDelete(cs);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!subjectToDelete) return;
    try {
      await apiClient.deleteCourseModule(subjectToDelete.id);
      toast.show("success", "Module deleted from course");
      fetchCourseSubjects(selectedCourseId!);
    } catch (err) {
      const error = err as Error;
      toast.show("error", error.message || "Failed to delete module");
    } finally {
      setIsDeleteConfirmOpen(false);
      setSubjectToDelete(null);
    }
  };

  const confirmToggleStatus = async () => {
    if (!subjectToToggle) return;

    try {
      await apiClient.updateCourseSubjectStatus(
        subjectToToggle.id,
        !subjectToToggle.is_active
      );
      toast.show(
        "success",
        `Module ${
          subjectToToggle.is_active ? "deactivated" : "activated"
        } successfully`
      );
      fetchCourseSubjects(selectedCourseId!);
    } catch (err) {
      const error = err as Error;
      toast.show("error", error.message || "Failed to update status");
    } finally {
      setIsConfirmOpen(false);
      setSubjectToToggle(null);
    }
  };

  // Get available subjects (not already assigned to this course)
  const availableSubjects = modules.filter(
    (s) => !courseSubjects.some((cs) => cs.module === s.id)
  );

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

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
            <h2 className="mt-4 text-2xl font-bold text-foreground">
              Access Denied
            </h2>
            <p className="mt-2 text-muted-foreground">
              You don&apos;t have permission to access this page. Only Super
              Admins can manage course curriculum.
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Course Builder</h1>
          <p className="mt-1 text-muted-foreground">
            Define which modules belong to each course and set their teaching
            order.
          </p>
        </div>

        {/* Course Selector Section */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">
                Select Course
              </label>
              {loadingCourses ? (
                <div className="flex items-center justify-center py-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <select
                  value={selectedCourseId || 0}
                  onChange={(e) => handleCourseSelect(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border text-foreground/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring hover:border-border transition-all"
                >
                  <option value={0}>-- Select Course --</option>
                  {courses
                    .filter((c) => c.is_active)
                    .map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </option>
                    ))}
                </select>
              )}
            </div>

            {selectedCourse && (
              <div className="bg-primary/10 border-l-4 border-primary/70 rounded-r-lg p-4">
                <h3 className="text-sm font-medium text-primary mb-2">
                  Selected Course
                </h3>
                <p className="text-sm text-primary">
                  <strong>Code:</strong> {selectedCourse.code}
                </p>
                <p className="text-sm text-primary">
                  <strong>Name:</strong> {selectedCourse.name}
                </p>
                <p className="text-sm text-primary">
                  <strong>Duration:</strong> {selectedCourse.duration_months}{" "}
                  months
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add Module Button */}
        {selectedCourseId && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={handleAddSubject}
              className="px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
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
        )}

        {/* Course Modules List */}
        {selectedCourseId ? (
          loadingSubjects ? (
            <div className="bg-card rounded-lg shadow overflow-hidden">
              <div className="animate-pulse">
                <div className="h-12 bg-muted"></div>
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-secondary border-t border-border"
                  ></div>
                ))}
              </div>
            </div>
          ) : courseSubjects.length === 0 ? (
            <div className="bg-card rounded-lg shadow p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground/70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-foreground">
                No modules assigned
              </h3>
              <p className="mt-1 text-muted-foreground">
                This course has no modules yet. Add modules to build the
                curriculum.
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Module Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Module Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {courseSubjects
                      .sort((a, b) => a.sequence_order - b.sequence_order)
                      .map((cs, index) => (
                        <tr
                          key={cs.id}
                          className="hover:bg-secondary/50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-medium">
                              {cs.sequence_order}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-foreground">
                              {cs.module_code}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-foreground">
                              {cs.module_name}
                            </div>
                            {cs.module_description && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {cs.module_description}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                cs.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-secondary text-foreground"
                              }`}
                            >
                              {cs.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex items-center justify-center gap-4">
                              {cs.is_active ? (
                                <button
                                  onClick={() => handleToggleStatus(cs)}
                                  className="text-orange-600 hover:text-orange-900"
                                  title="Deactivate"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(cs)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Reactivate"
                                >
                                  Reactivate
                                </button>
                              )}

                              <button
                                onClick={() => handleDelete(cs)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="bg-card rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-muted-foreground/70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-foreground">
              No Course Selected
            </h3>
            <p className="mt-2 text-muted-foreground">
              Please select a course from the dropdown above to view and manage
              its curriculum.
            </p>
          </div>
        )}

        {/* Add Module Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Add Module to Course
                  </h2>
                  <p className="text-amber-100 text-sm mt-0.5">
                    Add a module to the curriculum
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-white/70 hover:text-white transition-colors"
                  disabled={modalLoading}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {modalError && (
                  <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg" role="alert">
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="ml-3 text-sm font-medium text-red-800">{modalError}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleModalSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                      Module <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={modalFormData.subject_id}
                      onChange={(e) =>
                        setModalFormData({
                          ...modalFormData,
                          subject_id: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2.5 border border-border text-foreground/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring hover:border-border transition-all"
                      required
                      disabled={modalLoading}
                    >
                      <option value={0}>Select Module</option>
                      {availableSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.code} - {subject.name}
                        </option>
                      ))}
                    </select>
                    {availableSubjects.length === 0 && (
                      <p className="mt-1 text-xs text-orange-600">
                        All modules are already assigned to this course
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                      Sequence Order <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={modalFormData.sequence_order}
                      onChange={(e) =>
                        setModalFormData({
                          ...modalFormData,
                          sequence_order: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-4 py-2.5 border border-border text-foreground/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring hover:border-border transition-all"
                      required
                      disabled={modalLoading}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Position of this module in the curriculum
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-2.5 border-2 border-border text-foreground/80 font-semibold rounded-lg hover:bg-secondary/50 transition-colors"
                      disabled={modalLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      disabled={modalLoading || availableSubjects.length === 0}
                    >
                      {modalLoading && (
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      {modalLoading ? "Adding..." : "Add Module"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={isConfirmOpen}
          title={
            subjectToToggle?.is_active
              ? "Deactivate Module"
              : "Reactivate Module"
          }
          message={
            subjectToToggle
              ? subjectToToggle.is_active
                ? `Are you sure you want to deactivate "${
                    subjectToToggle.module_name
                  }" from this course? It will be hidden from the curriculum but not deleted.`
                : `Are you sure you want to reactivate "${
                    subjectToToggle.module_name
                  }" for this course?`
              : ""
          }
          confirmText={subjectToToggle?.is_active ? "Deactivate" : "Reactivate"}
          variant={subjectToToggle?.is_active ? "warning" : "info"}
          onConfirm={confirmToggleStatus}
          onCancel={() => {
            setIsConfirmOpen(false);
            setSubjectToToggle(null);
          }}
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title={"Delete Module"}
          message={
            subjectToDelete
              ? `Are you sure you want to permanently delete "${
                  subjectToDelete.module_name
                }" from this course? This action cannot be undone.`
              : ""
          }
          confirmText={"Delete"}
          variant={"danger"}
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
