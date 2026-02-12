"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient, type Course } from "@/lib/api";
import { useToast } from "@/lib/toast";

export default function CreateBatchPage() {
  const router = useRouter();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    course_id: "",
    start_date: "",
    end_date: "",
    capacity: "",
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const data = await apiClient.getCourses();
        setCourses(data.filter((course) => course.is_active));
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        toast.show("error", error.message || "Failed to load courses");
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
    }
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const trimmedName = formData.name.trim();
    const trimmedCode = formData.code.trim();

    if (!trimmedName) {
      nextErrors.name = "Batch name is required";
    } else if (trimmedName.length < 3) {
      nextErrors.name = "Batch name must be at least 3 characters";
    }

    if (!trimmedCode) {
      nextErrors.code = "Batch code is required";
    } else if (!/^[A-Z0-9-]+$/.test(trimmedCode.toUpperCase())) {
      nextErrors.code = "Use uppercase letters, numbers, or hyphens";
    }

    if (!formData.course_id) {
      nextErrors.course_id = "Please select a course";
    }

    if (!formData.capacity) {
      nextErrors.capacity = "Capacity is required";
    } else if (Number.isNaN(Number(formData.capacity)) || Number(formData.capacity) <= 0) {
      nextErrors.capacity = "Capacity must be a positive number";
    }

    if (!formData.start_date) {
      nextErrors.start_date = "Start date is required";
    }
    if (!formData.end_date) {
      nextErrors.end_date = "End date is required";
    }
    if (
      formData.start_date &&
      formData.end_date &&
      formData.start_date >= formData.end_date
    ) {
      nextErrors.end_date = "End date must be after start date";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.show("warning", "Please fix the highlighted fields");
      return;
    }

    setLoading(true);

    try {
      const batch = await apiClient.createBatch({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        course_id: parseInt(formData.course_id),
        start_date: formData.start_date,
        end_date: formData.end_date,
        capacity: parseInt(formData.capacity),
      });
      toast.show("success", "Batch created successfully");
      setTimeout(() => {
        router.push(`/dashboards/finance/batches/${batch.id}`);
      }, 800);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      toast.show("error", error.message || "Failed to create batch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Batch</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a new batch for your institution
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Batch Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:border-transparent ${
                    errors.name
                      ? "border border-red-300 focus:ring-red-500"
                      : "border border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-gray-700"
                >
                  Batch Code *
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  required
                  value={formData.code}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:border-transparent ${
                    errors.code
                      ? "border border-red-300 focus:ring-red-500"
                      : "border border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {errors.code && (
                  <p className="mt-1 text-xs text-red-600">{errors.code}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="course_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Course *
                </label>
                <select
                  id="course_id"
                  name="course_id"
                  required
                  value={formData.course_id}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:border-transparent ${
                    errors.course_id
                      ? "border border-red-300 focus:ring-red-500"
                      : "border border-gray-300 focus:ring-blue-500"
                  }`}
                >
                  <option value="">
                    {loadingCourses ? "Loading courses..." : "Select Course"}
                  </option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </option>
                  ))}
                </select>
                {errors.course_id && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.course_id}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="capacity"
                  className="block text-sm font-medium text-gray-700"
                >
                  Capacity *
                </label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  required
                  value={formData.capacity}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:border-transparent ${
                    errors.capacity
                      ? "border border-red-300 focus:ring-red-500"
                      : "border border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {errors.capacity && (
                  <p className="mt-1 text-xs text-red-600">{errors.capacity}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="start_date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Start Date *
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  required
                  value={formData.start_date}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:border-transparent ${
                    errors.start_date
                      ? "border border-red-300 focus:ring-red-500"
                      : "border border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {errors.start_date && (
                  <p className="mt-1 text-xs text-red-600">{errors.start_date}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="end_date"
                  className="block text-sm font-medium text-gray-700"
                >
                  End Date *
                </label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  required
                  value={formData.end_date}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:border-transparent ${
                    errors.end_date
                      ? "border border-red-300 focus:ring-red-500"
                      : "border border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {errors.end_date && (
                  <p className="mt-1 text-xs text-red-600">{errors.end_date}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Batch"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
