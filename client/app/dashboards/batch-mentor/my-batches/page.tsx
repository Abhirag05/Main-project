"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient, MentorBatch } from "@/lib/api";

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
    ACTIVE: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
    COMPLETED: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    CANCELLED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  };

  const style = statusStyles[status] || { bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-500" };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${style.bg} ${style.text}`}
    >
      <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
      {status}
    </span>
  );
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
      <div className="bg-white shadow-lg rounded-xl p-8">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState() {
  return (
    <div className="text-center py-16 bg-white rounded-xl shadow-lg">
      <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="h-10 w-10 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">No Batch Assigned</h3>
      <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
        You are not assigned to any batch yet. Please contact your centre administrator for batch assignment.
      </p>
    </div>
  );
}

// Detail item component
function DetailItem({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-base font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// Batch detail card component
function BatchDetailCard({ batch }: { batch: MentorBatch }) {
  const startDate = new Date(batch.start_date);
  const endDate = new Date(batch.end_date);
  const today = new Date();
  
  // Calculate progress
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const progressPercent = Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100);

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Batch Code</p>
            <h2 className="text-2xl font-bold text-white">{batch.batch_code}</h2>
          </div>
          <StatusBadge status={batch.batch_status} />
        </div>
      </div>

      {/* Course Info Banner */}
      <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-blue-600 font-medium">Course</p>
            <p className="text-lg font-semibold text-gray-900">{batch.course_name}</p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Start Date */}
          <DetailItem
            label="Start Date"
            value={startDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />

          {/* End Date */}
          <DetailItem
            label="End Date"
            value={endDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />

          {/* Total Students */}
          <DetailItem
            label="Total Students"
            value={batch.total_students}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
        </div>

        {/* Progress Bar (only for active batches) */}
        {batch.batch_status === "ACTIVE" && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Batch Progress</span>
              <span className="text-sm text-gray-500">{Math.round(progressPercent)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {elapsedDays > 0 ? `${elapsedDays} days elapsed` : "Starting soon"} • {Math.max(totalDays - elapsedDays, 0)} days remaining
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyBatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<MentorBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/");
      return;
    }

    const user = JSON.parse(userStr);
    if (user.role.code !== "BATCH_MENTOR") {
      router.push("/dashboards");
      return;
    }

    // Fetch batches
    const fetchBatches = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getMentorBatches();
        setBatches(data);
      } catch (err: any) {
        console.error("Failed to fetch batches:", err);
        if (err.message?.includes("403")) {
          setError("You don't have permission to view this page.");
        } else {
          setError(err.message || "Failed to load batches. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, [router]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Batch</h1>
          <p className="mt-1 text-sm text-gray-500">
            View details of your assigned batch
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingSkeleton />}

        {/* Empty State */}
        {!loading && !error && batches.length === 0 && <EmptyState />}

        {/* Batch Detail Card */}
        {!loading && !error && batches.length > 0 && (
          <BatchDetailCard batch={batches[0]} />
        )}
      </div>
    </DashboardLayout>
  );
}
