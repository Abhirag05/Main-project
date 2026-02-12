"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import { financeAPI, StudentAdmission } from "@/lib/financeAPI";

export default function FinanceDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    pending: 0,
    verified: 0,
    installmentPending: 0,
    rejected: 0,
    fullPayment: 0,
    installment: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentAdmissions, setRecentAdmissions] = useState<StudentAdmission[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await financeAPI.getAdmissions();
        
        // Calculate stats
        const pending = data.filter((a) => a.admission_status === "PENDING").length;
        const verified = data.filter(
          (a) =>
            a.admission_status === "FULL_PAYMENT_VERIFIED" ||
            a.admission_status === "INSTALLMENT_VERIFIED"
        ).length;
        const installmentPending = data.filter(
          (a) => a.admission_status === "INSTALLMENT_PENDING"
        ).length;
        const rejected = data.filter((a) => a.admission_status === "REJECTED").length;
        const fullPayment = data.filter((a) => a.payment_method === "FULL").length;
        const installment = data.filter((a) => a.payment_method === "INSTALLMENT").length;
        
        setStats({
          pending,
          verified,
          installmentPending,
          rejected,
          fullPayment,
          installment,
          total: data.length,
        });

        // Get 5 most recent pending admissions
        const recent = data
          .filter((a) => a.admission_status === "PENDING")
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        
        setRecentAdmissions(recent);
      } catch (error: any) {
        console.error("Failed to load dashboard data:", error);
        setError(error.message || "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchDashboardData();
    }
  }, [authLoading, user]);

  const recentPending = useMemo(
    () =>
      recentAdmissions.map((admission) => ({
        id: admission.student_profile_id,
        name: admission.full_name,
        payment: admission.payment_method,
        createdAt: admission.created_at,
      })),
    [recentAdmissions]
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-red-500 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-red-800">
                  We could not load the finance dashboard
                </h1>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-sm p-6 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Finance Admin Dashboard</h1>
              <p className="mt-1 text-sm text-blue-100">
                Track admissions, verify payments, and manage batches efficiently.
              </p>
            </div>
            <Link
              href="/dashboards/finance/students"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-colors"
            >
              Review Admissions
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <Link href="/dashboards/finance/students" className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700">
              View all students →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <div className="rounded-lg bg-amber-100 p-3 text-amber-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <Link href="/dashboards/finance/students" className="mt-4 inline-flex text-sm font-medium text-amber-600 hover:text-amber-700">
              Review now →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Verified Payments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.verified}</p>
              </div>
              <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <Link href="/dashboards/finance/students/verified" className="mt-4 inline-flex text-sm font-medium text-emerald-600 hover:text-emerald-700">
              View verified →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Disabled / Inst. Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.installmentPending}</p>
              </div>
              <div className="rounded-lg bg-red-100 p-3 text-red-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
            <Link href="/dashboards/finance/students/disabled" className="mt-4 inline-flex text-sm font-medium text-red-600 hover:text-red-700">
              View disabled →
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Pending Admissions</h2>
                <p className="text-sm text-gray-500">Newest applications waiting for review</p>
              </div>
              <Link href="/dashboards/finance/students" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>

            <div className="mt-4 border border-gray-100 rounded-lg overflow-hidden">
              {recentPending.length === 0 ? (
                <div className="p-6 text-sm text-gray-500 text-center">
                  No pending admissions right now.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {recentPending.map((item) => (
                    <li key={item.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()} • {item.payment === "FULL" ? "Full Payment" : item.payment === "INSTALLMENT" ? "Installment" : "N/A"}
                        </p>
                      </div>
                      <Link
                        href="/dashboards/finance/students"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Review
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <p className="text-sm text-gray-500">Jump to key finance workflows</p>
            <div className="mt-4 space-y-3">
              <Link
                href="/dashboards/finance/referral"
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-200 hover:text-blue-700"
              >
                Confirm Referrals
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/dashboards/finance/batches"
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-200 hover:text-blue-700"
              >
                Manage Batches
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/dashboards/finance/students/verified"
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-200 hover:text-blue-700"
              >
                Verified Students
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/dashboards/finance/students/disabled"
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-200 hover:text-blue-700"
              >
                Disabled Students
                <span className="text-gray-400">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

