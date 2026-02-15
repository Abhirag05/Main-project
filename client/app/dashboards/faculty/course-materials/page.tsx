"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useFacultyGuard } from "@/components/faculty/hooks/useFacultyGuard";
import FacultyAlert from "@/components/faculty/ui/FacultyAlert";
import FacultyCard from "@/components/faculty/ui/FacultyCard";
import FacultyEmptyState from "@/components/faculty/ui/FacultyEmptyState";
import FacultyPageHeader from "@/components/faculty/ui/FacultyPageHeader";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { courseMaterialAPI, CourseMaterial } from "@/lib/courseMaterialAPI";

const TYPE_BADGES: Record<string, { bg: string; text: string }> = {
  PDF: { bg: "bg-red-100", text: "text-red-700" },
  PPT: { bg: "bg-orange-100", text: "text-orange-700" },
  DOC: { bg: "bg-primary/10", text: "text-primary" },
  VIDEO: { bg: "bg-purple-100", text: "text-purple-700" },
  LINK: { bg: "bg-cyan-100", text: "text-cyan-700" },
};

export default function FacultyMaterialsPage() {
  const { isAllowed } = useFacultyGuard();
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState("");
  const [filterActive, setFilterActive] = useState<string>("true");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    material: CourseMaterial | null;
  }>({ isOpen: false, material: null });

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterType) params.material_type = filterType;
      if (filterActive !== "") params.is_active = filterActive === "true";
      const data = await courseMaterialAPI.getFacultyMaterials(params);
      setMaterials(data);
    } catch (err: any) {
      setError(err.message || "Failed to load materials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAllowed) {
      fetchMaterials();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterActive, isAllowed]);

  // Auto-clear messages
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const handleDeactivate = async (id: number) => {
    if (!confirm("Deactivate this material? Students will no longer see it."))
      return;
    try {
      await courseMaterialAPI.deleteMaterial(id);
      setSuccess("Material deactivated.");
      fetchMaterials();
    } catch (err: any) {
      setError(err.message || "Failed to deactivate.");
    }
  };

  const handleDelete = async (material: CourseMaterial) => {
    setDeletingId(material.id);
    try {
      await courseMaterialAPI.deleteMaterial(material.id);
      setSuccess("Material deleted.");
      setMaterials((prev) => prev.filter((mat) => mat.id !== material.id));
    } catch (err: any) {
      setError(err.message || "Failed to delete.");
    } finally {
      setDeletingId(null);
      setDeleteConfirm({ isOpen: false, material: null });
    }
  };

  if (!isAllowed) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <FacultyPageHeader
          title="My Course Materials"
          description="Manage learning materials assigned to your batches."
          action={
            <Link
              href="/dashboards/faculty/course-materials/upload"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
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
              Upload Material
            </Link>
          }
        />

        {/* Toast */}
        {error && (
          <FacultyAlert variant="error" className="mb-4">
            {error}
          </FacultyAlert>
        )}
        {success && (
          <FacultyAlert variant="success" className="mb-4">
            {success}
          </FacultyAlert>
        )}

        {/* Filters */}
        <FacultyCard className="p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Material Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-ring"
            >
              <option value="">All Types</option>
              <option value="PDF">PDF</option>
              <option value="PPT">PPT</option>
              <option value="DOC">DOC</option>
              <option value="VIDEO">Video</option>
              <option value="LINK">Link</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Status
            </label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-ring"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </FacultyCard>

        {/* Table / List */}
        <FacultyCard className="overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-3 text-muted-foreground">Loading materials...</p>
            </div>
          ) : materials.length === 0 ? (
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
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
              title="No materials found"
              description="Upload your first material to share with students."
              action={
                <Link
                  href="/dashboards/faculty/course-materials/upload"
                  className="inline-flex items-center text-primary hover:underline text-sm"
                >
                  Upload your first material
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Batches
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {materials.map((mat) => {
                    const badge = TYPE_BADGES[mat.material_type] || {
                      bg: "bg-secondary",
                      text: "text-foreground/80",
                    };
                    return (
                      <tr
                        key={mat.id}
                        className={`hover:bg-secondary/50 ${
                          !mat.is_active ? "opacity-50" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-foreground">
                            {mat.title}
                          </div>
                          {mat.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-xs">
                              {mat.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground/80">
                          {mat.module.code}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {mat.assigned_batches
                              .filter((a) => a.is_active)
                              .map((a) => (
                                <span
                                  key={a.id}
                                  className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                                    a.batch.mode === "LIVE"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-purple-100 text-purple-700"
                                  }`}
                                >
                                  {a.batch.code}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-semibold ${badge.bg} ${badge.text}`}
                          >
                            {mat.material_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(mat.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboards/faculty/course-materials/upload?id=${mat.id}`}
                              className="text-primary hover:text-primary text-sm font-medium"
                            >
                              Edit
                            </Link>
                            {mat.is_active && (
                              <button
                                onClick={() => handleDeactivate(mat.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Disable
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  isOpen: true,
                                  material: mat,
                                })
                              }
                              disabled={deletingId === mat.id}
                              className="text-muted-foreground hover:text-foreground text-sm font-medium disabled:opacity-50"
                            >
                              {deletingId === mat.id ? "Deleting..." : "Delete"}
                            </button>
                            {mat.file_url && (
                              <a
                                href={mat.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground/80 text-sm"
                              >
                                Download
                              </a>
                            )}
                            {mat.external_url && (
                              <a
                                href={mat.external_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground/80 text-sm"
                              >
                                Open
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </FacultyCard>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Material"
        message={`Delete "${deleteConfirm.material?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onCancel={() => setDeleteConfirm({ isOpen: false, material: null })}
        onConfirm={() =>
          deleteConfirm.material && handleDelete(deleteConfirm.material)
        }
      />
    </DashboardLayout>
  );
}
