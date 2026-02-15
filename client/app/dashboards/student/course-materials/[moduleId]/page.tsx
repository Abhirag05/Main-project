"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  courseMaterialAPI,
  StudentMaterial,
} from "@/lib/courseMaterialAPI";

const TYPE_BADGES: Record<string, { bg: string; text: string }> = {
  PDF: { bg: "bg-red-100", text: "text-red-700" },
  PPT: { bg: "bg-orange-100", text: "text-orange-700" },
  DOC: { bg: "bg-blue-100", text: "text-blue-700" },
  VIDEO: { bg: "bg-purple-100", text: "text-purple-700" },
  LINK: { bg: "bg-cyan-100", text: "text-cyan-700" },
};

export default function ModuleMaterialsPageWrapper() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    }>
      <ModuleMaterialsPage />
    </Suspense>
  );
}

function ModuleMaterialsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const moduleId = Number(params.moduleId);
  const moduleName = searchParams.get("name") || "Module";
  const moduleCode = searchParams.get("code") || "";

  const [materials, setMaterials] = useState<StudentMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");

  // Role guard
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
    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const params: any = { module_id: moduleId };
        if (filterType) params.material_type = filterType;
        const data = await courseMaterialAPI.getStudentMaterials(params);
        setMaterials(data);
      } catch (err: any) {
        setError(err.message || "Failed to load materials.");
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [moduleId, filterType]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Back + Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboards/student/course-materials")}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-3"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Modules
          </button>

          <h1 className="text-2xl font-bold text-gray-800">
            {moduleName}
          </h1>
          {moduleCode && (
            <p className="text-sm text-gray-500 mt-1">
              {moduleCode} &mdash; {materials.length} material{materials.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Material Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="PDF">PDF</option>
              <option value="PPT">PPT</option>
              <option value="DOC">DOC</option>
              <option value="VIDEO">Video</option>
              <option value="LINK">Link</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-500">Loading materials...</p>
          </div>
        ) : materials.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md text-center py-16">
            <svg
              className="w-16 h-16 mx-auto text-gray-300"
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
            <p className="mt-4 text-gray-500 font-medium">
              No materials found for this module.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((mat) => {
              const badge = TYPE_BADGES[mat.material_type] || {
                bg: "bg-gray-100",
                text: "text-gray-700",
              };
              const hasFile = !!mat.file_url;
              const hasLink = !!mat.external_url;

              return (
                <div
                  key={mat.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
                >
                  {/* Title & badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-800 leading-tight">
                      {mat.title}
                    </h3>
                    <span
                      className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${badge.bg} ${badge.text}`}
                    >
                      {mat.material_type}
                    </span>
                  </div>

                  {/* Description */}
                  {mat.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {mat.description}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="text-xs text-gray-400 mb-4 space-y-0.5">
                    <p>
                      Uploaded by{" "}
                      <span className="text-gray-600">
                        {mat.faculty_name}
                      </span>
                    </p>
                    <p>
                      {new Date(mat.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Action */}
                  {hasFile && (
                    <a
                      href={mat.file_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download
                    </a>
                  )}
                  {hasLink && (
                    <a
                      href={mat.external_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      Open Link
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
