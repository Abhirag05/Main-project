"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { assignmentAPIClient, Assignment } from "@/lib/assignmentAPI";

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "submitted" | "overdue">("all");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData.role.code !== "STUDENT") {
          router.push("/dashboards");
        }
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const data = await assignmentAPIClient.getStudentAssignments();
      setAssignments(data);
    } catch (err) {
      setError((err as Error).message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    if (filter === "all") return true;
    if (filter === "submitted") return !!a.my_submission;
    if (filter === "overdue") return a.is_overdue && !a.my_submission;
    if (filter === "pending") return !a.my_submission && !a.is_overdue;
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (assignment: Assignment) => {
    if (assignment.my_submission?.is_evaluated) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Evaluated</span>;
    }
    if (assignment.my_submission) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Submitted</span>;
    }
    if (assignment.is_overdue) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Overdue</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Assignments</h1>
          <p className="text-gray-600 mt-1">View and submit your assignments</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 overflow-x-auto sm:space-x-8">
            {["all", "pending", "submitted", "overdue"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  filter === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Assignments Cards */}
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === "all"
                ? "You don't have any assignments yet."
                : `No ${filter} assignments.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-white rounded-xl shadow-md border border-gray-100 p-6 flex flex-col gap-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{assignment.title}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {assignment.module_name} · {assignment.faculty_name}
                    </p>
                  </div>
                  {getStatusBadge(assignment)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500">Due Date</div>
                    <div className="font-medium text-gray-900">{formatDate(assignment.due_date)}</div>
                    {assignment.is_overdue && (
                      <div className="text-xs text-red-600 font-medium mt-1">Overdue</div>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500">Max Marks</div>
                    <div className="font-medium text-gray-900">{assignment.max_marks}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <Link
                    href={`/dashboards/student/assignments/${assignment.id}`}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {assignment.my_submission ? "View Submission" : "View Assignment"}
                  </Link>
                  {assignment.my_submission && !assignment.my_submission.is_evaluated && (
                    <Link
                      href={`/dashboards/student/assignments/${assignment.id}`}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                    >
                      Edit Submission
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
