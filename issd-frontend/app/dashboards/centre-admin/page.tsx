"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Link from "next/link";

export default function CentreAdminDashboard() {
  return (
    <DashboardLayout>
      <div className="w-full pr-4 pl-0 sm:pr-6 sm:pl-0 lg:pr-8 lg:pl-0 py-6 max-w-7xl mx-auto">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Quick Actions
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Jump to the most common Centre Admin tasks.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 lg:p-8">
            <Link
              href="/dashboards/centre-admin/batches"
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 7h16M4 12h16M4 17h10"
                    />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Batch Management
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Create batches and assign students and mentors.
                  </p>
                  <span className="mt-4 inline-flex items-center text-sm font-semibold text-slate-900">
                    View batches
                    <span className="ml-2 transition group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboards/centre-admin/faculty/subject-assignments"
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 to-cyan-500" />
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-6 12a6 6 0 0 1 12 0"
                    />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Faculty Assignments
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Assign modules and batches to faculty members.
                  </p>
                  <span className="mt-4 inline-flex items-center text-sm font-semibold text-slate-900">
                    Manage faculty
                    <span className="ml-2 transition group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboards/centre-admin/timetable"
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 3v3M17 3v3M4 9h16M6 13h4m-4 4h8"
                    />
                    <rect x="4" y="5" width="16" height="16" rx="2" ry="2" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Timetable
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Create and review the centre timetable.
                  </p>
                  <span className="mt-4 inline-flex items-center text-sm font-semibold text-slate-900">
                    Open timetable
                    <span className="ml-2 transition group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
