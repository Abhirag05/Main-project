"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentProfileCard from "@/components/student/StudentProfileCard";
import CourseDetailsCard from "@/components/student/CourseDetailsCard";
import { apiClient } from "@/lib/api";
import { useToast } from "@/lib/toast";

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<{ role: { code: string } } | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [batch, setBatch] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const u = localStorage.getItem("user");
      if (u) {
        setUser(JSON.parse(u));
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getCurrentUser();
      setProfile(data);
      // If student, also fetch assigned batch
      if (data?.role?.code === "STUDENT") {
        try {
          const b = await apiClient.getMyBatch();
          setBatch(b);
        } catch (err) {
          console.warn("Failed to fetch student batch", err);
        }
      }
    } catch (err) {
      const e = err as Error;
      toast.show("error", e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = () => {
    fetchProfile();
    toast.show("success", "Profile updated");
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Profile</h1>

        {loading ? (
          <div className="bg-card rounded-lg shadow-md p-6 mb-6">
            Loading profile...
          </div>
        ) : profile ? (
          <>
            <StudentProfileCard
              profile={profile}
              batch={batch}
              onUpdate={handleUpdate}
              onError={(msg) => toast.show("error", msg)}
            />
            {batch && <CourseDetailsCard batch={batch} />}
          </>
        ) : (
          <div className="bg-card rounded-lg shadow-md p-6 mb-6 text-red-600">
            Failed to load profile
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
