"use client";

import React from "react";
import { FacultyBatchAssignment } from "@/lib/api";

interface FacultyBatchAssignmentTableProps {
  assignments: FacultyBatchAssignment[];
  loading: boolean;
  onDeactivate: (assignment: FacultyBatchAssignment) => void;
}

function FacultyBatchAssignmentTable({
  assignments,
  loading,
  onDeactivate,
}: FacultyBatchAssignmentTableProps) {
  // Defensive check: ensure assignments is always an array
  const safeAssignments = Array.isArray(assignments) ? assignments : [];

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-muted"></div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-secondary border-t border-border"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (safeAssignments.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground/70"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-foreground">
          No batch assignments found
        </h3>
        <p className="mt-1 text-muted-foreground">
          Select a faculty member to view their assigned batches, or assign a
          batch using the button above.
        </p>
      </div>
    );
  }

  // Helper function for batch status badge colors
  const getBatchStatusBadgeColor = (status: string) => {
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

  return (
    <div className="bg-card rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Batch Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Course
              </th>
              
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Batch Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Batch Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Assignment Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Assigned At
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {safeAssignments.map((assignment) => (
              <tr
                key={assignment.id}
                className="hover:bg-secondary/50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-foreground">
                    {assignment.batch.code}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-foreground">
                    {assignment.batch.course_name}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-foreground">
                    {new Date(assignment.batch.start_date).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    to{" "}
                    {new Date(assignment.batch.end_date).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBatchStatusBadgeColor(
                      assignment.batch.status
                    )}`}
                  >
                    {assignment.batch.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      assignment.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {assignment.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(assignment.assigned_at).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  {assignment.is_active ? (
                    <button
                      onClick={() => onDeactivate(assignment)}
                      className="text-orange-600 hover:text-orange-900"
                      title="Deactivate assignment"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => onDeactivate(assignment)}
                      className="text-green-600 hover:text-green-900"
                      title="Reactivate assignment"
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default React.memo(FacultyBatchAssignmentTable);
