"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { placementAPI, StudentPlacementLink } from "@/lib/placementAPI";

export default function StudentPlacementsPage() {
  const [links, setLinks] = useState<StudentPlacementLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await placementAPI.getStudentPlacementLinks();
        setLinks(data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load placement links.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Placement Links</h1>
          <p className="mt-1 text-sm text-gray-500">
            View placement registration links shared with you
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
            {error}
          </div>
        ) : links.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No placement links yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              You haven&apos;t been added to any placement lists yet. Check back later.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((link) => (
              <div
                key={link.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {link.placement_list_name}
                  </h3>
                  {link.placement_list_description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-3">
                      {link.placement_list_description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    Shared on{" "}
                    {new Date(link.sent_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <a
                  href={link.placement_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition"
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
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Open Registration Link
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
