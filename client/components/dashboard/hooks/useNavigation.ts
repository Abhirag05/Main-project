import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";

export interface NavigationItem {
  name: string;
  href?: string;
  icon: string;
  subsections?: NavigationItem[];
}

// Role-based navigation configuration
const ROLE_NAVIGATION: Record<string, NavigationItem[]> = {
  SUPER_ADMIN: [
    {
      name: "User Management",
      icon: "users-cog",
      subsections: [
        {
          name: "Add User",
          href: "/dashboards/super-admin/add-user",
          icon: "user-plus",
        },
        {
          name: "List Users",
          href: "/dashboards/super-admin/users",
          icon: "users",
        },
      ],
    },
    {
      name: "Academics",
      icon: "academic-cap",
      subsections: [
        {
          name: "Courses",
          href: "/dashboards/super-admin/academics/courses",
          icon: "book-open",
        },
        {
          name: "Modules",
          href: "/dashboards/super-admin/academics/subjects",
          icon: "book",
        },
        {
          name: "Batch Templates",
          href: "/dashboards/super-admin/academics/batch-templates",
          icon: "template",
        },
        {
          name: "Course Builder",
          href: "/dashboards/super-admin/academics/course-builder",
          icon: "puzzle",
        },
      ],
    },
    {
      name: "Faculty",
      icon: "users",
      subsections: [
        {
          name: "Module Assignments",
          href: "/dashboards/super-admin/faculty/subject-assignments",
          icon: "clipboard",
        },
      ],
    },
  ],
  CENTRE_ADMIN: [
    {
      name: "Batch Management",
      icon: "calendar",
      subsections: [
        {
          name: "Batches",
          href: "/dashboards/centre-admin/batches",
          icon: "view-list",
        },
        {
          name: "Create Batch",
          href: "/dashboards/centre-admin/batches/create",
          icon: "plus",
        },
      ],
    },
    {
      name: "Faculty",
      icon: "users",
      subsections: [
        {
          name: "Module Assignments",
          href: "/dashboards/centre-admin/faculty/subject-assignments",
          icon: "clipboard",
        },
        {
          name: "Batch Assignments",
          href: "/dashboards/centre-admin/faculty/batch-assignments",
          icon: "calendar",
        },
      ],
    },
    {
      name: "Timetable",
      icon: "clock",
      subsections: [
        {
          name: "Time Slots",
          href: "/dashboards/centre-admin/timetable",
          icon: "calendar",
        },
      ],
    },
  ],
  FACULTY: [
    {
      name: "Teaching",
      icon: "academic-cap",
      subsections: [
        {
          name: "My Schedule",
          href: "/dashboards/faculty/schedule",
          icon: "clock",
        },
        {
          name: "My Batches",
          href: "/dashboards/faculty/batches",
          icon: "users",
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
          icon: "plus",
        },
        {
          name: "My Assessments",
          href: "/dashboards/faculty/assessments",
          icon: "view-list",
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
          icon: "plus",
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
          icon: "plus",
        },
        {
          name: "My Materials",
          href: "/dashboards/faculty/course-materials",
          icon: "view-list",
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
          icon: "book",
        },
        {
          name: "My Attendance",
          href: "/dashboards/student/my-attendance",
          icon: "calendar-check",
        },
        {
          name: "My Skills",
          href: "/dashboards/student/skills",
          icon: "star",
        },
        {
          name: "Course Materials",
          href: "/dashboards/student/course-materials",
          icon: "book-open",
        },
      ],
    },
    {
      name: "Assessments",
      icon: "clipboard",
      subsections: [
        {
          name: "All Assessments",
          href: "/dashboards/student/assessments",
          icon: "view-list",
        },
        {
          name: "My Results",
          href: "/dashboards/student/results",
          icon: "chart-bar",
        },
      ],
    },
    {
      name: "Assignments",
      icon: "document-text",
      subsections: [
        {
          name: "All Assignments",
          href: "/dashboards/student/assignments",
          icon: "view-list",
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
      href: "/dashboards/student/placements",
      icon: "briefcase",
    },
    {
      name: "Referral",
      href: "/dashboards/student/referral",
      icon: "link",
    },
  ],
  FINANCE: [
    {
      name: "Fee Management",
      icon: "currency-dollar",
      subsections: [
        {
          name: "Full Payment",
          href: "/dashboards/finance/fee/full-payment",
          icon: "cash",
        },
        {
          name: "Installment",
          href: "/dashboards/finance/fee/installment",
          icon: "credit-card",
        },
      ],
    },
    {
      name: "Batch Management",
      icon: "calendar",
      subsections: [
        {
          name: "Assign Students",
          href: "/dashboards/finance/batches",
          icon: "user-add",
        },
      ],
    },
    {
      name: "Student Management",
      icon: "users",
      subsections: [
        {
          name: "All Students",
          href: "/dashboards/finance/students",
          icon: "users",
        },
        {
          name: "Verified",
          href: "/dashboards/finance/students/verified",
          icon: "user",
        },
        {
          name: "Disabled",
          href: "/dashboards/finance/students/disabled",
          icon: "user",
        },
      ],
    },
    {
      name: "Referral",
      href: "/dashboards/finance/referral",
      icon: "link",
    },
  ],
  BATCH_MENTOR: [
    {
      name: "My Batches",
      href: "/dashboards/batch-mentor/my-batches",
      icon: "calendar",
    },
    {
      name: "My Students",
      href: "/dashboards/batch-mentor/students",
      icon: "users",
    },
    {
      name: "Batch Management",
      href: "/dashboards/batch-mentor/batch-management",
      icon: "clipboard-check",
    },
    {
      name: "Timetable",
      href: "/dashboards/batch-mentor/timetable",
      icon: "calendar",
    },
  ],
  PLACEMENT: [
    {
      name: "Placement Lists",
      href: "/dashboards/placement/lists",
      icon: "clipboard-list",
    },
    {
      name: "Students",
      href: "/dashboards/placement/students",
      icon: "user-check",
    },
  ],
};

// Common navigation items for all roles
const COMMON_NAVIGATION: NavigationItem[] = [
  { name: "Profile", href: "/dashboard/profile", icon: "user" },
];

/**
 * Get dashboard path based on role code
 */
export function getDashboardPath(roleCode: string): string {
  const code = roleCode.toUpperCase();
  const dashboardPaths: Record<string, string> = {
    SUPER_ADMIN: "/dashboards/super-admin",
    CENTRE_ADMIN: "/dashboards/centre-admin",
    ACADEMIC_COORDINATOR: "/dashboards/academic-coordinator",
    COURSE_COORDINATOR: "/dashboards/course-coordinator",
    BATCH_MENTOR: "/dashboards/batch-mentor",
    FACULTY: "/dashboards/faculty",
    STUDENT: "/dashboards/student",
    FINANCE: "/dashboards/finance",
    PLACEMENT: "/dashboards/placement",
    ALUMNI: "/dashboards/alumni",
  };

  return dashboardPaths[code] || "/dashboards/student";
}

/**
 * Build navigation menu based on user role
 */
export function useNavigation(roleCode: string) {
  const [studentMode, setStudentMode] = useState<"LIVE" | "RECORDED" | null>(
    null,
  );

  useEffect(() => {
    const code = roleCode.toUpperCase();
    if (code !== "STUDENT") return;

    let mounted = true;
    (async () => {
      try {
        const batch = await apiClient.getMyBatch();
        if (!mounted) return;
        if (batch?.mode) {
          setStudentMode(batch.mode);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [roleCode]);

  const navigation = useMemo(() => {
    const code = roleCode.toUpperCase();

    // Start with dashboard link
    const items: NavigationItem[] = [
      { name: "Dashboard", href: getDashboardPath(code), icon: "home" },
    ];

    // Add role-specific navigation
    let roleItems = ROLE_NAVIGATION[code] || [];

    if (code === "STUDENT" && studentMode === "RECORDED") {
      roleItems = roleItems.map((item) => {
        if (item.name !== "Academics") return item;
        return {
          ...item,
          subsections: [
            {
              name: "My Classes",
              href: "/dashboards/student/recorded-classes",
              icon: "play",
            },
            {
              name: "My Batch",
              href: "/dashboards/student/my-batch",
              icon: "book",
            },
          ],
        };
      });
    }

    items.push(...roleItems);

    // Add common navigation items
    items.push(...COMMON_NAVIGATION);

    return items;
  }, [roleCode, studentMode]);

  return navigation;
}
