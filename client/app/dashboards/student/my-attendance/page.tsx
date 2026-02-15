"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentAttendance from "@/components/student/StudentAttendance";
import { apiClient } from "@/lib/api";

export default function MyAttendancePage() {
  const router = useRouter();

  useEffect(() => {
    const checkMode = async () => {
      const batch = await apiClient.getMyBatch();
      if (batch?.mode === "RECORDED") {
        router.push("/dashboards/student/recorded-classes");
      }
    };

    checkMode();
  }, [router]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Attendance</h1>
          <p className="text-muted-foreground mt-2">
            View your attendance records and statistics
          </p>
        </div>

        {/* Student Attendance */}
        <div className="mb-8">
          <StudentAttendance />
        </div>
      </div>
    </DashboardLayout>
  );
}
