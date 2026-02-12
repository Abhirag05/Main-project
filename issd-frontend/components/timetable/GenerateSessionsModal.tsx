"use client";

import { useState } from "react";
import { TimeSlot } from "@/lib/timetableAPI";

interface GenerateSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: {
    start_date: string;
    end_date: string;
    time_slot_ids: number[];
  }) => Promise<void>;
  selectedSlots: TimeSlot[];
}

export default function GenerateSessionsModal({
  isOpen,
  onClose,
  onGenerate,
  selectedSlots,
}: GenerateSessionsModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Calculate approximate session count
  const calculateSessionCount = (): number => {
    if (!startDate || !endDate || selectedSlots.length === 0) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const weeks = Math.ceil(daysDiff / 7);

    // Count sessions based on days of week
    let count = 0;
    selectedSlots.forEach((slot) => {
      // Each slot will have approximately 'weeks' sessions
      count += weeks;
    });

    return count;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("End date must be after start date");
      return;
    }

    if (selectedSlots.length === 0) {
      setError("No time slots selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onGenerate({
        start_date: startDate,
        end_date: endDate,
        time_slot_ids: selectedSlots.map((s) => s.id),
      });
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to generate sessions",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const estimatedCount = calculateSessionCount();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Generate Class Sessions
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 overflow-y-auto max-h-[70vh]"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              Selected Time Slots
            </h4>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {selectedSlots.map((slot) => (
                <div key={slot.id} className="text-sm text-blue-700">
                  <span className="font-medium">{slot.day_name}</span>
                  {" • "}
                  {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                  {" • "}
                  {slot.module_detail?.code} ({slot.batch_detail?.code})
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={today}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || today}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                required
              />
            </div>
          </div>

          {estimatedCount > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-gray-400 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm text-gray-600">
                  Approximately{" "}
                  <span className="font-semibold text-gray-900">
                    {estimatedCount}
                  </span>{" "}
                  sessions will be created
                </span>
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-amber-400 mr-2 mt-0.5"
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
              <div className="text-sm text-amber-700">
                <p className="font-medium">Note:</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>
                    Sessions will be created for each matching day of the week
                  </li>
                  <li>
                    Existing sessions for the same date/time will not be
                    duplicated
                  </li>
                  <li>All sessions will have "SCHEDULED" status initially</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedSlots.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Generating..."
                : `Generate ${
                    estimatedCount > 0 ? estimatedCount : ""
                  } Sessions`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
