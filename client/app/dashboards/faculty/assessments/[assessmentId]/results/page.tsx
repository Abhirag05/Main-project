"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  assessmentApiClient,
  Assessment,
  StudentResult,
} from "@/lib/assessmentAPI";

export default function AssessmentResultsPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = Number(params.assessmentId);

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Search/filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredResults, setFilteredResults] = useState<StudentResult[]>([]);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const assessmentData =
        await assessmentApiClient.getAssessment(assessmentId);
      setAssessment(assessmentData);

      // Try to get results, but handle case where no students have submitted yet
      try {
        const resultsData =
          await assessmentApiClient.getAssessmentResults(assessmentId);
        setResults(Array.isArray(resultsData) ? resultsData : []);
        setFilteredResults(Array.isArray(resultsData) ? resultsData : []);
      } catch {
        // No results yet - that's okay
        setResults([]);
        setFilteredResults([]);
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load assessment");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (assessmentId) {
      fetchData();
    }
  }, [assessmentId, fetchData]);

  // Apply search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredResults(results);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredResults(
        results.filter(
          (r) =>
            r.student.full_name.toLowerCase().includes(query) ||
            r.student.email.toLowerCase().includes(query),
        ),
      );
    }
  }, [results, searchQuery]);

  const getStats = () => {
    if (results.length === 0) return { avg: 0, pass: 0, fail: 0 };
    const avg =
      results.reduce((sum, r) => sum + r.percentage, 0) / results.length;
    const pass = results.filter((r) => r.status === "PASS").length;
    const fail = results.filter((r) => r.status === "FAIL").length;
    return { avg, pass, fail };
  };

  const stats = getStats();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!assessment) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            Assessment not found
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
          <button
            onClick={() => router.push("/dashboards/faculty/assessments")}
            className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Assessments
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Assessment Results
          </h1>
          <p className="text-gray-600 mt-1">{assessment.title}</p>
          <div className="mt-3 flex items-center gap-2">
            {/* Actions: Publish, Activate, Download */}
            {assessment.status === "DRAFT" && (
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    await assessmentApiClient.publishAssessment(assessment.id);
                    const updated = await assessmentApiClient.getAssessment(
                      assessment.id,
                    );
                    setAssessment(updated);
                  } catch (err) {
                    console.error(err);
                    setError("Failed to publish assessment");
                  } finally {
                    setLoading(false);
                  }
                }}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                Publish
              </button>
            )}
            {assessment.status === "SCHEDULED" && (
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    await assessmentApiClient.updateAssessment(assessment.id, {
                      status: "ACTIVE",
                    });
                    const updated = await assessmentApiClient.getAssessment(
                      assessment.id,
                    );
                    setAssessment(updated);
                  } catch (err) {
                    console.error(err);
                    setError("Failed to activate assessment");
                  } finally {
                    setLoading(false);
                  }
                }}
                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                Activate Now
              </button>
            )}
            <button
              onClick={() => {
                // Generate CSV from results
                const rows = results.map((r) => [
                  r.student.full_name,
                  r.student.email,
                  String(r.score),
                  String(r.percentage),
                  r.status,
                  r.submitted_at || "",
                ]);
                const header = [
                  "Student Name",
                  "Email",
                  "Score",
                  "Percentage",
                  "Result",
                  "Submitted At",
                ];
                const csvContent = [header, ...rows]
                  .map((r) =>
                    r
                      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
                      .join(","),
                  )
                  .join("\n");
                const blob = new Blob([csvContent], {
                  type: "text/csv;charset=utf-8;",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${assessment.title.replace(/[^a-z0-9]/gi, "_")}_results.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Download Results
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>Batch: {assessment.batch.code}</span>
            <span>•</span>
            <span>Subject: {assessment.subject.name}</span>
            <span>•</span>
            <span>Total Marks: {assessment.total_marks}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-gray-900">
              {results.length}
            </div>
            <div className="text-sm text-gray-500">Total Submissions</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.avg.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Average Score</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.pass}
            </div>
            <div className="text-sm text-gray-500">Passed</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-red-600">{stats.fail}</div>
            <div className="text-sm text-gray-500">Failed</div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
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
              <p className="mt-4 text-lg text-gray-500">No results found</p>
              <p className="text-sm text-gray-400">
                {results.length === 0
                  ? "No students have submitted this assessment yet"
                  : "Try adjusting your search"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Name
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
                      Skill Impact
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredResults.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {result.student.full_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {result.student.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.score} / {result.assessment.total_marks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                result.percentage >= 60
                                  ? "bg-green-500"
                                  : result.percentage >= 40
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              style={{
                                width: `${Math.min(result.percentage, 100)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">
                            {result.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            result.status === "PASS"
                              ? "bg-green-100 text-green-800"
                              : result.status === "FAIL"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {result.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {result.skill_impacts &&
                          result.skill_impacts.length > 0 ? (
                            result.skill_impacts
                              .slice(0, 2)
                              .map((impact, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs"
                                >
                                  {impact.skill_name}: {impact.new_level}
                                </span>
                              ))
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                          {result.skill_impacts &&
                            result.skill_impacts.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{result.skill_impacts.length - 2} more
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
