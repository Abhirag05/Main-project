"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { timetableAPI, BatchTimetable } from "@/lib/timetableAPI";
import { apiClient } from "@/lib/api";

interface BatchInfo {
  id: number;
  code: string;
  course_name: string;
  start_date: string;
  end_date: string;
  status: string;
  meeting_link: string;
}

export default function AddLinkPage() {
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded batch card (shows timetable)
  const [expandedBatchId, setExpandedBatchId] = useState<number | null>(null);
  const [timetable, setTimetable] = useState<BatchTimetable | null>(null);
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  // Meeting link editing
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Fetch all active batches on mount
  useEffect(() => {
    const fetchBatches = async () => {
      setLoading(true);
      try {
        const batchRes = await apiClient.getBatches({ status: "ACTIVE" });
        setBatches(
          batchRes.map((b) => ({
            id: b.id,
            code: b.code,
            course_name: b.course_name,
            start_date: b.start_date,
            end_date: b.end_date,
            status: b.status,
            meeting_link: b.meeting_link || "",
          }))
        );
      } catch (err) {
        console.error("Failed to fetch batches:", err);
        setError("Failed to load batches");
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  // Load timetable when a batch card is expanded
  const handleToggleBatch = useCallback(
    async (batchId: number) => {
      if (expandedBatchId === batchId) {
        setExpandedBatchId(null);
        setTimetable(null);
        return;
      }

      setExpandedBatchId(batchId);
      setLoadingTimetable(true);
      setTimetable(null);

      try {
        const data = await timetableAPI.getBatchTimetable(batchId);
        setTimetable(data);
      } catch (err) {
        console.error("Failed to load timetable:", err);
      } finally {
        setLoadingTimetable(false);
      }
    },
    [expandedBatchId]
  );

  // Start editing meeting link
  const handleEditLink = (batch: BatchInfo) => {
    setEditingBatchId(batch.id);
    setLinkInput(batch.meeting_link);
  };

  // Save meeting link
  const handleSaveLink = async (batchId: number) => {
    setSaving(true);
    try {
      await apiClient.setMeetingLink(batchId, linkInput.trim());
      setBatches((prev) =>
        prev.map((b) =>
          b.id === batchId ? { ...b, meeting_link: linkInput.trim() } : b
        )
      );
      setEditingBatchId(null);
      setToast({ message: "Meeting link saved successfully!", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error("Failed to save meeting link:", err);
      setToast({ message: "Failed to save meeting link", type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Remove meeting link
  const handleRemoveLink = async (batchId: number) => {
    setSaving(true);
    try {
      await apiClient.setMeetingLink(batchId, "");
      setBatches((prev) =>
        prev.map((b) =>
          b.id === batchId ? { ...b, meeting_link: "" } : b
        )
      );
      setEditingBatchId(null);
      setToast({ message: "Meeting link removed", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error("Failed to remove meeting link:", err);
      setToast({ message: "Failed to remove meeting link", type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Calculate duration in months
  const getDuration = (start: string, end: string) => {
    if (!start || !end) return "N/A";
    const s = new Date(start);
    const e = new Date(end);
    const months =
      (e.getFullYear() - s.getFullYear()) * 12 +
      (e.getMonth() - s.getMonth());
    return months <= 1 ? "1 month" : `${months} months`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Link</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set a common meeting link for each batch. The link will be visible to
            faculty and students on their timetable.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card rounded-lg shadow p-6 animate-pulse"
              >
                <div className="h-5 bg-muted rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {/* No batches */}
        {!loading && batches.length === 0 && !error && (
          <div className="bg-card rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-3 text-lg font-medium text-foreground">
              No active batches
            </h3>
            <p className="mt-1 text-muted-foreground">
              Active batches will appear here for link assignment.
            </p>
          </div>
        )}

        {/* Batch Cards */}
        {!loading &&
          batches.map((batch) => (
            <div
              key={batch.id}
              className="bg-card rounded-lg shadow overflow-hidden"
            >
              {/* Card Header */}
              <div
                className="p-5 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => handleToggleBatch(batch.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Batch icon */}
                    <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {batch.code}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {batch.course_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    {/* Duration info */}
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-sm font-medium text-foreground">
                        {getDuration(batch.start_date, batch.end_date)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(batch.start_date)} –{" "}
                        {formatDate(batch.end_date)}
                      </p>
                    </div>

                    {/* Link status badge */}
                    {batch.meeting_link ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Link Set
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        No Link
                      </span>
                    )}

                    {/* Expand icon */}
                    <svg
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        expandedBatchId === batch.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedBatchId === batch.id && (
                <div className="border-t border-border">
                  {/* Meeting Link Section */}
                  <div className="px-5 py-4 bg-secondary/20">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-foreground">
                        Common Meeting Link
                      </label>
                    </div>

                    {editingBatchId === batch.id ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="url"
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          placeholder="https://meet.google.com/xxx or https://zoom.us/j/xxx"
                          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveLink(batch.id)}
                          disabled={saving}
                          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingBatchId(null)}
                          disabled={saving}
                          className="px-4 py-2 bg-card border border-border text-foreground text-sm font-medium rounded-lg hover:bg-secondary/50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {batch.meeting_link ? (
                          <>
                            <a
                              href={batch.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm truncate max-w-sm"
                            >
                              {batch.meeting_link}
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditLink(batch);
                              }}
                              className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-lg hover:bg-primary/20"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveLink(batch.id);
                              }}
                              disabled={saving}
                              className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditLink(batch);
                            }}
                            className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90"
                          >
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                              />
                            </svg>
                            Add Meeting Link
                          </button>
                        )}
                      </div>
                    )}

                    <p className="mt-2 text-xs text-muted-foreground">
                      This link will be shared with all faculty and students in
                      this batch for joining classes.
                    </p>
                  </div>

                  {/* Timetable Section */}
                  <div className="px-5 py-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3">
                      Weekly Timetable
                    </h4>

                    {loadingTimetable && (
                      <div className="animate-pulse space-y-2">
                        <div className="h-8 bg-muted rounded w-full"></div>
                        <div className="h-8 bg-muted rounded w-full"></div>
                        <div className="h-8 bg-muted rounded w-full"></div>
                      </div>
                    )}

                    {!loadingTimetable && timetable && (
                      <>
                        {timetable.weekly_schedule.filter(
                          (d) => d.slots.length > 0
                        ).length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            No timetable configured for this batch yet. Create
                            time slots on the Timetable page first.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border text-sm">
                              <thead className="bg-secondary/50">
                                <tr>
                                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                                    Day
                                  </th>
                                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                                    Time
                                  </th>
                                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                                    Subject
                                  </th>
                                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                                    Faculty
                                  </th>
                                  
                                </tr>
                              </thead>
                              <tbody className="bg-card divide-y divide-border">
                                {timetable.weekly_schedule
                                  .filter((d) => d.slots.length > 0)
                                  .map((daySchedule) =>
                                    daySchedule.slots.map((slot, idx) => (
                                      <tr
                                        key={`${daySchedule.day}-${slot.id}`}
                                        className="hover:bg-secondary/30"
                                      >
                                        {idx === 0 && (
                                          <td
                                            className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap"
                                            rowSpan={daySchedule.slots.length}
                                          >
                                            {daySchedule.day_name}
                                          </td>
                                        )}
                                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                                          {slot.start_time} – {slot.end_time}
                                        </td>
                                        <td className="px-4 py-2.5 text-foreground">
                                          {slot.subject}
                                          <span className="ml-1 text-xs text-muted-foreground">
                                            ({slot.module_code})
                                          </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                          {slot.faculty}
                                        </td>
                                        
                                      </tr>
                                    ))
                                  )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}

                    {!loadingTimetable && !timetable && (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        Failed to load timetable.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </DashboardLayout>
  );
}
