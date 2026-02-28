"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  TimeSlotTable,
  TimeSlotForm,
  WeeklyScheduleView,
} from "@/components/timetable";
import {
  TimeSlot,
  TimeSlotCreate,
  TimeSlotUpdate,
  timetableAPI,
} from "@/lib/timetableAPI";
import { apiClient } from "@/lib/api";

interface Batch {
  id: number;
  code: string;
  name?: string;
  course_name?: string;
  course_id?: number;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Faculty {
  id: number;
  full_name: string;
  employee_code: string;
}

export default function TimetableManagementPage() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);

  // Reference data
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");

  // Filters
  const [filterBatch, setFilterBatch] = useState<string>("");

  const fetchTimeSlots = useCallback(async () => {
    // Require a batch selection before fetching
    if (!filterBatch) {
      setTimeSlots([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params: { batch?: number } = {};
      if (filterBatch) {
        params.batch = parseInt(filterBatch);
      }
      const response = await timetableAPI.getTimeSlots(params);
      setTimeSlots(response);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch time slots";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filterBatch]);

  const fetchReferenceData = async () => {
    try {
      const [batchRes, subjectRes, facultyRes] = await Promise.all([
        apiClient.getBatches(),
        apiClient.getAcademicModules(),
        apiClient.getFacultyProfiles(),
      ]);

      setBatches(
        batchRes.map((b) => ({
          id: b.id,
          code: b.code,
          name: b.course_name,
          course_name: b.course_name,
          course_id: b.template_detail?.course,
        })),
      );
      setSubjects(
        subjectRes.map((s) => ({ id: s.id, name: s.name, code: s.code })),
      );
      setFaculties(
        facultyRes.map((f) => ({
          id: f.id,
          full_name: f.user?.full_name || "",
          employee_code: f.employee_code,
        })),
      );
    } catch (err) {
      console.error("Failed to fetch reference data:", err);
    }
  };

  useEffect(() => {
    fetchTimeSlots();
  }, [fetchTimeSlots]);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const handleCreate = () => {
    setEditingSlot(null);
    setIsFormOpen(true);
  };

  const handleEdit = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setIsFormOpen(true);
  };

  const handleDelete = async (slot: TimeSlot) => {
    if (
      !confirm(
        `Are you sure you want to delete this time slot for ${slot.module_detail?.name}?`,
      )
    ) {
      return;
    }

    try {
      await timetableAPI.deleteTimeSlot(slot.id);
      fetchTimeSlots();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete time slot";
      alert(errorMessage);
    }
  };

  const handleSave = async (data: TimeSlotCreate | TimeSlotUpdate) => {
    if (editingSlot) {
      await timetableAPI.updateTimeSlot(editingSlot.id, data as TimeSlotUpdate);
    } else {
      await timetableAPI.createTimeSlot(data as TimeSlotCreate);
    }
    fetchTimeSlots();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Timetable Management
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage weekly class schedules
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setViewMode("table")}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === "table"
                    ? "bg-primary text-white"
                    : "bg-card text-foreground/80 hover:bg-secondary/50"
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === "calendar"
                    ? "bg-primary text-white"
                    : "bg-card text-foreground/80 hover:bg-secondary/50"
                }`}
              >
                Calendar
              </button>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
            >
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
              Add Time Slot
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Filter by Batch
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
                    {batch.code}{" "}
                    {batch.course_name ? `- ${batch.course_name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg shadow p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Total Time Slots
            </div>
            <div className="mt-1 text-2xl font-semibold text-foreground">
              {timeSlots.length}
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Active Slots
            </div>
            <div className="mt-1 text-2xl font-semibold text-green-600">
              {timeSlots.filter((s) => s.is_active).length}
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Batches Covered
            </div>
            <div className="mt-1 text-2xl font-semibold text-primary">
              {new Set(timeSlots.map((s) => s.batch)).size}
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Faculty Assigned
            </div>
            <div className="mt-1 text-2xl font-semibold text-purple-600">
              {new Set(timeSlots.map((s) => s.faculty)).size}
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === "table" ? (
          <TimeSlotTable
            timeSlots={timeSlots}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <WeeklyScheduleView
            timeSlots={timeSlots}
            loading={loading}
            onSlotClick={handleEdit}
            viewMode="batch"
            title="Weekly Schedule Overview"
          />
        )}
      </div>

      {/* Modals */}
      <TimeSlotForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        editingSlot={editingSlot}
        batches={batches}
        modules={subjects}
        faculties={faculties}
      />

    </DashboardLayout>
  );
}
