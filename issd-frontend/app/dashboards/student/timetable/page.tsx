"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  WeeklyScheduleView,
  ClassSessionList,
  SessionDetailModal,
} from "@/components/timetable";
import { TimeSlot, ClassSession, timetableAPI } from "@/lib/timetableAPI";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function StudentTimetablePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [todaySessions, setTodaySessions] = useState<ClassSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<"today" | "week" | "schedule">(
    "today",
  );

  // Session detail modal
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        setError(null);
        setNotice(null);

        // Always resolve batch from backend (login payload doesn't include batch info)
        const myBatch = await apiClient.getMyBatch();
        const batchId = myBatch?.batch_id ?? null;
        if (!batchId) {
          setError("You are not assigned to any batch yet.");
          return;
        }
        if (myBatch?.mode === "RECORDED") {
          router.push("/dashboards/student/recorded-classes");
          return;
        }

        const [timetableRes, todayRes] = await Promise.all([
          timetableAPI.getBatchTimetable(batchId),
          timetableAPI.getTodaySessions(),
        ]);

        // Weekly schedule from batch timetable - convert to TimeSlot format for WeeklyScheduleView
        const slots: TimeSlot[] = (timetableRes.weekly_schedule || []).flatMap(
          (day) =>
            day.slots.map(
              (slot) =>
                ({
                  id: slot.id,
                  batch: batchId,
                  batch_detail: {
                    id: batchId,
                    code: timetableRes.batch_code,
                    course_name: timetableRes.course,
                    start_date: "",
                    end_date: "",
                    status: "active",
                  },
                  module: 0,
                  module_detail: {
                    id: 0,
                    code: slot.module_code,
                    name: slot.subject,
                  },
                  faculty: 0,
                  faculty_detail: {
                    id: 0,
                    employee_code: slot.faculty_code,
                    full_name: slot.faculty,
                    email: "",
                  },
                  day_of_week: day.day,
                  day_name: day.day_name,
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  room_number: slot.room,
                  default_meeting_link: slot.meeting_link,
                  is_active: true,
                  created_at: "",
                  updated_at: "",
                }) as TimeSlot,
            ),
        );
        setTimeSlots(slots);

        // Today's sessions from TodaySessions response
        const today = todayRes.sessions || [];
        setTodaySessions(today);

        // Get upcoming sessions
        const upcomingRes = await timetableAPI.getSessions({
          batch: batchId,
          date_from: new Date().toISOString().split("T")[0],
          date_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        });
        setUpcomingSessions(upcomingRes);

        // Friendly fallback when batch exists but timetable isn't created yet
        if (
          slots.length === 0 &&
          today.length === 0 &&
          upcomingRes.length === 0
        ) {
          setNotice("Timetable will be done soon.");
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch timetable";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleViewDetails = (session: ClassSession) => {
    setSelectedSession(session);
    setIsDetailOpen(true);
  };

  const handleSlotClick = (slot: TimeSlot) => {
    // Show slot info for students
    alert(
      `${slot.module_detail?.name}\nFaculty: ${
        slot.faculty_detail?.full_name
      }\nRoom: ${slot.room_number || "TBD"}\nTime: ${slot.start_time.slice(
        0,
        5,
      )} - ${slot.end_time.slice(0, 5)}`,
    );
  };

  // Stats
  const stats = {
    weeklyClasses: timeSlots.length,
    todayClasses: todaySessions.length,
    upcomingClasses: upcomingSessions.filter((s) => s.status === "SCHEDULED")
      .length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Timetable</h1>
            <p className="mt-1 text-sm text-gray-500">
              View your class schedule and upcoming sessions
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
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
                onClick={() => setViewMode("week")}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === "week"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setViewMode("schedule")}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === "schedule"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Weekly Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500">
              Weekly Classes
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {stats.weeklyClasses}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500">
              Today&apos;s Classes
            </div>
            <div className="mt-1 text-2xl font-semibold text-blue-600">
              {stats.todayClasses}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500">
              Upcoming (7 days)
            </div>
            <div className="mt-1 text-2xl font-semibold text-purple-600">
              {stats.upcomingClasses}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Notice */}
        {notice && !error && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            {notice}
          </div>
        )}

        {/* Content */}
        {viewMode === "today" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Today&apos;s Classes
            </h2>
            {todaySessions.length === 0 ? (
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
                  No classes today
                </h3>
                <p className="mt-1 text-gray-500">Enjoy your day!</p>
              </div>
            ) : (
              <ClassSessionList
                sessions={todaySessions}
                loading={loading}
                onStatusChange={() => {}}
                onViewDetails={handleViewDetails}
                showBatchInfo={false}
              />
            )}
          </div>
        )}

        {viewMode === "week" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              This Week&apos;s Classes
            </h2>
            <ClassSessionList
              sessions={upcomingSessions}
              loading={loading}
              onStatusChange={() => {}}
              onViewDetails={handleViewDetails}
              showBatchInfo={false}
            />
          </div>
        )}

        {viewMode === "schedule" && (
          <WeeklyScheduleView
            timeSlots={timeSlots}
            loading={loading}
            onSlotClick={handleSlotClick}
            viewMode="batch"
            title="Weekly Class Schedule"
          />
        )}
      </div>

      {/* Session Detail Modal (Read-only for students) */}
      <SessionDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedSession(null);
        }}
        session={selectedSession}
        onUpdate={() => {}}
        canEdit={false}
      />
    </DashboardLayout>
  );
}
