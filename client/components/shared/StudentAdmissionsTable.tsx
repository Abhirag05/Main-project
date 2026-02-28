"use client";

import React from "react";
import { StudentAdmission, AdmissionStatus } from "@/lib/financeAPI";
import Pagination, { usePagination } from "@/components/shared/Pagination";

interface StudentAdmissionsTableProps {
  admissions: StudentAdmission[];
  isLoading: boolean;
  onVerifyFullPayment: (studentProfileId: number) => void;
  onVerifyInstallment: (studentProfileId: number) => void;
  onMarkOverdue: (studentProfileId: number) => void;
  onCollectPayment: (studentProfileId: number) => void;
  onSuspend: (studentProfileId: number) => void;
  onReactivate: (studentProfileId: number) => void;
  onDrop: (studentProfileId: number) => void;
  isProcessing: boolean;
}

// ── Status Badge ────────────────────────────────────────────────

function StatusBadge({ status }: { status: AdmissionStatus }) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
    PAYMENT_DUE: "bg-orange-100 text-orange-800 border-orange-200",
    SUSPENDED: "bg-red-100 text-red-800 border-red-200",
    DROPPED: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const labels: Record<string, string> = {
    PENDING: "Pending",
    ACTIVE: "Active",
    PAYMENT_DUE: "Payment Due",
    SUSPENDED: "Suspended",
    DROPPED: "Dropped",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        styles[status] || "bg-secondary text-foreground border-border"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

// ── Skeleton ────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border-b border-border">
          <div className="px-6 py-4 flex space-x-4">
            <div className="flex-1 h-4 bg-muted rounded"></div>
            <div className="flex-1 h-4 bg-muted rounded"></div>
            <div className="flex-1 h-4 bg-muted rounded"></div>
            <div className="w-24 h-4 bg-muted rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Table ──────────────────────────────────────────────────

function StudentAdmissionsTable({
  admissions,
  isLoading,
  onVerifyFullPayment,
  onVerifyInstallment,
  onMarkOverdue,
  onCollectPayment,
  onSuspend,
  onReactivate,
  onDrop,
  isProcessing,
}: StudentAdmissionsTableProps) {
  const {
    currentPage,
    pageSize,
    totalItems,
    paginatedData,
    setCurrentPage,
    setPageSize,
  } = usePagination(admissions, 10);

  if (isLoading) {
    return (
      <div className="bg-card shadow-md rounded-lg overflow-hidden">
        <TableSkeleton />
      </div>
    );
  }

  if (admissions.length === 0) {
    return (
      <div className="bg-card shadow-md rounded-lg p-12 text-center">
        <svg className="mx-auto h-12 w-12 text-muted-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-foreground">No students found</h3>
        <p className="mt-1 text-sm text-muted-foreground">No student admissions match the current filter.</p>
      </div>
    );
  }

  return (
    <div className="bg-card shadow-md rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Course</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Mode</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {paginatedData.map((admission) => (
              <tr key={admission.student_profile_id} className="hover:bg-secondary/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-foreground">{admission.full_name}</div>
                  <div className="text-xs text-muted-foreground">ID: {admission.user_id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-foreground">{admission.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-foreground">{admission.phone || "N/A"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-foreground">{admission.interested_courses || "N/A"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-foreground">
                    {admission.payment_method === "FULL" ? "Full Payment" : admission.payment_method === "INSTALLMENT" ? "Installment" : admission.payment_method || "N/A"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={admission.admission_status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(admission.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <ActionButtons
                    admission={admission}
                    isProcessing={isProcessing}
                    onVerifyFullPayment={onVerifyFullPayment}
                    onVerifyInstallment={onVerifyInstallment}
                    onMarkOverdue={onMarkOverdue}
                    onCollectPayment={onCollectPayment}
                    onSuspend={onSuspend}
                    onReactivate={onReactivate}
                    onDrop={onDrop}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
  );
}

// ── Action Buttons ──────────────────────────────────────────────

function ActionButtons({
  admission,
  isProcessing,
  onVerifyFullPayment,
  onVerifyInstallment,
  onMarkOverdue,
  onCollectPayment,
  onSuspend,
  onReactivate,
  onDrop,
}: {
  admission: StudentAdmission;
  isProcessing: boolean;
  onVerifyFullPayment: (id: number) => void;
  onVerifyInstallment: (id: number) => void;
  onMarkOverdue: (id: number) => void;
  onCollectPayment: (id: number) => void;
  onSuspend: (id: number) => void;
  onReactivate: (id: number) => void;
  onDrop: (id: number) => void;
}) {
  const id = admission.student_profile_id;
  const status = admission.admission_status;
  const paymentMethod = admission.payment_method;

  const base =
    "inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

  // ── PENDING → Verify Payment + Drop ───────────────────────────
  if (status === "PENDING") {
    return (
      <div className="flex flex-wrap gap-2">
        {paymentMethod === "FULL" && (
          <button type="button" disabled={isProcessing} onClick={() => onVerifyFullPayment(id)} className={`${base} bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500`}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Verify Payment
          </button>
        )}
        {paymentMethod === "INSTALLMENT" && (
          <button type="button" disabled={isProcessing} onClick={() => onVerifyInstallment(id)} className={`${base} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Verify Installment
          </button>
        )}
        <button type="button" disabled={isProcessing} onClick={() => onDrop(id)} className={`${base} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Drop
        </button>
      </div>
    );
  }

  // ── ACTIVE (FULL) → Suspend ───────────────────────────────────
  if (status === "ACTIVE" && paymentMethod === "FULL") {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={isProcessing} onClick={() => onSuspend(id)} className={`${base} bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500`}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          Suspend
        </button>
      </div>
    );
  }

  // ── ACTIVE (INSTALLMENT) → Mark Overdue + Suspend ─────────────
  if (status === "ACTIVE" && paymentMethod === "INSTALLMENT") {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={isProcessing} onClick={() => onMarkOverdue(id)} className={`${base} bg-orange-600 hover:bg-orange-700 focus:ring-orange-500`}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Mark Overdue
        </button>
        <button type="button" disabled={isProcessing} onClick={() => onSuspend(id)} className={`${base} bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500`}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          Suspend
        </button>
      </div>
    );
  }

  // ── PAYMENT_DUE → Collect Payment + Drop ──────────────────────
  if (status === "PAYMENT_DUE") {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={isProcessing} onClick={() => onCollectPayment(id)} className={`${base} bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500`}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Collect Payment
        </button>
        <button type="button" disabled={isProcessing} onClick={() => onDrop(id)} className={`${base} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Drop
        </button>
      </div>
    );
  }

  // ── SUSPENDED → Reactivate + Drop ─────────────────────────────
  if (status === "SUSPENDED") {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={isProcessing} onClick={() => onReactivate(id)} className={`${base} bg-green-600 hover:bg-green-700 focus:ring-green-500`}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Reactivate
        </button>
        <button type="button" disabled={isProcessing} onClick={() => onDrop(id)} className={`${base} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Drop
        </button>
      </div>
    );
  }

  // ── DROPPED → No actions ──────────────────────────────────────
  return <span className="text-muted-foreground/70 text-xs italic">No actions</span>;
}

export default React.memo(StudentAdmissionsTable);
