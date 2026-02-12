"use client";

import { useState, useEffect } from "react";
import {
  attendanceAPI,
  StudentForAttendance,
  SessionStudentsResponse,
} from "@/lib/attendanceAPI";

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  sessionInfo?: {
    batch_code: string;
    module_name: string;
    session_date: string;
  };
  onSuccess?: () => void;
}

export default function MarkAttendanceModal({
  isOpen,
  onClose,
  sessionId,
  sessionInfo,
  onSuccess,
}: MarkAttendanceModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [sessionData, setSessionData] = useState<SessionStudentsResponse | null>(null);
  const [attendance, setAttendance] = useState<Map<number, "PRESENT" | "ABSENT">>(new Map());
  
  // Track if attendance has been modified
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchSessionStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sessionId]);

  const fetchSessionStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceAPI.getSessionStudents(sessionId);
      setSessionData(data);
      
      // Initialize attendance state from existing data
      const initialAttendance = new Map<number, "PRESENT" | "ABSENT">();
      data.students.forEach((student) => {
        // Default to PRESENT if not yet marked
        const status = student.current_attendance_status || "PRESENT";
        initialAttendance.set(student.student_id, status);
      });
      setAttendance(initialAttendance);
      setHasChanges(false);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load session students");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: number, status: "PRESENT" | "ABSENT") => {
    setAttendance((prev) => {
      const newAttendance = new Map(prev);
      newAttendance.set(studentId, status);
      return newAttendance;
    });
    setHasChanges(true);
  };

  const toggleStatus = (studentId: number) => {
    const currentStatus = attendance.get(studentId);
    const newStatus = currentStatus === "PRESENT" ? "ABSENT" : "PRESENT";
    handleStatusChange(studentId, newStatus);
  };

  const markAllPresent = () => {
    setAttendance((prev) => {
      const newAttendance = new Map(prev);
      sessionData?.students.forEach((student) => {
        newAttendance.set(student.student_id, "PRESENT");
      });
      return newAttendance;
    });
    setHasChanges(true);
  };

  const markAllAbsent = () => {
    setAttendance((prev) => {
      const newAttendance = new Map(prev);
      sessionData?.students.forEach((student) => {
        newAttendance.set(student.student_id, "ABSENT");
      });
      return newAttendance;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!sessionData) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const attendanceItems = Array.from(attendance.entries()).map(
        ([student_id, status]) => ({
          student_id,
          status,
        })
      );
      
      const result = await attendanceAPI.saveAttendance(sessionId, {
        attendance: attendanceItems,
      });
      
      setSuccess(`Attendance saved successfully! ${result.created} new, ${result.updated} updated.`);
      setHasChanges(false);
      
      // Refresh data to show updated stats
      await fetchSessionStudents();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to close?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Calculate current stats
  const presentCount = Array.from(attendance.values()).filter(
    (s) => s === "PRESENT"
  ).length;
  const absentCount = Array.from(attendance.values()).filter(
    (s) => s === "ABSENT"
  ).length;
  const attendancePercentage =
    presentCount + absentCount > 0
      ? Math.round((presentCount / (presentCount + absentCount)) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Mark Attendance
              </h2>
              {(sessionData || sessionInfo) && (
                <p className="text-sm text-gray-600 mt-1">
                  {sessionData?.batch_code || sessionInfo?.batch_code} •{" "}
                  {sessionData?.module_name || sessionInfo?.module_name} •{" "}
                  {sessionData?.session_date || sessionInfo?.session_date}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <svg
                className="h-6 w-6"
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

          {/* Content */}
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading students...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            ) : sessionData ? (
              <>
                {/* Status Message */}
                {!sessionData.is_marking_allowed && (
                  <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
                    <strong>Note:</strong> {sessionData.marking_message}
                  </div>
                )}

                {success && (
                  <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                  </div>
                )}

                {/* Stats Bar */}
                <div className="mb-4 grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {sessionData.stats.total_enrolled}
                    </div>
                    <div className="text-xs text-gray-500">Total Enrolled</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {presentCount}
                    </div>
                    <div className="text-xs text-gray-500">Present</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {absentCount}
                    </div>
                    <div className="text-xs text-gray-500">Absent</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {attendancePercentage}%
                    </div>
                    <div className="text-xs text-gray-500">Attendance</div>
                  </div>
                </div>

                {/* Quick Actions */}
                {sessionData.is_marking_allowed && (
                  <div className="mb-4 flex gap-2">
                    <button
                      onClick={markAllPresent}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    >
                      Mark All Present
                    </button>
                    <button
                      onClick={markAllAbsent}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Mark All Absent
                    </button>
                  </div>
                )}

                {/* Student List */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Roll No
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student Name
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Present
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sessionData.students.map((student) => {
                        const isPresent =
                          attendance.get(student.student_id) === "PRESENT";
                        return (
                          <tr
                            key={student.student_id}
                            className={`${
                              isPresent ? "bg-white" : "bg-red-50"
                            } hover:bg-gray-50 transition-colors`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {student.roll_no || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {student.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {student.email}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  isPresent
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {isPresent ? "Present" : "Absent"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {sessionData.is_marking_allowed ? (
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isPresent}
                                    onChange={() =>
                                      toggleStatus(student.student_id)
                                    }
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {sessionData.students.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No students enrolled in this batch.
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-lg">
            <div className="text-sm text-gray-500">
              {hasChanges && (
                <span className="text-amber-600">You have unsaved changes</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {sessionData?.is_marking_allowed && (
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    "Save Attendance"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
