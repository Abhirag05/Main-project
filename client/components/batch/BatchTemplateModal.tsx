"use client";

import { useState, useEffect } from 'react';
import { apiClient, BatchTemplate, Course, CreateBatchTemplateRequest } from '@/lib/api';

interface BatchTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template?: BatchTemplate | null;
  courses: Course[];
}

interface FieldErrors {
  course?: string;
  name?: string;
  max_students?: string;
}

export default function BatchTemplateModal({
  isOpen,
  onClose,
  onSuccess,
  template,
  courses
}: BatchTemplateModalProps) {
  const [formData, setFormData] = useState<CreateBatchTemplateRequest>({
    course: 0,
    name: '',
    mode: 'LIVE',
    max_students: 30,
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (template) {
      setFormData({
        course: template.course,
        name: template.name,
        mode: template.mode,
        max_students: template.max_students,
        is_active: template.is_active
      });
    } else {
      setFormData({
        course: courses.length > 0 ? courses[0].id : 0,
        name: '',
        mode: 'LIVE',
        max_students: 30,
        is_active: true
      });
    }
    setError('');
    setFieldErrors({});
    setTouched({});
  }, [template, courses, isOpen]);

  if (!isOpen) return null;

  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case 'course':
        if (!value || Number(value) === 0) return 'Please select a course';
        return undefined;
      case 'name':
        if (!String(value).trim()) return 'Template name is required';
        if (String(value).trim().length < 3) return 'Name must be at least 3 characters';
        return undefined;
      case 'max_students':
        if (!value || Number(value) <= 0) return 'Max students must be greater than 0';
        if (Number(value) > 500) return 'Max students cannot exceed 500';
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
    (['course', 'name', 'max_students'] as const).forEach((key) => {
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
    setError('');

    if (!validateForm()) {
      setError('Please correct the errors before submitting');
      return;
    }

    setLoading(true);

    try {
      if (template) {
        await apiClient.updateBatchTemplate(template.id, formData);
      } else {
        await apiClient.createBatchTemplate(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {template ? 'Edit Batch Template' : 'Create Batch Template'}
            </h2>
            <p className="text-rose-100 text-sm mt-0.5">
              {template ? 'Update template configuration' : 'Define a new batch template'}
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
            {/* Course Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                Course <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.course}
                onChange={(e) => {
                  setFormData({ ...formData, course: parseInt(e.target.value) });
                  handleBlur('course', parseInt(e.target.value));
                }}
                onBlur={() => handleBlur('course', formData.course)}
                className={getFieldClass('course')}
                required
                disabled={loading}
              >
                <option value={0}>Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
              {touched.course && fieldErrors.course && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.course}</p>
              )}
            </div>

            {/* Template Name */}
            <div>
              <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onBlur={() => handleBlur('name', formData.name)}
                placeholder="e.g., Python Full Stack - Regular"
                className={getFieldClass('name')}
                required
                disabled={loading}
              />
              {touched.name && fieldErrors.name && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            {/* Mode Radio Buttons */}
            <div>
              <label className="block text-sm font-semibold text-foreground/80 mb-2">
                Mode <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2.5 px-4 py-3 border rounded-lg cursor-pointer transition-all ${formData.mode === 'LIVE' ? 'border-primary bg-primary/10 ring-2 ring-ring/30' : 'border-border hover:border-border'}`}>
                  <input
                    type="radio"
                    value="LIVE"
                    checked={formData.mode === 'LIVE'}
                    onChange={() => setFormData({ ...formData, mode: 'LIVE' })}
                    className="text-primary focus:ring-ring"
                    disabled={loading}
                  />
                  <div>
                    <span className="text-sm font-semibold text-foreground/80">Live</span>
                    <p className="text-xs text-muted-foreground">Real-time classes</p>
                  </div>
                </label>
                <label className={`flex items-center gap-2.5 px-4 py-3 border rounded-lg cursor-pointer transition-all ${formData.mode === 'RECORDED' ? 'border-primary bg-primary/10 ring-2 ring-ring/30' : 'border-border hover:border-border'}`}>
                  <input
                    type="radio"
                    value="RECORDED"
                    checked={formData.mode === 'RECORDED'}
                    onChange={() => setFormData({ ...formData, mode: 'RECORDED' })}
                    className="text-primary focus:ring-ring"
                    disabled={loading}
                  />
                  <div>
                    <span className="text-sm font-semibold text-foreground/80">Recorded</span>
                    <p className="text-xs text-muted-foreground">Pre-recorded content</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Max Students */}
            <div>
              <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
                Max Students <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.max_students}
                onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 0 })}
                onBlur={() => handleBlur('max_students', formData.max_students)}
                min="1"
                max="500"
                className={getFieldClass('max_students')}
                required
                disabled={loading}
              />
              {touched.max_students && fieldErrors.max_students && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.max_students}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">Maximum number of students per batch</p>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <input
                type="checkbox"
                id="batch_is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-primary focus:ring-ring border-border rounded"
                disabled={loading}
              />
              <label htmlFor="batch_is_active" className="text-sm text-foreground/80">
                <span className="font-semibold">Active</span> — Template is available for batch creation
              </label>
            </div>

            {/* Actions */}
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
                className="px-6 py-2.5 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading}
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {template ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
