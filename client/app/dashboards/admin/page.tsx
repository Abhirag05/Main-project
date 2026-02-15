"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient } from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
interface DashboardStats {
  totalStudents: number;
  totalFaculty: number;
  activeBatches: number;
  totalCourses: number;
  totalModules: number;
}

/* ═══════════════════════════════════════════════════════════════
   Custom hook — fetch admin dashboard summary data
   ═══════════════════════════════════════════════════════════════ */
function useAdminDashboardData() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [users, batches, courses, modules] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getBatches(),
        apiClient.getAcademicCourses(),
        apiClient.getAcademicModules(),
      ]);

      setStats({
        totalStudents: users.filter((u) => u.role.code === "STUDENT").length,
        totalFaculty: users.filter((u) => u.role.code === "FACULTY").length,
        activeBatches: batches.filter((b) => b.status === "ACTIVE").length,
        totalCourses: courses.length,
        totalModules: modules.length,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { stats, loading, error, refetch: fetchData };
}

/* ═══════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════ */

/** Skeleton placeholder while stats load */
function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-5">
      <div className="h-4 w-20 rounded bg-muted" />
      <div className="mt-3 h-8 w-16 rounded bg-muted" />
    </div>
  );
}

/** Single KPI stat card */
function StatCard({
  label,
  value,
  icon,
  accent,
  accentBg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  accentBg?: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Top accent strip */}
      <div className={`h-1 ${accentBg || 'bg-primary'}`} />
      <div className="p-5">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentBg ? accentBg + '/15' : 'bg-primary/10'} ${accent}`}>
            {icon}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        <p className={`mt-3 text-3xl font-bold ${accent}`}>{value}</p>
      </div>
    </div>
  );
}

/** Quick-action card that links to a sub-page */
function QuickActionCard({
  href,
  gradient,
  iconBg,
  icon,
  title,
  description,
  cta,
}: {
  href: string;
  gradient: string;
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`}
      />
      <div className="flex items-start gap-4">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          {icon}
        </span>
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <span className="mt-4 inline-flex items-center text-sm font-semibold text-foreground">
            {cta}
            <span className="ml-2 transition group-hover:translate-x-0.5">
              &rarr;
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Grouped section wrapper */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 lg:p-8">
        {children}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Icons (shared SVG props for consistency)
   ═══════════════════════════════════════════════════════════════ */
const svgProps = {
  className: "h-5 w-5",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  viewBox: "0 0 24 24",
};

const icons = {
  userPlus: (
    <svg {...svgProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      />
    </svg>
  ),
  users: (
    <svg {...svgProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  batch: (
    <svg {...svgProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16M4 12h16M4 17h10"
      />
    </svg>
  ),
  academic: (
    <svg {...svgProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
      />
    </svg>
  ),
  faculty: (
    <svg {...svgProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  timetable: (
    <svg {...svgProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  dollar: (
    <svg {...svgProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  progress: (
    <svg {...svgProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  book: (
    <svg {...svgProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const { stats, loading, error, refetch } = useAdminDashboardData();

  return (
    <DashboardLayout>
      <div className="w-full max-w-7xl mx-auto space-y-8 py-6">
        {/* ── Header ─────────────────────────────── */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage students, academics, assessments, and progress from one
              place.
            </p>
          </div>
          {error && (
            <button
              onClick={refetch}
              className="self-start rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              Retry loading
            </button>
          )}
        </div>

        {/* ── KPI Stats Row ──────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatSkeleton key={i} />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Students"
              value={stats.totalStudents}
              icon={icons.users}
              accent="text-emerald-600"
              accentBg="bg-emerald-500"
            />
            <StatCard
              label="Faculty"
              value={stats.totalFaculty}
              icon={icons.faculty}
              accent="text-indigo-600"
              accentBg="bg-indigo-500"
            />
            <StatCard
              label="Active Batches"
              value={stats.activeBatches}
              icon={icons.batch}
              accent="text-amber-600"
              accentBg="bg-amber-500"
            />
            <StatCard
              label="Courses"
              value={stats.totalCourses}
              icon={icons.academic}
              accent="text-violet-600"
              accentBg="bg-violet-500"
            />
            <StatCard
              label="Modules"
              value={stats.totalModules}
              icon={icons.book}
              accent="text-sky-600"
              accentBg="bg-sky-500"
            />
          </div>
        ) : null}

        {/* ── 1. Student & Faculty Management ───── */}
        <Section
          title="Student & Faculty Management"
          description="Manage user accounts, admissions, and batch assignments."
        >
          <QuickActionCard
            href="/dashboards/admin/add-user"
            gradient="from-primary/70 to-indigo-500"
            iconBg="bg-primary/10 text-primary"
            icon={icons.userPlus}
            title="Add Faculty"
            description="Create a new faculty account."
            cta="Add faculty"
          />
          <QuickActionCard
            href="/dashboards/admin/users"
            gradient="from-indigo-400 to-purple-500"
            iconBg="bg-indigo-100 text-indigo-700"
            icon={icons.users}
            title="Manage Faculty"
            description="View and manage faculty accounts."
            cta="View faculty"
          />
          <QuickActionCard
            href="/dashboards/admin/students"
            gradient="from-emerald-400 to-teal-500"
            iconBg="bg-emerald-100 text-emerald-700"
            icon={icons.users}
            title="Students"
            description="View all students, approve or reject admissions."
            cta="View students"
          />
          <QuickActionCard
            href="/dashboards/admin/batches"
            gradient="from-amber-400 to-orange-500"
            iconBg="bg-amber-100 text-amber-700"
            icon={icons.batch}
            title="Batch Management"
            description="Create batches and assign students."
            cta="View batches"
          />
        </Section>

        {/* ── 2. Academics ───────────────────────── */}
        <Section
          title="Academics"
          description="Courses, modules, faculty assignments, and timetable."
        >
          <QuickActionCard
            href="/dashboards/admin/academics/courses"
            gradient="from-emerald-400 to-green-500"
            iconBg="bg-emerald-100 text-emerald-700"
            icon={icons.academic}
            title="Courses"
            description="Manage academic programs and courses."
            cta="View courses"
          />
          <QuickActionCard
            href="/dashboards/admin/academics/course-builder"
            gradient="from-violet-400 to-purple-500"
            iconBg="bg-violet-100 text-violet-700"
            icon={icons.academic}
            title="Course Builder"
            description="Build course structures with modules."
            cta="Open builder"
          />
          <QuickActionCard
            href="/dashboards/admin/faculty/subject-assignments"
            gradient="from-sky-400 to-cyan-500"
            iconBg="bg-sky-100 text-sky-700"
            icon={icons.faculty}
            title="Faculty Assignments"
            description="Assign modules and batches to faculty."
            cta="Manage assignments"
          />
          <QuickActionCard
            href="/dashboards/admin/timetable"
            gradient="from-rose-400 to-pink-500"
            iconBg="bg-rose-100 text-rose-700"
            icon={icons.timetable}
            title="Timetable"
            description="Manage time slots and schedules."
            cta="View timetable"
          />
        </Section>

        {/* ── 3. Fee & Payments ──────────────────── */}
        <Section
          title="Fee & Payments"
          description="Fee verification and payment management."
        >
          <QuickActionCard
            href="/dashboards/admin/fee/full-payment"
            gradient="from-green-400 to-emerald-500"
            iconBg="bg-green-100 text-green-700"
            icon={icons.dollar}
            title="Full Payment"
            description="Verify and manage full fee payments."
            cta="View payments"
          />
          <QuickActionCard
            href="/dashboards/admin/fee/installment"
            gradient="from-yellow-400 to-amber-500"
            iconBg="bg-yellow-100 text-yellow-700"
            icon={icons.dollar}
            title="Installment"
            description="Manage installment payment plans."
            cta="View installments"
          />
        </Section>

        {/* ── 4. Student Progress ────────────────── */}
        <Section
          title="Student Progress"
          description="Track student skill levels and academic progress."
        >
          <QuickActionCard
            href="/dashboards/admin/student-progress"
            gradient="from-teal-400 to-cyan-500"
            iconBg="bg-teal-100 text-teal-700"
            icon={icons.progress}
            title="Student Progress"
            description="View student skills, mastery levels, and progress."
            cta="View progress"
          />
        </Section>
      </div>
    </DashboardLayout>
  );
}
