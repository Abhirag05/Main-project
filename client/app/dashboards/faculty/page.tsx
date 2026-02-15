"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FacultyProfileCard from "@/components/faculty/FacultyProfileCard";
import { useFacultyGuard } from "@/components/faculty/hooks/useFacultyGuard";
import FacultyCard from "@/components/faculty/ui/FacultyCard";
import FacultyPageHeader from "@/components/faculty/ui/FacultyPageHeader";
import FacultyToast from "@/components/faculty/ui/FacultyToast";
import {
  apiClient,
  FacultySelfProfile,
  FacultyBatchAssignment,
} from "@/lib/api";
import { useToast } from "@/lib/toast";

export default function FacultyDashboard() {
  const { isAllowed } = useFacultyGuard();
  const [profile, setProfile] = useState<FacultySelfProfile | null>(null);
  const [batchCount, setBatchCount] = useState(0);
  const [moduleCount, setModuleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, batchData, moduleData] = await Promise.all([
        apiClient.getFacultySelfProfile(),
        apiClient.getFacultyBatchAssignments({
          faculty: "me",
          is_active: true,
        }),
        apiClient.getFacultyModuleAssignments({
          faculty: "me",
          is_active: true,
        }),
      ]);
      setProfile(profileData);
      setBatchCount(batchData.length);
      setModuleCount(moduleData.length);
    } catch (err) {
      const error = err as Error;
      setToast({ type: "error", message: error.message || "Failed to load data" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) {
      fetchData();
    }
  }, [isAllowed, fetchData]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleProfileUpdate = () => {
    fetchData();
    setToast({ type: "success", message: "Profile updated successfully" });
  };

  if (!isAllowed) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <FacultyPageHeader
          title="Faculty Dashboard"
          description="Overview of your profile and teaching activities"
        />

        {/* Toast Notification */}
        {toast && <FacultyToast message={toast.message} type={toast.type} />}

        {/* Profile Card */}
        {loading ? (
          <FacultyCard className="p-6 mb-6">
            <p className="text-gray-600">Loading profile...</p>
          </FacultyCard>
        ) : profile ? (
          <FacultyProfileCard
            profile={profile}
            onUpdate={handleProfileUpdate}
            onError={(msg) => setToast({ type: "error", message: msg })}
          />
        ) : (
          <FacultyCard className="p-6 mb-6">
            <p className="text-red-600">Failed to load profile</p>
          </FacultyCard>
        )}

        {/* Quick Actions */}
        <FacultyCard className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* My Schedule */}
            <Link
              href="/dashboards/faculty/schedule"
              className="flex items-center p-4 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <svg
                className="h-10 w-10 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
                />
              </svg>
              <div className="ml-4">
                <h3 className="font-semibold text-indigo-900">My Schedule</h3>
                <p className="text-sm text-indigo-700">
                  View &amp; manage sessions
                </p>
              </div>
            </Link>

            {/* My Batches */}
            <Link
              href="/dashboards/faculty/batches"
              className="flex items-center p-4 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <svg
                className="h-10 w-10 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
              <div className="ml-4">
                <h3 className="font-semibold text-green-900">My Batches</h3>
                <p className="text-sm text-green-700">
                  {batchCount} batches, {moduleCount} modules
                </p>
              </div>
            </Link>

            {/* Batch Timetable */}
            <Link
              href="/dashboards/faculty/timetable"
              className="flex items-center p-4 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <svg
                className="h-10 w-10 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="ml-4">
                <h3 className="font-semibold text-amber-900">Timetable</h3>
                <p className="text-sm text-amber-700">View batch timetables</p>
              </div>
            </Link>
          </div>
        </FacultyCard>
      </div>
    </DashboardLayout>
  );
}
