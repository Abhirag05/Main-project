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
        emoji: "✓",
        className: "bg-green-100 text-green-800 border-green-200",
        label: "Active",
      },
      COMPLETED: {
        emoji: "✓",
        className: "bg-blue-100 text-blue-800 border-blue-200",
        label: "Completed",
      },
      CANCELLED: {
        emoji: "✕",
        className: "bg-red-100 text-red-800 border-red-200",
        label: "Cancelled",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${config.className}`}
      >
        <span className="font-bold">{config.emoji}</span>
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
        <div className="flex items-center gap-3 text-red-600">
          <span className="text-2xl">✕</span>
          <div>
            <p className="font-medium">Error Loading Batch</p>
            <p className="text-sm text-red-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <span className="text-5xl block mb-4">⏱️</span>
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
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            <span>🎓</span>
            <span>Batch Code</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-3">
            {batch.batch_code}
          </h3>
          <p className="text-lg text-gray-700">{batch.course_name}</p>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <span>📅</span>
              <span className="text-sm font-medium">Start Date</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(batch.start_date)}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <span>📅</span>
              <span className="text-sm font-medium">End Date</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(batch.end_date)}
            </p>
          </div>
        </div>

        {/* Students Count */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-full p-3">
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">
                {batch.total_students}
              </p>
            </div>
          </div>
        </div>

        {/* Mentor Information */}
        {batch.mentor_name ? (
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 text-gray-700 font-medium mb-4">
              <span>👤</span>
              <span>Batch Mentor</span>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="bg-white rounded-full p-3 shadow-sm">
                  <span className="text-2xl">👤</span>
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    {batch.mentor_name}
                  </p>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>✉️</span>
                    <a
                      href={`mailto:${batch.mentor_email}`}
                      className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
                    >
                      {batch.mentor_email}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t pt-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span>👤</span>
                <p className="text-sm text-yellow-800">
                  No mentor assigned to this batch yet
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
