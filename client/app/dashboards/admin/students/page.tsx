"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentAdmissionsTable from "@/components/shared/StudentAdmissionsTable";
import VerifyFullPaymentModal from "@/components/shared/VerifyFullPaymentModal";
import VerifyInstallmentModal from "@/components/shared/VerifyInstallmentModal";
import DisableAccessModal from "@/components/shared/DisableAccessModal";
import EnableAccessModal from "@/components/shared/EnableAccessModal";
import { useToast } from "@/lib/toast";
import { financeAPI, StudentAdmission } from "@/lib/financeAPI";
import { isAdminRole } from "@/lib/roles";

export default function AdminAllStudentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [admissions, setAdmissions] = useState<StudentAdmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [verifyFullPaymentModal, setVerifyFullPaymentModal] = useState<{
    isOpen: boolean;
    studentProfileId: number | null;
    studentName: string;
  }>({ isOpen: false, studentProfileId: null, studentName: "" });

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

  const [completeCourseModal, setCompleteCourseModal] = useState<{
    isOpen: boolean;
    studentProfileId: number | null;
    studentName: string;
  }>({ isOpen: false, studentProfileId: null, studentName: "" });

  const toast = useToast();

  // Fetch admissions
  const fetchAdmissions = async () => {
    try {
      setIsLoading(true);
      const data = await financeAPI.getAdmissions();
      setAdmissions(data);
    } catch (error: any) {
      toast.show("error", error.message || "Failed to load students");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchAdmissions();
    }
  }, [authLoading, user]);

  // ── Payment verification handlers ──────────────────────────────

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
      toast.show("error", error.message || "Failed to verify payment");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Access control handlers ────────────────────────────────────

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

  // ── Course complete handler ────────────────────────────────────

  const handleCompleteCourseClick = (studentProfileId: number) => {
    const admission = admissions.find(
      (a) => a.student_profile_id === studentProfileId
    );
    if (admission) {
      setCompleteCourseModal({
        isOpen: true,
        studentProfileId,
        studentName: admission.full_name,
      });
    }
  };

  const handleCompleteCourseConfirm = async () => {
    if (!completeCourseModal.studentProfileId) return;
    try {
      setIsProcessing(true);
      await financeAPI.completeCourse(completeCourseModal.studentProfileId);
      toast.show("success", "Course marked as completed. Student access has been disabled.");
      setCompleteCourseModal({ isOpen: false, studentProfileId: null, studentName: "" });
      fetchAdmissions();
    } catch (error: any) {
      toast.show("error", error.message || "Failed to mark course as completed");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Filtered data ──────────────────────────────────────────────

  const filteredAdmissions = admissions.filter((admission) => {
    const matchesPayment =
      paymentModeFilter === "all" || admission.payment_method === paymentModeFilter;
    const matchesStatus =
      statusFilter === "all" || admission.admission_status === statusFilter;
    return matchesPayment && matchesStatus;
  });

  // ── Access control ─────────────────────────────────────────────

  if (!authLoading && user && !isAdminRole(user.role.code)) {
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
          <h1 className="mt-4 text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">
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
            <h1 className="text-3xl font-bold text-foreground">All Students</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage student payments and access
            </p>
          </div>
          <button
            onClick={fetchAdmissions}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground/80 bg-card hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50"
          >
            <svg
              className={`-ml-1 mr-2 h-5 w-5 text-muted-foreground ${
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

        {/* Filters */}
        <div className="bg-card shadow rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-medium text-foreground/80">
                Status:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block rounded-md border-border shadow-sm focus:border-ring focus:ring-ring sm:text-sm py-2 px-3 border text-foreground/80"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="FULL_PAYMENT_VERIFIED">Full Payment Verified</option>
                <option value="INSTALLMENT_VERIFIED">Installment Active</option>
                <option value="INSTALLMENT_PENDING">Installment Pending</option>
                <option value="COURSE_COMPLETED">Course Completed</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="payment-mode-filter" className="text-sm font-medium text-foreground/80">
                Payment Mode:
              </label>
              <select
                id="payment-mode-filter"
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="block rounded-md border-border shadow-sm focus:border-ring focus:ring-ring sm:text-sm py-2 px-3 border text-foreground/80"
              >
                <option value="all">All Payment Modes</option>
                <option value="FULL">Full Payment</option>
                <option value="INSTALLMENT">Installment</option>
              </select>
            </div>
            {(paymentModeFilter !== "all" || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setPaymentModeFilter("all");
                  setStatusFilter("all");
                }}
                className="text-sm text-primary hover:text-primary"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {/* Pending */}
          <div className="bg-card overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-yellow-500 p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground truncate">Pending</dt>
                    <dd className="text-lg font-semibold text-foreground">
                      {admissions.filter((a) => a.admission_status === "PENDING" || a.admission_status === "APPROVED").length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Verified */}
          <div className="bg-card overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-emerald-500 p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground truncate">Verified</dt>
                    <dd className="text-lg font-semibold text-foreground">
                      {admissions.filter((a) =>
                        a.admission_status === "FULL_PAYMENT_VERIFIED" ||
                        a.admission_status === "INSTALLMENT_VERIFIED"
                      ).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Installment Pending */}
          <div className="bg-card overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-orange-500 p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.832c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground truncate">Installment Pending</dt>
                    <dd className="text-lg font-semibold text-foreground">
                      {admissions.filter((a) => a.admission_status === "INSTALLMENT_PENDING").length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Course Completed */}
          <div className="bg-card overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-purple-500 p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground truncate">Course Completed</dt>
                    <dd className="text-lg font-semibold text-foreground">
                      {admissions.filter((a) => a.admission_status === "COURSE_COMPLETED").length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Disabled */}
          <div className="bg-card overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-muted-foreground p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground truncate">Disabled</dt>
                    <dd className="text-lg font-semibold text-foreground">
                      {admissions.filter((a) => a.admission_status === "DISABLED").length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <StudentAdmissionsTable
          admissions={filteredAdmissions}
          isLoading={isLoading}
          onVerifyFullPayment={handleVerifyFullPaymentClick}
          onVerifyInstallment={handleVerifyInstallmentClick}
          onDisableAccess={handleDisableAccessClick}
          onEnableAccess={handleEnableAccessClick}
          onCompleteCourse={handleCompleteCourseClick}
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

      {/* Course Complete Confirmation Modal */}
      {completeCourseModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-muted-foreground bg-opacity-75 transition-opacity" onClick={() => setCompleteCourseModal({ isOpen: false, studentProfileId: null, studentName: "" })} />
            <div className="relative transform overflow-hidden rounded-lg bg-card px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-base font-semibold leading-6 text-foreground">
                    Mark Course as Completed
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to mark <strong>{completeCourseModal.studentName}</strong>&apos;s course as completed?
                      This will disable their access to the student dashboard.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleCompleteCourseConfirm}
                  disabled={isProcessing}
                  className="inline-flex w-full justify-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 sm:w-auto disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setCompleteCourseModal({ isOpen: false, studentProfileId: null, studentName: "" })}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-secondary/50 sm:mt-0 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
