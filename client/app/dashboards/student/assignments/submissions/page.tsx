"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { assignmentAPIClient, Assignment, AssignmentSubmission, Skill } from "@/lib/assignmentAPI";

type FilterStatus = "all" | "evaluated" | "pending";

export default function MySubmissionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<AssignmentSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [assignmentMeta, setAssignmentMeta] = useState<
    Record<number, { module_name?: string; skills?: Skill[]; max_marks?: string }>
  >({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData.role.code !== "STUDENT") {
          router.push("/dashboards");
        }
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filterStatus, submissions]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const [submissionsResult, assignmentsResult] = await Promise.allSettled([
        assignmentAPIClient.getStudentSubmissions(),
        assignmentAPIClient.getStudentAssignments(),
      ]);

      if (submissionsResult.status === "fulfilled") {
        setSubmissions(submissionsResult.value);
      } else {
        throw submissionsResult.reason;
      }

      if (assignmentsResult.status === "fulfilled") {
        const meta = assignmentsResult.value.reduce(
          (acc, assignment: Assignment) => {
            acc[assignment.id] = {
              module_name: assignment.module_name,
              skills: assignment.skills,
              max_marks: assignment.max_marks,
            };
            return acc;
          },
          {} as Record<number, { module_name?: string; skills?: Skill[]; max_marks?: string }>
        );
        setAssignmentMeta(meta);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = submissions;

    switch (filterStatus) {
      case "evaluated":
        filtered = submissions.filter((sub) => sub.is_evaluated);
        break;
      case "pending":
        filtered = submissions.filter((sub) => !sub.is_evaluated);
        break;
      default:
        filtered = submissions;
    }

    setFilteredSubmissions(filtered);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAssignmentTitle = (submission: AssignmentSubmission) => {
    if (submission.assignment_title) {
      return submission.assignment_title;
    }
    return `Assignment #${submission.assignment}`;
  };

  const getModuleName = (submission: AssignmentSubmission) => {
    return (
      submission.module_name ||
      submission.subject_name ||
      assignmentMeta[submission.assignment]?.module_name ||
      "Module"
    );
  };

  const toNumber = (value?: string) => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const buildFileUrl = (filePath?: string) => {
    if (!filePath) return "";
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const normalizedBase = baseUrl.endsWith("/api")
      ? baseUrl.slice(0, -4)
      : baseUrl;
    const normalizedBaseWithSlash = normalizedBase.endsWith("/")
      ? normalizedBase.slice(0, -1)
      : normalizedBase;
    const normalizedPath = filePath.startsWith("/") ? filePath : `/${filePath}`;

    return `${normalizedBaseWithSlash}${normalizedPath}`;
  };

  const getStatusLabel = (submission: AssignmentSubmission) => {
    if (submission.is_evaluated) return "Evaluated";
    if (!submission.submission_file) return "Pending";
    return "Submitted";
  };

  const getAverageScore = () => {
    let total = 0;
    let count = 0;

    submissions
      .filter((s) => s.is_evaluated)
      .forEach((s) => {
        const marks = toNumber(s.marks_obtained);
        const maxMarks =
          toNumber(s.assignment_max_marks) ||
          toNumber(assignmentMeta[s.assignment]?.max_marks);
        if (marks === null || maxMarks === null || maxMarks === 0) return;
        total += (marks / maxMarks) * 100;
        count += 1;
      });

    if (count === 0) return "0";
    return (total / count).toFixed(1);
  };

  const getSkillsForSubmission = (submission: AssignmentSubmission) => {
    return assignmentMeta[submission.assignment]?.skills || [];
  };

  const renderSkillSummary = (submission: AssignmentSubmission) => {
    const skills = getSkillsForSubmission(submission);
    if (skills.length === 0) return "No skills";
    if (!submission.is_evaluated) return "Pending evaluation";

    return skills.map((skill) => skill.name).join(", ");
  };

  const getStatusBadge = (submission: AssignmentSubmission) => {
    const status = getStatusLabel(submission);
    const statusClasses: Record<string, string> = {
      Evaluated: "bg-green-100 text-green-800",
      Pending: "bg-yellow-100 text-yellow-800",
      Submitted: "bg-blue-100 text-blue-800",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded ${
          statusClasses[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status}
      </span>
    );
  };

  const openFeedback = (submission: AssignmentSubmission) => {
    setSelectedSubmission(submission);
    setIsFeedbackOpen(true);
  };

  const closeFeedback = () => {
    setIsFeedbackOpen(false);
    setSelectedSubmission(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/dashboards/student" className="hover:text-blue-600">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboards/student/assignments" className="hover:text-blue-600">Assignments</Link>
            <span>/</span>
            <span className="text-gray-900">My Submissions</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">My Submissions</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Summary */}
        {submissions.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-600">Total Submissions</div>
              <div className="text-2xl font-bold text-gray-900">{submissions.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-600">Evaluated</div>
              <div className="text-2xl font-bold text-green-600">
                {submissions.filter((s) => s.is_evaluated).length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-600">Average Score</div>
              <div className="text-2xl font-bold text-blue-600">
                {getAverageScore()}
                %
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All ({submissions.length})
            </button>
            <button
              onClick={() => setFilterStatus("evaluated")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === "evaluated"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Evaluated ({submissions.filter((s) => s.is_evaluated).length})
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === "pending"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pending ({submissions.filter((s) => !s.is_evaluated).length})
            </button>
          </div>
        </div>

        {/* Submissions Table */}
        {filteredSubmissions.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skills Evaluated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubmissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {getAssignmentTitle(submission)}
                        </div>
                        {submission.is_late_submission && (
                          <div className="text-xs text-red-600 mt-1">Late Submission</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {getModuleName(submission)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {renderSkillSummary(submission)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(submission.submitted_at)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(submission)}</td>
                      <td className="px-6 py-4 text-sm">
                        {submission.is_evaluated ? (
                          <div>
                            <div className="font-medium text-gray-900">
                              {submission.marks_obtained ?? "-"}
                              {toNumber(submission.assignment_max_marks) !== null && (
                                <span> / {submission.assignment_max_marks}</span>
                              )}
                            </div>
                            {toNumber(submission.marks_obtained) !== null &&
                              toNumber(submission.assignment_max_marks) !== null && (
                                <div className="text-xs text-gray-500">
                                  {(
                                    (toNumber(submission.marks_obtained)! /
                                      toNumber(submission.assignment_max_marks)!) *
                                    100
                                  ).toFixed(1)}%
                                </div>
                              )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Not evaluated</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openFeedback(submission)}
                            className="text-gray-600 hover:underline"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Submissions Found</h3>
            <p className="text-gray-600 mb-4">
              {filterStatus === "all"
                ? "You haven't submitted any assignments yet."
                : filterStatus === "evaluated"
                ? "No evaluated submissions yet."
                : "All your submissions have been evaluated."}
            </p>
            <Link
              href="/dashboards/student/assignments"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View Available Assignments
            </Link>
          </div>
        )}

        {isFeedbackOpen && selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg bg-white rounded-lg shadow-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Submission Details</h2>
                <button
                  type="button"
                  onClick={closeFeedback}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Assignment</div>
                  <div className="text-base font-medium text-gray-900">
                    {getAssignmentTitle(selectedSubmission)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Module</div>
                  <div className="text-base text-gray-900">{getModuleName(selectedSubmission)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Submitted</div>
                  <div className="text-base text-gray-900">
                    {formatDate(selectedSubmission.submitted_at)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="text-base text-gray-900">{getStatusLabel(selectedSubmission)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Marks</div>
                  <div className="text-base text-gray-900">
                    {selectedSubmission.is_evaluated
                      ? `${selectedSubmission.marks_obtained ?? "-"}${
                          toNumber(selectedSubmission.assignment_max_marks) !== null
                            ? ` / ${selectedSubmission.assignment_max_marks}`
                            : assignmentMeta[selectedSubmission.assignment]?.max_marks
                              ? ` / ${assignmentMeta[selectedSubmission.assignment]?.max_marks}`
                              : ""
                        }`
                      : "Not evaluated"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Skills</div>
                  <div className="text-base text-gray-900">
                    {(() => {
                      const skills = getSkillsForSubmission(selectedSubmission);
                      if (skills.length === 0) return "No skills";
                      if (!selectedSubmission.is_evaluated) return "Pending evaluation";
                      return skills.map((skill) => skill.name).join(", ");
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Feedback</div>
                  <div className="text-base text-gray-900">
                    {selectedSubmission.is_evaluated
                      ? selectedSubmission.feedback || "No feedback provided."
                      : "Feedback will appear after evaluation."}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap gap-2 justify-end">
                <a
                  href={buildFileUrl(selectedSubmission.submission_file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Download Submission
                </a>
                <button
                  type="button"
                  onClick={closeFeedback}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
