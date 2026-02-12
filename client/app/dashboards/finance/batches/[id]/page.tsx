"use client";

/**
 * Finance Admin Batch Details Page
 * 
 * Displays batch information and enrolled students.
 * Finance Admin has same access as Centre Admin.
 */

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient, Batch, BatchDetails } from "@/lib/api";
import { useToast } from "@/lib/toast";

export default function FinanceBatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    // Check user role
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);

        if (userData.role.code !== "FINANCE") {
          router.push("/dashboards");
        }
      } else {
        router.push("/");
      }
    }
  }, [router]);

  useEffect(() => {
    if (user?.role.code === "FINANCE") {
      fetchBatchDetail();
    }
  }, [user, batchId]);

  const fetchBatchDetail = async () => {
    setLoading(true);
    try {
      const [batchData, detailsData] = await Promise.all([
        apiClient.getBatch(parseInt(batchId)),
        apiClient.getBatchDetails(parseInt(batchId)),
      ]);
      setBatch(batchData);
      setBatchDetails(detailsData);
    } catch (err: any) {
      toast.show("error", err.message || "Failed to load batch details");
      setTimeout(() => router.push("/dashboards/finance/batches"), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading batch details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!batch || !batchDetails) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Batch not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li>
              <Link href="/dashboards/finance" className="text-gray-500 hover:text-gray-700">
                Finance Dashboard
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <Link href="/dashboards/finance/batches" className="text-gray-500 hover:text-gray-700">
                  Batches
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-900 font-medium">{batch.code}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header with Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{batch.code}</h1>
            <p className="mt-2 text-sm text-gray-600">Batch Details (Finance Admin)</p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/dashboards/finance/batches/${batch.id}/assign-students`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Assign Students
            </Link>
          </div>
        </div>

        {/* Batch Info Card */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Batch Information</h3>
          </div>
          <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Course</dt>
              <dd className="mt-1 text-sm text-gray-900">{batch.course_name} ({batch.course_code})</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  batch.status === "ACTIVE" ? "bg-green-100 text-green-800" :
                  batch.status === "COMPLETED" ? "bg-blue-100 text-blue-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {batch.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(batch.start_date).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">End Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(batch.end_date).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Mode</dt>
              <dd className="mt-1 text-sm text-gray-900">{batch.mode}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Students</dt>
              <dd className="mt-1 text-sm text-gray-900">{batch.current_student_count} / {batch.max_students}</dd>
            </div>
          </div>
        </div>

        {/* Enrolled Students */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Enrolled Students ({batchDetails.enrolled_students?.length || 0})
            </h3>
          </div>
          <div className="overflow-x-auto">
            {batchDetails.enrolled_students && batchDetails.enrolled_students.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {batchDetails.enrolled_students.map((student) => (
                    <tr key={student.student_profile_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(student.joined_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No students enrolled yet</p>
                <Link
                  href={`/dashboards/finance/batches/${batch.id}/assign-students`}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Assign Students
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
