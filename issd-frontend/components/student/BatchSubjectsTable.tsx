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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
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
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <span className="text-6xl mb-4 block">📚</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>
          <p className="text-gray-600">
            Please contact administration for batch assignment
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Modules & Faculty
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {message} • {modules.length} module{modules.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Module Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Module Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Faculty
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {modules.map((module, index) => (
              <tr
                key={module.module_id}
                className="hover:bg-gray-50 transition-colors"
              >
                {/* Index */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {index + 1}
                </td>

                {/* Module Code */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                    {module.module_code}
                  </span>
                </td>

                {/* Module Name */}
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {module.module_name}
                  </div>
                </td>

                {/* Faculty Name */}
                <td className="px-6 py-4">
                  {module.faculty_name ? (
                    <div className="text-sm text-gray-900">
                      {module.faculty_name}
                    </div>
                  ) : (
                    <span className="inline-flex items-center text-xs text-gray-500 italic">
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
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          <span className="font-medium">Note:</span> Faculty assignments are
          managed by administration. If you notice any discrepancies, please
          contact your batch coordinator.
        </p>
      </div>
    </div>
  );
}
