/**
 * Centralised role-code constants for the frontend.
 *
 * Any page-guard or navigation check that previously tested for
 * "SUPER_ADMIN", "CENTRE_ADMIN", or "FINANCE" should now
 * use `isAdminRole(code)` or check membership in `ADMIN_ROLE_CODES`.
 */

/** Every role code that counts as "admin-level" access. */
export const ADMIN_ROLE_CODES = [
  "SUPER_ADMIN",
  "CENTRE_ADMIN",
  "ADMIN",
  "FINANCE",
  "PLACEMENT", // kept for backward-compat with existing DB rows
] as const;

export type AdminRoleCode = (typeof ADMIN_ROLE_CODES)[number];

/** Returns `true` when the given role code is an admin-level role. */
export function isAdminRole(code: string | undefined | null): boolean {
  if (!code) return false;
  return (ADMIN_ROLE_CODES as readonly string[]).includes(code.toUpperCase());
}

/** Dashboard path for admin roles (consolidated). */
export const ADMIN_DASHBOARD_PATH = "/dashboards/admin";

/**
 * Resolve the correct dashboard path for any role code.
 * Admin-level roles all land on `/dashboards/admin`.
 */
export function getDashboardPathForRole(roleCode: string): string {
  const code = roleCode.toUpperCase();
  if (isAdminRole(code)) return ADMIN_DASHBOARD_PATH;

  const map: Record<string, string> = {
    ACADEMIC_COORDINATOR: "/dashboards/academic-coordinator",
    COURSE_COORDINATOR: "/dashboards/course-coordinator",
    FACULTY: "/dashboards/faculty",
    STUDENT: "/dashboards/student",
    ALUMNI: "/dashboards/alumni",
  };

  return map[code] || "/dashboards/student";
}
