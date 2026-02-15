"use client";

import { useState, useEffect } from "react";
import { apiClient, AcademicModule, createModuleRequest } from "@/lib/api";

interface SubjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subject?: AcademicModule | null;
}

interface FieldErrors {
  code?: string;
  name?: string;
}

export default function SubjectForm({
  isOpen,
  onClose,
  onSuccess,
  subject,
}: SubjectFormProps) {
  const [formData, setFormData] = useState<createModuleRequest>({
    code: "",
    name: "",
    description: "",
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (subject) {
      setFormData({
        code: subject.code,
        name: subject.name,
        description: subject.description || "",
        is_active: subject.is_active,
      });
    } else {
      setFormData({
        code: "",
        name: "",
        description: "",
        is_active: true,
      });
    }
    setError("");
    setFieldErrors({});
    setTouched({});
  }, [subject, isOpen]);

  if (!isOpen) return null;

  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case "code":
        if (!String(value).trim()) return "Module code is required";
        if (String(value).trim().length < 2) return "Code must be at least 2 characters";
        if (!/^[A-Za-z0-9_-]+$/.test(String(value).trim())) return "Code can only contain letters, numbers, hyphens, and underscores";
        return undefined;
      case "name":
        if (!String(value).trim()) return "Module name is required";
        if (String(value).trim().length < 3) return "Name must be at least 3 characters";
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
    (["code", "name"] as const).forEach((key) => {
      const err = validateField(key, formData[key]);
      if (err) { errors[key] = err; valid = false; }
    });
    setFieldErrors(errors);
    return valid;
  };

  const getFieldClass = (name: keyof FieldErrors) => {
    const base = "w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all text-foreground";
    if (touched[name] && fieldErrors[name]) {
      return `${base} border-red-300 focus:border-red-500 focus:ring-red-200`;
    }
    return `${base} border-border focus:border-ring focus:ring-ring/30 hover:border-border`;
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
    };

    setLoading(true);

    try {
      if (subject) {
        await apiClient.updateModule(subject.id, submitData);
      } else {
        await apiClient.createModule(submitData);
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
      <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {subject ? "Edit Module" : "Add New Module"}
            </h2>
            <p className="text-violet-100 text-sm mt-0.5">
              {subject ? "Update module information" : "Create a new academic module"}
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
            {/* Module Code */}
            <div>
              <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                Module Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                onBlur={() => handleBlur("code", formData.code)}
                placeholder="e.g., MATH101, CS201, PHY301"
                className={getFieldClass("code")}
                required
                disabled={loading}
                maxLength={50}
              />
              {touched.code && fieldErrors.code && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.code}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">Uppercase code identifier</p>
            </div>

            {/* Module Name */}
            <div>
              <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                Module Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onBlur={() => handleBlur("name", formData.name)}
                placeholder="e.g., Mathematics I, Computer Science Fundamentals"
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
              <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                Description <span className="text-muted-foreground/70 text-xs font-normal">(Optional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description about the module"
                rows={3}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:border-ring focus:ring-ring/30 hover:border-border transition-all text-foreground"
                disabled={loading}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-primary focus:ring-ring border-border rounded"
                disabled={loading}
              />
              <label htmlFor="is_active" className="text-sm text-foreground/80">
                <span className="font-semibold">Active</span> — Module is available for use
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border-2 border-border text-foreground/80 font-semibold rounded-lg hover:bg-secondary/50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading}
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {subject ? "Update Module" : "Create Module"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
