"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useFacultyGuard } from "@/components/faculty/hooks/useFacultyGuard";
import FacultyAlert from "@/components/faculty/ui/FacultyAlert";
import FacultyCard from "@/components/faculty/ui/FacultyCard";
import FacultyEmptyState from "@/components/faculty/ui/FacultyEmptyState";
import FacultyPageHeader from "@/components/faculty/ui/FacultyPageHeader";
import {
  assessmentApiClient,
  Assessment,
  AssessmentStatus,
} from "@/lib/assessmentAPI";

const STATUS_COLORS: Record<AssessmentStatus, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-800",
};

export default function MyAssessmentsPage() {
  const { isAllowed } = useFacultyGuard();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    assessment: Assessment | null;
  }>({ isOpen: false, assessment: null });
  const [deleting, setDeleting] = useState(false);

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await assessmentApiClient.getAssessments();
      setAssessments(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load assessments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) {
      fetchAssessments();
    }
  }, [fetchAssessments, isAllowed]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.assessment) return;

    setDeleting(true);
    try {
      await assessmentApiClient.deleteAssessment(deleteConfirm.assessment.id);
      showSuccess("Assessment deleted successfully");
      fetchAssessments();
    } catch (err) {
      const error = err as Error;
      showError(error.message || "Failed to delete assessment");
    } finally {
      setDeleting(false);
      setDeleteConfirm({ isOpen: false, assessment: null });
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isAllowed) {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <FacultyCard className="p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          </FacultyCard>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <FacultyPageHeader
          title="My Assessments"
          description="Manage your MCQ assessments"
          action={
            <Link
              href="/dashboards/faculty/assessments/create"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
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
              Create Assessment
            </Link>
          }
        />

        {/* Notifications */}
        {error && (
          <FacultyAlert variant="error" className="mb-4">
            {error}
          </FacultyAlert>
        )}
        {successMessage && (
          <FacultyAlert variant="success" className="mb-4">
            {successMessage}
          </FacultyAlert>
        )}

        {/* Assessments Table */}
        <FacultyCard className="overflow-hidden">
          {assessments.length === 0 ? (
            <FacultyEmptyState
              icon={
                <svg
                  className="h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              }
              title="No assessments found"
              description="Create your first assessment to get started."
              action={
                <Link
                  href="/dashboards/faculty/assessments/create"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Assessment
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skills Assessed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assessments.map((assessment) => (
                    <tr key={assessment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {assessment.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {assessment.questions_count} questions •{" "}
                          {assessment.total_marks} marks •{" "}
                          {assessment.duration_minutes} min
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {assessment.batch.code}
                        </div>
                        <div className="text-xs text-gray-500">
                          {assessment.batch.course_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {assessment.subject.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {assessment.skills && assessment.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assessment.skills.map((skill) => (
                              <span
                                key={skill.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                              >
                                {skill.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">
                            No skills
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDateTime(assessment.start_datetime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDateTime(assessment.end_datetime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            STATUS_COLORS[assessment.status]
                          }`}
                        >
                          {assessment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {(assessment.status === "DRAFT" ||
                            assessment.status === "SCHEDULED") && (
                            <>
                              <Link
                                href={`/dashboards/faculty/assessments/create?edit=${assessment.id}`}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                Edit
                              </Link>
                              <span className="text-gray-300">|</span>
                            </>
                          )}
                          <Link
                            href={`/dashboards/faculty/assessments/${assessment.id}/questions`}
                            className="text-blue-600 hover:text-blue-900"
                            title={
                              assessment.status === "DRAFT"
                                ? "Add Questions"
                                : "View Questions"
                            }
                          >
                            {assessment.status === "DRAFT"
                              ? "Add questions"
                              : "View questions"}
                          </Link>
                          {(assessment.status === "ACTIVE" ||
                            assessment.status === "COMPLETED") && (
                            <>
                              <span className="text-gray-300">|</span>
                              <Link
                                href={`/dashboards/faculty/assessments/${assessment.id}/results`}
                                className="text-green-600 hover:text-green-900"
                                title="View Results"
                              >
                                Results
                              </Link>
                            </>
                          )}
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                assessment,
                              })
                            }
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
          )}
        </FacultyCard>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Assessment"
        message={`Are you sure you want to delete "${deleteConfirm.assessment?.title}"? This will also delete all questions and associated student attempts. This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, assessment: null })}
        variant="danger"
      />
    </DashboardLayout>
  );
}
