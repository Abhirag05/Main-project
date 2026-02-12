"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useFacultyGuard } from "@/components/faculty/hooks/useFacultyGuard";
import FacultyAlert from "@/components/faculty/ui/FacultyAlert";
import FacultyCard from "@/components/faculty/ui/FacultyCard";
import FacultyEmptyState from "@/components/faculty/ui/FacultyEmptyState";
import FacultyPageHeader from "@/components/faculty/ui/FacultyPageHeader";
import { assessmentApiClient, Assessment } from "@/lib/assessmentAPI";

interface AssessmentWithStats extends Assessment {
  results_count: number;
  average_score: number;
}

export default function AssessmentResultsOverviewPage() {
  const { isAllowed } = useFacultyGuard();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<AssessmentWithStats[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<
    AssessmentWithStats[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>("all");

  // Get unique batches for filter dropdown
  const uniqueBatches = useMemo(() => {
    return Array.from(
      new Map(
        assessments.map((a) => [
          a.batch.id,
          { id: a.batch.id, code: a.batch.code },
        ]),
      ).values(),
    );
  }, [assessments]);

  // Apply batch filter
  useEffect(() => {
    if (selectedBatch === "all") {
      setFilteredAssessments(assessments);
    } else {
      setFilteredAssessments(
        assessments.filter((a) => a.batch.id.toString() === selectedBatch),
      );
    }
  }, [assessments, selectedBatch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get all assessments (preferably completed or active ones)
      const allAssessments = await assessmentApiClient.getAssessments();

      // Filter for assessments that may have results
      const relevantAssessments = allAssessments.filter(
        (a) => a.status === "COMPLETED" || a.status === "ACTIVE",
      );

      // Fetch results for each assessment in parallel
      const assessmentsWithStats = await Promise.all(
        relevantAssessments.map(async (assessment) => {
          try {
            const results = await assessmentApiClient.getAssessmentResults(
              assessment.id,
            );
            // Calculate average score
            const averageScore =
              results.length > 0
                ? results.reduce((sum, r) => sum + r.percentage, 0) /
                  results.length
                : 0;

            return {
              ...assessment,
              results_count: results.length,
              average_score: averageScore,
            };
          } catch (err) {
            // If fetching results fails for one assessment, still include it with 0 results
            return {
              ...assessment,
              results_count: 0,
              average_score: 0,
            };
          }
        }),
      );

      setAssessments(assessmentsWithStats);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load assessments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) {
      fetchData();
    }
  }, [fetchData, isAllowed]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
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
          title="Assessment Results"
          description="View results from all your assessments"
        />

        {error && (
          <FacultyAlert variant="error" className="mb-4">
            {error}
          </FacultyAlert>
        )}

        {/* Stats and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <FacultyCard className="inline-flex items-center gap-3 px-4 py-3">
            <div className="text-2xl font-semibold text-gray-900">
              {assessments.length}
            </div>
            <div className="text-sm text-gray-500">Total Assessments</div>
          </FacultyCard>

          <div className="flex items-center gap-2">
            <label
              htmlFor="batch-filter"
              className="text-sm font-medium text-gray-700"
            >
              Filter by Batch:
            </label>
            <select
              id="batch-filter"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Batches</option>
              {uniqueBatches.map((batch) => (
                <option key={batch.id} value={batch.id.toString()}>
                  {batch.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assessments Grid */}
        {filteredAssessments.length === 0 ? (
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              }
              title="No results available yet"
              description="Create and publish assessments. Results will appear here once students complete them."
              action={
                <Link
                  href="/dashboards/faculty/assessments/create"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Assessment
                </Link>
              }
            />
          </FacultyCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssessments.map((assessment) => (
              <Link
                key={assessment.id}
                href={`/dashboards/faculty/assessments/${assessment.id}/results`}
                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">
                      {assessment.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        assessment.status === "COMPLETED"
                          ? "bg-gray-100 text-gray-800"
                          : assessment.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {assessment.status}
                    </span>
                  </div>

                  <div className="text-sm text-gray-500 mb-4">
                    <div>
                      {assessment.batch.code} • {assessment.subject.name}
                    </div>
                    <div>{formatDateTime(assessment.end_datetime)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-xl font-bold text-gray-900">
                        {assessment.results_count}
                      </div>
                      <div className="text-xs text-gray-500">Submissions</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-xl font-bold text-blue-600">
                        {assessment.average_score.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Average</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
