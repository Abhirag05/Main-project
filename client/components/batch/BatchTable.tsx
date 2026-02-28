"use client";

import { Batch } from "@/lib/api";

interface BatchTableProps {
  batches: Batch[];
  onStatusUpdate: (batch: Batch) => void;
}

export default function BatchTable({ batches, onStatusUpdate }: BatchTableProps) {
  const getStatusBadge = (status: string) => {
    const badges = {
      ACTIVE: "bg-green-100 text-green-800",
      COMPLETED: "bg-secondary text-foreground",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return badges[status as keyof typeof badges] || "bg-secondary text-foreground";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-secondary/50">
          <tr>
            <th
              scope="col"
              className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6"
            >
              Batch Code
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-foreground"
            >
              Course
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-foreground"
            >
              Start Date
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-foreground"
            >
              End Date
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-foreground"
            >
              Students
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-foreground"
            >
              Status
            </th>
            <th
              scope="col"
              className="relative py-3.5 pl-3 pr-4 sm:pr-6"
            >
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {batches.map((batch) => (
            <tr key={batch.id}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">
                {batch.code}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground">
                    {batch.course_name}
                  </div>
                  <div className="text-muted-foreground">{batch.course_code}</div>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                {formatDate(batch.start_date)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                {formatDate(batch.end_date)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                {batch.current_student_count} / {batch.max_students}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                    batch.status
                  )}`}
                >
                  {batch.status}
                </span>
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                {batch.status === "ACTIVE" && (
                  <button
                    onClick={() => onStatusUpdate(batch)}
                    className="text-primary hover:text-primary"
                  >
                    Update Status
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
