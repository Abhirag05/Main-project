"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  ClassSessionList,
  SessionDetailModal,
  GenerateSessionsModal,
} from "@/components/timetable";
import {
  ClassSession,
  TimeSlot,
  timetableAPI,
} from "@/lib/timetableAPI";
import { apiClient } from "@/lib/api";

interface Batch {
  id: number;
  code: string;
  name?: string;
  course_name?: string;
}

export default function SessionsManagementPage() {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Batch filter
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filterBatch, setFilterBatch] = useState<string>("");

  // Date filters
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Status filter
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Detail modal
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(
    null
  );

  // Generate sessions modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch batches on mount
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const batchRes = await apiClient.getBatches();
        setBatches(
          batchRes.map((b) => ({
            id: b.id,
            code: b.code,
            name: b.course_name,
            course_name: b.course_name,
          }))
        );
      } catch (err) {
        console.error("Failed to fetch batches:", err);
      }
    };
    fetchBatches();
  }, []);

  // Fetch sessions when filters change
  const fetchSessions = useCallback(async () => {
    if (!filterBatch) {
      setSessions([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params: {
        batch?: number;
        date_from?: string;
        date_to?: string;
        status?: import("@/lib/timetableAPI").SessionStatus;
      } = {};

      if (filterBatch) params.batch = parseInt(filterBatch);
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (filterStatus) params.status = filterStatus as import("@/lib/timetableAPI").SessionStatus;

      const response = await timetableAPI.getSessions(params);
      setSessions(Array.isArray(response) ? response : []);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch sessions";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filterBatch, dateFrom, dateTo, filterStatus]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Fetch time slots for the selected batch (for generate modal)
  const handleOpenGenerate = async () => {
    if (!filterBatch) {
      setError("Please select a batch first");
      return;
    }

    setLoadingSlots(true);
    try {
      const slots = await timetableAPI.getTimeSlots({
        batch: parseInt(filterBatch),
        is_active: true,
      });
      setTimeSlots(slots);

      if (slots.length === 0) {
        setError(
          "No active time slots found for this batch. Create time slots in the Timetable page first."
        );
        return;
      }

      setShowGenerateModal(true);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch time slots";
      setError(errorMessage);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Generate sessions from time slots
  const handleGenerateSessions = async (data: {
    start_date: string;
    end_date: string;
    time_slot_ids: number[];
  }) => {
    // Use bulk create for each time slot
    const results = await Promise.all(
      data.time_slot_ids.map((slotId) =>
        timetableAPI.createBulkSessions({
          time_slot: slotId,
          start_date: data.start_date,
          end_date: data.end_date,
        })
      )
    );

    const totalCreated = results.reduce(
      (sum, r) => sum + (r.sessions?.length || 0),
      0
    );
    alert(`Successfully generated ${totalCreated} sessions!`);
    fetchSessions();
  };

  // Update session status
  const handleStatusChange = async (
    session: ClassSession,
    newStatus: string
  ) => {
    try {
      await timetableAPI.updateSession(session.id, {
        status: newStatus as any,
      });
      fetchSessions();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update session";
      alert(errorMessage);
    }
  };

  // Delete session
  const handleDeleteSession = async (session: ClassSession) => {
    try {
      await timetableAPI.deleteSession(session.id);
      fetchSessions();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete session";
      alert(errorMessage);
    }
  };

  // View session details
  const handleViewDetails = (session: ClassSession) => {
    setSelectedSession(session);
  };

  // Update session from detail modal
  const handleSessionUpdate = (updatedSession: ClassSession) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
    setSelectedSession(updatedSession);
  };

  // Summary stats
  const scheduledCount = sessions.filter(
    (s) => s.status === "SCHEDULED"
  ).length;
  const completedCount = sessions.filter(
    (s) => s.status === "COMPLETED"
  ).length;
  const cancelledCount = sessions.filter(
    (s) => s.status === "CANCELLED"
  ).length;
  const inProgressCount = sessions.filter(
    (s) => s.status === "IN_PROGRESS"
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Session Management
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate and manage class sessions from your timetable
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={handleOpenGenerate}
              disabled={!filterBatch || loadingSlots}
              className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingSlots ? (
                <svg
                  className="animate-spin w-5 h-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth={4}
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              )}
              Generate Sessions
            </button>
          </div>
        </div>

        {/* Info banner */}
        {!filterBatch && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-primary/70 mr-3 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-primary">
                <p className="font-medium">How it works</p>
                <ol className="mt-1 list-decimal list-inside space-y-1">
                  <li>
                    First, create time slots on the{" "}
                    <span className="font-semibold">Timetable</span> page
                    (recurring weekly schedule).
                  </li>
                  <li>
                    Select a batch below and click{" "}
                    <span className="font-semibold">Generate Sessions</span> to
                    create actual class sessions from those time slots.
                  </li>
                  <li>
                    Manage individual sessions — update status, cancel, or
                    delete.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Batch <span className="text-red-500">*</span>
              </label>
              <select
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="" disabled>
                  Select Batch
                </option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.code}
                    {batch.course_name ? ` - ${batch.course_name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="RESCHEDULED">Rescheduled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats */}
        {filterBatch && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-card rounded-lg shadow p-4">
              <div className="text-sm font-medium text-muted-foreground">Total</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">
                {sessions.length}
              </div>
            </div>
            <div className="bg-card rounded-lg shadow p-4">
              <div className="text-sm font-medium text-muted-foreground">Scheduled</div>
              <div className="mt-1 text-2xl font-semibold text-primary">
                {scheduledCount}
              </div>
            </div>
            <div className="bg-card rounded-lg shadow p-4">
              <div className="text-sm font-medium text-muted-foreground">
                In Progress
              </div>
              <div className="mt-1 text-2xl font-semibold text-green-600">
                {inProgressCount}
              </div>
            </div>
            <div className="bg-card rounded-lg shadow p-4">
              <div className="text-sm font-medium text-muted-foreground">Completed</div>
              <div className="mt-1 text-2xl font-semibold text-muted-foreground">
                {completedCount}
              </div>
            </div>
            <div className="bg-card rounded-lg shadow p-4">
              <div className="text-sm font-medium text-muted-foreground">Cancelled</div>
              <div className="mt-1 text-2xl font-semibold text-red-600">
                {cancelledCount}
              </div>
            </div>
          </div>
        )}

        {/* Session List */}
        {filterBatch && (
          <ClassSessionList
            sessions={sessions}
            loading={loading}
            onStatusChange={handleStatusChange}
            onViewDetails={handleViewDetails}
            showBatchInfo={true}
            showFacultyInfo={true}
            showStatusDropdown={true}
            showDeleteButton={true}
            onDelete={handleDeleteSession}
          />
        )}
      </div>

      {/* Generate Sessions Modal */}
      <GenerateSessionsModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerateSessions}
        selectedSlots={timeSlots}
      />

      {/* Session Detail Modal */}
      <SessionDetailModal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        session={selectedSession}
        onUpdate={handleSessionUpdate}
        canEdit={true}
      />
    </DashboardLayout>
  );
}
