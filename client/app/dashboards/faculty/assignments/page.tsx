"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useFacultyGuard } from "@/components/faculty/hooks/useFacultyGuard";
import FacultyAlert from "@/components/faculty/ui/FacultyAlert";
import FacultyCard from "@/components/faculty/ui/FacultyCard";
import FacultyEmptyState from "@/components/faculty/ui/FacultyEmptyState";
import FacultyPageHeader from "@/components/faculty/ui/FacultyPageHeader";
import { assignmentAPIClient, Assignment } from "@/lib/assignmentAPI";

export default function MyAssignmentsPage() {
  const router = useRouter();
  const { isAllowed } = useFacultyGuard();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    assignment: Assignment | null;
  }>({ isOpen: false, assignment: null });
  const [deleting, setDeleting] = useState(false);

  // View details modal
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    assignment: Assignment | null;
  }>({ isOpen: false, assignment: null });

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await assignmentAPIClient.getFacultyAssignments();
      setAssignments(data);
    } catch (err) {
      showError((err as Error).message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) {
      fetchAssignments();
    }
  }, [fetchAssignments, isAllowed]);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleToggleActive = async (assignment: Assignment) => {
    try {
      await assignmentAPIClient.updateAssignment(assignment.id, {
        is_active: !assignment.is_active,
      });
      showSuccess(
        assignment.is_active
          ? "Assignment disabled successfully"
          : "Assignment activated successfully",
      );
      fetchAssignments();
    } catch (err) {
      showError((err as Error).message || "Failed to update assignment");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.assignment) return;

    setDeleting(true);
    try {
      await assignmentAPIClient.deleteAssignment(deleteConfirm.assignment.id);
      showSuccess("Assignment deleted successfully");
      fetchAssignments();
    } catch (err) {
      showError((err as Error).message || "Failed to delete assignment");
    } finally {
      setDeleting(false);
      setDeleteConfirm({ isOpen: false, assignment: null });
    }
  };

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
    if (!assignment.is_active) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-secondary text-foreground">
          Draft
        </span>
      );
    }
    if (assignment.is_overdue) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          Closed
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  if (!isAllowed) {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <FacultyCard className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </FacultyCard>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <FacultyPageHeader
          title="My Assignments"
          description="Manage your assignments and submissions"
          action={
            <Link
              href="/dashboards/faculty/assignments/create"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Assignment
            </Link>
          }
        />

        {/* Success Message */}
        {success && (
          <FacultyAlert variant="success" className="mb-6">
            {success}
          </FacultyAlert>
        )}

        {/* Error Message */}
        {error && (
          <FacultyAlert variant="error" className="mb-6">
            {error}
          </FacultyAlert>
        )}

        {/* Assignments Table */}
        <FacultyCard className="overflow-hidden">
          {assignments.length === 0 ? (
            <FacultyEmptyState
              icon={
                <svg
                  className="h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
              title="No assignments"
              description="Get started by creating a new assignment."
              action={
                <Link
                  href="/dashboards/faculty/assignments/create"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create Assignment
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Assignment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Batch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Skills Evaluated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Submissions
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-secondary/50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">
                          {assignment.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Max: {assignment.max_marks} marks
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">
                          {assignment.batch_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">
                          {assignment.module_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {assignment.skills && assignment.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {assignment.skills.map((skill) => (
                              <span
                                key={skill.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                              >
                                {skill.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">
                          {formatDate(assignment.due_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(assignment)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">
                          {assignment.total_submissions || 0} submitted
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {assignment.evaluated_submissions || 0} evaluated
                          {(assignment.pending_evaluations || 0) > 0 && (
                            <span className="ml-1 text-orange-600 font-medium">
                              ({assignment.pending_evaluations} pending)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() =>
                            setViewModal({ isOpen: true, assignment })
                          }
                          className="text-primary hover:text-primary"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleToggleActive(assignment)}
                          className={`${
                            assignment.is_active
                              ? "text-yellow-600 hover:text-yellow-900"
                              : "text-green-600 hover:text-green-900"
                          }`}
                        >
                          {assignment.is_active ? "Disable" : "Activate"}
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({ isOpen: true, assignment })
                          }
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FacultyCard>
      </div>

      {/* View Details Modal */}
      {viewModal.isOpen && viewModal.assignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-foreground">
                Assignment Details
              </h3>
              <button
                onClick={() =>
                  setViewModal({ isOpen: false, assignment: null })
                }
                className="text-muted-foreground/70 hover:text-muted-foreground"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Title and Status */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-2xl font-semibold text-foreground">
                    {viewModal.assignment.title}
                  </h4>
                  {getStatusBadge(viewModal.assignment)}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Batch</p>
                  <p className="text-base font-medium text-foreground">
                    {viewModal.assignment.batch_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Module</p>
                  <p className="text-base font-medium text-foreground">
                    {viewModal.assignment.module_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Maximum Marks</p>
                  <p className="text-base font-medium text-foreground">
                    {viewModal.assignment.max_marks}
                  </p>
                </div>
                {viewModal.assignment.start_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="text-base font-medium text-foreground">
                      {formatDate(viewModal.assignment.start_date)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="text-base font-medium text-foreground">
                    {formatDate(viewModal.assignment.due_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created On</p>
                  <p className="text-base font-medium text-foreground">
                    {formatDate(viewModal.assignment.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-base font-medium text-foreground">
                    {formatDate(viewModal.assignment.updated_at)}
                  </p>
                </div>
              </div>

              {/* Skills Section */}
              {viewModal.assignment.skills &&
                viewModal.assignment.skills.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-foreground/80 mb-2">
                      Skills Evaluated
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {viewModal.assignment.skills.map((skill) => (
                        <span
                          key={skill.id}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Description */}
              <div>
                <h5 className="text-sm font-medium text-foreground/80 mb-2">
                  Description
                </h5>
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <p className="text-foreground whitespace-pre-wrap">
                    {viewModal.assignment.description}
                  </p>
                </div>
              </div>

              {/* Assignment File */}
              {(viewModal.assignment.assignment_file_url ||
                viewModal.assignment.assignment_file) && (
                <div>
                  <h5 className="text-sm font-medium text-foreground/80 mb-2">
                    Attached File
                  </h5>
                  <a
                    href={`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/api$/, "")}${viewModal.assignment.assignment_file_url || viewModal.assignment.assignment_file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    View Assignment File
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                {!viewModal.assignment?.is_overdue && (
                  <button
                    onClick={() => {
                      router.push(
                        `/dashboards/faculty/assignments/create?id=${viewModal.assignment?.id}`,
                      );
                    }}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Edit Assignment
                  </button>
                )}
                <button
                  onClick={() =>
                    setViewModal({ isOpen: false, assignment: null })
                  }
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Delete Assignment
            </h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete "{deleteConfirm.assignment?.title}
              "? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() =>
                  setDeleteConfirm({ isOpen: false, assignment: null })
                }
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
