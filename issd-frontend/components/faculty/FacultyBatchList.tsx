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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Assigned Batches
        </h2>
        <p className="text-gray-600">Loading...</p>
      </FacultyCard>
    );
  }

  return (
    <FacultyCard className="p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Assigned Batches
      </h2>

      {assignments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">No batches assigned yet</p>
          <p className="text-gray-400 text-sm mt-2">
            You will see your assigned batches here once they are allocated by
            the admin
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {assignment.batch.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {assignment.batch.course_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(assignment.batch.start_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(assignment.batch.end_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        assignment.batch.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : assignment.batch.status === "COMPLETED"
                            ? "bg-blue-100 text-blue-800"
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
