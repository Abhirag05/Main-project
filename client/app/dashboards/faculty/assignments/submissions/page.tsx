"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { assignmentAPIClient } from "@/lib/assignmentAPI";

export default function AllSubmissionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData.role.code !== "FACULTY") {
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
      const data = await assignmentAPIClient.getFacultyAssignments();
      setAssignments(data);
    } catch (err) {
      setError((err as Error).message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-card rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const activeAssignments = assignments.filter(a => a.is_active);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Assignment Submissions</h1>
          <p className="text-muted-foreground mt-1">View and evaluate student submissions</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeAssignments.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No active assignments with submissions</p>
            </div>
          ) : (
            activeAssignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/dashboards/faculty/assignments/${assignment.id}/submissions`}
                className="block bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <h3 className="font-semibold text-foreground mb-2">{assignment.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {assignment.batch_name} - {assignment.subject_name}
                </p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {assignment.total_submissions || 0} submissions
                  </span>
                  {(assignment.pending_evaluations || 0) > 0 && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                      {assignment.pending_evaluations} pending
                    </span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
