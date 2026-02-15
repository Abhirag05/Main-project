"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient } from "@/lib/api";

export default function StudentAssessmentsPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isAssessmentAvailable = (assessment: any) => {
    if (assessment.attempt_info) return false;
    try {
      const now = new Date();
      const start = new Date(assessment.start_datetime);
      const end = new Date(assessment.end_datetime);
      return (
        (assessment.status === "ACTIVE" || assessment.status === "SCHEDULED") &&
        now >= start &&
        now <= end
      );
    } catch (e) {
      return false;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SCHEDULED: "bg-yellow-100 text-yellow-800",
      ACTIVE: "bg-green-100 text-green-800",
      COMPLETED: "bg-blue-100 text-blue-800",
      DRAFT: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          styles[status] || styles.DRAFT
        }`}
      >
        {status}
      </span>
    );
  };

  const handleStartAssessment = (assessmentId: number) => {
    router.push(`/dashboards/student/assessments/${assessmentId}`);
  };

  const getAssessmentButtonAndStatus = (assessment: any) => {
    const now = new Date();
    const start = new Date(assessment.start_datetime);
    const end = new Date(assessment.end_datetime);

    if (assessment.attempt_info) {
      const attempt = assessment.attempt_info;
      if (
        attempt.status === "SUBMITTED" ||
        attempt.status === "EVALUATED" ||
        attempt.status === "COMPLETED"
      ) {
        const passed = attempt.percentage >= assessment.passing_percentage;
        return {
          button: (
            <div className="flex flex-col gap-2">
              <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium text-center">
                Submitted
              </span>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                onClick={() =>
                  router.push(
                    `/dashboards/student/assessments/${assessment.id}/result`,
                  )
                }
              >
                View
              </button>
            </div>
          ),
          status: (
            <div className="text-center">
              <span
                className={`block px-3 py-1 rounded-full text-sm font-medium mb-1 ${
                  passed
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {passed ? "Passed" : "Failed"}
              </span>
              <span className="text-xs text-gray-600">
                {attempt.percentage.toFixed(1)}% ({attempt.total_marks_obtained}
                /{assessment.total_marks})
              </span>
            </div>
          ),
        };
      } else if (attempt.status === "IN_PROGRESS") {
        if (now <= end) {
          return {
            button: (
              <button
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium"
                onClick={() => handleStartAssessment(assessment.id)}
              >
                Resume Assessment
              </button>
            ),
            status: "In Progress",
          };
        } else {
          return {
            button: (
              <span className="px-4 py-2 bg-red-100 text-red-800 rounded-md text-sm">
                Expired (Incomplete)
              </span>
            ),
            status: "Expired",
          };
        }
      } else {
        return {
          button: (
            <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md text-sm">
              Attempted
            </span>
          ),
          status: "Attempted",
        };
      }
    }

    if (isAssessmentAvailable(assessment)) {
      return {
        button: (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            onClick={() => handleStartAssessment(assessment.id)}
          >
            Start Assessment
          </button>
        ),
        status: "Available",
      };
    }

    if (now < start) {
      return {
        button: (
          <div className="text-center">
            <span className="block px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium mb-1">
              Scheduled
            </span>
            <span className="text-xs text-gray-500">{formatDate(start.toISOString())}</span>
          </div>
        ),
        status: "Scheduled",
      };
    }

    return {
      button: (
        <span className="px-4 py-2 bg-red-100 text-red-800 rounded-md text-sm">
          Expired
        </span>
      ),
      status: "Expired",
    };
  };

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 300));
      const data = await apiClient.getStudentAssessments();
      const normalized = (data || []).map((assess: any) => ({
        ...assess,
        attempt_info: assess.attempt_info
          ? {
              ...assess.attempt_info,
              percentage:
                assess.attempt_info.percentage !== null &&
                assess.attempt_info.percentage !== undefined
                  ? Number(assess.attempt_info.percentage)
                  : 0,
              total_marks_obtained:
                assess.attempt_info.total_marks_obtained !== null &&
                assess.attempt_info.total_marks_obtained !== undefined
                  ? Number(assess.attempt_info.total_marks_obtained)
                  : 0,
            }
          : null,
      }));
      setAssessments(normalized);
      setError(null);
    } catch (e) {
      setError((e as Error).message || "Failed to load assessments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
              <p className="text-gray-600 mt-2">
                View and attempt assessments assigned to your batch
              </p>
            </div>
            <button
              onClick={fetchAssessments}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              disabled={loading}
            >
              <svg
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchAssessments}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        ) : assessments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              No assessments yet
            </h3>
            <p className="mt-1 text-gray-500">
              There are no assessments assigned to your batch at this time.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {assessments.map((assessment) => (
              <div
                key={assessment.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {assessment.title}
                      </h2>
                      {getStatusBadge(assessment.status)}
                    </div>
                    {assessment.description && (
                      <p className="text-gray-600 mb-4">
                        {assessment.description}
                      </p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Subject:</span>
                        <p className="font-medium text-gray-900">
                          {assessment.subject?.name}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Faculty:</span>
                        <p className="font-medium text-gray-900">
                          {assessment.faculty?.full_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <p className="font-medium text-gray-900">
                          {assessment.duration_minutes} mins
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Marks:</span>
                        <p className="font-medium text-gray-900">
                          {assessment.total_marks}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Start:</span>
                        <p className="font-medium text-gray-900">
                          {formatDate(assessment.start_datetime)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">End:</span>
                        <p className="font-medium text-gray-900">
                          {formatDate(assessment.end_datetime)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Questions:</span>
                        <p className="font-medium text-gray-900">
                          {assessment.questions_count}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Passing:</span>
                        <p className="font-medium text-gray-900">
                          {assessment.passing_percentage}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    {(() => {
                      const { button } =
                        getAssessmentButtonAndStatus(assessment);
                      return button;
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
