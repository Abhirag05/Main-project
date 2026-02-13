"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Placement dashboard – redirects to the Placement Lists page.
 */
export default function PlacementDashboard() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboards/placement/lists");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Redirecting to Placement Lists…</p>
    </div>
  );
}
