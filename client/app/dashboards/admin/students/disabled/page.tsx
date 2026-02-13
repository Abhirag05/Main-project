"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentAdmissionsTable from "@/components/shared/StudentAdmissionsTable";
import EnableAccessModal from "@/components/shared/EnableAccessModal";
import { useToast } from "@/lib/toast";
import { financeAPI, StudentAdmission } from "@/lib/financeAPI";
import { isAdminRole } from "@/lib/roles";

export default function AdminDisabledStudentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [admissions, setAdmissions] = useState<StudentAdmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [enableModal, setEnableModal] = useState<{
    isOpen: boolean;
    studentProfileId: number | null;
    studentName: string;
  }>({ isOpen: false, studentProfileId: null, studentName: "" });

  const toast = useToast();

  const fetchAdmissions = async () => {
    try {
      setIsLoading(true);
      const data = await financeAPI.getAdmissions();
      const disabledStudents = data.filter(
        (admission) =>
          admission.admission_status === "INSTALLMENT_PENDING" ||
          admission.admission_status === "DISABLED"
      );
      setAdmissions(disabledStudents);
    } catch (error: any) {
      toast.show("error", error.message || "Failed to load disabled students");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchAdmissions();
    }
  }, [authLoading, user]);

  const handleEnableAccessClick = (studentProfileId: number) => {
    const admission = admissions.find(
      (a) => a.student_profile_id === studentProfileId
    );
    if (admission) {
      setEnableModal({
        isOpen: true,
        studentProfileId,
        studentName: admission.full_name,
      });
    }
  };

  const handleEnableAccessConfirm = async () => {
    if (!enableModal.studentProfileId) return;
    try {
      setIsProcessing(true);
      await financeAPI.enableAccess(enableModal.studentProfileId);
      toast.show("success", "Student access enabled successfully");
      setEnableModal({ isOpen: false, studentProfileId: null, studentName: "" });
      fetchAdmissions();
    } catch (error: any) {
      toast.show("error", error.message || "Failed to enable access");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!authLoading && user && !isAdminRole(user.role.code)) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You do not have permission to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Disabled Students</h1>
            <p className="mt-1 text-sm text-gray-600">
              Students with disabled access or pending installments
            </p>
          </div>
          <button
            onClick={fetchAdmissions}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg
              className={`-ml-1 mr-2 h-5 w-5 text-gray-500 ${isLoading ? "animate-spin" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="rounded-full bg-red-500 p-3">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5">
              <h2 className="text-2xl font-bold text-gray-900">{admissions.length}</h2>
              <p className="text-sm text-gray-600">Total Disabled Students</p>
            </div>
          </div>
        </div>

        <StudentAdmissionsTable
          admissions={admissions}
          isLoading={isLoading}
          onVerifyFullPayment={() => {}}
          onVerifyInstallment={() => {}}
          onDisableAccess={() => {}}
          onEnableAccess={handleEnableAccessClick}
          isProcessing={isProcessing}
        />
      </div>

      <EnableAccessModal
        isOpen={enableModal.isOpen}
        studentName={enableModal.studentName}
        onConfirm={handleEnableAccessConfirm}
        onCancel={() =>
          setEnableModal({ isOpen: false, studentProfileId: null, studentName: "" })
        }
        isLoading={isProcessing}
      />
    </DashboardLayout>
  );
}
