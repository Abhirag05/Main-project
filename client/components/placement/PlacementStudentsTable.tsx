"use client";

import React from "react";
import { VerifiedStudent, AdmissionStatus } from "@/lib/placementAPI";

interface PlacementStudentsTableProps {
  students: VerifiedStudent[];
  isLoading: boolean;
}

function StatusBadge({ status }: { status: AdmissionStatus }) {
  const styles: Record<AdmissionStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    APPROVED: "bg-green-100 text-green-800 border-green-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
    FULL_PAYMENT_VERIFIED: "bg-green-100 text-green-800 border-green-200",
    INSTALLMENT_VERIFIED: "bg-primary/10 text-primary border-primary/20",
    INSTALLMENT_PENDING: "bg-orange-100 text-orange-800 border-orange-200",
    DISABLED: "bg-secondary text-foreground border-border",
  };

  const labels: Record<AdmissionStatus, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    FULL_PAYMENT_VERIFIED: "Verified (Full)",
    INSTALLMENT_VERIFIED: "Verified (EMI)",
    INSTALLMENT_PENDING: "EMI Pending",
    DISABLED: "Disabled",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border-b border-border">
          <div className="px-6 py-4 flex space-x-4">
            <div className="flex-1 h-4 bg-muted rounded"></div>
            <div className="flex-1 h-4 bg-muted rounded"></div>
            <div className="flex-1 h-4 bg-muted rounded"></div>
            <div className="w-24 h-4 bg-muted rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlacementStudentsTable({
  students,
  isLoading,
}: PlacementStudentsTableProps) {
  if (isLoading) {
    return (
      <div className="bg-card shadow-md rounded-lg overflow-hidden">
        <TableSkeleton />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-card shadow-md rounded-lg p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground/70"
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
        <h3 className="mt-2 text-sm font-medium text-foreground">
          No verified students found
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Students verified by Finance Admin will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card shadow-md rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Centre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Interested Courses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Verified Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {students.map((student, index) => (
              <tr
                key={student.student_profile_id}
                className="hover:bg-secondary/50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium text-sm">
                          {student.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-foreground">
                        {student.full_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {student.student_profile_id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {student.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {student.phone || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground">
                    {student.centre_code}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {student.interested_courses || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={student.admission_status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(student.updated_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Table Footer with count */}
      <div className="bg-secondary/50 px-6 py-3 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{students.length}</span> verified student{students.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

export default React.memo(PlacementStudentsTable);
