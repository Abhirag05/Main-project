"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BatchCard from "@/components/batch/BatchCard";
import { apiClient, Batch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { isAdminRole } from "@/lib/roles";

export default function BatchesPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<any>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Delete confirmation
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; batchId: number | null; batchCode: string }>({
    open: false,
    batchId: null,
    batchCode: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Check user role
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);

        // Access control: only CENTRE_ADMIN
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
      fetchBatches();
    }
  }, [user, courseFilter, statusFilter]);

  const handleDeleteClick = (id: number) => {
    const batch = batches.find((b) => b.id === id);
    setDeleteModal({ open: true, batchId: id, batchCode: batch?.code || "" });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.batchId) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteBatch(deleteModal.batchId);
      toast.show("success", `Batch ${deleteModal.batchCode} deleted successfully`);
      setDeleteModal({ open: false, batchId: null, batchCode: "" });
      fetchBatches();
    } catch (err: any) {
      toast.show("error", err.message || "Failed to delete batch");
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (courseFilter) params.course = parseInt(courseFilter);
      if (statusFilter) params.status = statusFilter;

      const data = await apiClient.getBatches(params);
      setBatches(data);
    } catch (err: any) {
      toast.show("error", err.message || "Failed to load batches");
    } finally {
      setLoading(false);
    }
  };

  // Access denied state
  if (user && !isAdminRole(user.role.code)) {
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
              Access Denied
            </h2>
            <p className="mt-2 text-muted-foreground">
              You don't have permission to access this page. Only Centre Admins
              can manage batches.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Loading initial check
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Batches</h1>
            <p className="mt-2 text-sm text-foreground/80">
              Manage batches for your centre
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 text-foreground/80 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Batch Cards Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading batches...</span>
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground/70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-foreground">
                No batches found
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating a new batch.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => router.push("/dashboards/admin/batches/create")}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                >
                  Create Batch
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} onDelete={handleDeleteClick} />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 rounded-full bg-red-100 p-2">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Delete Batch</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete batch <span className="font-semibold text-foreground">{deleteModal.batchCode}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, batchId: null, batchCode: "" })}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-secondary/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                Delete Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
