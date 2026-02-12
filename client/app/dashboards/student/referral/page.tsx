"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import { useToast } from "@/lib/toast";
import { apiClient, StudentReferralInfo } from "@/lib/api";

export default function StudentReferralPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [referralInfo, setReferralInfo] = useState<StudentReferralInfo | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const toast = useToast();

  const fetchReferralInfo = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getMyReferralInfo();
      setReferralInfo(data);
    } catch (error: any) {
      toast.show("error", error.message || "Failed to load referral info");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchReferralInfo();
    }
  }, [authLoading, user]);

  const handleCopy = async () => {
    if (!referralInfo?.referral_code) return;
    try {
      await navigator.clipboard.writeText(referralInfo.referral_code);
      toast.show("success", "Referral code copied");
    } catch {
      toast.show("error", "Failed to copy referral code");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading referral info...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Referral</h1>
          <p className="mt-1 text-sm text-gray-600">
            Share your referral code to invite new students.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-sm font-medium text-gray-500">Your Code</h2>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-2xl font-bold text-gray-900 tracking-wider">
                {referralInfo?.referral_code || "N/A"}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-sm font-medium text-gray-500">
              Confirmed Referrals
            </h2>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {referralInfo?.confirmed_count ?? 0}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Confirmed by Finance after registration.
            </p>
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
}
