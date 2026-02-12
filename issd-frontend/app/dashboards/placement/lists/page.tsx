"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import {
  placementAPI,
  PlacementList,
  CreatePlacementListData,
} from "@/lib/placementAPI";
import { useToast } from "@/lib/toast";

export default function PlacementListsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [lists, setLists] = useState<PlacementList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newListLink, setNewListLink] = useState("");

  const toast = useToast();

  // Fetch lists
  const fetchLists = async () => {
    try {
      setIsLoading(true);
      const data = await placementAPI.getPlacementLists();
      setLists(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to load placement lists:", error);
      toast.show("error", error.message || "Failed to load placement lists");
      setLists([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchLists();
    }
  }, [authLoading, user]);

  // Create new list
  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) {
      toast.show("error", "Please enter a list name");
      return;
    }

    try {
      setIsCreating(true);
      const data: CreatePlacementListData = {
        name: newListName.trim(),
        description: newListDescription.trim(),
        placement_link: newListLink.trim() || undefined,
      };
      await placementAPI.createPlacementList(data);
      toast.show("success", "Placement list created successfully");
      setShowCreateModal(false);
      setNewListName("");
      setNewListDescription("");
      setNewListLink("");
      fetchLists();
    } catch (error: any) {
      toast.show("error", error.message || "Failed to create placement list");
    } finally {
      setIsCreating(false);
    }
  };

  // Delete list
  const handleDeleteList = async (listId: number, listName: string) => {
    if (!confirm(`Are you sure you want to delete "${listName}"?`)) {
      return;
    }

    try {
      await placementAPI.deletePlacementList(listId);
      toast.show("success", "Placement list deleted successfully");
      fetchLists();
    } catch (error: any) {
      toast.show("error", error.message || "Failed to delete placement list");
    }
  };

  if (isLoading && lists.length === 0) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading placement lists...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Placement Lists
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Organize students into custom lists for placement activities
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg
              className="h-5 w-5 mr-2"
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
            Create New List
          </button>
        </div>

        {/* Lists Grid */}
        {lists.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No placement lists yet
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Get started by creating your first placement list
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create List
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => (
              <div
                key={list.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
                onClick={() =>
                  router.push(`/dashboards/placement/lists/${list.id}`)
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {list.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {list.description || "No description"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(list.id, list.name);
                    }}
                    className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete list"
                  >
                    <svg
                      className="h-5 w-5"
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

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <svg
                      className="h-5 w-5 mr-2"
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
                    <span className="font-medium">{list.student_count}</span>
                    <span className="ml-1">
                      {list.student_count === 1 ? "student" : "students"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Created {new Date(list.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  By {list.created_by_name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Create New Placement List
              </h2>
              <form onSubmit={handleCreateList}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      List Name *
                    </label>
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      placeholder="e.g., Python Developers Q1 2024"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      placeholder="Optional description for this list"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Placement Registration Link
                    </label>
                    <input
                      type="url"
                      value={newListLink}
                      onChange={(e) => setNewListLink(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      placeholder="https://example.com/registration"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Students will receive this link when you send registration
                      invites
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewListName("");
                      setNewListDescription("");
                      setNewListLink("");
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isCreating ? "Creating..." : "Create List"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
