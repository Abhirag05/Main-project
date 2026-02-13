"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";
import { validateEmail } from "@/lib/validators";

interface AddUserFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  role_code?: string;
  designation?: string;
  joining_date?: string;
}

export default function AddUserForm({ onSuccess, onCancel }: AddUserFormProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role_code: "FACULTY",
    designation: "",
    joining_date: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case "full_name":
        if (!value.trim()) return "Full name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        if (!/^[a-zA-Z\s.'-]+$/.test(value)) return "Please enter a valid name";
        return undefined;
      
      case "email":
        if (!value.trim()) return "Email is required";
        return validateEmail(value) || undefined;
      
      case "phone":
        if (value && !/^[+]?[\d\s()-]{10,}$/.test(value)) {
          return "Please enter a valid phone number";
        }
        return undefined;
      
      case "designation":
        if (!value.trim()) return "Designation is required";
        return undefined;
      
      case "joining_date":
        if (!value) return "Joining date is required";
        if (value && new Date(value) > new Date()) {
          return "Joining date cannot be in the future";
        }
        return undefined;
      
      default:
        return undefined;
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError(null);
    
    // Validate field if it has been touched
    if (touched[name]) {
      const error = validateField(name, value);
      setFieldErrors(prev => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const error = validateField(name, value);
    setFieldErrors(prev => ({
      ...prev,
      [name]: error,
    }));
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) {
        errors[key as keyof FormErrors] = error;
        isValid = false;
      }
    });

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => ({
      ...acc,
      [key]: true,
    }), {});
    setTouched(allTouched);

    // Validate all fields
    if (!validateForm()) {
      setError("Please correct the errors before submitting");
      setIsSubmitting(false);
      return;
    }

    try {
      // Create faculty
      const userData: any = {
        email: formData.email.trim(),
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || undefined,
        role_code: "FACULTY",
        designation: formData.designation.trim(),
        joining_date: formData.joining_date,
      };

      await apiClient.createUser(userData);

      setSuccess(true);
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        role_code: "FACULTY",
        designation: "",
        joining_date: "",
      });
      setFieldErrors({});
      setTouched({});

      // Call onSuccess callback after a short delay
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to create faculty. Please try again.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldClassName = (fieldName: keyof FormErrors) => {
    const baseClasses = "w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 text-gray-900 bg-white";
    const hasError = touched[fieldName] && fieldErrors[fieldName];
    
    if (hasError) {
      return `${baseClasses} border-red-300 focus:border-red-500 focus:ring-red-200`;
    }
    return `${baseClasses} border-gray-300 focus:border-blue-500 focus:ring-blue-200 hover:border-gray-400`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
        <h2 className="text-2xl font-bold text-white">Add New Faculty</h2>
        <p className="text-blue-100 mt-1 text-sm">Create a new faculty account</p>
      </div>

      <div className="px-8 py-6">
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg" role="alert">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-green-800">
                  Faculty created successfully!
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Default password: <span className="font-mono font-semibold bg-green-100 px-2 py-0.5 rounded">ChangeMe@123</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg" role="alert">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="md:col-span-2">
                <label
                  htmlFor="full_name"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Full Name <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  aria-required="true"
                  aria-invalid={!!(touched.full_name && fieldErrors.full_name)}
                  aria-describedby={fieldErrors.full_name ? "full_name-error" : undefined}
                  className={getFieldClassName("full_name")}
                  placeholder="Enter full name"
                />
                {touched.full_name && fieldErrors.full_name && (
                  <p id="full_name-error" className="mt-1.5 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.full_name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Email Address <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  aria-required="true"
                  aria-invalid={!!(touched.email && fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  className={getFieldClassName("email")}
                  placeholder="user@example.com"
                />
                {touched.email && fieldErrors.email && (
                  <p id="email-error" className="mt-1.5 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Phone Number <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={!!(touched.phone && fieldErrors.phone)}
                  aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                  className={getFieldClassName("phone")}
                  placeholder="+1 (555) 000-0000"
                />
                {touched.phone && fieldErrors.phone && (
                  <p id="phone-error" className="mt-1.5 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* Faculty-specific fields */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Faculty Information
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Employee code will be auto-generated (e.g., FAC001, FAC002...)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Designation */}
              <div>
                <label
                  htmlFor="designation"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Designation <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  type="text"
                  id="designation"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  aria-required="true"
                  aria-invalid={!!(touched.designation && fieldErrors.designation)}
                  aria-describedby={fieldErrors.designation ? "designation-error" : undefined}
                  className={getFieldClassName("designation")}
                  placeholder="e.g., Assistant Professor"
                />
                {touched.designation && fieldErrors.designation && (
                  <p id="designation-error" className="mt-1.5 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.designation}
                  </p>
                )}
              </div>

              {/* Joining Date */}
              <div>
                <label
                  htmlFor="joining_date"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Joining Date <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  type="date"
                  id="joining_date"
                  name="joining_date"
                  value={formData.joining_date}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  max={new Date().toISOString().split("T")[0]}
                  aria-required="true"
                  aria-invalid={!!(touched.joining_date && fieldErrors.joining_date)}
                  aria-describedby={fieldErrors.joining_date ? "joining_date-error" : undefined}
                  className={getFieldClassName("joining_date")}
                />
                {touched.joining_date && fieldErrors.joining_date && (
                  <p id="joining_date-error" className="mt-1.5 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.joining_date}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-200">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial sm:min-w-[140px] px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:min-w-[180px] px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Faculty...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Faculty
                </>
              )}
            </button>
          </div>
        </form>

        {/* Information Notice */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Important Information</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Default password: <span className="font-mono font-semibold bg-white px-2 py-0.5 rounded border border-blue-200">ChangeMe@123</span></span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Faculty will be assigned to the default centre automatically</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Faculty must change their password on first login</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
