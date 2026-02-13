"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy Super Admin dashboard – redirects to the unified Admin Dashboard.
 * Kept so bookmarks and history entries don't break.
 */
export default function SuperAdminDashboard() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboards/admin");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Redirecting to Admin Dashboard…</p>
    </div>
  );
}
