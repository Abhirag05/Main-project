"use client";

import { useState, useEffect, useRef } from "react";
import {
  apiClient,
  FacultyProfile,
  Batch,
  AssignFacultyToBatchRequest,
  FacultySubjectAssignment,
} from "@/lib/api";

interface FacultyBatchAssignmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedFacultyId?: number | null;
  subjectAssignments?: FacultySubjectAssignment[];
}

export default function FacultyBatchAssignmentForm({
  isOpen,
  onClose,
  onSuccess,
  selectedFacultyId,
  subjectAssignments,
}: FacultyBatchAssignmentFormProps) {
  const [formData, setFormData] = useState<AssignFacultyToBatchRequest>({
    faculty_id: 0,
    batch_id: 0,
  });
  const [facultyList, setFacultyList] = useState<FacultyProfile[]>([]);
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [batchList, setBatchList] = useState<Batch[]>([]);
  const [facultySubjects, setFacultySubjects] = useState<
    FacultySubjectAssignment[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [filteringBatches, setFilteringBatches] = useState(false);
  const [error, setError] = useState("");
  const courseIdByCodeRef = useRef<Map<string, number>>(new Map());
  const courseModulesCacheRef = useRef<
    Map<number, { ids: Set<number>; names: Set<string> }>
  >(new Map());

  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedFacultyId) {
      setFormData((prevData) => ({
        ...prevData,
        faculty_id: selectedFacultyId,
      }));
    }
  }, [selectedFacultyId]);

  useEffect(() => {
    if (!isOpen) return;
    const facultyId = selectedFacultyId ?? formData.faculty_id;
    if (!facultyId) {
      setFacultySubjects([]);
      return;
    }

    if (selectedFacultyId && subjectAssignments) {
      setFacultySubjects(subjectAssignments);
      return;
    }

    const fetchSubjects = async () => {
      try {
        const data = await apiClient.getFacultySubjectAssignments({
          faculty_id: facultyId,
          is_active: true,
        });
        setFacultySubjects(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load faculty modules:", err);
        setFacultySubjects([]);
      }
    };

    fetchSubjects();
  }, [isOpen, selectedFacultyId, subjectAssignments, formData.faculty_id]);

  useEffect(() => {
    if (!isOpen) return;
    applyBatchFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    allBatches,
    facultySubjects,
    selectedFacultyId,
    formData.faculty_id,
  ]);

  const fetchDropdownData = async () => {
    setLoadingData(true);
    try {
      const [faculties, batches, courses] = await Promise.all([
        apiClient.getFacultyProfiles({ is_active: true }),
        apiClient.getBatches({ is_active: true }),
        apiClient.getCourses(),
      ]);

      setFacultyList(Array.isArray(faculties) ? faculties : []);
      const courseMap = new Map<string, number>();
      if (Array.isArray(courses)) {
        courses.forEach((course) => {
          courseMap.set(course.code, course.id);
        });
      }
      courseIdByCodeRef.current = courseMap;

      const activeBatches = Array.isArray(batches)
        ? batches.filter((b) => b.is_active && b.status !== "CANCELLED")
        : [];

      setAllBatches(activeBatches);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load data");
    } finally {
      setLoadingData(false);
    }
  };

  const getFacultyModuleCriteria = () => {
    const moduleIds = new Set<number>();
    const moduleNames = new Set<string>();

    facultySubjects.forEach((assignment) => {
      const id = assignment.module?.id ?? assignment.subject?.id;
      if (id) {
        moduleIds.add(id);
      }

      const name =
        assignment.module?.name?.trim() ??
        assignment.subject?.name?.trim() ??
        "";
      if (name) {
        moduleNames.add(name.toLowerCase());
      }
    });

    return { moduleIds, moduleNames };
  };

  const ensureCourseModules = async (courseId: number) => {
    const cached = courseModulesCacheRef.current.get(courseId);
    if (cached) return cached;

    const response = await apiClient.getCourseSubjects(courseId, {
      is_active: true,
    });
    const modules = response?.modules ?? response?.subjects ?? [];
    const ids = new Set<number>();
    const names = new Set<string>();

    modules.forEach((module: any) => {
      const id = module.module ?? module.subject;
      if (typeof id === "number") {
        ids.add(id);
      }
      const name =
        module.module_name?.trim() ?? module.subject_name?.trim() ?? "";
      if (name) {
        names.add(name.toLowerCase());
      }
    });

    const entry = { ids, names };
    courseModulesCacheRef.current.set(courseId, entry);
    return entry;
  };

  const applyBatchFilter = async () => {
    const facultyId = selectedFacultyId ?? formData.faculty_id;
    if (!facultyId) {
      setBatchList(allBatches);
      return;
    }

    const { moduleIds, moduleNames } = getFacultyModuleCriteria();
    if (moduleIds.size === 0 && moduleNames.size === 0) {
      setBatchList([]);
      return;
    }

    setFilteringBatches(true);
    try {
      const filtered: Batch[] = [];

      for (const batch of allBatches) {
        const courseId = courseIdByCodeRef.current.get(batch.course_code);
        if (!courseId) continue;

        const courseModules = await ensureCourseModules(courseId);

        const matchesById =
          moduleIds.size > 0
            ? Array.from(moduleIds).some((id) => courseModules.ids.has(id))
            : false;
        const matchesByName =
          moduleIds.size === 0 && moduleNames.size > 0
            ? Array.from(moduleNames).some((name) =>
                courseModules.names.has(name),
              )
            : false;

        if (matchesById || matchesByName) {
          filtered.push(batch);
        }
      }

      setBatchList(filtered);
      setFormData((prev) =>
        filtered.some((batch) => batch.id === prev.batch_id)
          ? prev
          : { ...prev, batch_id: 0 },
      );
    } catch (err) {
      console.error("Failed to filter batches by modules:", err);
      setBatchList([]);
    } finally {
      setFilteringBatches(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.faculty_id || formData.faculty_id === 0) {
      setError("Please select a faculty member");
      return;
    }
    if (!formData.batch_id || formData.batch_id === 0) {
      setError("Please select a batch");
      return;
    }

    setLoading(true);

    try {
      await apiClient.assignFacultyToBatch(formData);
      onSuccess();
      onClose();
      // Reset form
      setFormData({ faculty_id: 0, batch_id: 0 });
    } catch (err) {
      const error = err as Error;
      // Handle duplicate assignment error gracefully
      if (
        error.message.includes("already assigned") ||
        error.message.includes("already exists")
      ) {
        setError(
          "This faculty member is already assigned to this batch. Please choose a different batch.",
        );
      } else {
        setError(error.message || "Failed to assign batch");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ faculty_id: 0, batch_id: 0 });
      setError("");
      onClose();
    }
  };

  // Get selected batch for info display
  const selectedBatch = batchList.find((b) => b.id === formData.batch_id);
  const facultyModuleCount = facultySubjects.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {selectedFacultyId ? "Assign Batch" : "Assign Faculty to Batch"}
            </h2>
            <button
              onClick={handleClose}
              className="text-muted-foreground/70 hover:text-muted-foreground"
              disabled={loading}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {loadingData ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Faculty Dropdown - Only show if not pre-selected */}
              {!selectedFacultyId && (
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Faculty Member <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.faculty_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        faculty_id: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-border text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                    disabled={loading}
                  >
                    <option value={0} className="text-muted-foreground">
                      Select Faculty
                    </option>
                    {facultyList.map((faculty) => (
                      <option
                        key={faculty.id}
                        value={faculty.id}
                        className="text-foreground"
                      >
                        {faculty.employee_code} - {faculty.user.full_name} (
                        {faculty.designation})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Batch Dropdown */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Batch <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.batch_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      batch_id: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-border text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                  disabled={loading}
                >
                  <option value={0} className="text-muted-foreground">
                    Select Batch
                  </option>
                  {batchList.map((batch) => (
                    <option
                      key={batch.id}
                      value={batch.id}
                      className="text-foreground"
                    >
                      {batch.code} - {batch.course_name} ({batch.centre_name})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Only batches whose course includes all modules taught by the
                  selected faculty are shown.
                </p>
                {filteringBatches && (
                  <p className="mt-1 text-xs text-primary">
                    Filtering batches based on faculty modules...
                  </p>
                )}
                {!filteringBatches &&
                  formData.faculty_id > 0 &&
                  facultyModuleCount === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      This faculty has no active module assignments, so no
                      eligible batches are available.
                    </p>
                  )}
                {!filteringBatches &&
                  formData.faculty_id > 0 &&
                  facultyModuleCount > 0 &&
                  batchList.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      No batches match this faculty&apos;s modules.
                    </p>
                  )}
              </div>

              {/* Selected Batch Info */}
              {selectedBatch && (
                <div className="bg-secondary/50 border border-border rounded-md p-4">
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    Batch Details
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Course:</span>{" "}
                      <span className="text-foreground">
                        {selectedBatch.course_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Centre:</span>{" "}
                      <span className="text-foreground">
                        {selectedBatch.centre_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mode:</span>{" "}
                      <span className="text-foreground">
                        {selectedBatch.mode}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          selectedBatch.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : selectedBatch.status === "COMPLETED"
                              ? "bg-primary/10 text-primary"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedBatch.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Start:</span>{" "}
                      <span className="text-foreground">
                        {new Date(
                          selectedBatch.start_date,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">End:</span>{" "}
                      <span className="text-foreground">
                        {new Date(selectedBatch.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Information Box */}
              <div className="bg-primary/10 border border-primary/20 rounded-md p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-primary/70 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="text-sm text-primary">
                    <p className="font-medium">Assignment Info</p>
                    <p className="mt-1">
                      Assigning a faculty member to a batch allows them to teach
                      all sessions in that batch. You can deactivate assignments
                      later if needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-border text-foreground/80 rounded-md hover:bg-secondary/50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={loading}
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {loading ? "Assigning..." : "Assign Batch"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
