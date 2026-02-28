"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/lib/toast";
import { isAdminRole } from "@/lib/roles";
import {
  apiClient,
  EligibleStudent,
  BatchDetails,
  BatchStudent,
} from "@/lib/api";

// Progress Bar Component (only current step highlighted)
function WorkflowSteps({ currentStep }: { currentStep: number }) {
  const steps = [
    { id: 1, name: "Create Batch" },
    { id: 2, name: "Assign Students" },
  ];

  return (
    <nav aria-label="Progress" className="mb-10">
      <ol className="flex flex-col items-center gap-4 sm:mx-auto sm:flex-row sm:justify-between sm:gap-0 sm:max-w-xl">
        {steps.map((step) => {
          const isCurrent = step.id === currentStep;
          return (
            <li
              key={step.name}
              className="flex flex-col items-center text-center sm:relative sm:flex-1"
            >
              <div
                className="hidden sm:absolute sm:inset-0 sm:flex sm:items-center"
                aria-hidden="true"
              >
                <div className="h-0.5 w-full bg-muted" />
              </div>
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-card ${
                  isCurrent ? "border-primary" : "border-border"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isCurrent ? "bg-primary" : "bg-muted"
                  }`}
                />
                <span className="sr-only">{step.name}</span>
              </div>
              <span className="mt-2 text-xs font-medium text-muted-foreground sm:mt-0 sm:absolute sm:-bottom-7 sm:left-1/2 sm:-translate-x-1/2 sm:whitespace-nowrap">
                {step.name}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

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
          className="fixed inset-0 bg-muted-foreground bg-opacity-75 transition-opacity"
          onClick={onCancel}
        ></div>
        <div className="relative transform overflow-hidden rounded-lg bg-card text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-card px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 sm:mx-0 sm:h-10 sm:w-10">
                <svg
                  className="h-6 w-6 text-primary"
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
                <h3 className="text-lg font-semibold leading-6 text-foreground">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-secondary/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="inline-flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="mt-3 inline-flex w-full justify-center rounded-md bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-secondary/50 sm:mt-0 sm:w-auto disabled:opacity-50"
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
  const someSelected =
    selectedIds.size > 0 && selectedIds.size < students.length;

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow border border-border p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">
            Loading eligible students...
          </span>
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow border border-border p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground/70"
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
        <h3 className="mt-4 text-lg font-medium text-foreground">
          No Eligible Students
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          There are no approved students available for assignment.
          <br />
          All students might already be assigned to active batches.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-secondary/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={onToggleAll}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Student Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Registration Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {students.map((student) => (
              <tr
                key={student.student_profile_id}
                className={`cursor-pointer transition ${
                  selectedIds.has(student.student_profile_id)
                    ? "bg-primary/10"
                    : "hover:bg-secondary/50"
                }`}
                onClick={() => onToggle(student.student_profile_id)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(student.student_profile_id)}
                    onChange={() => onToggle(student.student_profile_id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {student.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-foreground">
                        {student.full_name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                  {student.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
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

      <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-medium text-foreground">
            Assigned Students Preview
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-secondary/50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Student Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Joined At
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
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
                        <p className="text-sm font-medium text-foreground">
                          {student.full_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
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
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
        >
          Done
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
              d="M5 13l4 4L19 7"
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
  const [eligibleStudents, setEligibleStudents] = useState<EligibleStudent[]>(
    [],
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(
    new Set(),
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

        if (!isAdminRole(userData.role.code)) {
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

    if (isAdminRole(user?.role.code)) {
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

    if (isAdminRole(user?.role.code)) {
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
        new Set(eligibleStudents.map((s) => s.student_profile_id)),
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
          `Cannot assign ${selectedStudentIds.size} students. Only ${availableSlots} slots available.`,
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
        studentIds.includes(s.student_profile_id),
      );
      setAssignedStudents(newlyAssigned);

      setShowConfirmModal(false);
      setShowPreview(true);
      toast.show(
        "success",
        `Successfully assigned ${studentIds.length} student(s) to batch!`,
      );
    } catch (err: any) {
      toast.show("error", err.message || "Failed to assign students");
    } finally {
      setAssigning(false);
    }
  };

  // Finish and go back to batch detail
  const handleFinish = () => {
    router.push(`/dashboards/admin/batches/${batchId}`);
  };

  // Access denied state
  if (user && !isAdminRole(user.role.code)) {
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
            <h2 className="mt-4 text-2xl font-bold text-foreground">
              Access Denied
            </h2>
            <p className="mt-2 text-muted-foreground">
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">
        <WorkflowSteps currentStep={2} />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Step 2: Assign Students to Batch
          </h1>
          <p className="mt-2 text-sm text-foreground/80">
            Select students to assign to batch{" "}
            <span className="font-semibold">{batchDetails?.code || "..."}</span>
          </p>
        </div>

        {/* Batch Info Card */}
        {batchDetails && (
          <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Batch Code
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {batchDetails.code}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Course
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {batchDetails.course_name}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Capacity
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {batchDetails.current_student_count} /{" "}
                  {batchDetails.max_students}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {batchDetails.available_slots} available
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
            onContinue={handleFinish}
          />
        ) : (
          <>
            {/* Selection Info Bar */}
            <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {eligibleStudents.length}
                  </span>{" "}
                  eligible student(s) found
                  {selectedStudentIds.size > 0 && (
                    <span className="ml-2 text-primary font-medium">
                      • {selectedStudentIds.size} selected
                    </span>
                  )}
                </div>
                <button
                  onClick={handleAssignClick}
                  disabled={selectedStudentIds.size === 0 || assigning}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Assign Selected Students
                  {selectedStudentIds.size > 0 &&
                    ` (${selectedStudentIds.size})`}
                </button>
              </div>
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
