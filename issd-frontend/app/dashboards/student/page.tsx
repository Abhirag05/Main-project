"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  StatCard,
  DashboardSection,
  StatusBadge,
  EmptyState,
  SkeletonCard,
  SkeletonSection,
  SkeletonWelcome,
} from "@/components/student/DashboardComponents";
import {
  fetchDashboardSummary,
  DashboardSummary,
} from "@/lib/studentDashboardAPI";

// ==================== ICONS ====================

function AttendanceIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function AssessmentIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function AssignmentIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function MaterialIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function SkillsIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function MaterialTypeIcon({ type }: { type: string }) {
  switch (type.toUpperCase()) {
    case "PDF":
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-red-100 text-red-600 text-xs font-bold">
          PDF
        </span>
      );
    case "VIDEO":
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-purple-100 text-purple-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.12V15.88a1.5 1.5 0 002.3 1.279l9.344-5.88a1.5 1.5 0 000-2.558L6.3 2.84z" />
          </svg>
        </span>
      );
    case "LINK":
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-blue-100 text-blue-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-600 text-xs font-bold">
          {type.slice(0, 3).toUpperCase()}
        </span>
      );
  }
}

// ==================== MAIN PAGE ====================

export default function StudentDashboardSummary() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Role guard
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData.role.code !== "STUDENT") {
          router.push("/dashboards");
          return;
        }
      } else {
        router.push("/");
        return;
      }
    }
  }, [router]);

  // Fetch dashboard data
  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const result = await fetchDashboardSummary();
        setDashboardData(result.data);
        setErrors(result.errors);
      } catch {
        setErrors(["Failed to load dashboard. Please try again."]);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ============ ERRORS BANNER ============ */}
        {errors.length > 0 && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Some data could not be loaded
                </p>
                <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ============ WELCOME SECTION ============ */}
        {loading ? (
          <SkeletonWelcome />
        ) : dashboardData ? (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-sm p-6 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold">
              Welcome back, {dashboardData.student.name}!
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-blue-100 text-sm">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="font-medium text-white">{dashboardData.student.batch}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="font-medium text-white">{dashboardData.student.course}</span>
              </span>
              {dashboardData.student.batchType !== "N/A" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                  {dashboardData.student.batchType === "ACTIVE" ? "Active" : dashboardData.student.batchType === "COMPLETED" ? "Completed" : dashboardData.student.batchType}
                </span>
              )}
            </div>
          </div>
        ) : null}

        {/* ============ STAT CARDS ROW ============ */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : dashboardData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Attendance"
              value={`${dashboardData.attendance.percentage}%`}
              subtitle={`${dashboardData.attendance.attended} / ${dashboardData.attendance.total} sessions`}
              icon={<AttendanceIcon />}
              color={
                dashboardData.attendance.percentage < 75
                  ? "bg-red-500"
                  : "bg-green-500"
              }
              highlight={dashboardData.attendance.percentage < 75}
              highlightColor="text-red-600"
            />
            <StatCard
              label="Assessments"
              value={`${dashboardData.assessments.completed} / ${dashboardData.assessments.total}`}
              subtitle={`${dashboardData.assessments.pending} pending`}
              icon={<AssessmentIcon />}
              color="bg-blue-500"
            />
            <StatCard
              label="Assignments"
              value={`${dashboardData.assignments.submitted} / ${dashboardData.assignments.total}`}
              subtitle={`${dashboardData.assignments.pending} pending`}
              icon={<AssignmentIcon />}
              color="bg-purple-500"
            />
            <StatCard
              label="Course Materials"
              value={dashboardData.materials.total}
              subtitle="available"
              icon={<MaterialIcon />}
              color="bg-orange-500"
            />
          </div>
        ) : null}

        {/* ============ SECTION: My Skills ============ */}
        {loading ? (
          <SkeletonSection />
        ) : dashboardData ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-lg text-white">
                  <SkillsIcon />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    My Skills
                  </h2>
                  <p className="text-sm text-gray-500">
                    Skills acquired from assessments &amp; assignments
                  </p>
                </div>
              </div>
              <Link
                href="/dashboards/student/skills"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
              >
                View All Skills
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="p-6">
              {dashboardData.skills.skills.length === 0 ? (
                <EmptyState message="You haven't acquired any skills yet. Complete assessments to earn skills." />
              ) : (
                <div className="space-y-3">
                  {dashboardData.skills.skills.slice(0, 5).map((s) => {
                    const pct =
                      typeof s.percentage_score === "number"
                        ? s.percentage_score
                        : Number(s.percentage_score) || 0;
                    const barColor =
                      pct >= 80
                        ? "bg-green-500"
                        : pct >= 60
                          ? "bg-yellow-500"
                          : pct >= 50
                            ? "bg-blue-500"
                            : "bg-red-500";
                    const levelMap: Record<string, string> = {
                      NOT_ACQUIRED: "Not Acquired",
                      BEGINNER: "Beginner",
                      INTERMEDIATE: "Intermediate",
                      ADVANCED: "Advanced",
                    };
                    const levelDisplay = s.level
                      ? levelMap[s.level] || s.level
                      : "";
                    const levelColor =
                      s.level === "ADVANCED"
                        ? "text-green-700 bg-green-50"
                        : s.level === "INTERMEDIATE"
                          ? "text-blue-700 bg-blue-50"
                          : s.level === "BEGINNER"
                            ? "text-yellow-700 bg-yellow-50"
                            : "text-gray-500 bg-gray-50";

                    return (
                      <div
                        key={s.skill || s.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {s.skill_name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelColor}`}
                              >
                                {levelDisplay}
                              </span>
                              <span className="text-sm font-semibold text-gray-700">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {dashboardData.skills.skills.length > 5 && (
                    <Link
                      href="/dashboards/student/skills"
                      className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium pt-2 border-t border-gray-100"
                    >
                      +{dashboardData.skills.skills.length - 5} more skills →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ============ MAIN CONTENT GRID ============ */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonSection key={i} />
            ))}
          </div>
        ) : dashboardData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ---- SECTION 1: Attendance Summary ---- */}
            <DashboardSection
              title="Attendance Summary"
              actionLabel="View Attendance Details"
              actionHref="/dashboards/student/my-attendance"
            >
              {dashboardData.attendance.total === 0 ? (
                <EmptyState message="No attendance records yet" />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {dashboardData.attendance.percentage}%
                      </p>
                      <p className="text-sm text-gray-500">
                        {dashboardData.attendance.attended} of{" "}
                        {dashboardData.attendance.total} sessions attended
                      </p>
                    </div>
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold ${
                        dashboardData.attendance.percentage >= 75
                          ? "bg-green-50 text-green-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {dashboardData.attendance.percentage >= 75 ? (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {dashboardData.attendance.percentage < 75 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                      <span className="font-medium">Low attendance alert:</span>{" "}
                      Your attendance is below the 75% threshold. Please ensure
                      regular attendance.
                    </div>
                  )}
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        dashboardData.attendance.percentage >= 75
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.min(dashboardData.attendance.percentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </DashboardSection>

            {/* ---- SECTION 2: Assessments Overview ---- */}
            <DashboardSection
              title="Assessments Overview"
              actionLabel="View All Assessments"
              actionHref="/dashboards/student/assessments"
            >
              {dashboardData.assessments.total === 0 ? (
                <EmptyState message="No assessments yet" />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xl font-bold text-gray-900">
                        {dashboardData.assessments.total}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Total</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xl font-bold text-green-700">
                        {dashboardData.assessments.completed}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Completed</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xl font-bold text-yellow-700">
                        {dashboardData.assessments.pending}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Pending</p>
                    </div>
                  </div>

                  {dashboardData.assessments.recent.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Recent
                      </p>
                      <div className="divide-y divide-gray-100">
                        {dashboardData.assessments.recent.map((a) => (
                          <div
                            key={a.id}
                            className="py-3 flex items-center justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {a.title}
                              </p>
                              {a.percentage !== null && (
                                <p className="text-xs text-gray-500">
                                  Score: {a.percentage}%
                                </p>
                              )}
                            </div>
                            <StatusBadge status={a.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DashboardSection>

            {/* ---- SECTION 3: Assignments Overview ---- */}
            <DashboardSection
              title="Assignments Overview"
              actionLabel="View All Assignments"
              actionHref="/dashboards/student/assignments"
            >
              {dashboardData.assignments.total === 0 ? (
                <EmptyState message="No assignments yet" />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-lg font-bold text-gray-900">
                        {dashboardData.assignments.total}
                      </p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2.5">
                      <p className="text-lg font-bold text-green-700">
                        {dashboardData.assignments.submitted}
                      </p>
                      <p className="text-xs text-gray-500">Submitted</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-2.5">
                      <p className="text-lg font-bold text-yellow-700">
                        {dashboardData.assignments.pending}
                      </p>
                      <p className="text-xs text-gray-500">Pending</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2.5">
                      <p className="text-lg font-bold text-blue-700">
                        {dashboardData.assignments.evaluated}
                      </p>
                      <p className="text-xs text-gray-500">Evaluated</p>
                    </div>
                  </div>

                  {dashboardData.assignments.recent.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Recent
                      </p>
                      <div className="divide-y divide-gray-100">
                        {dashboardData.assignments.recent.map((a) => (
                          <div
                            key={a.id}
                            className="py-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {a.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                Due: {formatDate(a.dueDate)}
                                {a.isEvaluated && a.marks !== null && (
                                  <span className="ml-2 text-blue-600 font-medium">
                                    Marks: {a.marks}
                                  </span>
                                )}
                              </p>
                            </div>
                            <StatusBadge
                              status={
                                a.isEvaluated
                                  ? "Evaluated"
                                  : a.status
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DashboardSection>

            {/* ---- SECTION 4: Course Materials ---- */}
            <DashboardSection
              title="Course Materials"
              subtitle={
                dashboardData.materials.total > 0
                  ? `${dashboardData.materials.total} materials available`
                  : undefined
              }
              actionLabel="Go to Course Materials"
              actionHref="/dashboards/student/course-materials"
            >
              {dashboardData.materials.total === 0 ? (
                <EmptyState message="No course materials available yet" />
              ) : dashboardData.materials.recent.length === 0 ? (
                <EmptyState message="No recently uploaded materials" />
              ) : (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Recently Uploaded
                  </p>
                  <div className="space-y-3">
                    {dashboardData.materials.recent.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <MaterialTypeIcon type={m.type} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {m.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {m.module} &middot; {m.type}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatDate(m.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DashboardSection>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
