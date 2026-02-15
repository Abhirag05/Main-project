"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/lib/toast";
import { placementAPI, PlacementList, CreatePlacementListData } from "@/lib/placementAPI";
import { isAdminRole } from "@/lib/roles";

export default function PlacementListsPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<{ role: { code: string } } | null>(null);
  const [lists, setLists] = useState<PlacementList[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<CreatePlacementListData>({
    name: "",
    description: "",
    placement_link: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PlacementList | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        setUser(u);
        if (!isAdminRole(u.role.code)) router.push("/dashboards");
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    if (user && isAdminRole(user.role.code)) fetchLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const data = await placementAPI.getPlacementLists();
      setLists(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.show("error", err.message || "Failed to load placement lists");
      setLists([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setForm({ name: "", description: "", placement_link: "" });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Company / list name is required";
    if (
      form.placement_link &&
      !/^https?:\/\/.+/.test(form.placement_link.trim())
    ) {
      errors.placement_link = "Please enter a valid URL (https://...)";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      await placementAPI.createPlacementList({
        name: form.name.trim(),
        description: form.description?.trim() || "",
        placement_link: form.placement_link?.trim() || "",
      });
      toast.show("success", "Placement list created successfully");
      setIsModalOpen(false);
      fetchLists();
    } catch (err: any) {
      toast.show("error", err.message || "Failed to create placement list");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await placementAPI.deletePlacementList(deleteTarget.id);
      toast.show("success", `"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      fetchLists();
    } catch (err: any) {
      toast.show("error", err.message || "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Placement Lists
            </h1>
            <p className="mt-1 text-gray-500">
              Create placement drives, assign eligible students and share
              registration links.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
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
            Create Placement List
          </button>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-xl border border-gray-200 p-6 space-y-4"
              >
                <div className="h-5 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : lists.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No placement lists yet
            </h3>
            <p className="mt-1 text-gray-500">
              Create a placement list to start organizing students for placement
              drives.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
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
              Create Placement List
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => (
              <div
                key={list.id}
                onClick={() =>
                  router.push(`/dashboards/admin/placement/lists/${list.id}`)
                }
                className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer overflow-hidden group"
              >
                {/* Card header accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />

                <div className="p-6 space-y-4">
                  {/* Title + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2">
                      {list.name}
                    </h3>
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      {list.student_count}
                    </span>
                  </div>

                  {/* Description */}
                  {list.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {list.description}
                    </p>
                  )}

                  {/* Registration link badge */}
                  {list.placement_link ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-2.5 py-1.5">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      Registration link added
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      No registration link
                    </div>
                  )}

                  {/* Footer meta */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span>
                      Created{" "}
                      {new Date(list.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(list);
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors p-1"
                      title="Delete"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white">
                Create Placement List
              </h2>
              <p className="text-blue-100 text-sm">
                Add a new placement drive for student assignment
              </p>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {/* Company / list name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Company / List Name{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all text-gray-900 ${
                    formErrors.name
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-200 hover:border-gray-400"
                  }`}
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (formErrors.name)
                      setFormErrors({ ...formErrors, name: "" });
                  }}
                  placeholder="e.g. TCS Digital — Feb 2026"
                  required
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 hover:border-gray-400 transition-all text-gray-900 resize-none"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Brief description of the placement drive…"
                />
              </div>

              {/* Registration link */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Registration Link
                </label>
                <input
                  type="url"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all text-gray-900 ${
                    formErrors.placement_link
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-200 hover:border-gray-400"
                  }`}
                  value={form.placement_link}
                  onChange={(e) => {
                    setForm({ ...form, placement_link: e.target.value });
                    if (formErrors.placement_link)
                      setFormErrors({ ...formErrors, placement_link: "" });
                  }}
                  placeholder="https://..."
                />
                {formErrors.placement_link && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.placement_link}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  You can add this later from the placement list detail page.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  disabled={isSaving}
                >
                  {isSaving && (
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {isSaving ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Delete Placement List
                  </h3>
                  <p className="text-sm text-gray-500">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to permanently delete{" "}
                <strong className="text-gray-900">{deleteTarget.name}</strong>?
                All assigned students will be removed from this list.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  disabled={isDeleting}
                >
                  {isDeleting && (
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
