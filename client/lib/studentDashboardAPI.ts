/**
 * Student Dashboard Summary API
 * Aggregates data from multiple student endpoints into a single dashboard view.
 * Uses existing backend APIs — no new backend endpoints required.
 */

import { apiClient } from "@/lib/api";
import { assignmentAPIClient, Assignment } from "@/lib/assignmentAPI";
import { courseMaterialAPI, StudentMaterial } from "@/lib/courseMaterialAPI";
import {
  studentAttendanceAPI,
  StudentSessionAttendance,
} from "@/lib/studentAttendanceAPI";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ==================== TYPES ====================

export interface DashboardStudent {
  name: string;
  batch: string;
  course: string;
  batchType: string; // "LIVE" | "RECORDED"
}

export interface DashboardAttendance {
  percentage: number;
  attended: number;
  total: number;
}

export interface DashboardAssessmentRecent {
  id: number;
  title: string;
  score: number | null;
  percentage: number | null;
  status: "Completed" | "Pending";
}

export interface DashboardAssessments {
  total: number;
  completed: number;
  pending: number;
  recent: DashboardAssessmentRecent[];
}

export interface DashboardAssignmentRecent {
  id: number;
  title: string;
  dueDate: string;
  status: "Submitted" | "Pending" | "Overdue";
  marks: string | null;
  isEvaluated: boolean;
}

export interface DashboardAssignments {
  total: number;
  submitted: number;
  pending: number;
  evaluated: number;
  recent: DashboardAssignmentRecent[];
}

export interface DashboardMaterialRecent {
  id: number;
  title: string;
  module: string;
  type: string;
  createdAt: string;
}

export interface DashboardMaterials {
  total: number;
  recent: DashboardMaterialRecent[];
}

export interface DashboardSummary {
  student: DashboardStudent;
  attendance: DashboardAttendance;
  assessments: DashboardAssessments;
  assignments: DashboardAssignments;
  materials: DashboardMaterials;
}

// ==================== HELPERS ====================

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ==================== FETCH FUNCTIONS ====================

async function fetchStudentInfo(): Promise<DashboardStudent> {
  // Get user from localStorage
  const userStr =
    typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userStr ? JSON.parse(userStr) : null;

  // Get batch info
  const batch = await apiClient.getMyBatch();

  return {
    name: user?.full_name || "Student",
    batch: batch?.batch_code || "Not Assigned",
    course: batch?.course_name || "N/A",
    batchType: batch?.batch_status || "N/A",
  };
}

async function fetchAttendance(): Promise<DashboardAttendance> {
  const sessions = await studentAttendanceAPI.getMyAttendance();
  const total = sessions.length;
  const attended = sessions.filter(
    (s) => s.attendance_status === "PRESENT"
  ).length;
  const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

  return { percentage, attended, total };
}

async function fetchAssessments(): Promise<DashboardAssessments> {
  const res = await fetch(
    `${API_BASE_URL}/student/assessments/?_t=${Date.now()}`,
    { method: "GET", headers: getAuthHeaders() }
  );

  if (!res.ok) {
    if (res.status === 404) return { total: 0, completed: 0, pending: 0, recent: [] };
    throw new Error("Failed to fetch assessments");
  }

  const data: any[] = await res.json();

  const completed = data.filter((a) => !!a.attempt_info);
  const pending = data.filter((a) => !a.attempt_info);

  const recent: DashboardAssessmentRecent[] = data
    .sort(
      (a, b) =>
        new Date(b.start_datetime || b.created_at).getTime() -
        new Date(a.start_datetime || a.created_at).getTime()
    )
    .slice(0, 3)
    .map((a) => ({
      id: a.id,
      title: a.title,
      score: a.attempt_info?.score ?? null,
      percentage: a.attempt_info?.percentage ?? null,
      status: a.attempt_info ? ("Completed" as const) : ("Pending" as const),
    }));

  return {
    total: data.length,
    completed: completed.length,
    pending: pending.length,
    recent,
  };
}

async function fetchAssignments(): Promise<DashboardAssignments> {
  const data: Assignment[] = await assignmentAPIClient.getStudentAssignments();

  const submitted = data.filter((a) => !!a.my_submission);
  const evaluated = data.filter((a) => a.my_submission?.is_evaluated);
  const pending = data.filter((a) => !a.my_submission);

  const recent: DashboardAssignmentRecent[] = data
    .sort(
      (a, b) =>
        new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
    )
    .slice(0, 3)
    .map((a) => {
      let status: "Submitted" | "Pending" | "Overdue" = "Pending";
      if (a.my_submission) {
        status = "Submitted";
      } else if (a.is_overdue) {
        status = "Overdue";
      }
      return {
        id: a.id,
        title: a.title,
        dueDate: a.due_date,
        status,
        marks: a.my_submission?.marks_obtained ?? null,
        isEvaluated: a.my_submission?.is_evaluated ?? false,
      };
    });

  return {
    total: data.length,
    submitted: submitted.length,
    pending: pending.length,
    evaluated: evaluated.length,
    recent,
  };
}

async function fetchMaterials(): Promise<DashboardMaterials> {
  const data: StudentMaterial[] =
    await courseMaterialAPI.getStudentMaterials();

  const recent: DashboardMaterialRecent[] = data
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 3)
    .map((m) => ({
      id: m.id,
      title: m.title,
      module: m.module.name,
      type: m.material_type,
      createdAt: m.created_at,
    }));

  return { total: data.length, recent };
}

// ==================== MAIN API ====================

/**
 * Fetches all dashboard data in parallel using existing APIs.
 * Returns partial data even if some requests fail.
 */
export async function fetchDashboardSummary(): Promise<{
  data: DashboardSummary;
  errors: string[];
}> {
  const errors: string[] = [];

  const [studentResult, attendanceResult, assessmentsResult, assignmentsResult, materialsResult] =
    await Promise.allSettled([
      fetchStudentInfo(),
      fetchAttendance(),
      fetchAssessments(),
      fetchAssignments(),
      fetchMaterials(),
    ]);

  const student: DashboardStudent =
    studentResult.status === "fulfilled"
      ? studentResult.value
      : (() => {
          errors.push("Failed to load student info");
          return { name: "Student", batch: "N/A", course: "N/A", batchType: "N/A" };
        })();

  const attendance: DashboardAttendance =
    attendanceResult.status === "fulfilled"
      ? attendanceResult.value
      : (() => {
          errors.push("Failed to load attendance");
          return { percentage: 0, attended: 0, total: 0 };
        })();

  const assessments: DashboardAssessments =
    assessmentsResult.status === "fulfilled"
      ? assessmentsResult.value
      : (() => {
          errors.push("Failed to load assessments");
          return { total: 0, completed: 0, pending: 0, recent: [] };
        })();

  const assignments: DashboardAssignments =
    assignmentsResult.status === "fulfilled"
      ? assignmentsResult.value
      : (() => {
          errors.push("Failed to load assignments");
          return { total: 0, submitted: 0, pending: 0, evaluated: 0, recent: [] };
        })();

  const materials: DashboardMaterials =
    materialsResult.status === "fulfilled"
      ? materialsResult.value
      : (() => {
          errors.push("Failed to load course materials");
          return { total: 0, recent: [] };
        })();

  return {
    data: { student, attendance, assessments, assignments, materials },
    errors,
  };
}
