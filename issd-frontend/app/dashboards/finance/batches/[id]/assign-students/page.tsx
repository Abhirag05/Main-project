"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/lib/toast";
import {
  apiClient,
  EligibleStudent,
  BatchDetails,
  BatchStudent,
} from "@/lib/api";

// Confirmation Modal Component
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onCancel}
        ></div>
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg
                  className="h-6 w-6 text-blue-600"
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
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className="text-lg font-semibold leading-6 text-gray-900">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">{message}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Assigning...
                </>
              ) : (
                confirmText
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Student Selection Table Component
interface StudentTableProps {
  students: EligibleStudent[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  isLoading: boolean;
}

function StudentSelectionTable({
  students,
  selectedIds,
  onToggle,
  onToggleAll,
  isLoading,
}: StudentTableProps) {
  const allSelected =
    students.length > 0 && selectedIds.size === students.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < students.length;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading eligible students...</span>
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
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
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No Eligible Students
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          There are no fee-verified students available for assignment.
          <br />
          All eligible students might already be assigned to active batches.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={onToggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Student Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Registration Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr
                key={student.student_profile_id}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedIds.has(student.student_profile_id) ? "bg-blue-50" : ""
                }`}
                onClick={() => onToggle(student.student_profile_id)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(student.student_profile_id)}
                    onChange={() => onToggle(student.student_profile_id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {student.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {student.full_name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {student.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(student.registration_date).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Preview Assigned Students Component
interface PreviewTableProps {
  students: BatchStudent[];
  batchCode: string;
  onContinue: () => void;
}

function AssignedStudentsPreview({
  students,
  batchCode,
  onContinue,
}: PreviewTableProps) {
  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-green-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Students Assigned Successfully!
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>
                {students.length} student(s) have been assigned to batch{" "}
                <span className="font-semibold">{batchCode}</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Assigned Students Preview
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Student Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Joined At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.student_profile_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-green-600">
                            {student.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {student.full_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(student.joined_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onContinue}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          View Batch Details
          <svg
            className="ml-2 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Main Page Component
export default function AssignStudentsPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [eligibleStudents, setEligibleStudents] = useState<EligibleStudent[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(
    new Set()
  );
  const [assignedStudents, setAssignedStudents] = useState<BatchStudent[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const [loadingBatch, setLoadingBatch] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const toast = useToast();

  // Check user authentication and role
  useEffect(() => {
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

  // Fetch batch details
  useEffect(() => {
    const fetchBatchDetails = async () => {
      if (!batchId || !user) return;

      setLoadingBatch(true);
      try {
        const data = await apiClient.getBatchDetails(parseInt(batchId));
        setBatchDetails(data);
      } catch (err: any) {
        toast.show("error", err.message || "Failed to load batch details");
      } finally {
        setLoadingBatch(false);
      }
    };

    if (user?.role.code === "FINANCE") {
      fetchBatchDetails();
    }
  }, [batchId, user, toast]);

  // Fetch eligible students
  useEffect(() => {
    const fetchEligibleStudents = async () => {
      if (!batchId || !user) return;

      setLoadingStudents(true);
      try {
        const data = await apiClient.getEligibleStudents(parseInt(batchId));
        setEligibleStudents(data);
      } catch (err: any) {
        toast.show("error", err.message || "Failed to load eligible students");
      } finally {
        setLoadingStudents(false);
      }
    };

    if (user?.role.code === "FINANCE") {
      fetchEligibleStudents();
    }
  }, [batchId, user, toast]);

  // Toggle single student selection
  const handleToggleStudent = (studentId: number) => {
    setSelectedStudentIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Toggle all students
  const handleToggleAll = () => {
    if (selectedStudentIds.size === eligibleStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(
        new Set(eligibleStudents.map((s) => s.student_profile_id))
      );
    }
  };

  // Handle assign button click
  const handleAssignClick = () => {
    if (selectedStudentIds.size === 0) return;

    // Check batch capacity
    if (batchDetails) {
      const availableSlots = batchDetails.available_slots;
      if (selectedStudentIds.size > availableSlots) {
        toast.show(
          "error",
          `Cannot assign ${selectedStudentIds.size} students. Only ${availableSlots} slots available.`
        );
        return;
      }
    }

    setShowConfirmModal(true);
  };

  // Confirm assignment
  const handleConfirmAssign = async () => {
    if (selectedStudentIds.size === 0) return;

    setAssigning(true);
    try {
      const studentIds = Array.from(selectedStudentIds);
      await apiClient.assignStudentsToBatch(parseInt(batchId), studentIds);

      // Fetch updated batch details to get the newly assigned students
      const updatedBatch = await apiClient.getBatchDetails(parseInt(batchId));
      setBatchDetails(updatedBatch);

      // Filter to only show the newly assigned students
      const newlyAssigned = updatedBatch.enrolled_students.filter((s) =>
        studentIds.includes(s.student_profile_id)
      );
      setAssignedStudents(newlyAssigned);

      setShowConfirmModal(false);
      setShowPreview(true);
      toast.show(
        "success",
        `Successfully assigned ${studentIds.length} student(s) to batch!`
      );
    } catch (err: any) {
      toast.show("error", err.message || "Failed to assign students");
    } finally {
      setAssigning(false);
    }
  };

  // Finish and go back to batch details
  const handleContinueToBatchDetails = () => {
    router.push(`/dashboards/finance/batches/${batchId}`);
  };

  // Access denied state
  if (user && user.role.code !== "FINANCE") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Access Denied
            </h2>
            <p className="mt-2 text-gray-600">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Loading state
  if (!user || loadingBatch) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Assign Students to Batch
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Select students to assign to batch{" "}
            <span className="font-semibold">{batchDetails?.code || "..."}</span>
          </p>
        </div>

        {/* Batch Info Card */}
        {batchDetails && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Batch Code
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {batchDetails.code}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Course
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {batchDetails.course_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Mode
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {batchDetails.mode}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Capacity
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {batchDetails.current_student_count} / {batchDetails.max_students}
                  <span className="ml-2 text-xs text-gray-500">
                    ({batchDetails.available_slots} available)
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content based on state */}
        {showPreview ? (
          <AssignedStudentsPreview
            students={assignedStudents}
            batchCode={batchDetails?.code || ""}
            onContinue={handleContinueToBatchDetails}
          />
        ) : (
          <>
            {/* Selection Info Bar */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {eligibleStudents.length} eligible student(s) found
                {selectedStudentIds.size > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    • {selectedStudentIds.size} selected
                  </span>
                )}
              </p>
              <button
                onClick={handleAssignClick}
                disabled={selectedStudentIds.size === 0 || assigning}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Assign Selected Students
                {selectedStudentIds.size > 0 && ` (${selectedStudentIds.size})`}
              </button>
            </div>

            {/* Student Selection Table */}
            <StudentSelectionTable
              students={eligibleStudents}
              selectedIds={selectedStudentIds}
              onToggle={handleToggleStudent}
              onToggleAll={handleToggleAll}
              isLoading={loadingStudents}
            />
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirm Assignment"
        message={`Are you sure you want to assign ${selectedStudentIds.size} student(s) to batch ${batchDetails?.code}?`}
        confirmText="Assign Students"
        onConfirm={handleConfirmAssign}
        onCancel={() => setShowConfirmModal(false)}
        isLoading={assigning}
      />

    </DashboardLayout>
  );
}
