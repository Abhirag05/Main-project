"use client";

import { useState, useEffect } from "react";
import { apiClient, AcademicCourse, CreateCourseRequest } from "@/lib/api";

interface CourseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  course?: AcademicCourse | null;
}

interface FieldErrors {
  code?: string;
  name?: string;
  duration_months?: string;
}

export default function CourseForm({
  isOpen,
  onClose,
  onSuccess,
  course,
}: CourseFormProps) {
  const [formData, setFormData] = useState<CreateCourseRequest>({
    code: "",
    name: "",
    description: "",
    duration_months: 12,
    skills: "",
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (course) {
      setFormData({
        code: course.code,
        name: course.name,
        description: course.description || "",
        duration_months: course.duration_months,
        skills: Array.isArray(course.skills) ? course.skills.join(", ") : "",
        is_active: course.is_active,
      });
    } else {
      setFormData({
        code: "",
        name: "",
        description: "",
        duration_months: 12,
        skills: "",
        is_active: true,
      });
    }
    setError("");
    setFieldErrors({});
    setTouched({});
  }, [course, isOpen]);

  if (!isOpen) return null;

  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case "code":
        if (!String(value).trim()) return "Course code is required";
        if (String(value).trim().length < 2) return "Code must be at least 2 characters";
        if (!/^[A-Za-z0-9_-]+$/.test(String(value).trim())) return "Code can only contain letters, numbers, hyphens, and underscores";
        return undefined;
      case "name":
        if (!String(value).trim()) return "Course name is required";
        if (String(value).trim().length < 3) return "Name must be at least 3 characters";
        return undefined;
      case "duration_months":
        if (!value || Number(value) <= 0) return "Duration must be greater than 0";
        if (Number(value) > 120) return "Duration cannot exceed 120 months";
        return undefined;
      default:
        return undefined;
    }
  };

  const handleBlur = (name: string, value: any) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: err }));
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    let valid = true;
    (["code", "name", "duration_months"] as const).forEach((key) => {
      const err = validateField(key, formData[key]);
      if (err) { errors[key] = err; valid = false; }
    });
    setFieldErrors(errors);
    return valid;
  };

  const getFieldClass = (name: keyof FieldErrors) => {
    const base = "w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all text-gray-900";
    if (touched[name] && fieldErrors[name]) {
      return `${base} border-red-300 focus:border-red-500 focus:ring-red-200`;
    }
    return `${base} border-gray-300 focus:border-blue-500 focus:ring-blue-200 hover:border-gray-400`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      setError("Please correct the errors before submitting");
      return;
    }

    const submitData = {
      ...formData,
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      description: formData.description?.trim() || "",
      skills: formData.skills?.trim() || "",
    };

    setLoading(true);

    try {
      if (course) {
        await apiClient.updateCourse(course.id, submitData);
      } else {
        await apiClient.createCourse(submitData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      const error = err as Error;
      setError(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {course ? "Edit Course" : "Add New Course"}
            </h2>
            <p className="text-blue-100 text-sm mt-0.5">
              {course ? "Update course information" : "Create a new academic course"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg" role="alert">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="ml-3 text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Course Code */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Course Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  onBlur={() => handleBlur("code", formData.code)}
                  placeholder="e.g., BCA, MCA, BSC"
                  className={getFieldClass("code")}
                  required
                  disabled={loading}
                  maxLength={20}
                />
                {touched.code && fieldErrors.code && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.code}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Uppercase code identifier</p>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Duration (Months) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) || 0 })}
                  onBlur={() => handleBlur("duration_months", formData.duration_months)}
                  min="1"
                  max="120"
                  className={getFieldClass("duration_months")}
                  required
                  disabled={loading}
                />
                {touched.duration_months && fieldErrors.duration_months && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.duration_months}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">e.g., 36 for 3 years</p>
              </div>
            </div>

            {/* Course Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Course Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onBlur={() => handleBlur("name", formData.name)}
                placeholder="e.g., Bachelor of Computer Applications"
                className={getFieldClass("name")}
                required
                disabled={loading}
                maxLength={200}
              />
              {touched.name && fieldErrors.name && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Description <span className="text-gray-400 text-xs font-normal">(Optional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the course"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 hover:border-gray-400 transition-all text-gray-900"
                disabled={loading}
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Skills <span className="text-gray-400 text-xs font-normal">(Optional)</span>
              </label>
              <textarea
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="e.g., Python, Django, REST APIs"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 hover:border-gray-400 transition-all text-gray-900"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">Comma-separated list of skills</p>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                <span className="font-semibold">Active</span> — Course is available for use
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading}
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {course ? "Update Course" : "Create Course"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
