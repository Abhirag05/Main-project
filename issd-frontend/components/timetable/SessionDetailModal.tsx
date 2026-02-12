"use client";

import { useState } from "react";
import {
  ClassSession,
  ClassSessionDetail,
  timetableAPI,
} from "@/lib/timetableAPI";

// Helper type for session that may or may not have detail fields
type SessionWithOptionalDetails = ClassSession & Partial<ClassSessionDetail>;

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionWithOptionalDetails | null;
  onUpdate: (session: ClassSession) => void;
  canEdit: boolean;
}

export default function SessionDetailModal({
  isOpen,
  onClose,
  session,
  onUpdate,
  canEdit,
}: SessionDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    meeting_link: "",
  });

  if (!isOpen || !session) return null;

  const handleEdit = () => {
    setFormData({
      meeting_link:
        session.meeting_link || session.effective_meeting_link || "",
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await timetableAPI.updateSession(session.id, {
        meeting_link: formData.meeting_link || "",
      });
      onUpdate(updated);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update session:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date: string, time: string) => {
    const d = new Date(date);
    return `${d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })} at ${time.slice(0, 5)}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: "bg-blue-100 text-blue-800",
      IN_PROGRESS: "bg-green-100 text-green-800",
      COMPLETED: "bg-gray-100 text-gray-800",
      CANCELLED: "bg-red-100 text-red-800",
      RESCHEDULED: "bg-yellow-100 text-yellow-800",
    };
    return colors[status] || colors.SCHEDULED;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              Session Details
            </h2>
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                session.status
              )}`}
            >
              {session.status.replace("_", " ")}
            </span>
          </div>
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

        <div className="p-6 space-y-6">
          {/* Module & Time Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {session.module_name}
              </h3>
              <p className="text-sm text-gray-500">
                {session.time_slot_detail?.module_detail?.code || ""}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {formatDateTime(session.session_date, session.scheduled_start)}
              </div>
              <div className="text-sm text-gray-500">
                Duration: {session.scheduled_start.slice(0, 5)} -{" "}
                {session.scheduled_end.slice(0, 5)}
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase">
                Batch
              </div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {session.batch_code}
              </div>
              <div className="text-xs text-gray-500">
                {session.time_slot_detail?.batch_detail?.course_name || ""}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase">
                Faculty
              </div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {session.faculty_name}
              </div>
              <div className="text-xs text-gray-500">
                {session.time_slot_detail?.faculty_detail?.employee_code || ""}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase">
                Meeting Link
              </div>
              <div className="mt-2">
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.meeting_link}
                    onChange={(e) =>
                      setFormData({ ...formData, meeting_link: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                ) : session.meeting_link || session.effective_meeting_link ? (
                  <a
                    href={session.meeting_link || session.effective_meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    Join Meeting
                  </a>
                ) : (
                  <span className="text-sm text-gray-500">Not set</span>
                )}
              </div>
            </div>
          </div>

          {/* Timestamps */}
          {(session.created_at || session.updated_at) && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                {session.created_at && (
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {new Date(session.created_at).toLocaleString()}
                  </div>
                )}
                {session.updated_at && (
                  <div>
                    <span className="font-medium">Last Updated:</span>{" "}
                    {new Date(session.updated_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {canEdit &&
                !["COMPLETED", "CANCELLED"].includes(session.status) && (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Edit Session
                  </button>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
