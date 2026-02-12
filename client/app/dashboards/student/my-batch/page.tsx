"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MyBatchCard from "@/components/student/MyBatchCard";
import BatchSubjectsTable from "@/components/student/BatchSubjectsTable";

export default function MyBatchPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Batch</h1>
          <p className="text-gray-600 mt-2">
            View your current batch details and information
          </p>
        </div>

        {/* My Batch Card */}
        <div className="mb-8">
          <MyBatchCard />
        </div>

        {/* Batch Subjects Table */}
        <div className="mb-8">
          <BatchSubjectsTable />
        </div>
      </div>
    </DashboardLayout>
  );
}
