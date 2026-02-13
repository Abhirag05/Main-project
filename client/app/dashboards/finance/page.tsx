"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy Finance dashboard – redirects to the unified Admin Dashboard.
 */
export default function FinanceDashboard() {
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
