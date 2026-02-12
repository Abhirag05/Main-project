"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  apiClient,
  MentorBatch,
  MentorBatchRecording,
  MentorSessionAttendance,
  MentorSessionAttendanceStudent,
} from "@/lib/api";
import { timetableAPI, ClassSession } from "@/lib/timetableAPI";
import BatchSelect from "@/components/batch/BatchSelect";

interface AttendanceStats {
  total_enrolled: number;
  present_count: number;
  absent_count: number;
  not_marked: number;
  attendance_percentage: number;
}

interface SessionWithAttendance extends ClassSession {
  attendance_stats?: AttendanceStats;
}

export default function BatchMentorAttendancePage() {
  const router = useRouter();
  const [batches, setBatches] = useState<MentorBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<SessionWithAttendance[]>([]);
  const [recordings, setRecordings] = useState<MentorBatchRecording[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDate, setUploadDate] = useState<string>("");
  const [uploadTopic, setUploadTopic] = useState("");
  const [uploadLink, setUploadLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"today" | "week" | "all">("week");
  const [selectedSession, setSelectedSession] =
    useState<SessionWithAttendance | null>(null);
  const [attendanceData, setAttendanceData] =
    useState<MentorSessionAttendance | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Fetch batches on mount
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/");
      return;
    }

    const user = JSON.parse(userStr);
    if (user.role?.code !== "BATCH_MENTOR") {
      router.push("/dashboards");
      return;
    }

    const fetchBatches = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getMentorBatches();
        setBatches(data);
        if (data.length > 0) {
          setSelectedBatchId((prev) => prev ?? data[0].batch_id);
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load batches.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, [router]);

  const selectedBatch = batches.find((b) => b.batch_id === selectedBatchId);
  const selectedBatchIsRecorded = selectedBatch
    ? (selectedBatch as MentorBatch).mode
      ? (selectedBatch as MentorBatch).mode === "RECORDED"
      : selectedBatch.batch_code?.toString().toUpperCase().includes("RECORDED")
    : false;

  // Fetch sessions when batch or view mode changes (LIVE batches)
  const fetchSessions = useCallback(async () => {
    if (!selectedBatchId) return;
    if (selectedBatchIsRecorded) return;

    try {
      setSessionsLoading(true);
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      let dateFrom = todayStr;
      let dateTo = todayStr;

      if (viewMode === "week") {
        // Get sessions for the past 7 days to today
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFrom = weekAgo.toISOString().split("T")[0];
      } else if (viewMode === "all") {
        // Get all sessions from batch start date
        const batch = batches.find((b) => b.batch_id === selectedBatchId);
        if (batch) {
          dateFrom = batch.start_date;
          dateTo = batch.end_date;
        }
      }

      const data = await timetableAPI.getSessions({
        batch: selectedBatchId,
        date_from: dateFrom,
        date_to: dateTo,
      });

      // Sort sessions by date (most recent first)
      const sortedSessions = data.sort(
        (a, b) =>
          new Date(b.session_date).getTime() -
          new Date(a.session_date).getTime(),
      );

      setSessions(sortedSessions);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load sessions.";
      setError(errorMessage);
    } finally {
      setSessionsLoading(false);
    }
  }, [selectedBatchId, viewMode, batches]);

  useEffect(() => {
    if (selectedBatchIsRecorded) return;
    fetchSessions();
  }, [fetchSessions, selectedBatchIsRecorded]);

  const fetchRecordings = useCallback(async () => {
    if (!selectedBatchId) return;
    if (!selectedBatchIsRecorded) return;

    try {
      setRecordingsLoading(true);
      const data = await apiClient.getMentorBatchRecordings(selectedBatchId);
      setRecordings(data);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load recordings.";
      setError(errorMessage);
    } finally {
      setRecordingsLoading(false);
    }
  }, [selectedBatchId, selectedBatchIsRecorded]);

  useEffect(() => {
    if (!selectedBatchIsRecorded) return;
    fetchRecordings();
  }, [fetchRecordings, selectedBatchIsRecorded]);

  // Fetch attendance data when session is selected
  const fetchAttendanceData = useCallback(async (sessionId: number) => {
    try {
      setAttendanceLoading(true);
      const data = await apiClient.getMentorSessionAttendance(sessionId);
      setAttendanceData(data);
    } catch (err: unknown) {
      console.error("Failed to fetch attendance:", err);
      setAttendanceData(null);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  // Handle session selection
  const handleViewDetails = (session: SessionWithAttendance) => {
    setSelectedSession(session);
    fetchAttendanceData(session.id);
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedSession(null);
    setAttendanceData(null);
  };

  // Group sessions by date
  const sessionsByDate = sessions.reduce(
    (acc, session) => {
      const date = session.session_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(session);
      return acc;
    },
    {} as Record<string, SessionWithAttendance[]>,
  );

  const getAttendanceStatusColor = (session: SessionWithAttendance) => {
    if (session.attendance_marked) {
      return "bg-green-100 text-green-800";
    }
    if (session.status === "COMPLETED") {
      return "bg-yellow-100 text-yellow-800";
    }
    return "bg-gray-100 text-gray-600";
  };

  const getAttendanceStatusText = (session: SessionWithAttendance) => {
    if (session.attendance_marked) {
      return "Attendance Marked";
    }
    if (session.status === "COMPLETED") {
      return "Pending";
    }
    return "Not Required";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800">Error</h2>
          <p className="mt-2 text-red-600">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (batches.length === 0) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 bg-white rounded-xl shadow-lg">
          <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="h-10 w-10 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            No Batch Assigned
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            You are not assigned to any batch yet. Please contact your centre
            administrator.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Batch Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor attendance for your batch sessions
            </p>
          </div>

          {/* Batch Selector - reusable */}
          <BatchSelect
            value={selectedBatchId}
            onChange={(id) => setSelectedBatchId(id)}
            className="ml-auto"
          />
        </div>

        {/* Batch Info and Stats */}
        {selectedBatch && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <p className="text-sm text-gray-500">Batch</p>
              <p className="text-lg font-semibold text-gray-900">
                {selectedBatch.batch_code}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-lg font-semibold text-blue-600">
                {selectedBatch.total_students}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <p className="text-sm text-gray-500">Sessions Shown</p>
              <p className="text-lg font-semibold text-gray-900">
                {sessions.length}
              </p>
            </div>
            {!selectedBatchIsRecorded && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <p className="text-sm text-gray-500">Attendance Marked</p>
                <p className="text-lg font-semibold text-green-600">
                  {sessions.filter((s) => s.attendance_marked).length}
                </p>
              </div>
            )}
          </div>
        )}

        {/* View Mode Tabs (only for LIVE) */}
        {!selectedBatchIsRecorded && (
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-fit">
            {[
              { key: "today", label: "Today" },
              { key: "week", label: "This Week" },
              { key: "all", label: "All Sessions" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key as "today" | "week" | "all")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === tab.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Sessions List (LIVE) or Recordings Table (RECORDED) */}
        {selectedBatchIsRecorded ? (
          recordingsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recorded Sessions
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setUploadDate("");
                      setUploadTopic("");
                      setUploadLink("");
                      setShowUploadModal(true);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    Upload meeting
                  </button>
                </div>
              </div>
              {recordings.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-600">
                  No recordings yet. Use Upload meeting to add one.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Meeting
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Recording
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recordings.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(r.session_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {r.meeting_topic || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-600">
                            <a
                              href={r.recording_link}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              View
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        ) : sessionsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No sessions found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              No sessions scheduled for the selected time period.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(sessionsByDate).map(([date, dateSessions]) => (
              <div key={date} className="space-y-3">
                {/* Date Header */}
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>

                {/* Sessions for this date */}
                <div className="grid gap-3">
                  {dateSessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium text-gray-900">
                              {session.module_name}
                            </h4>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAttendanceStatusColor(
                                session,
                              )}`}
                            >
                              {getAttendanceStatusText(session)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
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
                              {session.scheduled_start} -{" "}
                              {session.scheduled_end}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
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
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {session.attendance_marked && (
                            <span className="inline-flex items-center gap-1 text-green-600 text-sm">
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
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              Marked
                            </span>
                          )}
                          <button
                            onClick={() => handleViewDetails(session)}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal for recordings */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black bg-opacity-25"
                onClick={() => setShowUploadModal(false)}
              />
              <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Upload Meeting Recording
                  </h3>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-sm text-gray-800">Date</label>
                    <input
                      type="date"
                      value={uploadDate}
                      onChange={(e) => setUploadDate(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-400 px-3 py-2 text-gray-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-800">Topic</label>
                    <input
                      value={uploadTopic}
                      onChange={(e) => setUploadTopic(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-400 px-3 py-2 text-gray-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-800">
                      Recording Link
                    </label>
                    <input
                      value={uploadLink}
                      onChange={(e) => setUploadLink(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-400 px-3 py-2 text-gray-900 bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!selectedBatchId) return;
                        if (!uploadDate || !uploadTopic || !uploadLink) {
                          return alert(
                            "Please fill date, topic and recording link",
                          );
                        }
                        try {
                          await apiClient.createMentorBatchRecording(
                            selectedBatchId,
                            {
                              session_date: uploadDate,
                              meeting_topic: uploadTopic,
                              recording_link: uploadLink,
                            },
                          );
                          await fetchRecordings();
                          setShowUploadModal(false);
                        } catch (err) {
                          alert(
                            err instanceof Error
                              ? err.message
                              : "Failed to upload recording",
                          );
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session Detail Modal */}
        {selectedSession && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black bg-opacity-25"
                onClick={handleCloseModal}
              />
              <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Session Details
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Session Info */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Module</p>
                      <p className="font-medium text-gray-900">
                        {selectedSession.module_name}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(
                            selectedSession.session_date,
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="font-medium text-gray-900">
                          {selectedSession.scheduled_start} -{" "}
                          {selectedSession.scheduled_end}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Faculty</p>
                      <p className="font-medium text-gray-900">
                        {selectedSession.faculty_name}
                      </p>
                    </div>
                    {selectedSession.topic && (
                      <div>
                        <p className="text-sm text-gray-500">Topic</p>
                        <p className="font-medium text-gray-900">
                          {selectedSession.topic}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Attendance Section */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">
                      Attendance
                    </h4>

                    {attendanceLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : attendanceData ? (
                      <>
                        {/* Attendance Stats */}
                        <div className="grid grid-cols-4 gap-3 mb-4">
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-blue-600">
                              {attendanceData.stats.total_enrolled}
                            </p>
                            <p className="text-xs text-gray-500">Total</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {attendanceData.stats.present_count}
                            </p>
                            <p className="text-xs text-gray-500">Present</p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-red-600">
                              {attendanceData.stats.absent_count}
                            </p>
                            <p className="text-xs text-gray-500">Absent</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-gray-600">
                              {attendanceData.stats.attendance_percentage}%
                            </p>
                            <p className="text-xs text-gray-500">Rate</p>
                          </div>
                        </div>

                        {/* Student List */}
                        {attendanceData.students.length > 0 ? (
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Student
                                  </th>
                                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {attendanceData.students.map((student) => (
                                  <tr
                                    key={student.student_id}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-4 py-3">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          {student.full_name}
                                        </p>
                                        {student.email && (
                                          <p className="text-xs text-gray-500">
                                            {student.email}
                                          </p>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {student.status === "PRESENT" ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          <svg
                                            className="w-3.5 h-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M5 13l4 4L19 7"
                                            />
                                          </svg>
                                          Present
                                        </span>
                                      ) : student.status === "ABSENT" ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          <svg
                                            className="w-3.5 h-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M6 18L18 6M6 6l12 12"
                                            />
                                          </svg>
                                          Absent
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                          <svg
                                            className="w-3.5 h-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                          </svg>
                                          Not Marked
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            No students enrolled in this batch.
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <svg
                          className="mx-auto h-10 w-10 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">
                          {selectedSession.attendance_marked
                            ? "Unable to load attendance data."
                            : "Attendance has not been marked for this session."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
