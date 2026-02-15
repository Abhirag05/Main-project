"use client";

import { useEffect, useState } from "react";
import { apiClient, BatchSubject } from "@/lib/api";

export default function BatchModulesTable() {
  const [modules, setModules] = useState<BatchSubject[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBatchModules();
  }, []);

  const fetchBatchModules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getMyBatchModules();
      setModules(data.modules);
      setMessage(data.message);
    } catch (err: any) {
      console.error("Failed to fetch batch subjects:", err);
      setError(err.message || "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 text-red-600">
          <span className="text-2xl">✕</span>
          <div>
            <p className="font-medium">Error Loading Modules</p>
            <p className="text-sm text-red-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-md p-8">
        <div className="text-center">
          <span className="text-6xl mb-4 block">📚</span>
          <h3 className="text-lg font-medium text-foreground mb-2">{message}</h3>
          <p className="text-muted-foreground">
            Please contact administration for batch assignment
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">
          Modules & Faculty
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {message} • {modules.length} module{modules.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Module Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Module Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Faculty
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {modules.map((module, index) => (
              <tr
                key={module.module_id}
                className="hover:bg-secondary/50 transition-colors"
              >
                {/* Index */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {index + 1}
                </td>

                {/* Module Code */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                    {module.module_code}
                  </span>
                </td>

                {/* Module Name */}
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-foreground">
                    {module.module_name}
                  </div>
                </td>

                {/* Faculty Name */}
                <td className="px-6 py-4">
                  {module.faculty_name ? (
                    <div className="text-sm text-foreground">
                      {module.faculty_name}
                    </div>
                  ) : (
                    <span className="inline-flex items-center text-xs text-muted-foreground italic">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Will be assigned soon
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="px-6 py-3 bg-secondary/50 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Note:</span> Faculty assignments are
          managed by administration. If you notice any discrepancies, please
          contact your batch coordinator.
        </p>
      </div>
    </div>
  );
}
