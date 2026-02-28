"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  courseMaterialAPI,
  CreateMaterialData,
  CourseMaterial,
} from "@/lib/courseMaterialAPI";
import { apiClient } from "@/lib/api";

const MATERIAL_TYPES = [
  { value: "PDF", label: "PDF" },
  { value: "PPT", label: "PPT / PPTX" },
  { value: "DOC", label: "DOC / DOCX" },
  { value: "VIDEO", label: "Video (External URL)" },
  { value: "LINK", label: "External Link" },
];

const FILE_TYPES = ["PDF", "PPT", "DOC"];
const LINK_TYPES = ["VIDEO", "LINK"];

export default function UploadMaterialPageWrapper() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    }>
      <UploadMaterialPage />
    </Suspense>
  );
}

function UploadMaterialPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const materialId = searchParams.get("id");
  const parsedId = materialId ? Number.parseInt(materialId, 10) : null;
  const isEditMode = Number.isFinite(parsedId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState<number>(0);
  const [materialType, setMaterialType] = useState("PDF");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>([]);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);

  // Dropdown data
  const [modules, setModules] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Role guard
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

  // Fetch modules and batches assigned to this faculty
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [batchData, moduleData] = await Promise.all([
          apiClient.getFacultyBatchAssignments({
            faculty: "me",
            is_active: true,
          }),
          apiClient.getFacultyModuleAssignments({
            faculty: "me",
            is_active: true,
          }),
        ]);

        // Unique batches
        const uniqueBatches = Array.from(
          new Map(
            batchData.map((item: any) => [
              item.batch?.id,
              {
                id: item.batch?.id,
                code: item.batch?.code,
                mode: item.batch?.mode || item.batch?.template_mode || "",
              },
            ])
          ).values()
        ).filter(Boolean);
        setBatches(uniqueBatches);

        // Unique modules
        const uniqueModules = Array.from(
          new Map(
            moduleData.map((item: any) => [
              item.module?.id,
              { id: item.module?.id, code: item.module?.code, name: item.module?.name },
            ])
          ).values()
        ).filter(Boolean);
        setModules(uniqueModules);

        // If editing, load existing material
        if (isEditMode && parsedId) {
          const mat = await courseMaterialAPI.getMaterialDetail(parsedId);
          setTitle(mat.title);
          setDescription(mat.description);
          setModuleId(mat.module.id);
          setMaterialType(mat.material_type);
          setExternalUrl(mat.external_url || "");
          setExistingFileUrl(mat.file_url);
          setSelectedBatchIds(
            mat.assigned_batches
              .filter((a) => a.is_active)
              .map((a) => a.batch.id)
          );
        }
      } catch (err: any) {
        setError(err.message || "Failed to load data.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [isEditMode, parsedId]);

  // Auto-clear messages
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const toggleBatch = (id: number) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    if (selected) {
      // 20 MB limit
      if (selected.size > 20 * 1024 * 1024) {
        setError("File size exceeds 20 MB limit.");
        return;
      }
      const ext = selected.name.split(".").pop()?.toLowerCase();
      const allowed = ["pdf", "ppt", "pptx", "doc", "docx"];
      if (!ext || !allowed.includes(ext)) {
        setError(`File type .${ext} is not allowed. Allowed: pdf, ppt, pptx, doc, docx`);
        return;
      }
    }
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) { setError("Title is required."); return; }
    if (!moduleId) { setError("Please select a module."); return; }
    if (selectedBatchIds.length === 0) { setError("Select at least one batch."); return; }
    if (FILE_TYPES.includes(materialType) && !file && !isEditMode) {
      setError("Please upload a file for this material type.");
      return;
    }
    if (LINK_TYPES.includes(materialType) && !externalUrl.trim()) {
      setError("Please provide an external URL for this material type.");
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && parsedId) {
        // Update material metadata
        await courseMaterialAPI.updateMaterial(parsedId, {
          title,
          description,
          material_type: materialType,
          ...(file ? { file } : {}),
          ...(LINK_TYPES.includes(materialType) ? { external_url: externalUrl } : {}),
        });
        // Reassign batches
        await courseMaterialAPI.assignBatches(parsedId, selectedBatchIds);
        setSuccess("Material updated successfully!");
      } else {
        const data: CreateMaterialData = {
          title,
          description,
          module_id: moduleId,
          material_type: materialType,
          batch_ids: selectedBatchIds,
        };
        if (file) data.file = file;
        if (LINK_TYPES.includes(materialType)) data.external_url = externalUrl;

        await courseMaterialAPI.createMaterial(data);
        setSuccess("Material uploaded successfully!");
        // Reset form
        setTitle("");
        setDescription("");
        setFile(null);
        setExternalUrl("");
        setSelectedBatchIds([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save material.");
    } finally {
      setLoading(false);
    }
  };

  const isFileType = FILE_TYPES.includes(materialType);
  const isLinkType = LINK_TYPES.includes(materialType);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground mb-6">
          <Link href="/dashboards/faculty" className="hover:text-primary">
            Dashboard
          </Link>
          <span className="mx-2">/</span>
          <Link
            href="/dashboards/faculty/course-materials"
            className="hover:text-primary"
          >
            Course Materials
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground/80 font-medium">
            {isEditMode ? "Edit Material" : "Upload Material"}
          </span>
        </nav>

        {/* Toast */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <div className="bg-card rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-foreground mb-6">
            {isEditMode ? "Edit Course Material" : "Upload Course Material"}
          </h1>

          {loadingData ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-3 text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="e.g. Topic 1 - React Hooks Slides"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Optional description of the material"
                />
              </div>

              {/* Module & Type row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Module */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Module <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={moduleId}
                    onChange={(e) => setModuleId(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                    disabled={isEditMode}
                  >
                    <option value={0}>-- Select Module --</option>
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code} — {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Material Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Material Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={materialType}
                    onChange={(e) => {
                      setMaterialType(e.target.value);
                      setFile(null);
                      setExternalUrl("");
                    }}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    {MATERIAL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File upload (for PDF/PPT/DOC) */}
              {isFileType && (
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Upload File <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 20 MB. Allowed: pdf, ppt, pptx, doc, docx
                  </p>
                  {isEditMode && existingFileUrl && !file && (
                    <p className="text-xs text-primary mt-1">
                      Existing file attached.{" "}
                      <a
                        href={existingFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        View
                      </a>
                    </p>
                  )}
                </div>
              )}

              {/* External URL (for VIDEO/LINK) */}
              {isLinkType && (
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    External URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring focus:border-transparent"
                    placeholder="https://..."
                    required
                  />
                </div>
              )}

              {/* Batch Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Assign to Batches <span className="text-red-500">*</span>
                </label>
                {batches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No batches assigned to you.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {batches.map((b: any) => {
                      const isSelected = selectedBatchIds.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggleBatch(b.id)}
                          className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-left ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card hover:border-border"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? "border-primary bg-primary/80"
                                : "border-border"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-sm text-foreground">
                              {b.code}
                            </span>
                            <span
                              className="ml-2 inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700"
                            >
                              LIVE
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading
                    ? isEditMode
                      ? "Saving..."
                      : "Uploading..."
                    : isEditMode
                    ? "Save Changes"
                    : "Upload Material"}
                </button>
                <Link
                  href="/dashboards/faculty/course-materials"
                  className="px-6 py-2 border border-border text-foreground/80 font-medium rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
