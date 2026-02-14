"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  WeeklyScheduleView,
  ClassSessionList,
  SessionDetailModal,
} from "@/components/timetable";
import { MarkAttendanceModal } from "@/components/attendance";
import { useFacultyGuard } from "@/components/faculty/hooks/useFacultyGuard";
import FacultyAlert from "@/components/faculty/ui/FacultyAlert";
import FacultyCard from "@/components/faculty/ui/FacultyCard";
import FacultyPageHeader from "@/components/faculty/ui/FacultyPageHeader";
import {
  TimeSlot,
  ClassSession,
  SessionStatus,
  timetableAPI,
} from "@/lib/timetableAPI";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";

export default function FacultySchedulePage() {
  const { user } = useAuth();
  const { isAllowed } = useFacultyGuard();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [todaySessions, setTodaySessions] = useState<ClassSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<"schedule" | "today" | "upcoming">(
    "today",
  );

  // Session detail modal
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Attendance modal
  const [attendanceSession, setAttendanceSession] =
    useState<ClassSession | null>(null);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !isAllowed) return;

      setLoading(true);
      try {
        const facultyProfile = await apiClient.getFacultySelfProfile();
        // Use 'me' to get current faculty's schedule
        const [scheduleRes, todayRes] = await Promise.all([
          timetableAPI.getFacultySchedule("me"),
          timetableAPI.getSessions({
            faculty: facultyProfile.id,
            date_from: new Date().toISOString().split("T")[0],
            date_to: new Date().toISOString().split("T")[0],
          }),
        ]);

        // Convert FacultySchedule to TimeSlot format for WeeklyScheduleView
        const slots: TimeSlot[] = scheduleRes.schedule.flatMap((day) =>
          day.slots.map(
            (slot) =>
              ({
                id: slot.id,
                batch: 0,
                batch_detail: {
                  id: 0,
                  code: slot.batch_code,
                  course_name: "",
                  start_date: "",
                  end_date: "",
                  status: "active",
                },
                module: 0,
                module_detail: { id: 0, code: "", name: slot.module_name },
                faculty: scheduleRes.faculty_id,
                faculty_detail: {
                  id: scheduleRes.faculty_id,
                  employee_code: scheduleRes.employee_code,
                  full_name: scheduleRes.faculty_name,
                  email: "",
                },
                day_of_week: day.day,
                day_name: day.day_name,
                start_time: slot.start_time,
                end_time: slot.end_time,
                room_number: slot.room,
                default_meeting_link: "",
                is_active: true,
                created_at: "",
                updated_at: "",
              }) as TimeSlot,
          ),
        );
        setTimeSlots(slots);

        // Today's sessions for this faculty
        setTodaySessions(todayRes || []);

        // Get upcoming sessions (next 7 days)
        const upcomingRes = await timetableAPI.getSessions({
          faculty: facultyProfile.id,
          date_from: new Date().toISOString().split("T")[0],
          date_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        });
        setUpcomingSessions(upcomingRes);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch schedule";
        setError(errorMessage);

        // If unauthorized, suggest re-login
        if (
          errorMessage.includes("401") ||
          errorMessage.includes("Unauthorized") ||
          errorMessage.includes("Authentication")
        ) {
          setError("Your session has expired. Please log out and log back in.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, isAllowed]);

  const handleStatusChange = async (
    session: ClassSession,
    newStatus: string,
  ) => {
    try {
      await timetableAPI.updateSession(session.id, {
        status: newStatus as SessionStatus,
      });
      // Refresh data
      const today = await timetableAPI.getTodaySessions();
      setTodaySessions(today.sessions || []);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update session status";
      alert(errorMessage);
    }
  };

  const handleViewDetails = (session: ClassSession) => {
    setSelectedSession(session);
    setIsDetailOpen(true);
  };

  const handleMarkAttendance = (session: ClassSession) => {
    setAttendanceSession(session);
    setIsAttendanceOpen(true);
  };

  const handleSlotClick = (slot: TimeSlot) => {
    // Could show slot details or allow faculty to see more info
    alert(`${slot.module_detail?.name}\nBatch: ${slot.batch_detail?.code}`);
  };

  const handleUpdateSession = (updated: ClassSession) => {
    setTodaySessions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    );
    setUpcomingSessions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    );
    setSelectedSession(updated);
  };

  // Get today's day of week (1 = Monday, 7 = Sunday to match Django's TimeSlot.WEEKDAY_CHOICES)
  const getTodayDayOfWeek = () => {
    const day = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    return day === 0 ? 7 : day; // Convert to Django format (1 = Monday, 7 = Sunday)
  };

  // Stats
  const stats = {
    totalSlots: timeSlots.length,
    todaySessions: todaySessions.length,
    completedToday: todaySessions.filter((s) => s.status === "COMPLETED")
      .length,
    upcomingSessions: upcomingSessions.filter((s) => s.status === "SCHEDULED")
      .length,
  };

  if (!isAllowed) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <FacultyPageHeader
          title="My Schedule"
          description="View your weekly schedule and manage sessions"
          action={
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode("today")}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === "today"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setViewMode("upcoming")}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === "upcoming"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setViewMode("schedule")}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === "schedule"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Weekly
              </button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FacultyCard className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Weekly Slots
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {stats.totalSlots}
            </div>
          </FacultyCard>
          <FacultyCard className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Today&apos;s Sessions
            </div>
            <div className="mt-1 text-2xl font-semibold text-blue-600">
              {stats.todaySessions}
            </div>
          </FacultyCard>
          <FacultyCard className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Completed Today
            </div>
            <div className="mt-1 text-2xl font-semibold text-green-600">
              {stats.completedToday}
            </div>
          </FacultyCard>
          <FacultyCard className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Upcoming (7 days)
            </div>
            <div className="mt-1 text-2xl font-semibold text-purple-600">
              {stats.upcomingSessions}
            </div>
          </FacultyCard>
        </div>

        {/* Error */}
        {error && <FacultyAlert variant="error">{error}</FacultyAlert>}

        {/* Content */}
        {viewMode === "today" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Today&apos;s Sessions
            </h2>
            <ClassSessionList
              sessions={todaySessions}
              loading={loading}
              onStatusChange={handleStatusChange}
              onViewDetails={handleViewDetails}
              showFacultyInfo={false}
              showBatchInfo={true}
              showAttendanceButton={true}
              onMarkAttendance={handleMarkAttendance}
            />
          </div>
        )}

        {viewMode === "upcoming" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upcoming Sessions (Next 7 Days)
            </h2>
            <ClassSessionList
              sessions={upcomingSessions}
              loading={loading}
              onStatusChange={handleStatusChange}
              onViewDetails={handleViewDetails}
              showFacultyInfo={false}
              showAttendanceButton={true}
              onMarkAttendance={handleMarkAttendance}
            />
          </div>
        )}

        {viewMode === "schedule" && (
          <WeeklyScheduleView
            timeSlots={timeSlots}
            loading={loading}
            onSlotClick={handleSlotClick}
            viewMode="faculty"
            title="My Weekly Schedule"
          />
        )}
      </div>

      {/* Session Detail Modal */}
      <SessionDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedSession(null);
        }}
        session={selectedSession}
        onUpdate={handleUpdateSession}
        canEdit={true}
      />

      {/* Attendance Modal */}
      {attendanceSession && (
        <MarkAttendanceModal
          isOpen={isAttendanceOpen}
          onClose={() => {
            setIsAttendanceOpen(false);
            setAttendanceSession(null);
          }}
          sessionId={attendanceSession.id}
          sessionInfo={{
            batch_code: attendanceSession.batch_code || "",
            module_name: attendanceSession.module_name || "",
            session_date: attendanceSession.session_date,
          }}
          onSuccess={() => {
            // Update the session to show attendance as marked and mark session as COMPLETED
            const updateAttendanceMarked = (sessions: ClassSession[]) =>
              sessions.map((s) =>
                s.id === attendanceSession.id
                  ? { ...s, attendance_marked: true, status: "COMPLETED" as SessionStatus }
                  : s,
              );
            setTodaySessions(updateAttendanceMarked);
            setUpcomingSessions(updateAttendanceMarked);
          }}
        />
      )}
    </DashboardLayout>
  );
}
