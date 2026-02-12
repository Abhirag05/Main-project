"use client";

import { TimeSlot } from "@/lib/timetableAPI";

interface TimeSlotTableProps {
  timeSlots: TimeSlot[];
  loading: boolean;
  onEdit: (slot: TimeSlot) => void;
  onDelete: (slot: TimeSlot) => void;
  onGenerateSessions?: (slot: TimeSlot) => void; // optional: generating sessions may be disabled
}

const DAY_COLORS: Record<number, string> = {
  1: "bg-blue-100 text-blue-800",
  2: "bg-green-100 text-green-800",
  3: "bg-yellow-100 text-yellow-800",
  4: "bg-purple-100 text-purple-800",
  5: "bg-pink-100 text-pink-800",
  6: "bg-orange-100 text-orange-800",
  7: "bg-red-100 text-red-800",
};

export default function TimeSlotTable({
  timeSlots,
  loading,
  onEdit,
  onDelete,
  onGenerateSessions,
}: TimeSlotTableProps) {
  const safeSlots = Array.isArray(timeSlots) ? timeSlots : [];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200"></div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 border-t border-gray-200"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (safeSlots.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">
          No time slots found
        </h3>
        <p className="mt-1 text-gray-500">
          Create a time slot to set up the weekly schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Day
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Batch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Module
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Faculty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {safeSlots.map((slot) => (
              <tr key={slot.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      DAY_COLORS[slot.day_of_week]
                    }`}
                  >
                    {slot.day_name}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {slot.batch_detail?.code}
                  </div>
                  <div className="text-xs text-gray-500">
                    {slot.batch_detail?.course_name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {slot.module_detail?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {slot.module_detail?.code}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {slot.faculty_detail?.full_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {slot.faculty_detail?.employee_code}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      slot.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {slot.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex items-center justify-center space-x-2">
                    {onGenerateSessions && (
                      <button
                        onClick={() => onGenerateSessions(slot)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Generate Sessions"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(slot)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(slot)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
