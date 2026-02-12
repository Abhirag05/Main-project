/**
 * Centralized validation utilities.
 *
 * Every validator returns an empty string on success or an error message on failure.
 * This keeps call-sites simple:
 *
 *   const err = validateEmail(email);
 *   if (err) setError(err);
 */

// ─── Primitives ──────────────────────────────────────────────

/** Fail when a string/number/null/undefined value is empty or missing. */
export function validateRequired(
  value: string | number | null | undefined,
  label: string
): string {
  if (value === null || value === undefined) return `${label} is required`;
  if (typeof value === "string" && !value.trim()) return `${label} is required`;
  return "";
}

/** Fail when a trimmed string is shorter than `min` characters. */
export function validateMinLength(
  value: string,
  min: number,
  label: string
): string {
  if (value.trim().length < min)
    return `${label} must be at least ${min} characters`;
  return "";
}

/** Fail when a number is ≤ 0. */
export function validatePositiveNumber(
  value: number,
  label: string
): string {
  if (value <= 0) return `${label} must be greater than 0`;
  return "";
}

// ─── Identity fields ─────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string {
  const req = validateRequired(email, "Email");
  if (req) return req;
  if (!EMAIL_RE.test(email.trim())) return "Please enter a valid email address";
  return "";
}

const PHONE_CHARS_RE = /^[\d\s()+-]+$/;

export function validatePhone(phone: string): string {
  const req = validateRequired(phone, "Phone number");
  if (req) return req;
  if (!PHONE_CHARS_RE.test(phone))
    return "Phone number can only contain digits, spaces, +, -, (, )";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10)
    return "Phone number must contain at least 10 digits";
  return "";
}

export function validateName(name: string, fieldLabel = "Name"): string {
  const req = validateRequired(name, fieldLabel);
  if (req) return req;
  return validateMinLength(name, 2, fieldLabel);
}

// ─── Passwords ───────────────────────────────────────────────

/**
 * Strict rules for **registration** — requires upper, lower, digit & special char.
 */
export function validatePassword(password: string): string {
  const req = validateRequired(password, "Password");
  if (req) return req;
  if (password.length < 8)
    return "Password must be at least 8 characters long";
  if (!/[a-z]/.test(password))
    return "Password must contain at least one lowercase letter";
  if (!/[A-Z]/.test(password))
    return "Password must contain at least one uppercase letter";
  if (!/\d/.test(password))
    return "Password must contain at least one number";
  if (!/[@$!%*?&]/.test(password))
    return "Password must contain at least one special character (@$!%*?&)";
  return "";
}

/** Login only checks presence (server handles the rest). */
export function validatePasswordBasic(password: string): string {
  return validateRequired(password, "Password");
}

// ─── Dates ───────────────────────────────────────────────────

/**
 * `end` must be strictly after `start`.
 * Accepts Date objects or ISO/date strings.
 */
export function validateDateRange(
  start: Date | string,
  end: Date | string,
  startLabel = "Start date",
  endLabel = "End date"
): string {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime())) return `${startLabel} is invalid`;
  if (isNaN(e.getTime())) return `${endLabel} is invalid`;
  if (e <= s) return `${endLabel} must be after ${startLabel.toLowerCase()}`;
  return "";
}

/** True when the given date is in the future (or today). */
export function isDateInFuture(date: Date | string): boolean {
  const d = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d >= now;
}

/**
 * Convenience: validate that a date string is present and in the future.
 */
export function validateFutureDate(
  date: string,
  label = "Date"
): string {
  const req = validateRequired(date, label);
  if (req) return req;
  if (!isDateInFuture(date)) return `${label} must be today or in the future`;
  return "";
}
