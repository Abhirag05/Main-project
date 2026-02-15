"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient, Batch, BatchDetails, BatchStudent } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { isAdminRole } from "@/lib/roles";

export default function BatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBatch, setEditedBatch] = useState<Partial<Batch>>({});
  const toast = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    // Check user role
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);

        if (!isAdminRole(userData.role.code)) {
          router.push("/dashboards");
        }
      } else {
        router.push("/");
      }
    }
  }, [router]);

  useEffect(() => {
    if (isAdminRole(user?.role.code)) {
      fetchBatchDetail();
    }
  }, [user, batchId]);

  const fetchBatchDetail = async () => {
    setLoading(true);
    try {
      // Fetch batch info and enrolled students in parallel
      const [batchData, detailsData] = await Promise.all([
        apiClient.getBatch(parseInt(batchId)),
        apiClient.getBatchDetails(parseInt(batchId)),
      ]);
      setBatch(batchData);
      setBatchDetails(detailsData);
      setEditedBatch({
        start_date: batchData.start_date,
        end_date: batchData.end_date,
      });
    } catch (err: any) {
      toast.show("error", err.message || "Failed to load batch details");
      setTimeout(() => router.push("/dashboards/admin/batches"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (batch) {
      setEditedBatch({
        start_date: batch.start_date,
        end_date: batch.end_date,
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!batch) return;

    try {
      // Call update API (you'll need to add this to api.ts)
      await apiClient.updateBatch(batch.id, editedBatch);
      toast.show("success", "Batch updated successfully");
      setIsEditing(false);
      fetchBatchDetail(); // Refresh data
    } catch (err: any) {
      toast.show("error", err.message || "Failed to update batch");
    }
  };

 
  const handleStatusChange = async (newStatus: "COMPLETED" | "CANCELLED") => {
    if (!batch) return;

    try {
      await apiClient.updateBatchStatus(batch.id, newStatus);
      toast.show("success", `Batch status updated to ${newStatus}`);
      fetchBatchDetail();
    } catch (err: any) {
      toast.show("error", err.message || "Failed to update status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "COMPLETED":
        return "bg-primary/10 text-primary";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-secondary text-foreground";
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case "LIVE":
        return "bg-purple-100 text-purple-800";
      case "RECORDED":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-secondary text-foreground";
    }
  };

  if (!user || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading batch details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!batch) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-foreground">
              Batch Not Found
            </h2>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center text-sm text-muted-foreground hover:text-foreground"
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Batches
        </button>

        {/* Header with Actions */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-foreground">
                  {batch.code}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    batch.status
                  )}`}
                >
                  {batch.status}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getModeColor(
                    batch.mode
                  )}`}
                >
                  {batch.mode}
                </span>
              </div>
              <p className="mt-2 text-lg text-muted-foreground">{batch.course_name}</p>
            </div>
            
            {/* Action Buttons */}
            {!isEditing && (
              <div className="flex space-x-2">
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </button>
              </div>
            )}

            {isEditing && (
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-muted text-foreground/80 rounded-lg hover:bg-muted-foreground/30 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Batch Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="bg-card rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground border-b pb-3">
              Batch Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Batch Code
                </label>
                <p className="mt-1 text-base text-foreground">{batch.code}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Course
                </label>
                <p className="mt-1 text-base text-foreground">
                  {batch.course_name} ({batch.course_code})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Centre
                </label>
                <p className="mt-1 text-base text-foreground">
                  {batch.centre_name} ({batch.centre_code})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Duration
                </label>
                <p className="mt-1 text-base text-foreground">
                  {batch.course_duration_months} months
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Mode
                </label>
                <span
                  className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getModeColor(
                    batch.mode
                  )}`}
                >
                  {batch.mode}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Maximum Students
                </label>
                <p className="mt-1 text-base text-foreground">
                  {batch.max_students}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Current Enrollment
                </label>
                <p className="mt-1 text-base text-foreground">
                  {batch.current_student_count} students
                </p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="bg-card rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground border-b pb-3">
              Schedule & Status
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Start Date
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedBatch.start_date || ""}
                    onChange={(e) =>
                      setEditedBatch({
                        ...editedBatch,
                        start_date: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring sm:text-sm text-foreground/80"
                  />
                ) : (
                  <p className="mt-1 text-base text-foreground">
                    {new Date(batch.start_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  End Date
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedBatch.end_date || ""}
                    onChange={(e) =>
                      setEditedBatch({
                        ...editedBatch,
                        end_date: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring sm:text-sm text-foreground/80"
                  />
                ) : (
                  <p className="mt-1 text-base text-foreground">
                    {new Date(batch.end_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Status
                </label>
                <div className="mt-2 flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      batch.status
                    )}`}
                  >
                    {batch.status}
                  </span>
                  {batch.status === "ACTIVE" && !isEditing && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleStatusChange("COMPLETED")}
                        className="px-3 py-1 bg-primary text-white rounded-md text-xs hover:bg-primary/90"
                      >
                        Mark Completed
                      </button>
                      <button
                        onClick={() => handleStatusChange("CANCELLED")}
                        className="px-3 py-1 bg-red-600 text-white rounded-md text-xs hover:bg-red-700"
                      >
                        Cancel Batch
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Created
                </label>
                <p className="mt-1 text-base text-foreground">
                  {new Date(batch.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Last Updated
                </label>
                <p className="mt-1 text-base text-foreground">
                  {new Date(batch.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enrolled Students Section */}
        <div className="mt-8 bg-card rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              Enrolled Students
              {batchDetails && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({batchDetails.enrolled_students.length} of {batch.max_students} max)
                </span>
              )}
            </h2>
            {batch.status === "ACTIVE" && batch.current_student_count < batch.max_students && (
              <button
                onClick={() => router.push(`/dashboards/admin/batches/${batchId}/assign-students`)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Assign More Students
              </button>
            )}
          </div>

          {batchDetails && batchDetails.enrolled_students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Enrollment Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {batchDetails.enrolled_students.map((student, index) => (
                    <tr key={student.student_profile_id} className="hover:bg-secondary/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {student.full_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(student.joined_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground/70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-foreground">No students enrolled</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by assigning students to this batch.
              </p>
              {batch.status === "ACTIVE" && (
                <div className="mt-6">
                  <button
                    onClick={() => router.push(`/dashboards/admin/batches/${batchId}/assign-students`)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                  >
                    <svg
                      className="-ml-1 mr-2 h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Assign Students
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
