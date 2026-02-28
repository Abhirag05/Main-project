"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentAttendance from "@/components/student/StudentAttendance";

export default function MyAttendancePage() {

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
