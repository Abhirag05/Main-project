"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SessionsManagementPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to timetable page - Sessions feature removed
    router.replace("/dashboards/centre-admin/timetable");
  }, [router]);

  return null;
}
