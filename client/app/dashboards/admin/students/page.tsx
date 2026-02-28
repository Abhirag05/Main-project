"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentAdmissionsTable from "@/components/shared/StudentAdmissionsTable";
import VerifyFullPaymentModal from "@/components/shared/VerifyFullPaymentModal";
import VerifyInstallmentModal from "@/components/shared/VerifyInstallmentModal";
import ConfirmActionModal from "@/components/shared/ConfirmActionModal";
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

  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    studentProfileId: number | null;
    studentName: string;
    action: "markOverdue" | "collectPayment" | "suspend" | "reactivate" | "drop" | null;
  }>({ isOpen: false, studentProfileId: null, studentName: "", action: null });

  const toast = useToast();

  // ── Fetch ──────────────────────────────────────────────────────

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

  // ── Payment verification handlers ─────────────────────────────

  const handleVerifyFullPaymentClick = (studentProfileId: number) => {
    const admission = admissions.find((a) => a.student_profile_id === studentProfileId);
    if (admission) {
      setVerifyFullPaymentModal({ isOpen: true, studentProfileId, studentName: admission.full_name });
    }
  };

  const handleVerifyFullPaymentConfirm = async () => {
    if (!verifyFullPaymentModal.studentProfileId) return;
    try {
      setIsProcessing(true);
      await financeAPI.verifyFullPayment(verifyFullPaymentModal.studentProfileId);
      toast.show("success", "Payment verified — student is now Active");
      setVerifyFullPaymentModal({ isOpen: false, studentProfileId: null, studentName: "" });
      fetchAdmissions();
    } catch (error: any) {
      toast.show("error", error.message || "Failed to verify payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyInstallmentClick = (studentProfileId: number) => {
    const admission = admissions.find((a) => a.student_profile_id === studentProfileId);
    if (admission) {
      setVerifyInstallmentModal({ isOpen: true, studentProfileId, studentName: admission.full_name });
    }
  };

  const handleVerifyInstallmentConfirm = async () => {
    if (!verifyInstallmentModal.studentProfileId) return;
    try {
      setIsProcessing(true);
      await financeAPI.verifyInstallment(verifyInstallmentModal.studentProfileId);
      toast.show("success", "Installment verified — student is now Active");
      setVerifyInstallmentModal({ isOpen: false, studentProfileId: null, studentName: "" });
      fetchAdmissions();
    } catch (error: any) {
      toast.show("error", error.message || "Failed to verify installment");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Generic lifecycle action handler ──────────────────────────

  const openActionModal = (
    studentProfileId: number,
    action: "markOverdue" | "collectPayment" | "suspend" | "reactivate" | "drop",
  ) => {
    const admission = admissions.find((a) => a.student_profile_id === studentProfileId);
    if (admission) {
      setActionModal({ isOpen: true, studentProfileId, studentName: admission.full_name, action });
    }
  };

  const handleActionConfirm = async () => {
    if (!actionModal.studentProfileId || !actionModal.action) return;

    const apiMap = {
      markOverdue: financeAPI.markOverdue.bind(financeAPI),
      collectPayment: financeAPI.collectPayment.bind(financeAPI),
      suspend: financeAPI.suspendStudent.bind(financeAPI),
      reactivate: financeAPI.reactivateStudent.bind(financeAPI),
      drop: financeAPI.dropStudent.bind(financeAPI),
    };

    const successMsg: Record<string, string> = {
      markOverdue: "Student marked as Payment Due",
      collectPayment: "Payment collected — student is now Active",
      suspend: "Student has been suspended",
      reactivate: "Student has been reactivated",
      drop: "Student has been dropped",
    };

    try {
      setIsProcessing(true);
      await apiMap[actionModal.action](actionModal.studentProfileId);
      toast.show("success", successMsg[actionModal.action]);
      setActionModal({ isOpen: false, studentProfileId: null, studentName: "", action: null });
      fetchAdmissions();
    } catch (error: any) {
      toast.show("error", error.message || "Action failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Action modal config ──────────────────────────────────────

  const actionConfig: Record<string, { title: string; description: string; variant: "warning" | "danger" | "success" | "info" }> = {
    markOverdue: {
      title: "Mark Payment Due",
      description: `Are you sure you want to mark ${actionModal.studentName}'s installment as overdue? Their LMS access will be suspended until the next payment is collected.`,
      variant: "warning",
    },
    collectPayment: {
      title: "Collect Payment",
      description: `Confirm that ${actionModal.studentName} has made their installment payment? Their LMS access will be restored.`,
      variant: "success",
    },
    suspend: {
      title: "Suspend Student",
      description: `Are you sure you want to suspend ${actionModal.studentName}? Their LMS access will be revoked until reactivated.`,
      variant: "warning",
    },
    reactivate: {
      title: "Reactivate Student",
      description: `Are you sure you want to reactivate ${actionModal.studentName}? Their LMS access will be restored.`,
      variant: "success",
    },
    drop: {
      title: "Drop Student",
      description: `Are you sure you want to permanently drop ${actionModal.studentName}? This action cannot be easily undone.`,
      variant: "danger",
    },
  };

  const currentActionConfig = actionModal.action ? actionConfig[actionModal.action] : null;

  // ── Filtered data ─────────────────────────────────────────────

  const filteredAdmissions = admissions.filter((admission) => {
    const matchesPayment =
      paymentModeFilter === "all" || admission.payment_method === paymentModeFilter;
    const matchesStatus =
      statusFilter === "all" || admission.admission_status === statusFilter;
    return matchesPayment && matchesStatus;
  });

  // ── Access denied ─────────────────────────────────────────────

  if (!authLoading && user && !isAdminRole(user.role.code)) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Student Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage the student lifecycle — payments, access &amp; status
            </p>
          </div>
          <button
            onClick={fetchAdmissions}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground/80 bg-card hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50"
          >
            <svg
              className={`-ml-1 mr-2 h-5 w-5 text-muted-foreground ${isLoading ? "animate-spin" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-card shadow rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-medium text-foreground/80">Status:</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block rounded-md border-border shadow-sm focus:border-ring focus:ring-ring sm:text-sm py-2 px-3 border text-foreground/80"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="ACTIVE">Active</option>
                <option value="PAYMENT_DUE">Payment Due</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="DROPPED">Dropped</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="payment-mode-filter" className="text-sm font-medium text-foreground/80">Payment Mode:</label>
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
                onClick={() => { setPaymentModeFilter("all"); setStatusFilter("all"); }}
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
                      {admissions.filter((a) => a.admission_status === "PENDING").length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Active */}
          <div className="bg-card overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-emerald-500 p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground truncate">Active</dt>
                    <dd className="text-lg font-semibold text-foreground">
                      {admissions.filter((a) => a.admission_status === "ACTIVE").length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Due */}
          <div className="bg-card overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-orange-500 p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground truncate">Payment Due</dt>
                    <dd className="text-lg font-semibold text-foreground">
                      {admissions.filter((a) => a.admission_status === "PAYMENT_DUE").length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Suspended */}
          <div className="bg-card overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-red-500 p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground truncate">Suspended</dt>
                    <dd className="text-lg font-semibold text-foreground">
                      {admissions.filter((a) => a.admission_status === "SUSPENDED").length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Dropped */}
          <div className="bg-card overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-gray-500 p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground truncate">Dropped</dt>
                    <dd className="text-lg font-semibold text-foreground">
                      {admissions.filter((a) => a.admission_status === "DROPPED").length}
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
          onMarkOverdue={(id) => openActionModal(id, "markOverdue")}
          onCollectPayment={(id) => openActionModal(id, "collectPayment")}
          onSuspend={(id) => openActionModal(id, "suspend")}
          onReactivate={(id) => openActionModal(id, "reactivate")}
          onDrop={(id) => openActionModal(id, "drop")}
          isProcessing={isProcessing}
        />
      </div>

      {/* Verify Full Payment Modal */}
      <VerifyFullPaymentModal
        isOpen={verifyFullPaymentModal.isOpen}
        studentName={verifyFullPaymentModal.studentName}
        onConfirm={handleVerifyFullPaymentConfirm}
        onCancel={() => setVerifyFullPaymentModal({ isOpen: false, studentProfileId: null, studentName: "" })}
        isLoading={isProcessing}
      />

      {/* Verify Installment Modal */}
      <VerifyInstallmentModal
        isOpen={verifyInstallmentModal.isOpen}
        studentName={verifyInstallmentModal.studentName}
        onConfirm={handleVerifyInstallmentConfirm}
        onCancel={() => setVerifyInstallmentModal({ isOpen: false, studentProfileId: null, studentName: "" })}
        isLoading={isProcessing}
      />

      {/* Generic Action Confirmation Modal */}
      {currentActionConfig && (
        <ConfirmActionModal
          isOpen={actionModal.isOpen}
          title={currentActionConfig.title}
          description={currentActionConfig.description}
          variant={currentActionConfig.variant}
          confirmLabel={currentActionConfig.title}
          onConfirm={handleActionConfirm}
          onCancel={() => setActionModal({ isOpen: false, studentProfileId: null, studentName: "", action: null })}
          isLoading={isProcessing}
        />
      )}
    </DashboardLayout>
  );
}
