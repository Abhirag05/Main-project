"use client";

import { useEffect, useState } from "react";
import { apiClient, StudentBatch } from "@/lib/api";

export default function MyBatchCard() {
  const [batch, setBatch] = useState<StudentBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyBatch();
  }, []);

  const fetchMyBatch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getMyBatch();
      setBatch(data);
    } catch (err: any) {
      console.error("Failed to fetch batch:", err);
      setError(err.message || "Failed to load batch information");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: {
        className: "bg-green-100 text-green-800 border-green-200",
        label: "Active",
      },
      COMPLETED: {
        className: "bg-blue-100 text-blue-800 border-blue-200",
        label: "Completed",
      },
      CANCELLED: {
        className: "bg-red-100 text-red-800 border-red-200",
        label: "Cancelled",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE;

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-medium text-red-800">Error Loading Batch</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Batch Assigned
          </h3>
          <p className="text-gray-600">
            You are not assigned to any batch yet. Please contact your
            administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">My Batch</h2>
            <p className="text-blue-100 text-sm">Your current batch details</p>
          </div>
          {getStatusBadge(batch.batch_status)}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Batch Code and Course */}
        <div className="mb-6">
          <p className="text-gray-500 text-sm font-medium mb-2">Batch Code</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-3">
            {batch.batch_code}
          </h3>
          <p className="text-lg text-gray-700">{batch.course_name}</p>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-gray-600 text-sm font-medium mb-2">Start Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(batch.start_date)}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-gray-600 text-sm font-medium mb-2">End Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(batch.end_date)}
            </p>
          </div>
        </div>

        {/* Students Count */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-lg p-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">
                {batch.total_students}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
