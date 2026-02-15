"use client";

import { FacultyModuleAssignment } from "@/lib/api";
import FacultyCard from "@/components/faculty/ui/FacultyCard";

interface FacultyModuleListProps {
  assignments: FacultyModuleAssignment[];
  loading: boolean;
}

export default function FacultyModuleList({
  assignments,
  loading,
}: FacultyModuleListProps) {
  if (loading) {
    return (
      <FacultyCard className="p-6 mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Assigned Modules
        </h2>
        <p className="text-muted-foreground">Loading...</p>
      </FacultyCard>
    );
  }

  return (
    <FacultyCard className="p-6 mb-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        Assigned Modules
      </h2>

      {assignments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-lg">No modules assigned yet</p>
          <p className="text-muted-foreground/70 text-sm mt-2">
            You will see your assigned modules here once they are allocated by
            the admin
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Module Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Module Name
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
                    {assignment.module.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {assignment.module.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        assignment.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {assignment.is_active ? "Active" : "Inactive"}
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
