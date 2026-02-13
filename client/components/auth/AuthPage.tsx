"use client";

/**
 * AuthPage.tsx
 *
 * Complete authentication page with sliding animation between Sign In and Sign Up forms.
 * Uses React state to toggle .sign-up-mode class (NOT direct DOM manipulation).
 *
 * ANIMATION LOGIC:
 * - Container has base styles for sign-in view
 * - When isSignUpMode = true, add 'signUpMode' class
 * - CSS handles all transitions (1.8s for circle, 1s for forms, 0.9s for panels)
 *
 * FORM FIELDS (Sign Up):
 * - First Name, Last Name, Email, Phone, Password, Confirm Password
 * - Course Selection (required)
 * - Study Mode & Payment Method
 * - Referral toggle (Yes/No)
 *   - If Yes: Show referral code input (validated before submit)
 *   - If No: Show discovery source checkboxes
 *
 * VALIDATION:
 * - All existing validation logic preserved
 * - Referral code validated before submission
 * - Form blocked on any validation failure
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { validateEmail, validatePhone, validatePassword, validateName } from "@/lib/validators";
import { getDashboardPathForRole } from "@/lib/roles";
import styles from "./AuthPage.module.css";

// Course type for dropdown
type Course = {
  id: number;
  code: string;
  name: string;
};

export default function AuthPage() {
  const router = useRouter();

  // ============================================
  // ANIMATION STATE
  // Toggle this to switch between sign-in and sign-up views
  // ============================================
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================
  // LOGIN FORM STATE
  // ============================================
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // ============================================
  // REGISTRATION FORM STATE
  // All fields from existing registration
  // ============================================
  const [registerData, setRegisterData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    password: "",
    confirmPassword: "",
    interested_courses: "",
    payment_method: "",
    study_mode: "",
    hasReferral: "no",
    referralCode: "",
    discoverySources: [] as string[],
  });

  // Form errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password visibility toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Courses list from API
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Referral validation state
  const [referralStatus, setReferralStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [referralMessage, setReferralMessage] = useState("");

  // Discovery source options
  const discoveryOptions = [
    "Advertisement",
    "YouTube",
    "Friend",
    "Instagram",
    "Other",
  ];

  // ============================================
  // FETCH COURSES ON MOUNT
  // ============================================
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await apiClient.getPublicCourses();
        setCourses(response.data || []);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // ============================================
  // REFERRAL CODE VALIDATION (debounced)
  // Validates referral code when user types
  // ============================================
  useEffect(() => {
    if (registerData.hasReferral !== "yes") {
      setReferralStatus("idle");
      setReferralMessage("");
      return;
    }

    const code = registerData.referralCode.trim();
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
  }, [registerData.referralCode, registerData.hasReferral]);

  // ============================================
  // TOGGLE BETWEEN SIGN-IN AND SIGN-UP
  // This controls the sliding animation via CSS class
  // ============================================
  const handleSignUpClick = () => {
    setIsSignUpMode(true);
    setErrors({});
  };

  const handleSignInClick = () => {
    setIsSignUpMode(false);
    setErrors({});
  };

  // ============================================
  // LOGIN SUBMIT HANDLER
  // ============================================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(loginData.email);
    const passwordError = loginData.password ? "" : "Password is required";

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await apiClient.login({
        email: loginData.email,
        password: loginData.password,
      });

      // Role-based routing after successful login
      const roleCode = response.user.role.code.toUpperCase();
      const targetPath = getDashboardPathForRole(roleCode);

      window.location.href = targetPath;
    } catch (error) {
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Login failed. Please check your credentials.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // REGISTRATION SUBMIT HANDLER
  // All existing logic preserved
  // ============================================
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};

    const firstNameError = validateName(registerData.first_name, "First name");
    if (firstNameError) newErrors.first_name = firstNameError;

    const lastNameError = validateName(registerData.last_name, "Last name");
    if (lastNameError) newErrors.last_name = lastNameError;

    const emailError = validateEmail(registerData.email);
    if (emailError) newErrors.email = emailError;

    const phoneError = validatePhone(registerData.phone_number);
    if (phoneError) newErrors.phone_number = phoneError;

    const passwordError = validatePassword(registerData.password);
    if (passwordError) newErrors.password = passwordError;

    if (registerData.password !== registerData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Course is required
    if (!registerData.interested_courses) {
      newErrors.interested_courses = "Please select a course";
    }

    // Study mode is required
    if (!registerData.study_mode) {
      newErrors.study_mode = "Study mode is required";
    }

    // Payment method is required
    if (!registerData.payment_method) {
      newErrors.payment_method = "Payment method is required";
    }

    // Referral validation
    if (registerData.hasReferral === "yes") {
      if (!registerData.referralCode.trim()) {
        newErrors.referralCode = "Referral code is required";
      } else if (referralStatus !== "valid") {
        newErrors.referralCode = "Please enter a valid referral code";
      }
    }

    // Discovery source validation (required if no referral)
    if (
      registerData.hasReferral === "no" &&
      registerData.discoverySources.length === 0
    ) {
      newErrors.discoverySources = "Please select how you heard about us";
    }

    // Block submission if any errors
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Build payload (same structure as existing API)
      const payload: any = {
        first_name: registerData.first_name,
        last_name: registerData.last_name,
        email: registerData.email,
        phone_number: registerData.phone_number,
        password: registerData.password,
        interested_courses: registerData.interested_courses,
        payment_method: registerData.payment_method,
        study_mode: registerData.study_mode,
        discovery_sources:
          registerData.hasReferral === "no"
            ? registerData.discoverySources
            : [],
      };

      // Add referral code if provided
      if (
        registerData.hasReferral === "yes" &&
        registerData.referralCode.trim()
      ) {
        payload.referral_code = registerData.referralCode.trim().toUpperCase();
      }

      await apiClient.registerStudent(payload);

      // Show success and switch to login
      setErrors({
        success: "Registration successful! Please sign in to continue.",
      });

      // Reset form and switch to sign-in after delay
      setTimeout(() => {
        setIsSignUpMode(false);
        setErrors({});
        setRegisterData({
          first_name: "",
          last_name: "",
          email: "",
          phone_number: "",
          password: "",
          confirmPassword: "",
          interested_courses: "",
          payment_method: "",
          study_mode: "",
          hasReferral: "no",
          referralCode: "",
          discoverySources: [],
        });
      }, 2000);
    } catch (error) {
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Registration failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // HANDLE DISCOVERY SOURCE TOGGLE
  // ============================================
  const handleDiscoveryChange = (source: string) => {
    setRegisterData((prev) => {
      const exists = prev.discoverySources.includes(source);
      return {
        ...prev,
        discoverySources: exists
          ? prev.discoverySources.filter((s) => s !== source)
          : [...prev.discoverySources, source],
      };
    });
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div
      className={`${styles.container} ${isSignUpMode ? styles.signUpMode : ""}`}
    >
      {/* ============================================
          FORMS CONTAINER
          Contains both sign-in and sign-up forms
          ============================================ */}
      <div className={styles.formsContainer}>
        <div className={styles.signinSignup}>
          {/* ============================================
              SIGN IN FORM
              ============================================ */}
          <form
            onSubmit={handleLoginSubmit}
            className={`${styles.authForm} ${styles.signInForm}`}
          >
            <h2 className={styles.title}>Sign in</h2>

            {/* Error Alert */}
            {errors.general && !isSignUpMode && (
              <div className={styles.alertError}>
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  width="20"
                  height="20"
                  style={{ minWidth: "20px" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{errors.general}</span>
              </div>
            )}

            {/* Email Field */}
            <div className={styles.inputField}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                />
              </svg>
              <input
                type="email"
                placeholder="Email"
                value={loginData.email}
                onChange={(e) =>
                  setLoginData({ ...loginData, email: e.target.value })
                }
              />
            </div>
            {errors.email && !isSignUpMode && (
              <span className={styles.errorText}>{errors.email}</span>
            )}

            {/* Password Field */}
            <div className={styles.inputField}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <input
                type={showLoginPassword ? "text" : "password"}
                placeholder="Password"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowLoginPassword(!showLoginPassword)}
              >
                {showLoginPassword ? (
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
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
                )}
              </button>
            </div>
            {errors.password && !isSignUpMode && (
              <span className={styles.errorText}>{errors.password}</span>
            )}

            <button
              type="submit"
              className={`${styles.btn} ${styles.btnSolid}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Loading..." : "Login"}
            </button>
          </form>

          {/* ============================================
              SIGN UP FORM
              All fields with validation
              ============================================ */}
          <form
            onSubmit={handleRegisterSubmit}
            className={`${styles.authForm} ${styles.signUpForm} ${styles.scrollableForm}`}
          >
            <h2 className={styles.title}>Sign up</h2>

            {/* Success Alert */}
            {errors.success && (
              <div className={styles.alertSuccess}>
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  width="20"
                  height="20"
                  style={{ minWidth: "20px" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{errors.success}</span>
              </div>
            )}

            {/* Error Alert */}
            {errors.general && isSignUpMode && (
              <div className={styles.alertError}>
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  width="20"
                  height="20"
                  style={{ minWidth: "20px" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{errors.general}</span>
              </div>
            )}

            {/* First Name & Last Name Row */}
            <div className={styles.fieldRow}>
              <div className={`${styles.inputField} ${styles.inputFieldSmall}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="First Name"
                  value={registerData.first_name}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      first_name: e.target.value,
                    })
                  }
                />
              </div>
              <div className={`${styles.inputField} ${styles.inputFieldSmall}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Last Name"
                  value={registerData.last_name}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      last_name: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            {(errors.first_name || errors.last_name) && (
              <span className={styles.errorText}>
                {errors.first_name || errors.last_name}
              </span>
            )}

            {/* Email Field */}
            <div className={styles.inputField}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <input
                type="email"
                placeholder="Email"
                value={registerData.email}
                onChange={(e) =>
                  setRegisterData({ ...registerData, email: e.target.value })
                }
              />
            </div>
            {errors.email && isSignUpMode && (
              <span className={styles.errorText}>{errors.email}</span>
            )}

            {/* Phone Number Field */}
            <div className={styles.inputField}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <input
                type="tel"
                placeholder="Phone Number"
                value={registerData.phone_number}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    phone_number: e.target.value,
                  })
                }
              />
            </div>
            {errors.phone_number && (
              <span className={styles.errorText}>{errors.phone_number}</span>
            )}

            {/* Course Selection Dropdown */}
            <div className={styles.inputField}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <select
                value={registerData.interested_courses}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    interested_courses: e.target.value,
                  })
                }
              >
                <option value="">Select Course</option>
                {loadingCourses ? (
                  <option disabled>Loading courses...</option>
                ) : (
                  courses.map((course) => (
                    <option key={course.id} value={course.code}>
                      {course.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            {errors.interested_courses && (
              <span className={styles.errorText}>
                {errors.interested_courses}
              </span>
            )}

            {/* Study Mode & Payment Method Row */}
            <div className={styles.fieldRow}>
              <div className={`${styles.inputField} ${styles.inputFieldSmall}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <select
                  value={registerData.study_mode}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      study_mode: e.target.value,
                    })
                  }
                >
                  <option value="">Study Mode</option>
                  <option value="LIVE">Live</option>
                  <option value="RECORDED">Recorded</option>
                </select>
              </div>
              <div className={`${styles.inputField} ${styles.inputFieldSmall}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <select
                  value={registerData.payment_method}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      payment_method: e.target.value,
                    })
                  }
                >
                  <option value="">Payment</option>
                  <option value="FULL">Full Payment</option>
                  <option value="INSTALLMENT">Installment</option>
                </select>
              </div>
            </div>
            {(errors.study_mode || errors.payment_method) && (
              <span className={styles.errorText}>
                {errors.study_mode || errors.payment_method}
              </span>
            )}

            {/* ============================================
                REFERRAL SECTION
                Conditional rendering based on Yes/No selection
                ============================================ */}
            <p className={styles.fieldLabel}>Do you have a referral code?</p>
            <div className={styles.radioGroup}>
              <label>
                <input
                  type="radio"
                  name="hasReferral"
                  value="no"
                  checked={registerData.hasReferral === "no"}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      hasReferral: e.target.value,
                      referralCode: "",
                    })
                  }
                />
                No
              </label>
              <label>
                <input
                  type="radio"
                  name="hasReferral"
                  value="yes"
                  checked={registerData.hasReferral === "yes"}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      hasReferral: e.target.value,
                      discoverySources: [],
                    })
                  }
                />
                Yes
              </label>
            </div>

            {/* ============================================
                CONDITIONAL: Referral Code Input
                Shown only when hasReferral = "yes"
                Validated in real-time before submission
                ============================================ */}
            {registerData.hasReferral === "yes" && (
              <>
                <div className={styles.inputField}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Enter Referral Code"
                    value={registerData.referralCode}
                    onChange={(e) =>
                      setRegisterData({
                        ...registerData,
                        referralCode: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
                {/* Show referral validation status */}
                {referralStatus === "checking" && (
                  <span className={styles.errorText} style={{ color: "#666" }}>
                    Validating...
                  </span>
                )}
                {referralStatus === "valid" && (
                  <span
                    className={styles.errorText}
                    style={{ color: "#27ae60" }}
                  >
                    {referralMessage}
                  </span>
                )}
                {referralStatus === "invalid" && (
                  <span className={styles.errorText}>{referralMessage}</span>
                )}
                {errors.referralCode && (
                  <span className={styles.errorText}>
                    {errors.referralCode}
                  </span>
                )}
              </>
            )}

            {/* ============================================
                CONDITIONAL: Discovery Source Checkboxes
                Shown only when hasReferral = "no"
                At least one must be selected
                ============================================ */}
            {registerData.hasReferral === "no" && (
              <>
                <p className={styles.fieldLabel}>How did you hear about us?</p>
                <div className={styles.checkboxGroup}>
                  {discoveryOptions.map((source) => (
                    <label key={source}>
                      <input
                        type="checkbox"
                        checked={registerData.discoverySources.includes(source)}
                        onChange={() => handleDiscoveryChange(source)}
                      />
                      {source}
                    </label>
                  ))}
                </div>
                {errors.discoverySources && (
                  <span className={styles.errorText}>
                    {errors.discoverySources}
                  </span>
                )}
              </>
            )}

            {/* Password & Confirm Password Row */}
            <div className={styles.fieldRow}>
              <div className={`${styles.inputField} ${styles.inputFieldSmall}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={registerData.password}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      password: e.target.value,
                    })
                  }
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
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
                  )}
                </button>
              </div>
              <div className={`${styles.inputField} ${styles.inputFieldSmall}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm"
                  value={registerData.confirmPassword}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
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
                  )}
                </button>
              </div>
            </div>
            {(errors.password || errors.confirmPassword) && (
              <span className={styles.errorText}>
                {errors.password || errors.confirmPassword}
              </span>
            )}

            <button
              type="submit"
              className={styles.btn}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Loading..." : "Sign up"}
            </button>
          </form>
        </div>
      </div>

      {/* ============================================
          PANELS CONTAINER
          Left panel: "New here?" with Sign Up button
          Right panel: "One of us?" with Sign In button
          ============================================ */}
      <div className={styles.panelsContainer}>
        {/* Left Panel - Visible in sign-in mode */}
        <div className={`${styles.panel} ${styles.leftPanel}`}>
          <div className={styles.panelContent}>
            <h3>New Here?</h3>
            <p>
              Create an account and start your learning journey with us today!
            </p>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnTransparent}`}
              onClick={handleSignUpClick}
            >
              Sign up
            </button>
          </div>
          {/* Decorative image placeholder */}
          <div className={styles.image}>
            <svg
              viewBox="0 0 400 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="200" cy="200" r="150" fill="rgba(255,255,255,0.1)" />
              <path
                d="M150 280 L200 180 L250 280 Z"
                fill="rgba(255,255,255,0.2)"
              />
              <circle cx="200" cy="150" r="40" fill="rgba(255,255,255,0.2)" />
            </svg>
          </div>
        </div>

        {/* Right Panel - Visible in sign-up mode */}
        <div className={`${styles.panel} ${styles.rightPanel}`}>
          <div className={styles.panelContent}>
            <h3>One of us?</h3>
            <p>
              Sign in to continue your learning experience and access your
              dashboard!
            </p>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnTransparent}`}
              onClick={handleSignInClick}
            >
              Sign in
            </button>
          </div>
          {/* Decorative image placeholder */}
          <div className={styles.image}>
            <svg
              viewBox="0 0 400 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="100"
                y="150"
                width="200"
                height="150"
                rx="10"
                fill="rgba(255,255,255,0.1)"
              />
              <circle cx="200" cy="120" r="50" fill="rgba(255,255,255,0.15)" />
              <rect
                x="130"
                y="180"
                width="60"
                height="80"
                fill="rgba(255,255,255,0.1)"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
