"use client";

import { useState } from "react";
import { apiClient, FacultySelfProfile } from "@/lib/api";
import FacultyCard from "@/components/faculty/ui/FacultyCard";

interface FacultyProfileCardProps {
  profile: FacultySelfProfile;
  onUpdate: () => void;
  onError: (message: string) => void;
}

export default function FacultyProfileCard({
  profile,
  onUpdate,
  onError,
}: FacultyProfileCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    phone: profile.phone,
    designation: profile.designation,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setEditForm({
      phone: profile.phone,
      designation: profile.designation,
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.updateFacultySelfProfile(editForm);
      setIsEditModalOpen(false);
      onUpdate();
    } catch (err) {
      const error = err as Error;
      onError(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <FacultyCard className="p-6 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">My Profile</h2>
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Full Name
            </label>
            <p className="text-foreground font-medium">{profile.full_name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Email
            </label>
            <p className="text-foreground">{profile.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Employee Code
            </label>
            <p className="text-foreground font-medium">{profile.employee_code}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Designation
            </label>
            <p className="text-foreground">{profile.designation}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Phone
            </label>
            <p className="text-foreground">{profile.phone || "N/A"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Centre
            </label>
            <p className="text-foreground">{profile.centre?.name || "N/A"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Joining Date
            </label>
            <p className="text-foreground">
              {new Date(profile.joining_date).toLocaleDateString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Status
            </label>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                profile.is_active
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {profile.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </FacultyCard>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-md border border-border">
            <h3 className="text-xl font-bold text-foreground mb-4">
              Edit Profile
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground bg-card"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Designation
                </label>
                <input
                  type="text"
                  value={editForm.designation}
                  onChange={(e) =>
                    setEditForm({ ...editForm, designation: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground bg-card"
                  placeholder="Enter designation"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 border border-border rounded-lg text-foreground/80 hover:bg-secondary/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
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
