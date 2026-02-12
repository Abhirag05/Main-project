"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient, StudentAttempt } from "@/lib/api";

export default function StudentResultsPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttempts();
  }, []);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getStudentAttempts();
      // Normalize attempt fields to safe numeric types to avoid runtime errors
      const normalized = (data || []).map((a: any) => ({
        ...a,
        percentage:
          a.percentage !== null && a.percentage !== undefined
            ? Number(a.percentage)
            : 0,
        total_marks_obtained:
          a.total_marks_obtained !== null &&
          a.total_marks_obtained !== undefined
            ? Number(a.total_marks_obtained)
            : 0,
        assessment_total_marks:
          a.assessment_total_marks !== null &&
          a.assessment_total_marks !== undefined
            ? Number(a.assessment_total_marks)
            : 0,
      }));
      setAttempts(normalized);
      setError(null);
    } catch (err) {
      const e = err as Error;
      setError(e.message || "Failed to fetch attempts");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SUBMITTED: "bg-green-100 text-green-800",
      IN_PROGRESS: "bg-yellow-100 text-yellow-800",
      EXPIRED: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[status] || styles.IN_PROGRESS}`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  const getResultBadge = (resultStatus: string) => {
    const styles: Record<string, string> = {
      PASS: "bg-green-100 text-green-800",
      FAIL: "bg-red-100 text-red-800",
      NOT_GRADED: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[resultStatus] || styles.NOT_GRADED}`}
      >
        {resultStatus.replace("_", " ")}
      </span>
    );
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Results</h1>
              <p className="text-gray-600 mt-2">
                View your assessment results and performance history
              </p>
            </div>
            <button
              onClick={fetchAttempts}
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
              onClick={fetchAttempts}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        ) : attempts.length === 0 ? (
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
              No results yet
            </h3>
            <p className="mt-1 text-gray-500">
              You haven't attempted any assessments yet.
            </p>
            <button
              onClick={() => router.push("/dashboards/student/assessments")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Available Assessments
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {attempts.length}
                </p>
                <p className="text-gray-600">Total Attempts</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {attempts.filter((a) => a.result_status === "PASS").length}
                </p>
                <p className="text-gray-600">Passed</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {attempts.length > 0
                    ? (
                        attempts.reduce((sum, a) => sum + a.percentage, 0) /
                        attempts.length
                      ).toFixed(1)
                    : 0}
                  %
                </p>
                <p className="text-gray-600">Average Score</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {attempts.length > 0
                    ? Math.max(...attempts.map((a) => a.percentage)).toFixed(1)
                    : 0}
                  %
                </p>
                <p className="text-gray-600">Best Score</p>
              </div>
            </div>

            {/* Attempts List */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Assessment History
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assessment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {attempt.assessment_title}
                            </div>
                            <div className="text-sm text-gray-500">
                              Attempt #{attempt.id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(attempt.started_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {attempt.total_marks_obtained}/
                          {attempt.assessment_total_marks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-medium ${getPercentageColor(attempt.percentage)}`}
                          >
                            {attempt.percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(attempt.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getResultBadge(attempt.result_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboards/student/assessments/${attempt.assessment}/result`,
                              )
                            }
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
