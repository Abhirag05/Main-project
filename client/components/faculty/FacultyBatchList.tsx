"use client";

import { FacultyBatchAssignment } from "@/lib/api";
import FacultyCard from "@/components/faculty/ui/FacultyCard";

interface FacultyBatchListProps {
  assignments: FacultyBatchAssignment[];
  loading: boolean;
}

export default function FacultyBatchList({
  assignments,
  loading,
}: FacultyBatchListProps) {
  if (loading) {
    return (
      <FacultyCard className="p-6 mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Assigned Batches
        </h2>
        <p className="text-muted-foreground">Loading...</p>
      </FacultyCard>
    );
  }

  return (
    <FacultyCard className="p-6 mb-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        Assigned Batches
      </h2>

      {assignments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-lg">No batches assigned yet</p>
          <p className="text-muted-foreground/70 text-sm mt-2">
            You will see your assigned batches here once they are allocated by
            the admin
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Batch Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Course Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-secondary/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {assignment.batch.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {assignment.batch.course_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(assignment.batch.start_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(assignment.batch.end_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        assignment.batch.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : assignment.batch.status === "COMPLETED"
                            ? "bg-primary/10 text-primary"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {assignment.batch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FacultyCard>
  );
}
