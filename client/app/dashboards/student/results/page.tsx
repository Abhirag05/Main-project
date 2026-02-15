"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient, StudentAssessment } from "@/lib/api";

export default function StudentResultsPage() {
  const [assessments, setAssessments] = useState<StudentAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getStudentAssessments();
        setAssessments(data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load results.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const completedAssessments = assessments.filter((a) => !!a.attempt_info);
  const pendingAssessments = assessments.filter((a) => !a.attempt_info);

  const totalScore = completedAssessments.reduce(
    (sum, a) => sum + (a.attempt_info?.total_marks_obtained ?? 0),
    0
  );
  const totalMarks = completedAssessments.reduce(
    (sum, a) => sum + a.total_marks,
    0
  );
  const overallPercentage =
    totalMarks > 0 ? ((totalScore / totalMarks) * 100).toFixed(1) : "0.0";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Results</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View your assessment results and performance summary
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
            {error}
          </div>
        ) : assessments.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground/70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-foreground">
              No assessments yet
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No assessments are available for your batch yet.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <div className="bg-card overflow-hidden shadow rounded-lg p-5">
                <p className="text-sm font-medium text-muted-foreground">Total Assessments</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {assessments.length}
                </p>
              </div>
              <div className="bg-card overflow-hidden shadow rounded-lg p-5">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  {completedAssessments.length}
                </p>
              </div>
              <div className="bg-card overflow-hidden shadow rounded-lg p-5">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="mt-1 text-2xl font-bold text-yellow-600">
                  {pendingAssessments.length}
                </p>
              </div>
              <div className="bg-card overflow-hidden shadow rounded-lg p-5">
                <p className="text-sm font-medium text-muted-foreground">Overall Score</p>
                <p className="mt-1 text-2xl font-bold text-primary">
                  {overallPercentage}%
                </p>
              </div>
            </div>

            {/* Completed Results Table */}
            {completedAssessments.length > 0 && (
              <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">
                    Completed Assessments
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Assessment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Percentage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Submitted
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {completedAssessments.map((a) => {
                        const pct = a.attempt_info?.percentage ?? 0;
                        const passed = pct >= a.passing_percentage;
                        return (
                          <tr key={a.id} className="hover:bg-secondary/50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                              {a.title}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {a.subject.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                              {a.attempt_info?.total_marks_obtained ?? 0} / {a.total_marks}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`font-semibold ${passed ? "text-green-600" : "text-red-600"}`}>
                                {pct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  passed
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {passed ? "Passed" : "Failed"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {a.attempt_info?.submitted_at
                                ? new Date(a.attempt_info.submitted_at).toLocaleDateString(
                                    "en-IN",
                                    { day: "numeric", month: "short", year: "numeric" }
                                  )
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pending Assessments */}
            {pendingAssessments.length > 0 && (
              <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">
                    Pending Assessments
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Assessment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Total Marks
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Available
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {pendingAssessments.map((a) => (
                        <tr key={a.id} className="hover:bg-secondary/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {a.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {a.subject.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {a.total_marks}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {a.duration_minutes} mins
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {new Date(a.start_datetime).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            –{" "}
                            {new Date(a.end_datetime).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
