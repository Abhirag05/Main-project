"use client";

import { useEffect, useState } from "react";
import {
  studentAttendanceAPI,
  StudentSessionAttendance,
} from "@/lib/studentAttendanceAPI";

export default function StudentAttendance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<StudentSessionAttendance[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await studentAttendanceAPI.getMyAttendance();
        if (!mounted) return;
        setRecords(data);
      } catch (err: any) {
        setError(err.message || "Failed to load attendance");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const presentCount = records.filter(
    (r) => r.attendance_status === "PRESENT",
  ).length;
  const absentCount = records.filter(
    (r) => r.attendance_status === "ABSENT",
  ).length;

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">My Attendance</h3>
          <p className="text-sm text-gray-500">
            View sessions you've attended or missed
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-600">
          Loading attendance...
        </div>
      ) : error ? (
        <div className="py-4 text-red-700 bg-red-50 border border-red-100 rounded">
          {error}
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {records.length}
              </div>
              <div className="text-xs text-gray-500">Total Sessions</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {presentCount}
              </div>
              <div className="text-xs text-gray-500">Present</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">
                {absentCount}
              </div>
              <div className="text-xs text-gray-500">Absent</div>
            </div>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((r) => (
                  <tr
                    key={r.session_id}
                    className={
                      r.attendance_status === "PRESENT"
                        ? ""
                        : r.attendance_status === "ABSENT"
                          ? "bg-red-50"
                          : "bg-gray-50"
                    }
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {new Date(r.session_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {r.module_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {r.batch_code}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500">
                      {r.scheduled_start?.slice(0, 5)} -{" "}
                      {r.scheduled_end?.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${r.attendance_status === "PRESENT" ? "bg-green-100 text-green-800" : r.attendance_status === "ABSENT" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700"}`}
                      >
                        {r.attendance_status
                          ? r.attendance_status === "PRESENT"
                            ? "Present"
                            : "Absent"
                          : "Not Marked"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
