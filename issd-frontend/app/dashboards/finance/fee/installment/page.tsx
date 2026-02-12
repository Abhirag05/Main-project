"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentAdmissionsTable from "@/components/shared/StudentAdmissionsTable";
import VerifyInstallmentModal from "@/components/shared/VerifyInstallmentModal";
import DisableAccessModal from "@/components/shared/DisableAccessModal";
import EnableAccessModal from "@/components/shared/EnableAccessModal";
import { useToast } from "@/lib/toast";
import { financeAPI, StudentAdmission } from "@/lib/financeAPI";

export default function InstallmentStudentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [admissions, setAdmissions] = useState<StudentAdmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal states
  const [verifyInstallmentModal, setVerifyInstallmentModal] = useState<{
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
      // Filter for installment students only
      const installmentStudents = data.filter(
        (admission) => admission.payment_method === "INSTALLMENT"
      );
      setAdmissions(installmentStudents);
    } catch (error: any) {
      toast.show("error", error.message || "Failed to load installment students");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchAdmissions();
    }
  }, [authLoading, user]);

  // Handle verify installment
  const handleVerifyInstallmentClick = (studentProfileId: number) => {
    const admission = admissions.find(
      (a) => a.student_profile_id === studentProfileId
    );
    if (admission) {
      setVerifyInstallmentModal({
        isOpen: true,
        studentProfileId,
        studentName: admission.full_name,
      });
    }
  };

  const handleVerifyInstallmentConfirm = async () => {
    if (!verifyInstallmentModal.studentProfileId) return;
    try {
      setIsProcessing(true);
      await financeAPI.verifyInstallment(verifyInstallmentModal.studentProfileId);
      toast.show("success", "Installment payment verified successfully");
      setVerifyInstallmentModal({ isOpen: false, studentProfileId: null, studentName: "" });
      fetchAdmissions();
    } catch (error: any) {
      toast.show("error", error.message || "Failed to verify installment");
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
            <h1 className="text-3xl font-bold text-gray-900">Installment Students</h1>
            <p className="mt-1 text-sm text-gray-600">
              Students who opted for installment payment method
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-full bg-blue-500 p-3">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h2 className="text-2xl font-bold text-gray-900">{admissions.length}</h2>
                <p className="text-sm text-gray-600">Total Installment Students</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-full bg-amber-500 p-3">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h2 className="text-2xl font-bold text-gray-900">
                  {admissions.filter((a) => a.admission_status === "INSTALLMENT_PENDING" || a.admission_status === "PENDING" || a.admission_status === "APPROVED").length}
                </h2>
                <p className="text-sm text-gray-600">Pending / In Progress</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <StudentAdmissionsTable
          admissions={admissions}
          isLoading={isLoading}
          onVerifyFullPayment={() => {}}
          onVerifyInstallment={handleVerifyInstallmentClick}
          onDisableAccess={handleDisableAccessClick}
          onEnableAccess={handleEnableAccessClick}
          isProcessing={isProcessing}
        />
      </div>

      {/* Modals */}
      <VerifyInstallmentModal
        isOpen={verifyInstallmentModal.isOpen}
        studentName={verifyInstallmentModal.studentName}
        onConfirm={handleVerifyInstallmentConfirm}
        onCancel={() =>
          setVerifyInstallmentModal({ isOpen: false, studentProfileId: null, studentName: "" })
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
