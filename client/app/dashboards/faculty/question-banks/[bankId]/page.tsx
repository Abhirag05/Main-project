"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { assessmentApiClient, QuestionBankDetail, BankQuestion } from "@/lib/assessmentAPI";

export default function QuestionBankDetailPageWrapper() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    }>
      <QuestionBankDetailPage />
    </Suspense>
  );
}

function QuestionBankDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const bankId = params.bankId as string;
  const successCount = searchParams.get("success");

  const [loading, setLoading] = useState(true);
  const [bank, setBank] = useState<QuestionBankDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(!!successCount);

  // Check user role on mount
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

  // Auto-hide success message
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const fetchBank = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assessmentApiClient.getQuestionBank(Number(bankId));
      setBank(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load question bank");
    } finally {
      setLoading(false);
    }
  }, [bankId]);

  useEffect(() => {
    if (bankId) {
      fetchBank();
    }
  }, [bankId, fetchBank]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOptionLabel = (option: string) => {
    const labels: Record<string, string> = {
      A: "option_a",
      B: "option_b",
      C: "option_c",
      D: "option_d",
    };
    return labels[option];
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <div className="bg-card rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !bank) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-8 rounded-lg text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Question Bank</h2>
            <p>{error || "Question bank not found"}</p>
            <Link
              href="/dashboards/faculty/question-banks"
              className="mt-4 inline-block text-primary hover:underline"
            >
              ← Back to Question Banks
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Success Message */}
        {showSuccess && successCount && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Successfully imported {successCount} questions!
            </div>
            <button onClick={() => setShowSuccess(false)} className="text-green-700 hover:text-green-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboards/faculty/question-banks"
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Question Banks
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{bank.name}</h1>
              {bank.description && (
                <p className="text-muted-foreground mt-1">{bank.description}</p>
              )}
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                {bank.subject_name}
              </span>
              <span className="text-sm text-muted-foreground">
                Created: {formatDate(bank.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="bg-card rounded-lg shadow-md p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{bank.questions_count}</div>
              <div className="text-sm text-muted-foreground">Total Questions</div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="bg-card rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Questions Preview</h2>
            <p className="text-sm text-muted-foreground">
              Review all questions in this bank. Questions are read-only after import.
            </p>
          </div>

          {bank.questions && bank.questions.length > 0 ? (
            <div className="divide-y divide-border">
              {bank.questions.map((question: BankQuestion, index: number) => (
                <div key={question.id} className="p-6">
                  {/* Question Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <p className="text-foreground font-medium leading-relaxed">
                      {question.question_text}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="ml-12 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(["A", "B", "C", "D"] as const).map((label) => {
                      const optionKey = `option_${label.toLowerCase()}` as keyof BankQuestion;
                      const optionText = question[optionKey] as string;
                      const isCorrect = question.correct_option === label;

                      return (
                        <div
                          key={label}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${
                            isCorrect
                              ? "bg-green-50 border-green-200"
                              : "bg-secondary/50 border-border"
                          }`}
                        >
                          <span
                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                              isCorrect
                                ? "bg-green-500 text-white"
                                : "bg-muted text-foreground/80"
                            }`}
                          >
                            {label}
                          </span>
                          <span
                            className={`text-sm ${
                              isCorrect ? "text-green-800 font-medium" : "text-foreground/80"
                            }`}
                          >
                            {optionText}
                            {isCorrect && (
                              <span className="ml-2 text-green-600">✓ Correct</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              No questions found in this bank.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
