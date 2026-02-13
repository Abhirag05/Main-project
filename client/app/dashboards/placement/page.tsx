"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy Placement dashboard – redirects to the Student Progress page.
 */
export default function PlacementDashboard() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboards/admin/student-progress");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Redirecting to Student Progress…</p>
    </div>
  );
}
