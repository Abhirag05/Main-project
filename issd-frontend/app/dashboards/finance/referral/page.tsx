"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import { useToast } from "@/lib/toast";
import { financeAPI, FinanceReferralItem } from "@/lib/financeAPI";
import Pagination, { usePagination } from "@/components/shared/Pagination";

export default function FinanceReferralPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [referrals, setReferrals] = useState<FinanceReferralItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const toast = useToast();
  const { currentPage, pageSize, totalItems, paginatedData, setCurrentPage, setPageSize } = usePagination(referrals, 10);

  const fetchReferrals = async () => {
    try {
      setIsLoading(true);
      const data = await financeAPI.getPendingReferrals();
      setReferrals(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.show("error", error.message || "Failed to load referrals");
      setReferrals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchReferrals();
    }
  }, [authLoading, user]);

  const handleConfirm = async (studentProfileId: number) => {
    try {
      setIsProcessing(true);
      await financeAPI.confirmReferral(studentProfileId);
      toast.show("success", "Referral confirmed");
      fetchReferrals();
    } catch (error: any) {
      toast.show("error", error.message || "Failed to confirm referral");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading referrals...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Referral Confirmation
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Confirm referrals for newly registered students.
          </p>
        </div>

        {referrals.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-10 text-center">
            <p className="text-sm text-gray-600">No pending referrals.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Referrer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((referral) => (
                    <tr key={referral.student_profile_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {referral.student_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {referral.student_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {referral.referred_by_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {referral.referred_by_email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {referral.referred_by_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          type="button"
                          onClick={() =>
                            handleConfirm(referral.student_profile_id)
                          }
                          disabled={isProcessing}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Confirm
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        )}
      </div>

    </DashboardLayout>
  );
}
