"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useFacultyGuard } from "@/components/faculty/hooks/useFacultyGuard";
import FacultyAlert from "@/components/faculty/ui/FacultyAlert";
import FacultyCard from "@/components/faculty/ui/FacultyCard";
import FacultyEmptyState from "@/components/faculty/ui/FacultyEmptyState";
import FacultyPageHeader from "@/components/faculty/ui/FacultyPageHeader";
import { assessmentApiClient, QuestionBank } from "@/lib/assessmentAPI";

export default function QuestionBanksPage() {
  const { isAllowed } = useFacultyGuard();
  const [loading, setLoading] = useState(true);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  const fetchQuestionBanks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const banks = await assessmentApiClient.getQuestionBanks();
      setQuestionBanks(banks);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load question banks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) {
      fetchQuestionBanks();
    }
  }, [fetchQuestionBanks, isAllowed]);

  const handleDelete = async (bankId: number, bankName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${bankName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeleteLoading(bankId);
    try {
      await assessmentApiClient.deleteQuestionBank(bankId);
      setQuestionBanks((banks) => banks.filter((b) => b.id !== bankId));
    } catch (err) {
      const error = err as Error;
      alert(error.message || "Failed to delete question bank");
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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
          title="Question Banks"
          description="Manage your question banks for quick assessment creation"
          action={
            <Link
              href="/dashboards/faculty/question-banks/upload"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Upload New Bank
            </Link>
          }
        />

        {error && (
          <FacultyAlert variant="error" className="mb-4">
            {error}
          </FacultyAlert>
        )}

        {/* Stats Card */}
        <div className="mb-6">
          <FacultyCard className="inline-flex items-center gap-3 px-4 py-3">
            <div className="text-2xl font-semibold text-gray-900">
              {questionBanks.length}
            </div>
            <div className="text-sm text-gray-500">Total Question Banks</div>
          </FacultyCard>
        </div>

        {/* Question Banks Table */}
        {questionBanks.length === 0 ? (
          <FacultyCard>
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              }
              title="No question banks yet"
              description="Upload an AIKEN format file to create your first question bank."
              action={
                <Link
                  href="/dashboards/faculty/question-banks/upload"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Question Bank
                </Link>
              }
            />
          </FacultyCard>
        ) : (
          <FacultyCard className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Questions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {questionBanks.map((bank) => (
                  <tr key={bank.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {bank.name}
                      </div>
                      {bank.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {bank.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {bank.subject_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {bank.questions_count}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(bank.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboards/faculty/question-banks/${bank.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(bank.id, bank.name)}
                        disabled={deleteLoading === bank.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deleteLoading === bank.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FacultyCard>
        )}
      </div>
    </DashboardLayout>
  );
}
