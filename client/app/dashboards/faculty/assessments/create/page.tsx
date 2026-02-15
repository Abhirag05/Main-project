"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  assessmentApiClient,
  FacultyBatchOption,
  BatchModuleOption,
  CourseSkill,
  CreateAssessmentRequest,
  QuestionBank,
} from "@/lib/assessmentAPI";

interface FormData {
  title: string;
  batch_id: number | null;
  module_id: number | null;
  total_marks: number;
  duration_minutes: number;
  skill_ids: number[];
  start_datetime: string;
  end_datetime: string;
}

export default function CreateAssessmentPageWrapper() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    }>
      <CreateAssessmentPage />
    </Suspense>
  );
}

function CreateAssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown data
  const [batches, setBatches] = useState<FacultyBatchOption[]>([]);
  const [modules, setModules] = useState<BatchModuleOption[]>([]);
  const [skills, setSkills] = useState<CourseSkill[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: "",
    batch_id: null,
    module_id: null,
    total_marks: 100,
    duration_minutes: 60,
    skill_ids: [],
    start_datetime: "",
    end_datetime: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Check user role on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData.role.code !== "FACULTY") {
          router.push("/dashboards");
        }
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  // Fetch faculty batches on mount
  useEffect(() => {
    fetchBatches();
  }, []);

  // Fetch assessment data if in edit mode
  useEffect(() => {
    if (isEditMode && editId && batches.length > 0) {
      fetchAssessmentForEdit(Number(editId));
    }
  }, [isEditMode, editId, batches]);

  // Fetch modules and skills when batch changes (but not during initial edit load)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  useEffect(() => {
    if (formData.batch_id && initialLoadComplete) {
      const batch = batches.find((b) => b.id === formData.batch_id);
      if (batch && batch.course_id) {
        fetchModules(formData.batch_id);
        fetchSkills(batch.course_id);
      } else if (batch) {
        // If batch exists but course_id is missing, still fetch modules
        fetchModules(formData.batch_id);
      }
    } else if (!formData.batch_id && initialLoadComplete) {
      setModules([]);
      setSkills([]);
      setFormData((prev) => ({ ...prev, module_id: null, skill_ids: [] }));
    }
  }, [formData.batch_id, batches, initialLoadComplete]);

  const fetchAssessmentForEdit = async (assessmentId: number) => {
    setLoading(true);
    try {
      const assessment = await assessmentApiClient.getAssessment(assessmentId);
      
      // Check if it's a draft or scheduled
      if (assessment.status !== "DRAFT" && assessment.status !== "SCHEDULED") {
        setError("Only draft and scheduled assessments can be edited");
        router.push("/dashboards/faculty/assessments");
        return;
      }

      // Fetch modules and skills for the batch
      if (assessment.batch.id) {
        await fetchModules(assessment.batch.id);
        const batch = batches.find((b) => b.id === assessment.batch.id);
        if (batch && batch.course_id) {
          await fetchSkills(batch.course_id);
        }
      }

      // Format datetime for input fields
      const formatDateTimeLocal = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toISOString().slice(0, 16);
      };

      // Populate form with assessment data
      setFormData({
        title: assessment.title,
        batch_id: assessment.batch.id,
        module_id: assessment.subject.id,
        total_marks: assessment.total_marks,
        duration_minutes: assessment.duration_minutes,
        skill_ids: assessment.skills?.map((s) => s.id) || [],
        start_datetime: formatDateTimeLocal(assessment.start_datetime),
        end_datetime: formatDateTimeLocal(assessment.end_datetime),
      });

      setInitialLoadComplete(true);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load assessment");
    } finally {
      setLoading(false);
    }
  };

  // Set initial load complete for new assessments
  useEffect(() => {
    if (!isEditMode) {
      setInitialLoadComplete(true);
    }
  }, [isEditMode]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const data = await assessmentApiClient.getFacultyBatches();
      setBatches(data.filter((b) => b.status === "ACTIVE"));
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load batches");
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async (batchId: number) => {
    setLoadingModules(true);
    try {
      const data = await assessmentApiClient.getBatchModules(batchId);
      setModules(data);
    } catch (err) {
      console.error("Failed to load modules:", err);
      setModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchSkills = async (courseId: number) => {
    setLoadingSkills(true);
    try {
      const data = await assessmentApiClient.getCourseSkills(courseId);
      setSkills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load skills:", err);
      setSkills([]);
    } finally {
      setLoadingSkills(false);
    }
  };



  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = "Assessment title is required";
    }
    if (!formData.batch_id) {
      errors.batch_id = "Please select a batch";
    }
    if (!formData.module_id) {
      errors.module_id = "Please select a module";
    }
    if (formData.total_marks <= 0) {
      errors.total_marks = "Total marks must be greater than 0";
    }
    if (formData.duration_minutes <= 0) {
      errors.duration_minutes = "Duration must be greater than 0";
    }
    if (!formData.start_datetime) {
      errors.start_datetime = "Start date/time is required";
    }
    if (!formData.end_datetime) {
      errors.end_datetime = "End date/time is required";
    }
    if (formData.start_datetime && formData.end_datetime) {
      const start = new Date(formData.start_datetime);
      const end = new Date(formData.end_datetime);
      if (end <= start) {
        errors.end_datetime = "End time must be after start time";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
    // Clear error when field is modified
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSkillToggle = (skillId: number) => {
    setFormData((prev) => ({
      ...prev,
      skill_ids: prev.skill_ids.includes(skillId)
        ? prev.skill_ids.filter((id) => id !== skillId)
        : [...prev.skill_ids, skillId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const requestData: CreateAssessmentRequest = {
        title: formData.title,
        batch: formData.batch_id!,
        subject: formData.module_id!,
        total_marks: formData.total_marks,
        duration_minutes: formData.duration_minutes,
        skill_ids: formData.skill_ids,
        start_time: formData.start_datetime,
        end_time: formData.end_datetime,
      };

      if (isEditMode && editId) {
        // Update existing assessment
        await assessmentApiClient.updateAssessment(Number(editId), requestData);
        router.push("/dashboards/faculty/assessments");
      } else {
        // Create new assessment
        await assessmentApiClient.createAssessment(requestData);
        router.push("/dashboards/faculty/assessments");
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || `Failed to ${isEditMode ? "update" : "create"} assessment`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboards/faculty/assessments");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? "Edit Assessment" : "Create Assessment"}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditMode
              ? "Update your assessment details"
              : "Create a new MCQ-based assessment for your students"}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Assessment Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Assessment Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${
                  formErrors.title ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., Python Fundamentals Quiz"
              />
              {formErrors.title && (
                <p className="mt-1 text-sm text-red-500">{formErrors.title}</p>
              )}
            </div>

            {/* Batch Selection */}
            <div>
              <label
                htmlFor="batch_id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Batch <span className="text-red-500">*</span>
              </label>
              <select
                id="batch_id"
                name="batch_id"
                value={formData.batch_id ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    batch_id: e.target.value ? Number(e.target.value) : null,
                    module_id: null,
                    skill_names: [],
                  }))
                }
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${
                  formErrors.batch_id ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select a batch</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.code} - {batch.course_name}
                  </option>
                ))}
              </select>
              {formErrors.batch_id && (
                <p className="mt-1 text-sm text-red-500">{formErrors.batch_id}</p>
              )}
              {batches.length === 0 && !loading && (
                <p className="mt-1 text-sm text-yellow-600">
                  No active batches assigned to you
                </p>
              )}
              {formData.batch_id && (
                <p className="mt-1 text-sm text-gray-600">
                  Course: {batches.find((b) => b.id === formData.batch_id)?.course_name}
                </p>
              )}
            </div>

            {/* Module Selection */}
            <div>
              <label
                htmlFor="module_id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Module <span className="text-red-500">*</span>
              </label>
              <select
                id="module_id"
                name="module_id"
                value={formData.module_id ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    module_id: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                disabled={!formData.batch_id || loadingModules}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  formErrors.module_id ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">
                  {loadingModules
                    ? "Loading modules..."
                    : formData.batch_id
                    ? "Select a module"
                    : "Select a batch first"}
                </option>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.code} - {module.name}
                  </option>
                ))}
              </select>
              {formErrors.module_id && (
                <p className="mt-1 text-sm text-red-500">{formErrors.module_id}</p>
              )}
            </div>

            {/* Total Marks & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="total_marks"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Total Marks <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="total_marks"
                  name="total_marks"
                  value={formData.total_marks}
                  onChange={handleInputChange}
                  min="1"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${
                    formErrors.total_marks ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.total_marks && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.total_marks}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="duration_minutes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="duration_minutes"
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleInputChange}
                  min="1"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${
                    formErrors.duration_minutes ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.duration_minutes && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.duration_minutes}
                  </p>
                )}
              </div>
            </div>

            {/* Skills Multi-select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills Evaluated
              </label>
              {loadingSkills ? (
                <div className="text-gray-500 text-sm">Loading skills...</div>
              ) : skills.length > 0 ? (
                <div className="border border-gray-300 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {skills.map((skill) => (
                      <label
                        key={skill.id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.skill_ids.includes(skill.id)}
                          onChange={() => handleSkillToggle(skill.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{skill.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm border border-gray-200 rounded-lg p-4">
                  {formData.batch_id
                    ? "No skills available for this course"
                    : "Select a batch to see available skills"}
                </div>
              )}
              {formData.skill_ids.length > 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  {formData.skill_ids.length} skill(s) selected
                </p>
              )}
            </div>



            {/* Date/Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="start_datetime"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="start_datetime"
                  name="start_datetime"
                  value={formData.start_datetime}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${
                    formErrors.start_datetime ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.start_datetime && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.start_datetime}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="end_datetime"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  End Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="end_datetime"
                  name="end_datetime"
                  value={formData.end_datetime}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${
                    formErrors.end_datetime ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.end_datetime && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.end_datetime}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
