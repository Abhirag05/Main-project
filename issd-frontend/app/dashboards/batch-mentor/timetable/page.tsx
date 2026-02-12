"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  WeeklyScheduleView,
  ClassSessionList,
  SessionDetailModal,
  GenerateSessionsModal,
} from "@/components/timetable";
import {
  ClassSession,
  SessionStatus,
  TimeSlot,
  timetableAPI,
} from "@/lib/timetableAPI";
import { apiClient, MentorBatch } from "@/lib/api";
import BatchSelect from "@/components/batch/BatchSelect";

export default function BatchMentorTimetablePage() {
  const router = useRouter();
  const [batches, setBatches] = useState<MentorBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [todaySessions, setTodaySessions] = useState<ClassSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"today" | "week" | "schedule">(
    "today",
  );

  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const selectedBatch = useMemo(
    () => batches.find((b) => b.batch_id === selectedBatchId) || null,
    [batches, selectedBatchId],
  );

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
        setError(null);
        const data = await apiClient.getMentorBatches();
        setBatches(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load batches.");
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, [router]);

  const fetchTimetable = useCallback(async () => {
    if (!selectedBatchId) return;

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const today = new Date();
      const dayIndex = today.getDay();
      const mondayOffset = dayIndex === 0 ? -6 : 1 - dayIndex;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + mondayOffset);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const todayStr = today.toISOString().split("T")[0];
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      const [timetableRes, todayRes, upcomingRes] = await Promise.all([
        timetableAPI.getBatchTimetable(selectedBatchId),
        timetableAPI.getSessions({
          batch: selectedBatchId,
          date_from: todayStr,
          date_to: todayStr,
        }),
        timetableAPI.getSessions({
          batch: selectedBatchId,
          date_from: weekStartStr,
          date_to: weekEndStr,
        }),
      ]);

      const normalizedToday = todayRes;
      const normalizedUpcoming = upcomingRes;

      const slots: TimeSlot[] = (timetableRes.weekly_schedule || []).flatMap(
        (day) =>
          day.slots.map(
            (slot) =>
              ({
                id: slot.id,
                batch: selectedBatchId,
                batch_detail: {
                  id: selectedBatchId,
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
                  name: slot.module,
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
                room_number: slot.room || "",
                default_meeting_link: slot.meeting_link || "",
                is_active: true,
                created_at: "",
                updated_at: "",
              }) as TimeSlot,
          ),
      );

      setTimeSlots(slots);
      setTodaySessions(normalizedToday);
      setUpcomingSessions(normalizedUpcoming);

      if (
        slots.length === 0 &&
        normalizedToday.length === 0 &&
        normalizedUpcoming.length === 0
      ) {
        setNotice("Timetable will be done soon.");
      } else if (
        normalizedToday.length === 0 &&
        normalizedUpcoming.length > 0 &&
        viewMode === "today"
      ) {
        setNotice("No classes today. Switched to This Week view.");
        setViewMode("week");
      } else {
        setNotice(null);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch timetable";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedBatchId, viewMode]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const handleStatusChange = async (
    session: ClassSession,
    newStatus: string,
  ) => {
    try {
      await timetableAPI.updateSession(session.id, {
        status: newStatus as SessionStatus,
      });

      setTodaySessions((prev) =>
        prev.map((s) =>
          s.id === session.id
            ? { ...s, status: newStatus as SessionStatus }
            : s,
        ),
      );
      setUpcomingSessions((prev) =>
        prev.map((s) =>
          s.id === session.id
            ? { ...s, status: newStatus as SessionStatus }
            : s,
        ),
      );
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

  const handleUpdateSession = (updated: ClassSession) => {
    setTodaySessions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    );
    setUpcomingSessions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    );
    setSelectedSession(updated);
  };

  const handleDeleteSession = async (session: ClassSession) => {
    try {
      await timetableAPI.deleteSession(session.id);

      // Remove from both lists
      setTodaySessions((prev) => prev.filter((s) => s.id !== session.id));
      setUpcomingSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete session";
      alert(errorMessage);
    }
  };

  const handleGenerateSessions = async (data: {
    start_date: string;
    end_date: string;
    time_slot_ids: number[];
  }) => {
    await Promise.all(
      data.time_slot_ids.map((slotId) =>
        timetableAPI.createBulkSessions({
          time_slot: slotId,
          start_date: data.start_date,
          end_date: data.end_date,
        }),
      ),
    );

    await fetchTimetable();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Batch Timetable
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View schedule and add or edit meeting links for your batches
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <BatchSelect
              value={selectedBatchId}
              onChange={(id) => setSelectedBatchId(id)}
              modeFilter={"LIVE"}
            />

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

        {selectedBatch && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Selected Batch</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {selectedBatch.batch_code} • {selectedBatch.course_name}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsGenerateOpen(true)}
            disabled={timeSlots.length === 0}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Sessions
          </button>
          <p className="text-sm text-gray-500">
            Create scheduled sessions for the selected batch based on time
            slots.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {notice && !error && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            {notice}
          </div>
        )}

        {viewMode === "today" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Today&apos;s Classes
            </h2>
            <ClassSessionList
              sessions={todaySessions}
              loading={loading}
              onStatusChange={handleStatusChange}
              onViewDetails={handleViewDetails}
              showBatchInfo={false}
              onDelete={handleDeleteSession}
              showDeleteButton={true}
            />
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
              onStatusChange={handleStatusChange}
              onViewDetails={handleViewDetails}
              showBatchInfo={false}
              onDelete={handleDeleteSession}
              showDeleteButton={true}
            />
          </div>
        )}

        {viewMode === "schedule" && (
          <WeeklyScheduleView
            timeSlots={timeSlots}
            loading={loading}
            viewMode="batch"
            title="Weekly Class Schedule"
          />
        )}
      </div>

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

      <GenerateSessionsModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        onGenerate={handleGenerateSessions}
        selectedSlots={timeSlots}
      />
    </DashboardLayout>
  );
}
