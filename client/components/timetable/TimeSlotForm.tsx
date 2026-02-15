"use client";

import { useState, useEffect } from "react";
import { TimeSlot, timetableAPI } from "@/lib/timetableAPI";
import { apiClient } from "@/lib/api";

interface TimeSlotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<TimeSlot>) => Promise<void>;
  editingSlot: TimeSlot | null;
  batches: Array<{
    id: number;
    code: string;
    course_name?: string;
    course_id?: number;
  }>;
  modules: Array<{ id: number; name: string; code: string }>;
  faculties: Array<{ id: number; full_name: string; employee_code: string }>;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

export default function TimeSlotForm({
  isOpen,
  onClose,
  onSave,
  editingSlot,
  batches,
  modules,
  faculties,
}: TimeSlotFormProps) {
  const [formData, setFormData] = useState({
    batch: "",
    module: "",
    faculty: "",
    day_of_week: "1",
    start_time: "09:00",
    end_time: "10:00",
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [conflictSuccess, setConflictSuccess] = useState<string | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [filteredModules, setFilteredModules] = useState<
    Array<{ id: number; name: string; code: string }>
  >([]);
  const [loadingModules, setLoadingModules] = useState(false);

  const [filteredFaculties, setFilteredFaculties] = useState<
    Array<{ id: number; full_name: string; employee_code: string }>
  >([]);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [moduleToFacultyIds, setModuleToFacultyIds] = useState<
    Record<number, number[]>
  >({});

  const getBaseModulesForCourse = async (courseId?: number) => {
    if (!courseId) return modules;

    const response = await apiClient.getCourseSubjects(courseId, {
      is_active: true,
    });

    if (response.subjects && Array.isArray(response.subjects)) {
      return response.subjects.map((cm) => ({
        id: cm.module,
        name: cm.module_name,
        code: cm.module_code,
      }));
    }

    return [] as Array<{ id: number; name: string; code: string }>;
  };

  const loadBatchEligibleOptions = async (
    batchId: number,
    courseId?: number,
    keepCurrentSelection: boolean = false,
  ) => {
    setLoadingModules(true);
    setLoadingFaculties(true);
    setModuleToFacultyIds({});

    try {
      const [baseModules, batchAssignments] = await Promise.all([
        getBaseModulesForCourse(courseId),
        apiClient.getFacultyBatchAssignments({
          batch_id: batchId,
          is_active: true,
        }),
      ]);

      // Faculties assigned to this batch
      const facultyById = new Map<
        number,
        { id: number; full_name: string; employee_code: string }
      >();
      for (const assignment of batchAssignments || []) {
        const f = assignment.faculty;
        facultyById.set(f.id, {
          id: f.id,
          full_name: f.user?.full_name || "",
          employee_code: f.employee_code,
        });
      }
      const batchFacultyList = Array.from(facultyById.values());
      setFilteredFaculties(batchFacultyList);

      // If no faculty assigned to batch, there can be no eligible modules
      if (batchFacultyList.length === 0) {
        setFilteredModules(keepCurrentSelection ? baseModules : []);
        setModuleToFacultyIds({});
        return;
      }

      // Build module -> faculty mapping based on FacultyModuleAssignment intersected with batch faculty
      const batchFacultyIds = batchFacultyList.map((f) => f.id);

      const perFacultyAssignments = await Promise.all(
        batchFacultyIds.map((facultyId) =>
          apiClient
            .getFacultySubjectAssignments({
              faculty_id: facultyId,
              is_active: true,
            })
            .catch(() => []),
        ),
      );

      const moduleFacultyMap: Record<number, number[]> = {};
      for (let i = 0; i < batchFacultyIds.length; i++) {
        const facultyId = batchFacultyIds[i];
        const assignments = perFacultyAssignments[i] || [];

        for (const a of assignments) {
          // Assignment may contain either `module` (new) or `subject` (legacy).
          // Support both shapes and also raw id fields.
          const rawModule =
            (a as any).module ??
            (a as any).subject ??
            (a as any).module_id ??
            (a as any).subject_id;

          let moduleId: number | null = null;
          if (rawModule && typeof rawModule === "object") {
            moduleId = rawModule.id ?? null;
          } else if (rawModule) {
            moduleId = Number(rawModule);
          }

          if (!moduleId) continue;
          if (!moduleFacultyMap[moduleId]) moduleFacultyMap[moduleId] = [];
          if (!moduleFacultyMap[moduleId].includes(facultyId)) {
            moduleFacultyMap[moduleId].push(facultyId);
          }
        }
      }

      setModuleToFacultyIds(moduleFacultyMap);

      // Eligible modules: modules in course that have at least one eligible faculty for this batch
      const eligibleModules = baseModules.filter(
        (m) => (moduleFacultyMap[m.id] || []).length > 0,
      );

      // Ensure current editing selection stays visible even if assignments changed
      if (keepCurrentSelection && editingSlot) {
        const currentModuleId = editingSlot.module;
        const currentModule = baseModules.find((m) => m.id === currentModuleId);
        if (
          currentModule &&
          !eligibleModules.some((m) => m.id === currentModuleId)
        ) {
          eligibleModules.unshift(currentModule);
        }

        const currentFacultyId = editingSlot.faculty;
        if (
          currentFacultyId &&
          !batchFacultyList.some((f) => f.id === currentFacultyId)
        ) {
          const fallback = faculties.find((f) => f.id === currentFacultyId);
          if (fallback) {
            setFilteredFaculties([fallback, ...batchFacultyList]);
          }
        }
      }

      setFilteredModules(eligibleModules);
    } catch (err) {
      console.error("Failed to load batch eligible options:", err);
      // Conservative fallback: keep existing global lists
      setFilteredModules(modules);
      setFilteredFaculties(faculties);
      setModuleToFacultyIds({});
    } finally {
      setLoadingModules(false);
      setLoadingFaculties(false);
    }
  };

  // Handle batch selection change
  const handleBatchChange = (batchId: string) => {
    // Reset dependent fields when batch changes
    setFormData({
      ...formData,
      batch: batchId,
      module: "",
      faculty: "",
    });

    if (batchId) {
      const selectedBatch = batches.find((b) => b.id === parseInt(batchId));

      loadBatchEligibleOptions(
        parseInt(batchId),
        selectedBatch?.course_id,
        false,
      );
    } else {
      setFilteredModules([]);
      setFilteredFaculties([]);
      setModuleToFacultyIds({});
    }
  };

  const handleModuleChange = (moduleId: string) => {
    // Reset faculty when module changes, since eligible faculty set may change
    setFormData({ ...formData, module: moduleId, faculty: "" });
    setConflictWarning(null);
    setConflictSuccess(null);
  };

  useEffect(() => {
    if (editingSlot) {
      setFormData({
        batch: String(editingSlot.batch),
        module: String(editingSlot.module),
        faculty: String(editingSlot.faculty),
        day_of_week: String(editingSlot.day_of_week),
        start_time: editingSlot.start_time.slice(0, 5),
        end_time: editingSlot.end_time.slice(0, 5),
        is_active: editingSlot.is_active,
      });
      const selectedBatch = batches.find((b) => b.id === editingSlot.batch);

      loadBatchEligibleOptions(
        editingSlot.batch,
        selectedBatch?.course_id,
        true,
      );
    } else {
      setFormData({
        batch: "",
        module: "",
        faculty: "",
        day_of_week: "1",
        start_time: "09:00",
        end_time: "10:00",
        is_active: true,
      });
      setFilteredModules([]);
      setFilteredFaculties([]);
      setModuleToFacultyIds({});
    }
    setError(null);
    setConflictWarning(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSlot, isOpen, batches]);

  const checkForConflicts = async () => {
    if (
      !formData.batch ||
      !formData.module ||
      !formData.day_of_week ||
      !formData.start_time ||
      !formData.end_time ||
      !formData.faculty
    ) {
      setConflictWarning(null);
      setConflictSuccess(null);
      return;
    }

    if (formData.start_time >= formData.end_time) {
      setConflictWarning(null);
      setConflictSuccess(null);
      return;
    }

    setCheckingConflict(true);
    try {
      const requestData = {
        faculty: parseInt(formData.faculty),
        batch: parseInt(formData.batch),
        day_of_week: parseInt(formData.day_of_week),
        start_time: formData.start_time,
        end_time: formData.end_time,
        exclude_time_slot: editingSlot?.id,
      };

      console.log("Checking conflicts with data:", requestData);

      // Use the dedicated conflict checking API
      const conflictCheck = await timetableAPI.checkConflict(requestData);

      console.log("Conflict check response:", conflictCheck);

      if (conflictCheck.has_conflict && conflictCheck.conflicts.length > 0) {
        const warnings = conflictCheck.conflicts.map(
          (c) => `${c.batch} - ${c.module} (${c.time})`,
        );
        setConflictWarning(warnings.join(" • "));
        setConflictSuccess(null);
      } else {
        setConflictWarning(null);
        setConflictSuccess("No time conflict detected.");
      }
    } catch (err) {
      console.error("Conflict check error:", err);
      setConflictWarning(null);
      setConflictSuccess(null);
    } finally {
      setCheckingConflict(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkForConflicts();
    }, 500);
    return () => clearTimeout(timer);
  }, [
    formData.faculty,
    formData.day_of_week,
    formData.start_time,
    formData.end_time,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkForConflicts();
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.batch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.batch || !formData.module || !formData.faculty) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.start_time >= formData.end_time) {
      setError("End time must be after start time");
      return;
    }

    if (checkingConflict) {
      setError("Please wait until conflict check finishes");
      return;
    }

    if (conflictWarning) {
      setError(conflictWarning);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: Partial<TimeSlot> = {
        batch: parseInt(formData.batch),
        module: parseInt(formData.module),
        faculty: parseInt(formData.faculty),
        day_of_week: parseInt(formData.day_of_week),
        start_time: formData.start_time + ":00",
        end_time: formData.end_time + ":00",
        is_active: formData.is_active,
      };

      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      const errObj = err as {
        message?: string;
        response?: { data?: { detail?: string } };
      };

      setError(
        errObj?.response?.data?.detail ||
          errObj?.message ||
          "Failed to save time slot",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingSlot ? "Edit Time Slot" : "Create Time Slot"}
          </h2>
          <button
            onClick={onClose}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {conflictWarning && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <svg
                className="w-5 h-5 mr-2 mt-0.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{conflictWarning}</span>
            </div>
          )}

          {conflictSuccess && !conflictWarning && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start">
              <svg
                className="w-5 h-5 mr-2 mt-0.5 shrink-0"
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
              <span>{conflictSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.batch}
                onChange={(e) => handleBatchChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="" className="text-gray-500">
                  Select Batch
                </option>
                {batches.map((batch) => (
                  <option
                    key={batch.id}
                    value={batch.id}
                    className="text-gray-900"
                  >
                    {batch.code}{" "}
                    {batch.course_name ? `- ${batch.course_name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.module}
                onChange={(e) => handleModuleChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={!formData.batch || loadingModules}
              >
                <option value="" className="text-gray-500">
                  {loadingModules
                    ? "Loading modules..."
                    : !formData.batch
                      ? "Select a batch first"
                      : "Select Module"}
                </option>
                {filteredModules.map((module) => (
                  <option
                    key={module.id}
                    value={module.id}
                    className="text-gray-900"
                  >
                    {module.code} - {module.name}
                  </option>
                ))}
              </select>
              {formData.batch &&
                filteredModules.length === 0 &&
                !loadingModules && (
                  <p className="mt-1 text-xs text-amber-600">
                    No eligible modules found for this batch.
                  </p>
                )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Faculty <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.faculty}
                onChange={(e) =>
                  setFormData({ ...formData, faculty: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={!formData.batch || loadingFaculties}
              >
                <option value="" className="text-gray-500">
                  {loadingFaculties
                    ? "Loading faculty..."
                    : !formData.batch
                      ? "Select a batch first"
                      : formData.module
                        ? "Select Faculty for module"
                        : "Select Faculty"}
                </option>
                {(formData.module
                  ? filteredFaculties.filter((f) => {
                      const moduleId = parseInt(formData.module);
                      const allowed = moduleToFacultyIds[moduleId] || [];
                      return allowed.includes(f.id);
                    })
                  : filteredFaculties
                ).map((faculty) => (
                  <option
                    key={faculty.id}
                    value={faculty.id}
                    className="text-gray-900"
                  >
                    {faculty.employee_code} - {faculty.full_name}
                  </option>
                ))}
              </select>
              {checkingConflict && (
                <p className="text-xs text-gray-500 mt-1">
                  Checking for conflicts...
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Day of Week <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.day_of_week}
                onChange={(e) =>
                  setFormData({ ...formData, day_of_week: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option
                    key={day.value}
                    value={day.value}
                    className="text-gray-900"
                  >
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) =>
                  setFormData({ ...formData, end_time: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!conflictWarning}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : editingSlot ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
