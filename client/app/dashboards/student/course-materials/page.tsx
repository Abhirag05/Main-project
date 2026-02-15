"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  courseMaterialAPI,
  StudentMaterial,
} from "@/lib/courseMaterialAPI";
import { apiClient, BatchModule } from "@/lib/api";

// Color palette for module cards (cycles if more modules than colors)
const MODULE_COLORS = [
  { bg: "bg-primary/10", border: "border-primary/20", icon: "bg-primary/80", hover: "hover:border-primary/70" },
  { bg: "bg-purple-50", border: "border-purple-200", icon: "bg-purple-500", hover: "hover:border-purple-400" },
  { bg: "bg-green-50", border: "border-green-200", icon: "bg-green-500", hover: "hover:border-green-400" },
  { bg: "bg-orange-50", border: "border-orange-200", icon: "bg-orange-500", hover: "hover:border-orange-400" },
  { bg: "bg-cyan-50", border: "border-cyan-200", icon: "bg-cyan-500", hover: "hover:border-cyan-400" },
  { bg: "bg-rose-50", border: "border-rose-200", icon: "bg-rose-500", hover: "hover:border-rose-400" },
  { bg: "bg-amber-50", border: "border-amber-200", icon: "bg-amber-500", hover: "hover:border-amber-400" },
  { bg: "bg-primary/10", border: "border-primary/20", icon: "bg-primary/80", hover: "hover:border-primary/70" },
];

export default function StudentMaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<StudentMaterial[]>([]);
  const [batchModules, setBatchModules] = useState<BatchModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchModulesError, setBatchModulesError] = useState<boolean>(false);

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
        const [materialsResult, batchModulesResult] = await Promise.allSettled([
          courseMaterialAPI.getStudentMaterials(),
          apiClient.getMyBatchModules(),
        ]);

        if (materialsResult.status === "fulfilled") {
          setMaterials(materialsResult.value);
          setError(null);
        } else {
          setError(materialsResult.reason?.message || "Failed to load materials.");
        }

        if (batchModulesResult.status === "fulfilled") {
          setBatchModules(batchModulesResult.value.modules || []);
          setBatchModulesError(false);
        } else {
          setBatchModules([]);
          setBatchModulesError(true);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load materials.");
        setBatchModules([]);
        setBatchModulesError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, []);

  const batchModuleIds = useMemo(() => {
    return new Set(batchModules.map((mod) => mod.module_id));
  }, [batchModules]);

  const filteredMaterials = useMemo(() => {
    if (batchModulesError) return [];
    if (batchModules.length === 0) return [];
    return materials.filter((m) => batchModuleIds.has(m.module.id));
  }, [batchModules, batchModuleIds, batchModulesError, materials]);

  const materialStats = useMemo(() => {
    const stats: Record<number, { materialCount: number; types: Set<string> }> = {};
    filteredMaterials.forEach((m) => {
      if (!stats[m.module.id]) {
        stats[m.module.id] = { materialCount: 0, types: new Set() };
      }
      stats[m.module.id].materialCount++;
      stats[m.module.id].types.add(m.material_type);
    });
    return stats;
  }, [filteredMaterials]);

  // Build module cards from batch modules, even if no materials
  const modules = useMemo(() => {
    if (batchModulesError) return [];
    return batchModules.map((mod) => {
      const stat = materialStats[mod.module_id];
      return {
        id: mod.module_id,
        code: mod.module_code,
        name: mod.module_name,
        materialCount: stat?.materialCount || 0,
        types: stat?.types || new Set<string>(),
      };
    });
  }, [batchModules, batchModulesError, materialStats]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Course Materials
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a module to view its learning materials.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 text-muted-foreground">Loading modules...</p>
          </div>
        ) : modules.length === 0 ? (
          <div className="bg-card rounded-lg shadow-md text-center py-16">
            <svg
              className="w-16 h-16 mx-auto text-muted-foreground/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p className="mt-4 text-muted-foreground font-medium">
              No materials available for your batch yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod, idx) => {
              const color = MODULE_COLORS[idx % MODULE_COLORS.length];
              return (
                <div
                  key={mod.id}
                  onClick={() =>
                    router.push(
                      `/dashboards/student/course-materials/${mod.id}?name=${encodeURIComponent(mod.name)}&code=${encodeURIComponent(mod.code)}`
                    )
                  }
                  className={`cursor-pointer rounded-xl border-2 ${color.border} ${color.bg} ${color.hover} p-6 transition-all hover:shadow-lg group`}
                >
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 ${color.icon} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>

                  {/* Module code */}
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    {mod.code}
                  </p>

                  {/* Module name */}
                  <h2 className="text-lg font-bold text-foreground mb-3 leading-tight">
                    {mod.name}
                  </h2>

                  {/* Stats row */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-medium">
                      {mod.materialCount} material{mod.materialCount !== 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-1.5">
                      {Array.from(mod.types).map((type) => (
                        <span
                          key={type}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-card/70 text-muted-foreground font-medium"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Arrow hint */}
                  <div className="mt-4 flex items-center text-sm text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
                    <span>View materials</span>
                    <svg
                      className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
