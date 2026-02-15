"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { validateEmail, validatePhone, validateName, validatePassword } from "@/lib/validators";

// Import Course type from the API module
type Course = {
  id: number;
  code: string;
  name: string;
  description?: string;
  duration_months: number;
  skills?: string[];
  is_active: boolean;
};

export default function RegistrationForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    interestedCourse: "",
    studyMode: "",
    paymentMethod: "",
    hasReferral: "",
    referralCode: "",
    discoverySources: [] as string[],
  });

  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    interestedCourse: "",
    studyMode: "",
    paymentMethod: "",
    referralCode: "",
    general: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [referralStatus, setReferralStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [referralMessage, setReferralMessage] = useState("");

  const discoveryOptions = [
    "Ads",
    "Social Media",
    "Friend",
    "Website",
    "Other",
  ];

  // Fetch courses on component mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await apiClient.getPublicCourses();
        setCourses(response.data);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time validation
    let error = "";
    if (name === "firstName") {
      error = validateName(value, "First name");
    } else if (name === "lastName") {
      error = validateName(value, "Last name");
    } else if (name === "email") {
      error = validateEmail(value);
    } else if (name === "phoneNumber") {
      error = validatePhone(value);
    } else if (name === "password") {
      error = validatePassword(value);
    } else if (name === "studyMode") {
      error = value ? "" : "Study mode is required";
    } else if (name === "referralCode") {
      error = value ? "" : "Referral code is required";
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleDiscoveryChange = (source: string) => {
    setFormData((prev) => {
      const exists = prev.discoverySources.includes(source);
      return {
        ...prev,
        discoverySources: exists
          ? prev.discoverySources.filter((s) => s !== source)
          : [...prev.discoverySources, source],
      };
    });
  };

  const handleHasReferralChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      hasReferral: value,
      referralCode: value === "yes" ? prev.referralCode : "",
      discoverySources: value === "no" ? prev.discoverySources : [],
    }));
    setErrors((prev) => ({ ...prev, referralCode: "" }));
    setReferralStatus("idle");
    setReferralMessage("");
  };

  useEffect(() => {
    if (formData.hasReferral !== "yes") {
      setReferralStatus("idle");
      setReferralMessage("");
      return;
    }

    const code = formData.referralCode.trim();
    if (!code) {
      setReferralStatus("idle");
      setReferralMessage("");
      return;
    }

    setReferralStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const response = await apiClient.validateReferralCode(code);
        setReferralStatus(response.valid ? "valid" : "invalid");
        setReferralMessage(response.message);
      } catch (error) {
        setReferralStatus("invalid");
        setReferralMessage("Unable to validate referral code.");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.referralCode, formData.hasReferral]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate all fields
    const firstNameError = validateName(formData.firstName, "First name");
    const lastNameError = validateName(formData.lastName, "Last name");
    const emailError = validateEmail(formData.email);
    const phoneNumberError = validatePhone(formData.phoneNumber);
    const passwordError = validatePassword(formData.password);
    const studyModeError = formData.studyMode ? "" : "Study mode is required";
    const referralCodeError =
      formData.hasReferral === "yes"
        ? formData.referralCode.trim()
          ? referralStatus === "valid"
            ? ""
            : "Please enter a valid referral code"
          : "Referral code is required"
        : "";

    setErrors({
      firstName: firstNameError,
      lastName: lastNameError,
      email: emailError,
      phoneNumber: phoneNumberError,
      password: passwordError,
      interestedCourse: "",
      studyMode: studyModeError,
      paymentMethod: "",
      referralCode: referralCodeError,
      general: "",
    });

    // If any errors exist, don't submit
    if (
      firstNameError ||
      lastNameError ||
      emailError ||
      phoneNumberError ||
      passwordError ||
      studyModeError ||
      referralCodeError
    ) {
      return;
    }

    setIsSubmitting(true);
    setSuccess(false);

    try {
      // Call backend registration API
      const response = await apiClient.registerStudent({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone_number: formData.phoneNumber,
        password: formData.password,
        interested_courses: formData.interestedCourse,
        study_mode: formData.studyMode as "LIVE" | "RECORDED" | undefined,
        payment_method: formData.paymentMethod,
        referral_code:
          formData.hasReferral === "yes"
            ? formData.referralCode.trim().toUpperCase()
            : undefined,
        discovery_sources:
          formData.hasReferral === "no" ? formData.discoverySources : [],
      });

      console.log("Registration response:", response);

      // Show success message
      setSuccess(true);

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        password: "",
        interestedCourse: "",
        studyMode: "",
        paymentMethod: "",
        hasReferral: "",
        referralCode: "",
        discoverySources: [],
      });
      setErrors({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        password: "",
        interestedCourse: "",
        studyMode: "",
        paymentMethod: "",
        referralCode: "",
        general: "",
      });
      setReferralStatus("idle");
      setReferralMessage("");

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (error) {
      console.error("Registration error:", error);
      setErrors((prev) => ({
        ...prev,
        general:
          error instanceof Error
            ? error.message
            : "Registration failed. Please try again.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-center text-foreground mb-2">
            Create Account
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Sign up to get started
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <p className="text-sm font-semibold">
                  Registration successful!
                </p>
                <p className="text-sm">
                  Your admission is pending approval. Redirecting to login...
                </p>
              </div>
            )}

            {/* General Error Message */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="text-sm">{errors.general}</p>
              </div>
            )}

            {/* First Name Field */}
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-foreground/80 mb-2"
              >
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition text-foreground ${
                  errors.firstName
                    ? "border-red-500 bg-red-50"
                    : "border-border"
                }`}
                placeholder="Enter your first name"
                disabled={isSubmitting || success}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name Field */}
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-foreground/80 mb-2"
              >
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition text-foreground ${
                  errors.lastName
                    ? "border-red-500 bg-red-50"
                    : "border-border"
                }`}
                placeholder="Enter your last name"
                disabled={isSubmitting || success}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground/80 mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition text-foreground ${
                  errors.email ? "border-red-500 bg-red-50" : "border-border"
                }`}
                placeholder="Enter your email"
                disabled={isSubmitting || success}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Phone Number Field */}
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-foreground/80 mb-2"
              >
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition text-foreground ${
                  errors.phoneNumber
                    ? "border-red-500 bg-red-50"
                    : "border-border"
                }`}
                placeholder="Enter your phone number"
                disabled={isSubmitting || success}
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.phoneNumber}
                </p>
              )}
            </div>

            {/* Interested Course Field */}
            <div>
              <label
                htmlFor="interestedCourse"
                className="block text-sm font-medium text-foreground/80 mb-2"
              >
                Interested Course
              </label>
              <select
                id="interestedCourse"
                name="interestedCourse"
                value={formData.interestedCourse}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition text-foreground ${
                  errors.interestedCourse
                    ? "border-red-500 bg-red-50"
                    : "border-border"
                }`}
                disabled={isSubmitting || success || loadingCourses}
              >
                <option value="">
                  {loadingCourses ? "Loading courses..." : "Select a course "}
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
              {errors.interestedCourse && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.interestedCourse}
                </p>
              )}
            </div>

            {/* Study Mode Field */}
            <div>
              <label
                htmlFor="studyMode"
                className="block text-sm font-medium text-foreground/80 mb-2"
              >
                Study Mode <span className="text-red-500">*</span>
              </label>
              <select
                id="studyMode"
                name="studyMode"
                value={formData.studyMode}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition text-foreground ${
                  errors.studyMode
                    ? "border-red-500 bg-red-50"
                    : "border-border"
                }`}
                disabled={isSubmitting || success}
                required
              >
                <option value="">Select study mode</option>
                <option value="LIVE">Live</option>
                <option value="RECORDED">Recorded</option>
              </select>
              {errors.studyMode && (
                <p className="mt-1 text-sm text-red-600">{errors.studyMode}</p>
              )}
            </div>

            {/* Payment Method Field */}
            <div>
              <label
                htmlFor="paymentMethod"
                className="block text-sm font-medium text-foreground/80 mb-2"
              >
                Payment Method
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition text-foreground ${
                  errors.paymentMethod
                    ? "border-red-500 bg-red-50"
                    : "border-border"
                }`}
                disabled={isSubmitting || success}
              >
                <option value="">Select payment method</option>
                <option value="FULL">Full Payment</option>
                <option value="INSTALLMENT">Installment</option>
              </select>
              {errors.paymentMethod && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.paymentMethod}
                </p>
              )}
            </div>

            {/* Referral Section */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground/80">
                Do you have a referral code?
              </label>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="radio"
                    name="hasReferral"
                    value="yes"
                    checked={formData.hasReferral === "yes"}
                    onChange={(e) => handleHasReferralChange(e.target.value)}
                    disabled={isSubmitting || success}
                  />
                  Yes
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="radio"
                    name="hasReferral"
                    value="no"
                    checked={formData.hasReferral === "no"}
                    onChange={(e) => handleHasReferralChange(e.target.value)}
                    disabled={isSubmitting || success}
                  />
                  No
                </label>
              </div>

              {formData.hasReferral === "yes" && (
                <div>
                  <label
                    htmlFor="referralCode"
                    className="block text-sm font-medium text-foreground/80 mb-2"
                  >
                    Referral Code
                  </label>
                  <input
                    type="text"
                    id="referralCode"
                    name="referralCode"
                    value={formData.referralCode}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition text-foreground ${
                      errors.referralCode || referralStatus === "invalid"
                        ? "border-red-500 bg-red-50"
                        : referralStatus === "valid"
                          ? "border-green-500 bg-green-50"
                          : "border-border"
                    }`}
                    placeholder="Enter referral code"
                    disabled={isSubmitting || success}
                  />
                  {errors.referralCode && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.referralCode}
                    </p>
                  )}
                  {!errors.referralCode && referralStatus !== "idle" && (
                    <p
                      className={`mt-1 text-sm ${
                        referralStatus === "valid"
                          ? "text-green-600"
                          : referralStatus === "checking"
                            ? "text-muted-foreground"
                            : "text-red-600"
                      }`}
                    >
                      {referralStatus === "checking"
                        ? "Checking referral code..."
                        : referralMessage}
                    </p>
                  )}
                </div>
              )}

              {formData.hasReferral === "no" && (
                <div className="bg-secondary/50 border border-border rounded-lg p-4">
                  <p className="text-sm font-medium text-foreground/80 mb-3">
                    How did you hear about us?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {discoveryOptions.map((option) => (
                      <label
                        key={option}
                        className="inline-flex items-center gap-2 text-sm text-foreground/80"
                      >
                        <input
                          type="checkbox"
                          checked={formData.discoverySources.includes(option)}
                          onChange={() => handleDiscoveryChange(option)}
                          disabled={isSubmitting || success}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground/80 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition pr-12 text-foreground ${
                    errors.password
                      ? "border-red-500 bg-red-50"
                      : "border-border"
                  }`}
                  placeholder="Enter your password"
                  disabled={isSubmitting || success}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isSubmitting || success}
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="w-full bg-primary text-white py-2.5 px-4 rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting
                ? "Registering..."
                : success
                  ? "Registration Successful!"
                  : "Register"}
            </button>
          </form>

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/"
              className="text-primary hover:text-primary font-medium"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
