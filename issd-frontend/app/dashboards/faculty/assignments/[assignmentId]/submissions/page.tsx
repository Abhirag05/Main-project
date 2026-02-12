"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { assignmentAPIClient, AssignmentSubmission } from "@/lib/assignmentAPI";

export default function AssignmentSubmissionsPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params?.assignmentId ? parseInt(params.assignmentId as string) : null;

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter
  const [filter, setFilter] = useState<"all" | "evaluated" | "pending">("all");

  // Evaluate modal
  const [evaluateModal, setEvaluateModal] = useState<{
    isOpen: boolean;
    submission: AssignmentSubmission | null;
  }>({ isOpen: false, submission: null });
  const [evaluateData, setEvaluateData] = useState({ marks_obtained: 0, feedback: "" });
  const [evaluating, setEvaluating] = useState(false);

  // Check user role
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData.role.code !== "FACULTY") {
          router.push("/dashboards");
        }
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    if (assignmentId) {
      fetchSubmissions();
    }
  }, [assignmentId]);

  const fetchSubmissions = async () => {
    if (!assignmentId) return;

    setLoading(true);
    try {
      const data = await assignmentAPIClient.getAssignmentSubmissions(assignmentId, undefined);
      setAssignment(data.assignment);
      setSubmissions(data.submissions);
    } catch (err) {
      showError((err as Error).message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const openEvaluateModal = (submission: AssignmentSubmission) => {
    setEvaluateModal({ isOpen: true, submission });
    setEvaluateData({
      marks_obtained: submission.marks_obtained ? parseFloat(submission.marks_obtained) : 0,
      feedback: submission.feedback || "",
    });
  };

  const handleEvaluate = async () => {
    if (!evaluateModal.submission) return;

    // Validate
    const maxMarks = parseFloat(assignment.max_marks);
    if (evaluateData.marks_obtained < 0 || evaluateData.marks_obtained > maxMarks) {
      showError(`Marks must be between 0 and ${maxMarks}`);
      return;
    }

    setEvaluating(true);
    try {
      await assignmentAPIClient.evaluateSubmission(evaluateModal.submission.id, evaluateData);
      showSuccess("Submission evaluated successfully");
      setEvaluateModal({ isOpen: false, submission: null });
      fetchSubmissions();
      if (assignmentId) {
        setTimeout(() => {
          router.push(`/dashboards/faculty/assignments/${assignmentId}/submissions`);
        }, 1200);
      }
    } catch (err) {
      showError((err as Error).message || "Failed to evaluate submission");
    } finally {
      setEvaluating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredSubmissions =
    filter === "all"
      ? submissions
      : submissions.filter((submission) =>
          filter === "evaluated" ? submission.is_evaluated : !submission.is_evaluated
        );

  const getEmptyStateCopy = () => {
    if (submissions.length === 0) {
      return {
        title: "No submissions yet",
        description: "Students haven't submitted their work yet.",
      };
    }

    if (filter === "pending") {
      return {
        title: "No pending evaluations",
        description: "All submissions are evaluated for this assignment.",
      };
    }

    if (filter === "evaluated") {
      return {
        title: "No evaluated submissions",
        description: "Submissions are waiting for evaluation.",
      };
    }

    return {
      title: "No submissions found",
      description: "Try a different filter.",
    };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/dashboards/faculty" className="hover:text-blue-600">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboards/faculty/assignments" className="hover:text-blue-600">Assignments</Link>
            <span>/</span>
            <span className="text-gray-900">Submissions</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{assignment?.title || "Assignment"} - Submissions</h1>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span>Max Marks: {assignment?.max_marks}</span>
            <span>•</span>
            <span>Due: {assignment && formatDate(assignment.due_date)}</span>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {["all", "pending", "evaluated"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  filter === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === "pending" && submissions.filter(s => !s.is_evaluated).length > 0 && (
                  <span className="ml-2 bg-orange-100 text-orange-800 py-0.5 px-2 rounded-full text-xs">
                    {submissions.filter(s => !s.is_evaluated).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{getEmptyStateCopy().title}</h3>
              <p className="mt-1 text-sm text-gray-500">{getEmptyStateCopy().description}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marks</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubmissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{submission.student_name}</div>
                        <div className="text-sm text-gray-500">{submission.student_roll_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(submission.submitted_at)}</div>
                        {submission.is_late_submission && (
                          <span className="text-xs text-red-600 font-medium">Late</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {submission.is_evaluated ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Evaluated
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {submission.is_evaluated ? (
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">{submission.marks_obtained}</span>
                            <span className="text-gray-500"> / {assignment.max_marks}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Not evaluated</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <a
                          href={`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/api$/, "")}${submission.submission_file}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Download
                        </a>
                        {assignment && new Date(assignment.due_date) < new Date() ? (
                          <button
                            onClick={() => openEvaluateModal(submission)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {submission.is_evaluated ? "Re-evaluate" : "Evaluate"}
                          </button>
                        ) : (
                          <span className="text-gray-400 cursor-not-allowed" title="Available after deadline">
                            {submission.is_evaluated ? "Re-evaluate" : "Evaluate"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Evaluate Modal */}
      {evaluateModal.isOpen && evaluateModal.submission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Evaluate Submission</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Student:</strong> {evaluateModal.submission.student_name}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Submitted:</strong> {formatDate(evaluateModal.submission.submitted_at)}
              </p>

              <a
                href={`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/api$/, "")}${evaluateModal.submission.submission_file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Submission
              </a>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marks Obtained (Max: {assignment.max_marks})
                </label>
                <input
                  type="number"
                  min="0"
                  max={assignment.max_marks}
                  step="0.5"
                  value={evaluateData.marks_obtained}
                  onChange={(e) => setEvaluateData({ ...evaluateData, marks_obtained: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Feedback</label>
                <textarea
                  rows={4}
                  value={evaluateData.feedback}
                  onChange={(e) => setEvaluateData({ ...evaluateData, feedback: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Provide feedback to the student..."
                ></textarea>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEvaluate}
                disabled={evaluating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {evaluating ? "Saving..." : "Save Evaluation"}
              </button>
              <button
                onClick={() => setEvaluateModal({ isOpen: false, submission: null })}
                disabled={evaluating}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
