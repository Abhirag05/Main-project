"use client";

import React, { useState } from "react";
import { StudentAdmission, AdmissionStatus } from "@/lib/financeAPI";
import Pagination, { usePagination } from "@/components/shared/Pagination";

interface StudentAdmissionsTableProps {
  admissions: StudentAdmission[];
  isLoading: boolean;
  onVerifyFullPayment: (studentProfileId: number) => void;
  onVerifyInstallment: (studentProfileId: number) => void;
  onDisableAccess: (studentProfileId: number) => void;
  onEnableAccess: (studentProfileId: number) => void;
  onCompleteCourse?: (studentProfileId: number) => void;
  isProcessing: boolean;
}

function StatusBadge({ status }: { status: AdmissionStatus }) {
  const styles = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    APPROVED: "bg-green-100 text-green-800 border-green-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
    FULL_PAYMENT_VERIFIED: "bg-green-100 text-green-800 border-green-200",
    INSTALLMENT_VERIFIED: "bg-blue-100 text-blue-800 border-blue-200",
    INSTALLMENT_PENDING: "bg-orange-100 text-orange-800 border-orange-200",
    COURSE_COMPLETED: "bg-purple-100 text-purple-800 border-purple-200",
    DISABLED: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const labels = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    FULL_PAYMENT_VERIFIED: "Payment Completed",
    INSTALLMENT_VERIFIED: "Installment Active",
    INSTALLMENT_PENDING: "Installment Pending",
    COURSE_COMPLETED: "Course Completed",
    DISABLED: "Disabled",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        styles[status]
      }`}
    >
      {labels[status]}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border-b border-gray-200">
          <div className="px-6 py-4 flex space-x-4">
            <div className="flex-1 h-4 bg-gray-200 rounded"></div>
            <div className="flex-1 h-4 bg-gray-200 rounded"></div>
            <div className="flex-1 h-4 bg-gray-200 rounded"></div>
            <div className="w-24 h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StudentAdmissionsTable({
  admissions,
  isLoading,
  onVerifyFullPayment,
  onVerifyInstallment,
  onDisableAccess,
  onEnableAccess,
  onCompleteCourse,
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
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <TableSkeleton />
      </div>
    );
  }

  if (admissions.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No students found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          No student admissions match the current filter.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Course
                
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Referral
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Mode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Study Mode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((admission) => (
              <tr
                key={admission.student_profile_id}
                className="hover:bg-gray-50"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {admission.full_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {admission.user_id}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{admission.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {admission.phone || "N/A"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {admission.interested_courses || "N/A"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {admission.referred_by_name ? (
                    <div>
                      <div className="text-sm text-gray-900">
                        {admission.referred_by_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {admission.referred_by_code || "Referral"} •{" "}
                        {admission.referral_confirmed ? "Confirmed" : "Pending"}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-gray-500">Not referred</div>
                      {admission.discovery_sources &&
                        admission.discovery_sources.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {admission.discovery_sources.join(", ")}
                          </div>
                        )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {admission.payment_method === "FULL"
                      ? "Full Payment"
                      : admission.payment_method === "INSTALLMENT"
                        ? "Installment"
                        : admission.payment_method || "N/A"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {admission.study_mode === "LIVE"
                      ? "Live"
                      : admission.study_mode === "RECORDED"
                        ? "Recorded"
                        : "N/A"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={admission.admission_status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(admission.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <ActionButtons
                    admission={admission}
                    isProcessing={isProcessing}
                    onVerifyFullPayment={onVerifyFullPayment}
                    onVerifyInstallment={onVerifyInstallment}
                    onDisableAccess={onDisableAccess}
                    onEnableAccess={onEnableAccess}
                    onCompleteCourse={onCompleteCourse}
                  />
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
  );
}

function ActionButtons({
  admission,
  isProcessing,
  onVerifyFullPayment,
  onVerifyInstallment,
  onDisableAccess,
  onEnableAccess,
  onCompleteCourse,
}: {
  admission: StudentAdmission;
  isProcessing: boolean;
  onVerifyFullPayment: (id: number) => void;
  onVerifyInstallment: (id: number) => void;
  onDisableAccess: (id: number) => void;
  onEnableAccess: (id: number) => void;
  onCompleteCourse?: (id: number) => void;
}) {
  const id = admission.student_profile_id;
  const status = admission.admission_status;
  const paymentMethod = admission.payment_method;

  const btnClass = (color: string) =>
    `inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-${color}-600 hover:bg-${color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`;

  // ── PENDING: Show payment verification based on payment_method + Disable ──
  if (status === "PENDING" || status === "APPROVED") {
    return (
      <div className="flex flex-wrap gap-2">
        {paymentMethod === "FULL" && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onVerifyFullPayment(id); }}
            disabled={isProcessing}
            className={btnClass("emerald")}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Full Payment
          </button>
        )}
        {paymentMethod === "INSTALLMENT" && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onVerifyInstallment(id); }}
            disabled={isProcessing}
            className={btnClass("blue")}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Verify Installment
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onDisableAccess(id); }}
          disabled={isProcessing}
          className={btnClass("gray")}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Disable
        </button>
      </div>
    );
  }

  // ── FULL_PAYMENT_VERIFIED: Only "Course Complete" action ──
  if (status === "FULL_PAYMENT_VERIFIED") {
    return (
      <div className="flex flex-wrap gap-2">
        {onCompleteCourse && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onCompleteCourse(id); }}
            disabled={isProcessing}
            className={btnClass("purple")}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Course Complete
          </button>
        )}
      </div>
    );
  }

  // ── INSTALLMENT_VERIFIED: Suspend (disable for pending installment) ──
  if (status === "INSTALLMENT_VERIFIED") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onDisableAccess(id); }}
          disabled={isProcessing}
          className={btnClass("orange")}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Suspend Access
        </button>
      </div>
    );
  }

  // ── INSTALLMENT_PENDING: Re-verify installment to restore access ──
  if (status === "INSTALLMENT_PENDING") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onVerifyInstallment(id); }}
          disabled={isProcessing}
          className={btnClass("blue")}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Verify Installment
        </button>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onDisableAccess(id); }}
          disabled={isProcessing}
          className={btnClass("gray")}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Disable
        </button>
      </div>
    );
  }

  // ── DISABLED: Enable access back ──
  if (status === "DISABLED") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onEnableAccess(id); }}
          disabled={isProcessing}
          className={btnClass("green")}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Enable Access
        </button>
      </div>
    );
  }

  // ── COURSE_COMPLETED / REJECTED: No actions ──
  return <span className="text-gray-400 text-xs italic">No actions</span>;
}

export default React.memo(StudentAdmissionsTable);
