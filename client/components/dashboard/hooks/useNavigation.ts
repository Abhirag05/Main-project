import { useMemo } from "react";
import { isAdminRole, getDashboardPathForRole, ADMIN_DASHBOARD_PATH } from "@/lib/roles";

export interface NavigationItem {
  name: string;
  href?: string;
  icon: string;
  subsections?: NavigationItem[];
}

// Role-based navigation configuration
const ROLE_NAVIGATION: Record<string, NavigationItem[]> = {
  // ─── Consolidated ADMIN navigation ───────────────────────────────
  // Shown for every admin-level role (SUPER_ADMIN, CENTRE_ADMIN,
  // ADMIN, FINANCE) via the isAdminRole() guard.
  ADMIN: [
    {
      name: "Student Management",
      icon: "users-cog",
      subsections: [
        {
          name: "All Students",
          href: "/dashboards/admin/students",
          icon: "users",
        },
        {
          name: "Verified",
          href: "/dashboards/admin/students/verified",
          icon: "user-check",
        },
        {
          name: "Suspended",
          href: "/dashboards/admin/students/suspended",
          icon: "user-ban",
        },
        {
          name: "Full Payment",
          href: "/dashboards/admin/fee/full-payment",
          icon: "cash",
        },
        {
          name: "Installment",
          href: "/dashboards/admin/fee/installment",
          icon: "credit-card",
        },
      ],
    },
    {
      name: "Batch Management",
      icon: "layers",
      subsections: [
        {
          name: "View Batches",
          href: "/dashboards/admin/batches",
          icon: "view-list",
        },
        {
          name: "Create Batch",
          href: "/dashboards/admin/batches/create",
          icon: "plus",
        },
        {
          name: "Batch Templates",
          href: "/dashboards/admin/academics/batch-templates",
          icon: "template",
        },
      ],
    },
    {
      name: "Faculty Management",
      icon: "chalkboard",
      subsections: [
        {
          name: "Add Faculty",
          href: "/dashboards/admin/add-user",
          icon: "user-plus",
        },
        {
          name: "List Faculty",
          href: "/dashboards/admin/users",
          icon: "user-group",
        },
        {
          name: "Faculty Modules",
          href: "/dashboards/admin/faculty/subject-assignments",
          icon: "folder-open",
        },
        {
          name: "Faculty Batches",
          href: "/dashboards/admin/faculty/batch-assignments",
          icon: "table-cells",
        },
      ],
    },
    {
      name: "Course Management",
      icon: "book-open",
      subsections: [
        {
          name: "Courses",
          href: "/dashboards/admin/academics/courses",
          icon: "academic-cap",
        },
        {
          name: "Modules",
          href: "/dashboards/admin/academics/subjects",
          icon: "book",
        },
        {
          name: "Course Builder",
          href: "/dashboards/admin/academics/course-builder",
          icon: "puzzle",
        },
      ],
    },
    {
      name: "Academics",
      icon: "calendar",
      subsections: [
        {
          name: "Timetable",
          href: "/dashboards/admin/timetable",
          icon: "clock",
        },
        {
          name: "Add Link",
          href: "/dashboards/admin/sessions",
          icon: "link",
        },
      ],
    },
    {
      name: "Placement Management",
      icon: "briefcase",
      subsections: [
        {
          name: "Placement Lists",
          href: "/dashboards/admin/placement/lists",
          icon: "clipboard-list",
        },
        {
          name: "Student Skills",
          href: "/dashboards/admin/placement/students",
          icon: "sparkles",
        },
      ],
    },
  ],
  FACULTY: [
    {
      name: "Teaching",
      icon: "chalkboard",
      subsections: [
        {
          name: "My Schedule",
          href: "/dashboards/faculty/schedule",
          icon: "clock",
        },
        {
          name: "My Batches",
          href: "/dashboards/faculty/batches",
          icon: "layers",
        },
        {
          name: "Batch Timetable",
          href: "/dashboards/faculty/timetable",
          icon: "calendar",
        },
      ],
    },
    {
      name: "Assessments",
      icon: "clipboard-check",
      subsections: [
        {
          name: "Create Assessment",
          href: "/dashboards/faculty/assessments/create",
          icon: "pencil-square",
        },
        {
          name: "My Assessments",
          href: "/dashboards/faculty/assessments",
          icon: "clipboard-list",
        },
        {
          name: "Question Banks",
          href: "/dashboards/faculty/question-banks",
          icon: "collection",
        },
        {
          name: "Results",
          href: "/dashboards/faculty/assessments/results",
          icon: "chart-bar",
        },
      ],
    },
    {
      name: "Assignments",
      icon: "document-text",
      subsections: [
        {
          name: "Create Assignment",
          href: "/dashboards/faculty/assignments/create",
          icon: "pencil-square",
        },
        {
          name: "My Assignments",
          href: "/dashboards/faculty/assignments",
          icon: "view-list",
        },
        {
          name: "Submissions",
          href: "/dashboards/faculty/assignments/submissions",
          icon: "inbox",
        },
      ],
    },
    {
      name: "Course Materials",
      icon: "book-open",
      subsections: [
        {
          name: "Upload Material",
          href: "/dashboards/faculty/course-materials/upload",
          icon: "upload",
        },
        {
          name: "My Materials",
          href: "/dashboards/faculty/course-materials",
          icon: "folder-open",
        },
      ],
    },
  ],
  STUDENT: [
    {
      name: "Academics",
      icon: "academic-cap",
      subsections: [
        {
          name: "My Timetable",
          href: "/dashboards/student/timetable",
          icon: "clock",
        },
        {
          name: "My Batch",
          href: "/dashboards/student/my-batch",
          icon: "layers",
        },
        {
          name: "My Attendance",
          href: "/dashboards/student/my-attendance",
          icon: "calendar-check",
        },
        {
          name: "Course Materials",
          href: "/dashboards/student/course-materials",
          icon: "folder-open",
        },
        {
          name: "My Skills",
          href: "/dashboards/student/skills",
          icon: "sparkles",
        },
      ],
    },
    {
      name: "Assessments",
      icon: "clipboard-check",
      subsections: [
        {
          name: "My Assessments",
          href: "/dashboards/student/assessments",
          icon: "clipboard-list",
        },
        {
          name: "My Results",
          href: "/dashboards/student/results",
          icon: "award",
        },
      ],
    },
    {
      name: "Assignments",
      icon: "document-text",
      subsections: [
        {
          name: "My Assignments",
          href: "/dashboards/student/assignments",
          icon: "pencil-square",
        },
        {
          name: "My Submissions",
          href: "/dashboards/student/assignments/submissions",
          icon: "inbox",
        },
      ],
    },
    {
      name: "Placements",
      icon: "briefcase",
      subsections: [
        {
          name: "Placement Links",
          href: "/dashboards/student/placements",
          icon: "link",
        },
      ],
    },
  ],
  // FINANCE, SUPER_ADMIN, CENTRE_ADMIN roles are all
  // handled by the ADMIN entry above via isAdminRole().
};

// Common navigation items for all roles
const COMMON_NAVIGATION: NavigationItem[] = [
  { name: "Profile", href: "/dashboard/profile", icon: "user" },
];

/**
 * Get dashboard path based on role code
 */
export function getDashboardPath(roleCode: string): string {
  return getDashboardPathForRole(roleCode);
}

/**
 * Build navigation menu based on user role
 */
export function useNavigation(roleCode: string) {
  const navigation = useMemo(() => {
    const code = roleCode.toUpperCase();

    // Start with dashboard link
    const items: NavigationItem[] = [
      { name: "Dashboard", href: getDashboardPath(code), icon: "home" },
    ];

    // Add role-specific navigation
    // Admin-level roles all use the consolidated ADMIN navigation
    let navKey = code;
    if (isAdminRole(code)) {
      navKey = "ADMIN";
    }
    let roleItems = ROLE_NAVIGATION[navKey] || ROLE_NAVIGATION[code] || [];

    items.push(...roleItems);

    // Add common navigation items
    items.push(...COMMON_NAVIGATION);

    return items;
  }, [roleCode]);

  return navigation;
}
