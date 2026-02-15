"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { assignmentAPIClient, Assignment } from "@/lib/assignmentAPI";

export default function SubmitAssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params?.id ? parseInt(params.id as string) : null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);

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
    if (assignmentId) {
      fetchAssignment();
    }
  }, [assignmentId]);

  const fetchAssignment = async () => {
    if (!assignmentId) return;

    setLoading(true);
    try {
      const assignments = await assignmentAPIClient.getStudentAssignments();
      const found = assignments.find((a) => a.id === assignmentId);
      if (found) {
        setAssignment(found);
      } else {
        setError("Assignment not found");
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load assignment");
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        showError("File size must be less than 10MB");
        e.target.value = "";
        return;
      }

      setSubmissionFile(file);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!submissionFile) {
      showError("Please select a file to submit");
      return;
    }

    if (!assignment) return;

    // Check if overdue
    if (assignment.is_overdue) {
      showError("Cannot submit - deadline has passed");
      return;
    }

    setSubmitting(true);
    try {
      const result = await assignmentAPIClient.submitAssignment(assignment.id, submissionFile);
      showSuccess(result.message);
      setSubmissionFile(null);

      // Redirect after confirmation
      setTimeout(() => {
        router.push("/dashboards/student/assignments");
      }, 1500);
    } catch (err) {
      showError((err as Error).message || "Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!assignment) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-red-600">Assignment not found</p>
            <Link href="/dashboards/student/assignments" className="text-blue-600 hover:underline mt-4 inline-block">
              Back to Assignments
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const canSubmit = !assignment.is_overdue;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/dashboards/student" className="hover:text-blue-600">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboards/student/assignments" className="hover:text-blue-600">Assignments</Link>
            <span>/</span>
            <span className="text-gray-900">{assignment.title}</span>
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

        {/* Assignment Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{assignment.title}</h1>

          <div className="grid grid-cols-1 gap-4 mb-6 text-sm sm:grid-cols-2">
            <div>
              <span className="font-medium text-gray-700">Module:</span>
              <span className="ml-2 text-gray-900">{assignment.module_name}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Faculty:</span>
              <span className="ml-2 text-gray-900">{assignment.faculty_name}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Due Date:</span>
              <span className={`ml-2 ${assignment.is_overdue ? "text-red-600 font-semibold" : "text-gray-900"}`}>
                {formatDate(assignment.due_date)}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Max Marks:</span>
              <span className="ml-2 text-gray-900">{assignment.max_marks}</span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <div className="text-gray-700 whitespace-pre-wrap">{assignment.description}</div>
          </div>

          {assignment.assignment_file_url && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Assignment File</h3>
              <a
                href={`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/api$/, "")}${assignment.assignment_file_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Assignment Materials
              </a>
            </div>
          )}

          {/* Current Submission Status */}
          {assignment.my_submission && (
            <div className="border-t pt-6 mt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Your Submission</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      <strong>Submitted:</strong> {formatDate(assignment.my_submission.submitted_at)}
                    </p>
                    {assignment.my_submission.is_late_submission && (
                      <p className="text-sm text-red-600 mt-1">(Late Submission)</p>
                    )}
                    {assignment.my_submission.is_evaluated && (
                      <>
                        <p className="text-sm text-gray-700 mt-2">
                          <strong>Marks:</strong> {assignment.my_submission.marks_obtained} / {assignment.max_marks}
                        </p>
                        {assignment.my_submission.feedback && (
                          <div className="mt-2">
                            <strong className="text-sm text-gray-700">Feedback:</strong>
                            <p className="text-sm text-gray-600 mt-1">{assignment.my_submission.feedback}</p>
                          </div>
                        )}
                      </>
                    )}
                    {!assignment.my_submission.is_evaluated && (
                      <p className="text-sm text-orange-600 mt-2">Pending evaluation</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submission Form */}
        {canSubmit && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {assignment.my_submission ? "Re-upload Submission" : "Submit Your Work"}
            </h2>

            {assignment.my_submission && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <strong>Note:</strong> Uploading a new file will replace your previous submission.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Submission File
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg bg-white file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  accept=".pdf,.doc,.docx,.zip,.rar,.txt,.py,.java,.cpp,.c,.js"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: PDF, DOC, ZIP, code files - Max 10MB
                </p>
                {submissionFile && (
                  <p className="text-sm text-green-600 mt-2">
                    Selected: {submissionFile.name} ({(submissionFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleSubmit}
                  disabled={!submissionFile || submitting}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : assignment.my_submission ? "Re-upload" : "Submit Assignment"}
                </button>
                <Link
                  href="/dashboards/student/assignments"
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium text-center"
                >
                  Back to Assignments
                </Link>
              </div>
            </div>
          </div>
        )}

        {!canSubmit && !assignment.my_submission && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Submission deadline has passed</p>
            <Link
              href="/dashboards/student/assignments"
              className="inline-block mt-4 text-blue-600 hover:underline"
            >
              Back to Assignments
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
