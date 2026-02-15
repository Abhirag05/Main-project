"use client";

import { ClassSession } from "@/lib/timetableAPI";

interface ClassSessionListProps {
  sessions: ClassSession[];
  loading: boolean;
  onStatusChange: (session: ClassSession, newStatus: string) => void;
  onViewDetails: (session: ClassSession) => void;
  showBatchInfo?: boolean;
  showFacultyInfo?: boolean;
  showAttendanceButton?: boolean;
  showStatusDropdown?: boolean;
  onMarkAttendance?: (session: ClassSession) => void;
  onDelete?: (session: ClassSession) => void;
  showDeleteButton?: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  SCHEDULED: { bg: "bg-blue-100", text: "text-blue-800" },
  IN_PROGRESS: { bg: "bg-green-100", text: "text-green-800" },
  COMPLETED: { bg: "bg-gray-100", text: "text-gray-800" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-800" },
  RESCHEDULED: { bg: "bg-yellow-100", text: "text-yellow-800" },
};

const STATUS_OPTIONS = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function ClassSessionList({
  sessions,
  loading,
  onStatusChange,
  onViewDetails,
  showBatchInfo = true,
  showFacultyInfo = true,
  showAttendanceButton = false,
  showStatusDropdown = false,
  onMarkAttendance,
  onDelete,
  showDeleteButton = false,
}: ClassSessionListProps) {
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isToday = (dateStr: string): boolean => {
    const today = new Date();
    const sessionDate = new Date(dateStr);
    return today.toDateString() === sessionDate.toDateString();
  };

  const isPast = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDate = new Date(dateStr);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate < today;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200"></div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 border-t border-gray-200"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (safeSessions.length === 0) {
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">
          No sessions found
        </h3>
        <p className="mt-1 text-gray-500">
          Generate sessions from time slots to populate the schedule.
        </p>
      </div>
    );
  }

  // Group sessions by date
  const sessionsByDate: Record<string, ClassSession[]> = {};
  safeSessions.forEach((session) => {
    const date = session.session_date;
    if (!sessionsByDate[date]) {
      sessionsByDate[date] = [];
    }
    sessionsByDate[date].push(session);
  });

  // Sort sessions within each date by start time
  Object.keys(sessionsByDate).forEach((date) => {
    sessionsByDate[date].sort((a, b) =>
      a.scheduled_start.localeCompare(b.scheduled_start),
    );
  });

  // Sort dates
  const sortedDates = Object.keys(sessionsByDate).sort();

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="divide-y divide-gray-200">
        {sortedDates.map((date) => (
          <div key={date} className="border-t-4 border-blue-100">
            <div
              className={`px-6 py-4 ${
                isToday(date) ? "bg-blue-50" : "bg-gray-50"
              } flex items-center justify-between`}
            >
              <div className="flex items-center space-x-2">
                <span
                  className={`font-medium ${
                    isToday(date) ? "text-blue-700" : "text-gray-700"
                  }`}
                >
                  {formatDate(date)}
                </span>
                {isToday(date) && (
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                    Today
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {sessionsByDate[date].length} session
                {sessionsByDate[date].length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {sessionsByDate[date].map((session) => {
                const statusColor =
                  STATUS_COLORS[session.status] || STATUS_COLORS.SCHEDULED;
                const pastSession =
                  isPast(date) && session.status === "SCHEDULED";

                return (
                  <div
                    key={session.id}
                    className={`px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors ${
                      pastSession ? "bg-red-50" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="text-lg font-medium text-gray-900">
                            {session.module_name || "Module"}
                          </span>
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusColor.bg} ${statusColor.text}`}
                          >
                            {session.status.replace("_", " ")}
                          </span>
                          {session.effective_meeting_link && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                              Online
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {session.scheduled_start.slice(0, 5)} -{" "}
                            {session.scheduled_end.slice(0, 5)}
                          </span>

                          {showBatchInfo && session.batch_code && (
                            <span className="flex items-center">
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                              {session.batch_code}
                            </span>
                          )}

                          {showFacultyInfo && session.faculty_name && (
                            <span className="flex items-center">
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              {session.faculty_name}
                            </span>
                          )}
                        </div>

                        {pastSession && (
                          <div className="mt-2 text-sm text-red-600">
                            ⚠️ This session is past due and still marked as
                            scheduled
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 sm:ml-4 flex-shrink-0">
                        {showStatusDropdown &&
                          !["COMPLETED", "CANCELLED"].includes(
                            session.status,
                          ) && (
                            <select
                              value={session.status}
                              onChange={(e) =>
                                onStatusChange(session, e.target.value)
                              }
                              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <option
                                  key={option.value}
                                  value={option.value}
                                  className="text-gray-900"
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}

                        {showDeleteButton &&
                          onDelete &&
                          session.status === "SCHEDULED" &&
                          !isPast(date) && (
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Are you sure you want to delete this session: ${session.module_name} on ${formatDate(date)} at ${session.scheduled_start.slice(0, 5)}?`,
                                  )
                                ) {
                                  onDelete(session);
                                }
                              }}
                              className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                              title="Delete Session"
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
                          )}

                        <button
                          onClick={() => onViewDetails(session)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                          title="View Details"
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>

                        {session.effective_meeting_link && (
                          <a
                            href={session.effective_meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50"
                            title="Join Meeting"
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
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </a>
                        )}

                        {showAttendanceButton && onMarkAttendance && (
                          <button
                            onClick={() => onMarkAttendance(session)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center ${
                              session.attendance_marked
                                ? "text-white bg-blue-600 hover:bg-blue-700"
                                : "text-white bg-green-600 hover:bg-green-700"
                            }`}
                            title={
                              session.attendance_marked
                                ? "Edit Attendance"
                                : "Mark Attendance"
                            }
                          >
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              {session.attendance_marked ? (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              ) : (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                                />
                              )}
                            </svg>
                            {session.attendance_marked
                              ? "Attendance Marked"
                              : "Mark Attendance"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
