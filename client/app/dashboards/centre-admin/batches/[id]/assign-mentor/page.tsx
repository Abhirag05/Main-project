"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient, AvailableMentor, BatchDetails } from "@/lib/api";
import { useToast } from "@/lib/toast";

// Progress Bar Component (only current step highlighted)
function WorkflowSteps({ currentStep }: { currentStep: number }) {
  const steps = [
    { id: 1, name: "Create Batch" },
    { id: 2, name: "Assign Students" },
    { id: 3, name: "Assign Mentor" },
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
                <div className="h-0.5 w-full bg-gray-200" />
              </div>
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white ${
                  isCurrent ? "border-blue-600" : "border-gray-300"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isCurrent ? "bg-blue-600" : "bg-gray-300"
                  }`}
                />
                <span className="sr-only">{step.name}</span>
              </div>
              <span className="mt-2 text-xs font-medium text-gray-500 sm:mt-0 sm:absolute sm:-bottom-7 sm:left-1/2 sm:-translate-x-1/2 sm:whitespace-nowrap">
                {step.name}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Mentor Selection Card
function MentorCard({
  mentor,
  isSelected,
  onSelect,
}: {
  mentor: AvailableMentor;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <svg
            className="h-6 w-6 text-blue-600"
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
      )}
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center ${
              isSelected ? "bg-blue-200" : "bg-gray-200"
            }`}
          >
            <span
              className={`text-lg font-semibold ${isSelected ? "text-blue-700" : "text-gray-600"}`}
            >
              {mentor.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${isSelected ? "text-blue-900" : "text-gray-900"}`}
          >
            {mentor.full_name}
          </p>
          <p className="text-sm text-gray-500">{mentor.email}</p>
          {mentor.phone && (
            <p className="text-xs text-gray-400">{mentor.phone}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AssignMentorPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [availableMentors, setAvailableMentors] = useState<AvailableMentor[]>(
    [],
  );
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(null);
  const [loadingBatch, setLoadingBatch] = useState(true);
  const [loadingMentors, setLoadingMentors] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [assignmentComplete, setAssignmentComplete] = useState(false);
  const [isChangingMentor, setIsChangingMentor] = useState(false);
  const toast = useToast();

  // Check user authentication and role
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        if (userData.role.code !== "CENTRE_ADMIN") {
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
        // If mentor is already assigned, show completion state
        if (data.mentor_detail) {
          setAssignmentComplete(true);
        }
      } catch (err: any) {
        toast.show("error", err.message || "Failed to load batch details");
      } finally {
        setLoadingBatch(false);
      }
    };
    fetchBatchDetails();
  }, [batchId, user]);

  // Fetch available mentors
  useEffect(() => {
    const fetchMentors = async () => {
      if (!batchId || !user) return;
      // Fetch mentors when not complete OR when changing mentor
      if (assignmentComplete && !isChangingMentor) return;
      setLoadingMentors(true);
      try {
        const data = await apiClient.getAvailableMentors(parseInt(batchId));
        setAvailableMentors(data);
      } catch (err: any) {
        toast.show("error", err.message || "Failed to load available mentors");
      } finally {
        setLoadingMentors(false);
      }
    };
    fetchMentors();
  }, [batchId, user, assignmentComplete, isChangingMentor]);

  // Handle change mentor button click
  const handleChangeMentor = async () => {
    setIsChangingMentor(true);
    setAssignmentComplete(false);
    setSelectedMentorId(null);
    // Mentors will be fetched by the useEffect above
  };

  // Handle cancel change mentor
  const handleCancelChange = () => {
    setIsChangingMentor(false);
    setAssignmentComplete(true);
    setSelectedMentorId(null);
  };

  const handleAssignMentor = async () => {
    if (!selectedMentorId || !batchId) return;

    setAssigning(true);
    try {
      await apiClient.assignMentorToBatch(parseInt(batchId), selectedMentorId);
      toast.show(
        "success",
        isChangingMentor
          ? "Mentor changed successfully!"
          : "Mentor assigned successfully!",
      );
      // Refresh batch details to show the assigned mentor
      const updatedBatch = await apiClient.getBatchDetails(parseInt(batchId));
      setBatchDetails(updatedBatch);
      setAssignmentComplete(true);
      setIsChangingMentor(false);
    } catch (err: any) {
      toast.show("error", err.message || "Failed to assign mentor");
    } finally {
      setAssigning(false);
    }
  };

  const handleFinish = () => {
    toast.show("success", "Batch setup completed successfully!");
    setTimeout(() => {
      router.push(`/dashboards/centre-admin/batches`);
    }, 1500);
  };

  const handleSkip = () => {
    router.push(`/dashboards/centre-admin/batches`);
  };

  // Access denied state
  if (user && user.role.code !== "CENTRE_ADMIN") {
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
              Only Centre Admins can assign mentors.
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
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        <WorkflowSteps currentStep={3} />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Step 3: Assign Batch Mentor
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            {assignmentComplete
              ? "Mentor has been assigned to this batch."
              : "Select a mentor to assign to this batch."}
          </p>
        </div>

        {/* Batch Info Card */}
        {batchDetails && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Batch Information
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Batch Code
                </dt>
                <dd className="mt-1 text-sm text-gray-900 font-semibold">
                  {batchDetails.code}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Course</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {batchDetails.course_name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Mode</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      batchDetails.mode === "LIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {batchDetails.mode}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Students</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {batchDetails.current_student_count} /{" "}
                  {batchDetails.max_students}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Assignment Complete State */}
        {assignmentComplete && batchDetails?.mentor_detail ? (
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
                    Batch Setup Complete!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>All steps have been completed successfully.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Mentor Card */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Assigned Mentor
                </h3>
                <button
                  onClick={handleChangeMentor}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="mr-1.5 h-4 w-4"
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
                  Change Mentor
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-blue-600">
                      {batchDetails.mentor_detail.full_name
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {batchDetails.mentor_detail.full_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {batchDetails.mentor_detail.email}
                  </p>
                  {batchDetails.mentor_detail.phone && (
                    <p className="text-sm text-gray-400">
                      {batchDetails.mentor_detail.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-4">
                Setup Summary
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center text-sm text-blue-800">
                  <svg
                    className="h-5 w-5 text-green-500 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Batch created:{" "}
                  <span className="font-semibold ml-1">
                    {batchDetails.code}
                  </span>
                </li>
                <li className="flex items-center text-sm text-blue-800">
                  <svg
                    className="h-5 w-5 text-green-500 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Students assigned:{" "}
                  <span className="font-semibold ml-1">
                    {batchDetails.current_student_count}
                  </span>
                </li>
                <li className="flex items-center text-sm text-blue-800">
                  <svg
                    className="h-5 w-5 text-green-500 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Mentor assigned:{" "}
                  <span className="font-semibold ml-1">
                    {batchDetails.mentor_detail.full_name}
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleFinish}
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Finish & View Batch
              </button>
            </div>
          </div>
        ) : (
          /* Mentor Selection State */
          <div className="space-y-6">
            {isChangingMentor && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Changing Batch Mentor
                    </h3>
                    <div className="mt-1 text-sm text-yellow-700">
                      <p>
                        Select a new mentor from the list below. The current
                        mentor will be unassigned from this batch.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {loadingMentors ? (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">
                    Loading available mentors...
                  </span>
                </div>
              </div>
            ) : availableMentors.length === 0 ? (
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No Available Mentors
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  There are no available mentors at this centre.
                  <br />
                  All mentors might already be assigned to other batches.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  {isChangingMentor ? (
                    <button
                      onClick={handleCancelChange}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={handleSkip}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Skip for Now
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Select a Mentor ({availableMentors.length} available)
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {availableMentors.map((mentor) => (
                      <MentorCard
                        key={mentor.id}
                        mentor={mentor}
                        isSelected={selectedMentorId === mentor.id}
                        onSelect={() => setSelectedMentorId(mentor.id)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {isChangingMentor ? (
                    <button
                      onClick={handleCancelChange}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={handleSkip}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Skip for Now
                    </button>
                  )}
                  <button
                    onClick={handleAssignMentor}
                    disabled={!selectedMentorId || assigning}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {assigning ? (
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
                        {isChangingMentor ? "Changing..." : "Assigning..."}
                      </>
                    ) : (
                      <>
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
                            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                          />
                        </svg>
                        {isChangingMentor ? "Change Mentor" : "Assign Mentor"}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
