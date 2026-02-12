"use client";

import { useState } from "react";
import { apiClient, StudentBatch } from "@/lib/api";

interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  role: { code: string; name: string };
  centre?: { name: string } | null;
  is_active: boolean;
  created_at: string;
}

interface StudentProfileCardProps {
  profile: UserProfile;
  onUpdate: () => void;
  onError: (message: string) => void;
  batch?: StudentBatch | null;
}

export default function StudentProfileCard({
  profile,
  onUpdate,
  onError,
  batch,
}: StudentProfileCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [phone, setPhone] = useState(profile.phone || "");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.updateUser(profile.id, { phone });
      setIsEditOpen(false);
      onUpdate();
    } catch (err) {
      const e = err as Error;
      onError(e.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
          <button
            onClick={() => setIsEditOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {batch && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Course
                </label>
                <p className="text-gray-900 font-medium">{batch.course_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Batch
                </label>
                <p className="text-gray-900">{batch.batch_code}</p>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Full Name
            </label>
            <p className="text-gray-900 font-medium">{profile.full_name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">
              Email
            </label>
            <p className="text-gray-900">{profile.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">
              Phone
            </label>
            <p className="text-gray-900">{profile.phone || "N/A"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">
              Centre
            </label>
            <p className="text-gray-900">{profile.centre?.name || "N/A"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">
              Joined
            </label>
            <p className="text-gray-900">
              {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">
              Status
            </label>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${profile.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              {profile.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Edit Profile
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
