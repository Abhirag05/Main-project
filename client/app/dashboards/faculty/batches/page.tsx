"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useFacultyGuard } from "@/components/faculty/hooks/useFacultyGuard";
import FacultyAlert from "@/components/faculty/ui/FacultyAlert";
import FacultyCard from "@/components/faculty/ui/FacultyCard";
import FacultyEmptyState from "@/components/faculty/ui/FacultyEmptyState";
import FacultyPageHeader from "@/components/faculty/ui/FacultyPageHeader";
import {
  apiClient,
  FacultyBatchAssignment,
  FacultyModuleAssignment,
} from "@/lib/api";

export default function FacultyBatchesPage() {
  const { isAllowed } = useFacultyGuard();
  const [batchAssignments, setBatchAssignments] = useState<
    FacultyBatchAssignment[]
  >([]);
  const [moduleAssignments, setModuleAssignments] = useState<
    FacultyModuleAssignment[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBatches, setExpandedBatches] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    if (isAllowed) {
      fetchData();
    }
  }, [isAllowed]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [batches, modules] = await Promise.all([
        apiClient.getFacultyBatchAssignments({
          faculty: "me",
          is_active: true,
        }),
        apiClient.getFacultyModuleAssignments({
          faculty: "me",
          is_active: true,
        }),
      ]);
      setBatchAssignments(batches);
      setModuleAssignments(modules);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const toggleBatch = (batchId: number) => {
    setExpandedBatches((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  if (!isAllowed) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <FacultyPageHeader
          title="My Batches"
          description="View your assigned batches and modules"
        />

        {error && (
          <FacultyAlert variant="error" className="mb-6">
            {error}
          </FacultyAlert>
        )}

        {loading ? (
          <FacultyCard className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </FacultyCard>
        ) : batchAssignments.length === 0 ? (
          <FacultyCard>
            <FacultyEmptyState
              icon={
                <svg
                  className="h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
              }
              title="No batches assigned"
              description="You will see your assigned batches here once they are allocated by the admin."
            />
          </FacultyCard>
        ) : (
          <div className="space-y-4">
            {batchAssignments.map((assignment) => (
              <FacultyCard key={assignment.id} className="overflow-hidden">
                {/* Batch Header - Clickable */}
                <button
                  onClick={() => toggleBatch(assignment.batch.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <svg
                          className="h-6 w-6 text-indigo-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-foreground">
                        {assignment.batch.code}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {assignment.batch.course_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-muted-foreground">
                        {new Date(
                          assignment.batch.start_date,
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(
                          assignment.batch.end_date,
                        ).toLocaleDateString()}
                      </p>
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          assignment.batch.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : assignment.batch.status === "COMPLETED"
                              ? "bg-primary/10 text-primary"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {assignment.batch.status}
                      </span>
                    </div>
                    <svg
                      className={`h-5 w-5 text-muted-foreground/70 transition-transform ${
                        expandedBatches.has(assignment.batch.id)
                          ? "rotate-180"
                          : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Expanded Content - Modules */}
                {expandedBatches.has(assignment.batch.id) && (
                  <div className="border-t bg-secondary/50 px-6 py-4">
                    <h4 className="text-sm font-medium text-foreground/80 mb-3">
                      Assigned Modules
                    </h4>
                    {moduleAssignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No modules assigned yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {moduleAssignments.map((module) => (
                          <div
                            key={module.id}
                            className="bg-card rounded-lg border border-border p-3 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded bg-purple-100 flex items-center justify-center">
                                  <svg
                                    className="h-4 w-4 text-purple-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                                    />
                                  </svg>
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {module.module.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {module.module.code}
                                </p>
                              </div>
                              <span
                                className={`flex-shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                  module.is_active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-secondary text-muted-foreground"
                                }`}
                              >
                                {module.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </FacultyCard>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
