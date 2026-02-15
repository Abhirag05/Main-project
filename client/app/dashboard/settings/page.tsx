"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(userStr));
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <DashboardLayout>
        <div>Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account preferences and settings
          </p>
        </div>

        {/* Settings Sections */}
        <div className="bg-card rounded-lg shadow">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Account</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80">
                Username
              </label>
              <p className="mt-1 text-sm text-muted-foreground">{user?.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80">
                Email
              </label>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80">
                Role
              </label>
              <p className="mt-1 text-sm text-muted-foreground">{user?.role?.name}</p>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-card rounded-lg shadow">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground/80">
                Email Notifications
              </label>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-primary rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground/80">
                SMS Notifications
              </label>
              <input
                type="checkbox"
                className="h-4 w-4 text-primary rounded"
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
