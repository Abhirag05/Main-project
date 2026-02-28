"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Recorded classes page has been removed.
 * Redirect to live timetable.
 */
export default function StudentRecordedClassesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboards/student/timetable");
  }, [router]);
  return null;
}

