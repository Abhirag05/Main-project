"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { FacultyBatchAssignment } from "@/lib/api";
import { timetableAPI, BatchTimetable } from "@/lib/timetableAPI";
import FacultyCard from "@/components/faculty/ui/FacultyCard";

interface FacultyBatchTimetableProps {
  batchAssignments: FacultyBatchAssignment[];
  onError: (message: string) => void;
}

export default function FacultyBatchTimetable({
  batchAssignments,
  onError,
}: FacultyBatchTimetableProps) {
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [timetable, setTimetable] = useState<BatchTimetable | null>(null);
  const [loading, setLoading] = useState(false);

  const facultyCode = useMemo(() => {
    return batchAssignments[0]?.faculty?.employee_code || "";
  }, [batchAssignments]);

  // Auto-select first batch if available
  useEffect(() => {
    if (
      batchAssignments.length > 0 &&
      selectedBatchId === null &&
      batchAssignments[0].batch.status === "ACTIVE"
    ) {
      setSelectedBatchId(batchAssignments[0].batch.id);
    }
  }, [batchAssignments, selectedBatchId]);

  // Load timetable when batch is selected
  const loadTimetable = useCallback(
    async (batchId: number) => {
      setLoading(true);
      try {
        const data = await timetableAPI.getBatchTimetable(batchId);
        setTimetable(data);
      } catch (err) {
        const error = err as Error;
        onError(error.message || "Failed to load timetable");
        setTimetable(null);
      } finally {
        setLoading(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    if (selectedBatchId) {
      loadTimetable(selectedBatchId);
    }
  }, [selectedBatchId, loadTimetable]);

  const handleBatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const batchId = parseInt(e.target.value);
    setSelectedBatchId(batchId || null);
  };

  const activeBatches = useMemo(
    () => batchAssignments.filter((a) => a.batch.status === "ACTIVE"),
    [batchAssignments],
  );

  return (
    <FacultyCard className="p-6 mb-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        Batch Timetable
      </h2>

      {activeBatches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-lg">No active batches available</p>
          <p className="text-muted-foreground/70 text-sm mt-2">
            Timetable will be shown for active batches only
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Select Batch
            </label>
            <select
              value={selectedBatchId || ""}
              onChange={handleBatchChange}
              className="w-full md:w-96 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground bg-card"
            >
              <option value="" className="text-muted-foreground">
                -- Select a batch --
              </option>
              {activeBatches.map((assignment) => (
                <option
                  key={assignment.id}
                  value={assignment.batch.id}
                  className="text-foreground"
                >
                  {assignment.batch.code} - {assignment.batch.course_name}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading timetable...</p>
            </div>
          )}

          {!loading && timetable && (
            <div className="overflow-x-auto">
              {timetable.weekly_schedule.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-lg">
                    No timetable configured for this batch
                  </p>
                  <p className="text-muted-foreground/70 text-sm mt-2">
                    The timetable will appear once it is created by the admin
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Day
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Start Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        End Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Module
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Room / Link
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {timetable.weekly_schedule
                      .map((daySchedule) => ({
                        ...daySchedule,
                        slots: facultyCode
                          ? daySchedule.slots.filter(
                              (slot) => slot.faculty_code === facultyCode,
                            )
                          : daySchedule.slots,
                      }))
                      .filter((daySchedule) => daySchedule.slots.length > 0)
                      .map((daySchedule) =>
                        daySchedule.slots.map((slot, index) => (
                          <tr key={slot.id} className="hover:bg-secondary/50">
                            {index === 0 && (
                              <td
                                className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground"
                                rowSpan={daySchedule.slots.length}
                              >
                                {daySchedule.day_name}
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {slot.start_time}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {slot.end_time}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                              <div>{slot.subject}</div>
                              <div className="text-xs text-muted-foreground">
                                {slot.module_code}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {slot.room && (
                                <div className="mb-1">Room: {slot.room}</div>
                              )}
                              {slot.meeting_link && (
                                <a
                                  href={slot.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline text-xs"
                                >
                                  Join Meeting
                                </a>
                              )}
                              {!slot.room && !slot.meeting_link && (
                                <span className="text-muted-foreground/70">N/A</span>
                              )}
                            </td>
                          </tr>
                        )),
                      )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {!loading && !timetable && selectedBatchId && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-lg">Failed to load timetable</p>
            </div>
          )}
        </>
      )}
    </FacultyCard>
  );
}
