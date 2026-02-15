"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { assignmentAPIClient, CreateAssignmentData } from "@/lib/assignmentAPI";
import { apiClient } from "@/lib/api";

export default function CreateAssignmentPageWrapper() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    }>
      <CreateAssignmentPage />
    </Suspense>
  );
}

function CreateAssignmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get('id');
  const parsedAssignmentId = assignmentId ? Number.parseInt(assignmentId, 10) : null;
  const isEditMode = Number.isFinite(parsedAssignmentId);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateAssignmentData>({
    batch: 0,
    module: 0,
    title: "",
    description: "",
    max_marks: 100,
    start_date: "",
    due_date: "",
    is_active: true,
    skill_ids: [],
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Dropdowns
  const [batches, setBatches] = useState<any[]>([]);
  const [batchAssignments, setBatchAssignments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [allModules, setAllModules] = useState<any[]>([]);
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Check user role
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

  // Fetch batches, modules, and assignment data if editing
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [batchData, moduleData] = await Promise.all([
          apiClient.getFacultyBatchAssignments({ faculty: "me", is_active: true }),
          apiClient.getFacultyModuleAssignments({ faculty: "me", is_active: true }),
        ]);

        // Store raw batch assignments for course_name lookup
        setBatchAssignments(batchData);

        // Get unique batches with their course info
        const uniqueBatches = Array.from(
          new Map(batchData.map((item: any) => [
            item.batch?.id, 
            { ...item.batch, course_name: item.batch?.course_name }
          ])).values()
        ).filter(Boolean);
        setBatches(uniqueBatches);

        // Store all modules
        setAllModules(moduleData);

        // If editing, fetch assignment data
        if (isEditMode && parsedAssignmentId !== null) {
          const assignmentData = await assignmentAPIClient.getAssignmentDetail(parsedAssignmentId);
          
          // Format dates for datetime-local input
          const formatDateForInput = (dateStr: string) => {
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
          };

          setFormData({
            batch: assignmentData.batch || 0,
            module: assignmentData.module || 0,
            title: assignmentData.title || "",
            description: assignmentData.description || "",
            max_marks: Number(assignmentData.max_marks) || 100,
            start_date: assignmentData.start_date ? formatDateForInput(assignmentData.start_date) : "",
            due_date: assignmentData.due_date ? formatDateForInput(assignmentData.due_date) : "",
            is_active: assignmentData.is_active ?? true,
          });

          if (assignmentData.assignment_file_url || assignmentData.assignment_file) {
            setExistingFileUrl((assignmentData.assignment_file_url || assignmentData.assignment_file) || null);
          }
        }
      } catch (err) {
        showError((err as Error).message || "Failed to load data");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isEditMode, parsedAssignmentId]);

  // Filter modules and fetch skills by selected batch
  useEffect(() => {
    if (formData.batch && allModules.length > 0) {
      // Find the selected batch to get its course_name
      const selectedBatch = batches.find((b: any) => b.id === formData.batch);
      const courseName = selectedBatch?.course_name;

      // Filter modules that belong to the same course
      const filteredModules = allModules.filter(
        (item: any) => item?.module?.course_name === courseName
      );
      setSubjects(filteredModules);

      // Reset module if it's not valid for the new batch
      if (formData.module) {
        const isValid = filteredModules.some((s: any) => s?.module?.id === formData.module);
        if (!isValid) {
          setFormData((prev) => ({ ...prev, module: 0 }));
        }
      }

      // Fetch skills for this batch
      fetchBatchSkills(formData.batch);
    } else {
      setSubjects([]);
      setAvailableSkills([]);
    }
  }, [formData.batch, allModules, batches, formData.module]);

  const fetchBatchSkills = async (batchId: number) => {
    setLoadingSkills(true);
    try {
      const skills = await assignmentAPIClient.getBatchSkills(batchId);
      setAvailableSkills(skills || []);
    } catch (err) {
      console.error("Error fetching skills:", err);
      // Don't show error for missing skills, just show empty state
      setAvailableSkills([]);
    } finally {
      setLoadingSkills(false);
    }
  };

  const handleSkillToggle = (skillId: number) => {
    setFormData((prev) => {
      const currentSkills = prev.skill_ids || [];
      if (currentSkills.includes(skillId)) {
        return {
          ...prev,
          skill_ids: currentSkills.filter((id) => id !== skillId),
        };
      } else {
        return {
          ...prev,
          skill_ids: [...currentSkills, skillId],
        };
      }
    });
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "batch" || name === "module" || name === "max_marks" 
        ? parseInt(value) || 0 
        : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        showError("File size must be less than 10MB");
        e.target.value = "";
        return;
      }

      setAttachmentFile(file);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      showError("Title is required");
      return false;
    }

    if (!formData.batch) {
      showError("Please select a batch");
      return false;
    }

    if (!formData.module) {
      showError("Please select a module");
      return false;
    }

    if (!formData.description.trim()) {
      showError("Description is required");
      return false;
    }

    if (formData.max_marks <= 0) {
      showError("Max marks must be greater than 0");
      return false;
    }

    if (!formData.start_date) {
      showError("Start date is required");
      return false;
    }

    if (!formData.due_date) {
      showError("Due date is required");
      return false;
    }

    const startDate = new Date(formData.start_date);
    // Validate due date is in future
    const dueDate = new Date(formData.due_date);
    const now = new Date();
    if (startDate <= now) {
      showError("Start date must be in the future");
      return false;
    }

    if (dueDate <= startDate) {
      showError("Due date must be after the start date");
      return false;
    }

    if (dueDate <= now) {
      showError("Due date must be in the future");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const submitData: CreateAssignmentData = {
        ...formData,
        is_active: true,
      };

      if (attachmentFile) {
        submitData.assignment_file = attachmentFile;
      }

      if (isEditMode && parsedAssignmentId !== null) {
        await assignmentAPIClient.updateAssignment(parsedAssignmentId, submitData);
        showSuccess("Assignment updated successfully!");
      } else {
        await assignmentAPIClient.createAssignment(submitData);
        showSuccess("Assignment scheduled successfully!");
      }
      
      // Redirect after delay
      setTimeout(() => {
        router.push("/dashboards/faculty/assignments");
      }, 1500);
    } catch (err) {
      const fallbackMessage = isEditMode
        ? "Failed to update assignment"
        : "Failed to create assignment";
      const errorMessage = (err as Error)?.message || fallbackMessage;
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/dashboards/faculty" className="hover:text-blue-600">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/dashboards/faculty/assignments" className="hover:text-blue-600">
              Assignments
            </Link>
            <span>/</span>
            <span className="text-gray-900">{isEditMode ? 'Edit' : 'Create'}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{isEditMode ? 'Edit Assignment' : 'Create Assignment'}</h1>
          <p className="text-gray-600 mt-1">{isEditMode ? 'Update assignment details' : 'Create a new assignment for your students'}</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Python Programming Assignment 1"
                required
              />
            </div>

            {/* Batch and Module */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="batch" className="block text-sm font-medium text-gray-700 mb-2">
                  Batch <span className="text-red-500">*</span>
                </label>
                <select
                  id="batch"
                  name="batch"
                  value={formData.batch}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  required
                >
                  <option value={0} style={{ color: '#111827' }}>Select Batch</option>
                  {batches.map((batch: any) => (
                    <option key={batch.id} value={batch.id} style={{ color: '#111827' }}>
                      {batch.code} - {batch.course_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="module" className="block text-sm font-medium text-gray-700 mb-2">
                  Module <span className="text-red-500">*</span>
                </label>
                <select
                  id="module"
                  name="module"
                  value={formData.module}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  required
                  disabled={!formData.batch}
                >
                  <option value={0} style={{ color: '#111827' }}>Select Module</option>
                  {subjects.map((item: any) => (
                    <option key={item?.module?.id} value={item?.module?.id} style={{ color: '#111827' }}>
                      {item?.module?.name}
                    </option>
                  ))}
                </select>
                {!formData.batch && (
                  <p className="text-xs text-gray-500 mt-1">Select a batch first</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Provide detailed instructions for the assignment..."
                required
              ></textarea>
              <p className="text-xs text-gray-500 mt-1">
                Describe the assignment requirements, submission format, and evaluation criteria
              </p>
            </div>

            {/* Assignment File (Optional) */}
            <div>
              <label htmlFor="attachment" className="block text-sm font-medium text-gray-700 mb-2">
                Assignment File (Optional)
              </label>
              {existingFileUrl && !attachmentFile && (
                <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-2">Current file attached:</p>
                  <a
                    href={`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/api$/, "")}${existingFileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View current file
                  </a>
                </div>
              )}
              <input
                type="file"
                id="attachment"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg bg-white file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                accept=".pdf,.doc,.docx,.zip,.rar"
              />
              <p className="text-xs text-gray-500 mt-1">
                {existingFileUrl ? 'Upload a new file to replace the current one (PDF, DOC, ZIP - Max 10MB)' : 'Upload reference materials (PDF, DOC, ZIP - Max 10MB)'}
              </p>
              {attachmentFile && (
                <p className="text-sm text-green-600 mt-2">
                  New file selected: {attachmentFile.name}
                </p>
              )}
            </div>

            {/* Skills Multi-select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills Evaluated <span className="text-gray-500 text-xs font-normal">(Optional)</span>
              </label>
              {loadingSkills ? (
                <div className="text-gray-500 text-sm border border-gray-200 rounded-lg p-4">
                  Loading skills...
                </div>
              ) : !formData.batch ? (
                <div className="text-gray-500 text-sm border border-gray-200 rounded-lg p-4">
                  Select a batch first to see available skills
                </div>
              ) : availableSkills.length > 0 ? (
                <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableSkills.map((skill) => (
                      <label
                        key={skill.id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={(formData.skill_ids || []).includes(skill.id)}
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
                  No skills available for this batch's course
                </div>
              )}
              {(formData.skill_ids || []).length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {formData.skill_ids?.length} skill(s) selected
                </p>
              )}
            </div>

            {/* Max Marks, Start Date and Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="max_marks" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Marks <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="max_marks"
                  name="max_marks"
                  value={formData.max_marks}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (isEditMode ? "Updating..." : "Scheduling...") : (isEditMode ? "Update Assignment" : "Schedule Assignment")}
              </button>

              <Link
                href="/dashboards/faculty/assignments"
                className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
