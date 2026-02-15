"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  apiClient,
  AssessmentDetail,
  AssessmentAttemptResponse,
  SubmitAnswerData,
  AssessmentSubmissionResponse,
} from "@/lib/api";

interface AttemptState {
  attemptId: number | null;
  currentQuestionIndex: number;
  answers: Map<number, number | null>;
  timeRemaining: number; // in seconds
  isSubmitting: boolean;
}

export default function AssessmentAttemptPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = parseInt(params.id as string);

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [attemptData, setAttemptData] =
    useState<AssessmentAttemptResponse | null>(null);
  const [attemptState, setAttemptState] = useState<AttemptState>({
    attemptId: null,
    currentQuestionIndex: 0,
    answers: new Map(),
    timeRemaining: 0,
    isSubmitting: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [submissionResult, setSubmissionResult] =
    useState<AssessmentSubmissionResponse | null>(null);

  // Fetch assessment details
  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getStudentAssessmentDetail(assessmentId);
        setAssessment(data);
        setError(null);
      } catch (err) {
        const e = err as Error;
        setError(e.message || "Failed to fetch assessment");
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [assessmentId]);

  // Timer effect
  useEffect(() => {
    if (
      !hasStarted ||
      attemptState.timeRemaining <= 0 ||
      attemptState.isSubmitting
    )
      return;

    const timer = setInterval(() => {
      setAttemptState((prev) => {
        const newTimeRemaining = prev.timeRemaining - 1;
        if (newTimeRemaining <= 0) {
          // Auto-submit when time runs out
          handleSubmitAssessment();
          return { ...prev, timeRemaining: 0 };
        }
        return { ...prev, timeRemaining: newTimeRemaining };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, attemptState.timeRemaining, attemptState.isSubmitting]);

  const startAssessment = async () => {
    try {
      setLoading(true);
      const response = await apiClient.startAssessmentAttempt(assessmentId);
      setAttemptData(response);
      setAttemptState((prev) => ({
        ...prev,
        attemptId: response.attempt_id,
        timeRemaining: response.time_limit_minutes * 60,
      }));
      setHasStarted(true);
      setError(null);
    } catch (err) {
      const e = err as Error;
      setError(e.message || "Failed to start assessment");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: number, optionId: number | null) => {
    setAttemptState((prev) => ({
      ...prev,
      answers: new Map(prev.answers.set(questionId, optionId)),
    }));
  };

  const navigateToQuestion = (index: number) => {
    if (assessment && index >= 0 && index < assessment.questions.length) {
      setAttemptState((prev) => ({
        ...prev,
        currentQuestionIndex: index,
      }));
    }
  };

  const handleSubmitAssessment = useCallback(async () => {
    if (!assessment || attemptState.isSubmitting) return;

    try {
      setAttemptState((prev) => ({ ...prev, isSubmitting: true }));

      // Prepare answers data
      const answers: SubmitAnswerData[] = assessment.questions.map(
        (question) => ({
          question_id: question.id,
          selected_option_id: attemptState.answers.get(question.id) || null,
        }),
      );

      const result = await apiClient.submitAssessmentAnswers(
        assessmentId,
        answers,
      );
      setSubmissionResult(result);
    } catch (err) {
      const e = err as Error;
      setError(e.message || "Failed to submit assessment");
      setAttemptState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [
    assessment,
    attemptState.answers,
    attemptState.isSubmitting,
    assessmentId,
  ]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColorClass = () => {
    const percentage =
      attemptState.timeRemaining /
      (assessment ? assessment.duration_minutes * 60 : 1);
    if (percentage <= 0.1) return "text-red-600";
    if (percentage <= 0.25) return "text-orange-600";
    return "text-green-600";
  };

  const currentQuestion =
    assessment?.questions[attemptState.currentQuestionIndex];

  // Show submission result
  if (submissionResult) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-card rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
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
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Assessment Submitted Successfully!
            </h2>
            <div className="space-y-4 text-lg">
              <div className="flex justify-center items-center gap-8">
                <div className="text-center">
                  <p className="text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold text-primary">
                    {submissionResult.total_marks_obtained}/
                    {assessment?.total_marks}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Percentage</p>
                  {(() => {
                    const pct = submissionResult?.percentage ?? null;
                    const passing = assessment?.passing_percentage ?? 0;
                    const colorClass =
                      pct !== null && pct >= passing
                        ? "text-green-600"
                        : "text-red-600";
                    return (
                      <p className={`text-2xl font-bold ${colorClass}`}>
                        {pct !== null ? `${pct.toFixed(1)}%` : "—"}
                      </p>
                    );
                  })()}
                </div>
              </div>
              <p
                className={`text-xl font-semibold ${
                  submissionResult.percentage >=
                  (assessment?.passing_percentage || 0)
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {submissionResult.result_status}
              </p>
            </div>
            <div className="mt-8 space-x-4">
              <button
                onClick={() =>
                  router.push(
                    `/dashboards/student/assessments/${assessmentId}/result`,
                  )
                }
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                View Detailed Results
              </button>
              <button
                onClick={() => router.push("/dashboards/student/assessments")}
                className="px-6 py-3 bg-foreground/60 text-white rounded-lg hover:bg-foreground/80 transition-colors"
              >
                Back to Assessments
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!assessment) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Assessment not found</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-foreground/60 text-white rounded-lg hover:bg-foreground/80 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Assessment start screen
  if (!hasStarted) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-card rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-4">
                {assessment.title}
              </h1>
              {assessment.description && (
                <p className="text-muted-foreground text-lg mb-6">
                  {assessment.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 text-center">
              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="text-muted-foreground">Subject</p>
                <p className="font-semibold text-foreground">
                  {assessment.subject_name}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-muted-foreground">Duration</p>
                <p className="font-semibold text-foreground">
                  {assessment.duration_minutes} minutes
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-muted-foreground">Questions</p>
                <p className="font-semibold text-foreground">
                  {assessment.questions_count}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-muted-foreground">Total Marks</p>
                <p className="font-semibold text-foreground">
                  {assessment.total_marks}
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">
                Instructions:
              </h3>
              <ul className="text-yellow-700 space-y-2">
                <li>
                  • You have {assessment.duration_minutes} minutes to complete
                  this assessment
                </li>
                <li>
                  • You can navigate between questions using the question
                  navigation
                </li>
                <li>• Make sure to save your answers before submitting</li>
                <li>• Once submitted, you cannot modify your answers</li>
                <li>• The assessment will auto-submit when time runs out</li>
              </ul>
            </div>

            <div className="text-center">
              <button
                onClick={startAssessment}
                disabled={loading}
                className="px-8 py-4 bg-primary text-white text-lg font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Starting..." : "Start Assessment"}
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Assessment attempt screen
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with timer */}
        <div className="bg-card rounded-lg shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {assessment.title}
              </h1>
              <p className="text-muted-foreground">{assessment.subject_name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Time Remaining</p>
              <p className={`text-2xl font-bold ${getTimeColorClass()}`}>
                {formatTime(attemptState.timeRemaining)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-sm p-4 sticky top-4">
              <h3 className="font-semibold text-foreground mb-4">Questions</h3>
              <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                {assessment.questions.map((question, index) => {
                  const isAnswered = attemptState.answers.has(question.id);
                  const isCurrent = index === attemptState.currentQuestionIndex;

                  return (
                    <button
                      key={question.id}
                      onClick={() => navigateToQuestion(index)}
                      className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                        isCurrent
                          ? "bg-primary text-white"
                          : isAnswered
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-secondary text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-primary rounded"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-secondary border border-border rounded"></div>
                  <span>Not Answered</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            {currentQuestion && (
              <div className="bg-card rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    Question {attemptState.currentQuestionIndex + 1} of{" "}
                    {assessment.questions.length}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {currentQuestion.marks}{" "}
                    {currentQuestion.marks === 1 ? "mark" : "marks"}
                  </span>
                </div>

                <div className="mb-6">
                  <p className="text-foreground text-lg leading-relaxed">
                    {currentQuestion.question_text}
                  </p>
                </div>

                <div className="space-y-3">
                  {currentQuestion.options.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        attemptState.answers.get(currentQuestion.id) ===
                        option.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option.id}
                        checked={
                          attemptState.answers.get(currentQuestion.id) ===
                          option.id
                        }
                        onChange={() =>
                          handleAnswerSelect(currentQuestion.id, option.id)
                        }
                        className="mt-1 mr-3 text-primary"
                      />
                      <span className="text-foreground">
                        {option.option_text}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between items-center mt-8">
                  <button
                    onClick={() =>
                      navigateToQuestion(attemptState.currentQuestionIndex - 1)
                    }
                    disabled={attemptState.currentQuestionIndex === 0}
                    className="px-4 py-2 bg-foreground/60 text-white rounded-lg hover:bg-foreground/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <div className="flex gap-4">
                    <button
                      onClick={() =>
                        handleAnswerSelect(currentQuestion.id, null)
                      }
                      className="px-4 py-2 border border-border text-foreground/80 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      Clear Answer
                    </button>

                    {attemptState.currentQuestionIndex ===
                    assessment.questions.length - 1 ? (
                      <button
                        onClick={handleSubmitAssessment}
                        disabled={attemptState.isSubmitting}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {attemptState.isSubmitting
                          ? "Submitting..."
                          : "Submit Assessment"}
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          navigateToQuestion(
                            attemptState.currentQuestionIndex + 1,
                          )
                        }
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit confirmation modal could be added here */}
      </div>
    </DashboardLayout>
  );
}
