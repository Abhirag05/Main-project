"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient, StudentAttemptDetail } from "@/lib/api";

export default function AssessmentResultPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = parseInt(params.id as string);

  const [attemptDetail, setAttemptDetail] =
    useState<StudentAttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    const fetchAttemptDetail = async () => {
      try {
        setLoading(true);
        // First get all student attempts to find the one for this assessment
        const attempts = await apiClient.getStudentAttempts();
        const relevantAttempt = attempts.find(
          (attempt) => attempt.assessment === assessmentId,
        );

        if (relevantAttempt) {
          const detail = await apiClient.getStudentAttemptDetail(
            relevantAttempt.id,
          );
          setAttemptDetail(detail);
        } else {
          setError("No attempt found for this assessment");
        }
        setError(null);
      } catch (err) {
        const e = err as Error;
        setError(e.message || "Failed to fetch attempt details");
      } finally {
        setLoading(false);
      }
    };

    fetchAttemptDetail();
  }, [assessmentId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getResultColor = (
    percentage: number,
    passingPercentage: number = 40,
  ) => {
    return percentage >= passingPercentage ? "text-green-600" : "text-red-600";
  };

  const getResultBgColor = (
    percentage: number,
    passingPercentage: number = 40,
  ) => {
    return percentage >= passingPercentage
      ? "bg-green-50 border-green-200"
      : "bg-red-50 border-red-200";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !attemptDetail) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error || "Result not found"}</p>
            <button
              onClick={() => router.push("/dashboards/student/assessments")}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Assessments
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const correctAnswers = attemptDetail.answers.filter(
    (answer) => answer.is_correct,
  ).length;
  const totalQuestions = attemptDetail.answers.length;
  const passingPercentage = 40; // You might want to get this from the assessment data
  const pct =
    attemptDetail.percentage !== null && attemptDetail.percentage !== undefined
      ? Number(attemptDetail.percentage)
      : null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {attemptDetail.assessment_title}
              </h1>
              <p className="text-gray-600 mt-2">Assessment Results</p>
            </div>
            <button
              onClick={() => router.push("/dashboards/student/assessments")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Assessments
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div
          className={`rounded-lg border-2 p-8 mb-8 ${getResultBgColor(pct ?? 0, passingPercentage)}`}
        >
          <div className="text-center">
            <div className="mb-6">
              {pct !== null && pct >= passingPercentage ? (
                <svg
                  className="mx-auto h-16 w-16 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </div>

            <h2
              className={`text-3xl font-bold mb-4 ${getResultColor(pct ?? 0, passingPercentage)}`}
            >
              {attemptDetail.result_status}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              <div className="text-center">
                <p className="text-gray-600">Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {attemptDetail.total_marks_obtained}/
                  {attemptDetail.assessment_total_marks}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">Percentage</p>
                <p
                  className={`text-2xl font-bold ${getResultColor(pct ?? 0, passingPercentage)}`}
                >
                  {pct !== null ? `${pct.toFixed(1)}%` : "—"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">Correct</p>
                <p className="text-2xl font-bold text-green-600">
                  {correctAnswers}/{totalQuestions}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">Attempted</p>
                <p className="text-2xl font-bold text-blue-600">
                  {
                    attemptDetail.answers.filter(
                      (a) => a.selected_option !== null,
                    ).length
                  }
                  /{totalQuestions}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submission Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Submission Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-600">Started At</p>
              <p className="font-medium text-gray-900">
                {formatDate(attemptDetail.started_at)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Submitted At</p>
              <p className="font-medium text-gray-900">
                {attemptDetail.submitted_at
                  ? formatDate(attemptDetail.submitted_at)
                  : "Not submitted"}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Status</p>
              <p className="font-medium text-gray-900">
                {attemptDetail.status}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Result</p>
              <p
                className={`font-medium ${getResultColor(pct ?? 0, passingPercentage)}`}
              >
                {attemptDetail.result_status}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Answers */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Detailed Review
              </h3>
              <button
                onClick={() => setShowAnswers(!showAnswers)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showAnswers ? "Hide" : "Show"} Detailed Answers
              </button>
            </div>
          </div>

          {showAnswers && (
            <div className="p-6">
              <div className="space-y-8">
                {attemptDetail.answers.map((answer, index) => (
                  <div
                    key={answer.id}
                    className="border border-gray-200 rounded-lg p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-medium text-gray-900">
                        Question {index + 1}
                      </h4>
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            answer.is_correct
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {answer.is_correct ? "Correct" : "Incorrect"}
                        </span>
                        <span className="text-sm text-gray-600">
                          {answer.marks_obtained} marks
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-gray-900 font-medium mb-3">
                        {answer.question_text}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600">
                          Your Answer:
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            answer.is_correct
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {answer.selected_option_text || "Not answered"}
                        </span>
                      </div>

                      {!answer.is_correct && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-600">
                            Correct Answer:
                          </span>
                          <span className="px-2 py-1 rounded text-sm bg-green-100 text-green-800">
                            {answer.correct_option_text}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Performance Summary */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Performance Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {correctAnswers}
              </p>
              <p className="text-green-700">Correct Answers</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {totalQuestions - correctAnswers}
              </p>
              <p className="text-red-700">Incorrect Answers</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">
                {((correctAnswers / totalQuestions) * 100).toFixed(1)}%
              </p>
              <p className="text-gray-700">Accuracy Rate</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
