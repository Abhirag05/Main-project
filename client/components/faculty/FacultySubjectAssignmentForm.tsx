"use client";

import { useState, useEffect } from "react";
import {
  apiClient,
  FacultyProfile,
  AcademicModule,
  AssignSubjectToFacultyRequest,
} from "@/lib/api";

interface FacultySubjectAssignmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedFacultyId?: number | null;
}

interface FieldErrors {
  faculty_id?: string;
  module_id?: string;
}

export default function FacultySubjectAssignmentForm({
  isOpen,
  onClose,
  onSuccess,
  selectedFacultyId,
}: FacultySubjectAssignmentFormProps) {
  const [formData, setFormData] = useState<AssignSubjectToFacultyRequest>({
    faculty_id: 0,
    module_id: 0,
  });
  const [facultyList, setFacultyList] = useState<FacultyProfile[]>([]);
  const [subjectList, setSubjectList] = useState<AcademicModule[]>([]);
  const [assignedModuleIds, setAssignedModuleIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
      setError("");
      if (selectedFacultyId) {
        setFormData((prevData) => ({
          ...prevData,
          faculty_id: selectedFacultyId,
        }));
      }
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

  const fetchDropdownData = async () => {
    setLoadingData(true);
    try {
      const [faculties, subjects] = await Promise.all([
        apiClient.getFacultyProfiles({ is_active: true }),
        apiClient.getAcademicModules(),
      ]);

      setFacultyList(Array.isArray(faculties) ? faculties : []);
      setSubjectList(
        Array.isArray(subjects) ? subjects.filter((s) => s.is_active) : [],
      );
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load data");
    } finally {
      setLoadingData(false);
    }
  };

  const fetchAssignedModules = async (facultyId: number) => {
    try {
      const assignments = await apiClient.getFacultySubjectAssignments({
        faculty_id: facultyId,
        is_active: true,
      });
      if (Array.isArray(assignments)) {
        const ids = Array.from(
          new Set(
            assignments
              .map((a) => a.module?.id || a.subject?.id)
              .filter(Boolean) as number[],
          ),
        );
        setAssignedModuleIds(ids);
      } else {
        setAssignedModuleIds([]);
      }
    } catch (err) {
      setAssignedModuleIds([]);
    }
  };

  useEffect(() => {
    const facultyToCheck = selectedFacultyId || formData.faculty_id;
    if (facultyToCheck && facultyToCheck !== 0) {
      fetchAssignedModules(facultyToCheck);
    } else {
      setAssignedModuleIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFacultyId, formData.faculty_id, isOpen]);

  if (!isOpen) return null;

  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case "faculty_id":
        if (!value || Number(value) === 0) return "Please select a faculty member";
        return undefined;
      case "module_id":
        if (!value || Number(value) === 0) return "Please select a module";
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

    if (!selectedFacultyId) {
      const facErr = validateField("faculty_id", formData.faculty_id);
      if (facErr) { errors.faculty_id = facErr; valid = false; }
    }
    const modErr = validateField("module_id", formData.module_id);
    if (modErr) { errors.module_id = modErr; valid = false; }

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
    // Validation
    if (!formData.faculty_id || formData.faculty_id === 0) {
      setError("Please select a faculty member");
      return;
    }
    if (!formData.module_id || formData.module_id === 0) {
      setError("Please select a module");
      return;
    }

    setLoading(true);

    try {
      // The API expects `module_id` now
      await apiClient.assignSubjectToFaculty(formData);
      onSuccess();
      onClose();
      setFormData({ faculty_id: 0, module_id: 0 });
    } catch (err) {
      const error = err as Error;
      if (
        error.message.includes("already assigned") ||
        error.message.includes("already exists")
      ) {
        setError(
          "This faculty member is already assigned to this module. Please choose a different module.",
        );
      } else {
        setError(error.message || "Failed to assign module");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ faculty_id: 0, module_id: 0 });
      setError("");
      setFieldErrors({});
      setTouched({});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {selectedFacultyId ? "Assign Module" : "Assign Module to Faculty"}
            </h2>
            <p className="text-indigo-100 text-sm mt-0.5">
              Link a module to a faculty member
            </p>
          </div>
          <button
            onClick={handleClose}
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

          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-16">
              <svg className="animate-spin h-10 w-10 text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-muted-foreground">Loading faculty and modules...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Faculty Dropdown - Only show if not pre-selected */}
              {!selectedFacultyId && (
                <div>
                  <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                    Faculty Member <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.faculty_id}
                    onChange={(e) => {
                      setFormData({ ...formData, faculty_id: parseInt(e.target.value) });
                      handleBlur("faculty_id", parseInt(e.target.value));
                    }}
                    onBlur={() => handleBlur("faculty_id", formData.faculty_id)}
                    className={getFieldClass("faculty_id")}
                    required
                    disabled={loading}
                  >
                    <option value={0}>Select Faculty</option>
                    {facultyList.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.employee_code} - {faculty.user.full_name} ({faculty.designation})
                      </option>
                    ))}
                  </select>
                  {touched.faculty_id && fieldErrors.faculty_id && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.faculty_id}</p>
                  )}
                </div>
              )}

              {/* Subject Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                  Module <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.module_id}
                  onChange={(e) => {
                    setFormData({ ...formData, module_id: parseInt(e.target.value) });
                    handleBlur("module_id", parseInt(e.target.value));
                  }}
                  onBlur={() => handleBlur("module_id", formData.module_id)}
                  className={getFieldClass("module_id")}
                  required
                  disabled={loading}
                >
                  <option value={0}>Select Module</option>
                  {subjectList
                    .filter((subject) => !assignedModuleIds.includes(subject.id))
                    .map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.code} - {subject.name}
                      </option>
                    ))}
                </select>
                {touched.module_id && fieldErrors.module_id && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.module_id}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Only active modules not already assigned to this faculty are shown
                </p>
              </div>

              {/* Information Box */}
              <div className="bg-primary/10 border-l-4 border-primary/70 rounded-r-lg p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-primary/80 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3 text-sm text-primary">
                    <p className="font-semibold">Assignment Info</p>
                    <p className="mt-1">
                      Assigning a module to faculty allows them to teach that module across different batches.
                      You can deactivate assignments later if needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 border-2 border-border text-foreground/80 font-semibold rounded-lg hover:bg-secondary/50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={loading}
                >
                  {loading && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  Assign Module
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
