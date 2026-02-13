"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlacementsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboards/student");
  }, [router]);
  return null;
}
