"use client";

import Link from "next/link";
import { Batch } from "@/lib/api";

interface BatchCardProps {
  batch: Batch;
  baseUrl?: string; // Optional base URL for linking (defaults to centre-admin)
  onDelete?: (id: number) => void;
}

export default function BatchCard({ batch, baseUrl = "/dashboards/admin/batches", onDelete }: BatchCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "COMPLETED":
        return "bg-primary/10 text-primary";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-secondary text-foreground";
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case "LIVE":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-purple-100 text-purple-800";
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-border">
      {/* Card Header with Status Badge */}
      <div className="bg-gradient-to-r from-primary/90 to-primary px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-1">
              {batch.code}
            </h3>
            <p className="text-primary-foreground text-sm">{batch.course_name}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
              batch.status
            )}`}
          >
            {batch.status}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-4">
        {/* Course and Mode Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg
              className="w-5 h-5 text-muted-foreground/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span className="text-sm text-muted-foreground">{batch.course_code}</span>
          </div>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${getModeColor(
              batch.mode
            )}`}
          >
            {batch.mode}
          </span>
        </div>

        {/* Date Range */}
        <div className="flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-muted-foreground/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm text-muted-foreground">
            {new Date(batch.start_date).toLocaleDateString()} -{" "}
            {new Date(batch.end_date).toLocaleDateString()}
          </span>
        </div>

        {/* Centre Info */}
        <div className="flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-muted-foreground/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <span className="text-sm text-muted-foreground">
            {batch.centre_name} ({batch.centre_code})
          </span>
        </div>

        {/* Duration */}
        <div className="flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-muted-foreground/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-muted-foreground">
            {batch.course_duration_months} months duration
          </span>
        </div>

        {/* Student Count */}
        <div className="flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-muted-foreground/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <span className="text-sm text-muted-foreground">
            {batch.current_student_count} / {batch.max_students} students
          </span>
        </div>
      </div>

      {/* Card Footer with Action Link */}
      <div className="px-6 py-4 bg-secondary/50 border-t border-border flex gap-2">
        <Link
          href={`${baseUrl}/${batch.id}`}
          className="flex-1 text-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
        >
          View Batch Details →
        </Link>
        {onDelete && (
          <button
            onClick={() => onDelete(batch.id)}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-1"
            title="Delete batch"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
