"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentAdmissionsTable from "@/components/shared/StudentAdmissionsTable";
import VerifyFullPaymentModal from "@/components/shared/VerifyFullPaymentModal";
import DisableAccessModal from "@/components/shared/DisableAccessModal";
import EnableAccessModal from "@/components/shared/EnableAccessModal";
import { useToast } from "@/lib/toast";
import { financeAPI, StudentAdmission } from "@/lib/financeAPI";

export default function FullPaymentStudentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [admissions, setAdmissions] = useState<StudentAdmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal states
  const [verifyFullPaymentModal, setVerifyFullPaymentModal] = useState<{
    isOpen: boolean;
    studentProfileId: number | null;
    studentName: string;
  }>({ isOpen: false, studentProfileId: null, studentName: "" });

  const [disableAccessModal, setDisableAccessModal] = useState<{
    isOpen: boolean;
    studentProfileId: number | null;
    studentName: string;
  }>({ isOpen: false, studentProfileId: null, studentName: "" });

  const [enableAccessModal, setEnableAccessModal] = useState<{
    isOpen: boolean;
    studentProfileId: number | null;
    studentName: string;
  }>({ isOpen: false, studentProfileId: null, studentName: "" });

  const toast = useToast();

  const fetchAdmissions = async () => {
    try {
      setIsLoading(true);
      const data = await financeAPI.getAdmissions();
      // Filter for full payment students only
      const fullPaymentStudents = data.filter(
        (admission) => admission.payment_method === "FULL"
      );
      setAdmissions(fullPaymentStudents);
    } catch (error: any) {
      toast.show("error", error.message || "Failed to load full payment students");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchAdmissions();
    }
  }, [authLoading, user]);

  // Handle verify full payment
  const handleVerifyFullPaymentClick = (studentProfileId: number) => {
    const admission = admissions.find(
      (a) => a.student_profile_id === studentProfileId
    );
    if (admission) {
      setVerifyFullPaymentModal({
        isOpen: true,
        studentProfileId,
        studentName: admission.full_name,
      });
    }
  };

  const handleVerifyFullPaymentConfirm = async () => {
    if (!verifyFullPaymentModal.studentProfileId) return;
    try {
      setIsProcessing(true);
      await financeAPI.verifyFullPayment(verifyFullPaymentModal.studentProfileId);
      toast.show("success", "Full payment verified successfully");
      setVerifyFullPaymentModal({ isOpen: false, studentProfileId: null, studentName: "" });
      fetchAdmissions();
    } catch (error: any) {
      toast.show("error", error.message || "Failed to verify payment");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle disable access
  const handleDisableAccessClick = (studentProfileId: number) => {
    const admission = admissions.find(
      (a) => a.student_profile_id === studentProfileId
    );
    if (admission) {
      setDisableAccessModal({
        isOpen: true,
        studentProfileId,
        studentName: admission.full_name,
      });
    }
  };

  const handleDisableAccessConfirm = async () => {
    if (!disableAccessModal.studentProfileId) return;
    try {
      setIsProcessing(true);
      await financeAPI.disableAccess(disableAccessModal.studentProfileId);
      toast.show("success", "Student access disabled");
      setDisableAccessModal({ isOpen: false, studentProfileId: null, studentName: "" });
      fetchAdmissions();
    } catch (error: any) {
      toast.show("error", error.message || "Failed to disable access");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle enable access
  const handleEnableAccessClick = (studentProfileId: number) => {
    const admission = admissions.find(
      (a) => a.student_profile_id === studentProfileId
    );
    if (admission) {
      setEnableAccessModal({
        isOpen: true,
        studentProfileId,
        studentName: admission.full_name,
      });
    }
  };

  const handleEnableAccessConfirm = async () => {
    if (!enableAccessModal.studentProfileId) return;
    try {
      setIsProcessing(true);
      await financeAPI.enableAccess(enableAccessModal.studentProfileId);
      toast.show("success", "Student access enabled");
      setEnableAccessModal({ isOpen: false, studentProfileId: null, studentName: "" });
      fetchAdmissions();
    } catch (error: any) {
      toast.show("error", error.message || "Failed to enable access");
    } finally {
      setIsProcessing(false);
    }
  };

  // Access control
  if (!authLoading && user && user.role.code !== "FINANCE") {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">
            You do not have permission to access this page.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Full Payment Students</h1>
            <p className="mt-1 text-sm text-gray-600">
              Students who opted for full payment method
            </p>
          </div>
          <button
            onClick={fetchAdmissions}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg
              className={`-ml-1 mr-2 h-5 w-5 text-gray-500 ${
                isLoading ? "animate-spin" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-full bg-green-500 p-3">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h2 className="text-2xl font-bold text-gray-900">{admissions.length}</h2>
                <p className="text-sm text-gray-600">Total Full Payment Students</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-full bg-emerald-500 p-3">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h2 className="text-2xl font-bold text-gray-900">
                  {admissions.filter((a) => a.admission_status === "FULL_PAYMENT_VERIFIED").length}
                </h2>
                <p className="text-sm text-gray-600">Verified</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-full bg-yellow-500 p-3">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h2 className="text-2xl font-bold text-gray-900">
                  {admissions.filter((a) => a.admission_status === "PENDING" || a.admission_status === "APPROVED").length}
                </h2>
                <p className="text-sm text-gray-600">Pending Verification</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <StudentAdmissionsTable
          admissions={admissions}
          isLoading={isLoading}
          onVerifyFullPayment={handleVerifyFullPaymentClick}
          onVerifyInstallment={() => {}}
          onDisableAccess={handleDisableAccessClick}
          onEnableAccess={handleEnableAccessClick}
          isProcessing={isProcessing}
        />
      </div>

      {/* Modals */}
      <VerifyFullPaymentModal
        isOpen={verifyFullPaymentModal.isOpen}
        studentName={verifyFullPaymentModal.studentName}
        onConfirm={handleVerifyFullPaymentConfirm}
        onCancel={() =>
          setVerifyFullPaymentModal({ isOpen: false, studentProfileId: null, studentName: "" })
        }
        isLoading={isProcessing}
      />

      <DisableAccessModal
        isOpen={disableAccessModal.isOpen}
        studentName={disableAccessModal.studentName}
        onConfirm={handleDisableAccessConfirm}
        onCancel={() =>
          setDisableAccessModal({ isOpen: false, studentProfileId: null, studentName: "" })
        }
        isLoading={isProcessing}
      />

      <EnableAccessModal
        isOpen={enableAccessModal.isOpen}
        studentName={enableAccessModal.studentName}
        onConfirm={handleEnableAccessConfirm}
        onCancel={() =>
          setEnableAccessModal({ isOpen: false, studentProfileId: null, studentName: "" })
        }
        isLoading={isProcessing}
      />
    </DashboardLayout>
  );
}
