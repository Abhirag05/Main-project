"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { timetableAPI, ClassSessionDetail } from "@/lib/timetableAPI";
import { useAuth } from "@/contexts/AuthContext";
import {
  attendanceAPI,
  SessionStudentsResponse,
} from "@/lib/attendanceAPI";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function MarkAttendancePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [session, setSession] = useState<ClassSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Attendance state
  const [sessionData, setSessionData] = useState<SessionStudentsResponse | null>(null);
  const [attendance, setAttendance] = useState<Map<number, "PRESENT" | "ABSENT">>(new Map());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const sessionId = parseInt(resolvedParams.sessionId, 10);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    // Access control: only FACULTY
    if (user && user.role !== "FACULTY") {
      router.push("/dashboards");
      return;
    }

    // Only fetch if user is FACULTY
    if (user && user.role === "FACULTY" && sessionId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, sessionId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch session details and students in parallel
      const [sessionDetails, studentsData] = await Promise.all([
        timetableAPI.getSession(sessionId),
        attendanceAPI.getSessionStudents(sessionId),
      ]);
      setSession(sessionDetails);
      setSessionData(studentsData);
      
      // Initialize attendance state from existing data
      const initialAttendance = new Map<number, "PRESENT" | "ABSENT">();
      studentsData.students.forEach((student) => {
        const status = student.current_attendance_status || "PRESENT";
        initialAttendance.set(student.student_id, status);
      });
      setAttendance(initialAttendance);
      setHasChanges(false);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load session");
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
      
      // Refresh data
      await fetchData();
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
        router.push("/dashboards/faculty/schedule");
      }
    } else {
      router.push("/dashboards/faculty/schedule");
    }
  };

  // Calculate stats
  const presentCount = Array.from(attendance.values()).filter(s => s === "PRESENT").length;
  const absentCount = Array.from(attendance.values()).filter(s => s === "ABSENT").length;
  const attendancePercentage = presentCount + absentCount > 0
    ? Math.round((presentCount / (presentCount + absentCount)) * 100)
    : 0;

  // Show loading while auth is being determined
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </div>
      </DashboardLayout>
    );
  }

  // Only redirect/block after auth is loaded
  if (!user || user.role !== "FACULTY") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Redirecting...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header with back button */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center text-muted-foreground hover:text-foreground mb-4"
          >
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Schedule
          </button>
          
          <h1 className="text-2xl font-bold text-foreground">Mark Attendance</h1>
          {session && (
            <p className="mt-1 text-sm text-muted-foreground">
              {session.batch_code} • {session.module_name} • {session.session_date}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading session...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
            <button
              onClick={() => router.push("/dashboards/faculty/schedule")}
              className="ml-4 text-red-900 underline"
            >
              Go back to schedule
            </button>
          </div>
        ) : sessionData ? (
          <div className="bg-card rounded-lg shadow">
            {/* Status Messages */}
            {!sessionData.is_marking_allowed && (
              <div className="m-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
                <strong>Note:</strong> {sessionData.marking_message}
              </div>
            )}

            {success && (
              <div className="m-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}

            {/* Stats Bar */}
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {sessionData.stats.total_enrolled}
                </div>
                <div className="text-xs text-muted-foreground">Total Enrolled</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {presentCount}
                </div>
                <div className="text-xs text-muted-foreground">Present</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {absentCount}
                </div>
                <div className="text-xs text-muted-foreground">Absent</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">
                  {attendancePercentage}%
                </div>
                <div className="text-xs text-muted-foreground">Attendance</div>
              </div>
            </div>

            {/* Quick Actions */}
            {sessionData.is_marking_allowed && (
              <div className="px-4 pb-4 flex gap-2">
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
            <div className="border-t">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Roll No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Present
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {sessionData.students.map((student) => {
                    const isPresent = attendance.get(student.student_id) === "PRESENT";
                    return (
                      <tr
                        key={student.student_id}
                        className={`${isPresent ? "bg-card" : "bg-red-50"} hover:bg-secondary/50 transition-colors`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                          {student.roll_no || "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {student.full_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
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
                                onChange={() => toggleStatus(student.student_id)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                          ) : (
                            <span className="text-muted-foreground/70">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sessionData.students.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No students enrolled in this batch.
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t bg-secondary/50">
              <div className="text-sm text-muted-foreground">
                {hasChanges && (
                  <span className="text-amber-600">You have unsaved changes</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-medium text-foreground/80 bg-card border border-border rounded-md hover:bg-secondary/50 transition-colors"
                >
                  Cancel
                </button>
                {sessionData.is_marking_allowed && (
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:bg-primary/30 disabled:cursor-not-allowed transition-colors flex items-center"
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
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
            Session not found.
            <button
              onClick={() => router.push("/dashboards/faculty/schedule")}
              className="ml-4 text-yellow-900 underline"
            >
              Go back to schedule
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}