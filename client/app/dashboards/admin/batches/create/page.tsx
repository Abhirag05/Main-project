"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient, BatchTemplate, CreateBatchRequest } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { isAdminRole } from "@/lib/roles";

// Progress Bar Component (only current step highlighted)
function WorkflowSteps({ currentStep }: { currentStep: number }) {
  const steps = [
    { id: 1, name: "Create Batch" },
    { id: 2, name: "Assign Students" },
    { id: 3, name: "Assign Mentor" },
  ];

  return (
    <nav aria-label="Progress" className="mb-10">
      <ol className="flex flex-col items-center gap-4 sm:mx-auto sm:flex-row sm:justify-between sm:gap-0 sm:max-w-xl">
        {steps.map((step) => {
          const isCurrent = step.id === currentStep;
          return (
            <li
              key={step.name}
              className="flex flex-col items-center text-center sm:relative sm:flex-1"
            >
              <div
                className="hidden sm:absolute sm:inset-0 sm:flex sm:items-center"
                aria-hidden="true"
              >
                <div className="h-0.5 w-full bg-gray-200" />
              </div>
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white ${
                  isCurrent ? "border-blue-600" : "border-gray-300"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isCurrent ? "bg-blue-600" : "bg-gray-300"
                  }`}
                />
                <span className="sr-only">{step.name}</span>
              </div>
              <span className="mt-2 text-xs font-medium text-gray-500 sm:mt-0 sm:absolute sm:-bottom-7 sm:left-1/2 sm:-translate-x-1/2 sm:whitespace-nowrap">
                {step.name}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function CreateBatchPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<any>(null);
  const [templates, setTemplates] = useState<BatchTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedTemplate, setSelectedTemplate] =
    useState<BatchTemplate | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check user role
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);

        // Access control: only CENTRE_ADMIN
        if (!isAdminRole(userData.role.code)) {
          router.push("/dashboards");
        }
      } else {
        router.push("/");
      }
    }
  }, [router]);

  useEffect(() => {
    if (isAdminRole(user?.role.code)) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getActiveBatchTemplates();
      setTemplates(data);
    } catch (err: any) {
      toast.show("error", err.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedTemplate) {
      newErrors.template = "Please select a batch template";
    }
    if (!startDate) {
      newErrors.startDate = "Start date is required";
    }
    if (!endDate) {
      newErrors.endDate = "End date is required";
    }
    if (startDate && endDate && startDate >= endDate) {
      newErrors.endDate = "End date must be after start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;
    if (!selectedTemplate) return;

    setSubmitting(true);
    try {
      const data: CreateBatchRequest = {
        template_id: selectedTemplate.id,
        start_date: startDate,
        end_date: endDate,
      };

      const batch = await apiClient.createBatch(data);
      toast.show(
        "success",
        "Batch created successfully! Redirecting to assign students...",
      );
      setTimeout(() => {
        router.push(
          `/dashboards/admin/batches/${batch.id}/assign-students`,
        );
      }, 1500);
    } catch (err: any) {
      toast.show("error", err.message || "Failed to create batch");
    } finally {
      setSubmitting(false);
    }
  };

  const calculateEndDate = (start: string, months: number): string => {
    if (!start || !months) return "";
    const date = new Date(start);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split("T")[0];
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === parseInt(templateId));
    setSelectedTemplate(template || null);

    // Auto-calculate end date if start date is already selected
    if (template && startDate) {
      const newEndDate = calculateEndDate(
        startDate,
        template.course_detail.duration_months,
      );
      setEndDate(newEndDate);
      if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: "" }));
    }

    if (errors.template) {
      setErrors({ ...errors, template: "" });
    }
  };

  // Access denied state
  if (user && !isAdminRole(user.role.code)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
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
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Access Denied
            </h2>
            <p className="mt-2 text-gray-600">
              You don't have permission to access this page. Only Centre Admins
              can create batches.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Loading initial check
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        <WorkflowSteps currentStep={1} />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Step 1: Create Batch
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Create a new batch from an existing template
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
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
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No active templates available
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Contact your Super Admin to create batch templates.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Template Selection */}
            <div className="bg-white px-6 py-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                1. Select Batch Template
              </h2>
              <div>
                <label
                  htmlFor="template"
                  className="block text-sm font-medium text-gray-700"
                >
                  Template
                </label>
                <select
                  id="template"
                  value={selectedTemplate?.id || ""}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className={`mt-1 block w-full rounded-md text-gray-700 shadow-sm sm:text-sm ${
                    errors.template
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                >
                  <option value="">-- Select a template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.course_detail.name} - {template.mode} (
                      {template.max_students} students)
                    </option>
                  ))}
                </select>
                {errors.template && (
                  <p className="mt-1 text-sm text-red-600">{errors.template}</p>
                )}
              </div>
            </div>

            {/* Date Selection */}
            <div className="bg-white px-6 py-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                2. Select Dates
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartDate(newStart);

                      // Auto-calculate end date
                      if (selectedTemplate && newStart) {
                        const newEnd = calculateEndDate(
                          newStart,
                          selectedTemplate.course_detail.duration_months,
                        );
                        setEndDate(newEnd);
                        if (errors.endDate)
                          setErrors((prev) => ({ ...prev, endDate: "" }));
                      }

                      if (errors.startDate) {
                        setErrors({ ...errors, startDate: "" });
                      }
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm text-gray-700 ${
                      errors.startDate
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.startDate}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (errors.endDate) {
                        setErrors({ ...errors, endDate: "" });
                      }
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm text-gray-700 ${
                      errors.endDate
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.endDate}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Preview */}
            {selectedTemplate && (
              <div className="bg-blue-50 px-6 py-6 rounded-lg border border-blue-200 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  3. Preview
                </h2>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Course
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {selectedTemplate.course_detail.name} (
                      {selectedTemplate.course_detail.code})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Mode</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedTemplate.mode === "LIVE"
                            ? "bg-green-100 text-green-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {selectedTemplate.mode}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Maximum Students
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {selectedTemplate.max_students}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Duration
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {selectedTemplate.course_detail.duration_months} months
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => router.push("/dashboards/admin/batches")}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Creating..." : "Create Batch"}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
