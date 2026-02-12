"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import { placementAPI, StudentPlacementLink } from "@/lib/placementAPI";
import { useToast } from "@/lib/toast";

export default function StudentPlacementsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [placementLinks, setPlacementLinks] = useState<StudentPlacementLink[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  const toast = useToast();

  // Fetch placement links
  const fetchPlacementLinks = async () => {
    try {
      setIsLoading(true);
      const data = await placementAPI.getStudentPlacementLinks();
      setPlacementLinks(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to load placement links:", error);
      toast.show("error", error.message || "Failed to load placement links");
      setPlacementLinks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchPlacementLinks();
    }
  }, [authLoading, user]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Loading placement opportunities...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Placements</h1>
          <p className="mt-1 text-sm text-gray-600">
            Placement opportunities and registration links
          </p>
        </div>

        {/* Placements List */}
        {placementLinks.length === 0 ? (
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
                d="M20 7l-8-4m0 0L4 7m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0L12 3m0 0L4 7m0 0v10a2 2 0 002 2h12a2 2 0 002-2V7"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No placements yet
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              You haven't received any placement links yet. Check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {placementLinks.map((link) => (
              <div
                key={link.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {link.placement_list_name}
                    </h3>
                    {link.placement_list_description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {link.placement_list_description}
                      </p>
                    )}
                  </div>
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>

                {/* Sent Date */}
                <div className="text-xs text-gray-500 mb-4">
                  Received: {new Date(link.sent_at).toLocaleDateString()}
                </div>

                {/* Registration Link Button */}
                <a
                  href={link.placement_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm mb-3"
                >
                  Open Registration Link
                </a>

                {/* Copy Link Button */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(link.placement_link);
                    toast.show("success", "Link copied to clipboard");
                  }}
                  className="block w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  Copy Link
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
