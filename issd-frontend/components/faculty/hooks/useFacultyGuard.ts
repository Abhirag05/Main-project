"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type GuardUser = {
  role?: {
    code?: string;
  };
} | null;

export function useFacultyGuard() {
  const router = useRouter();
  const [user, setUser] = useState<GuardUser>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        router.push("/login");
        return;
      }

      const userData = JSON.parse(userStr) as GuardUser;
      setUser(userData);

      if (userData?.role?.code !== "FACULTY") {
        router.push("/dashboards");
        return;
      }
    } catch {
      router.push("/login");
      return;
    } finally {
      setIsChecking(false);
    }
  }, [router]);

  const isAllowed = useMemo(
    () => !!user && user?.role?.code === "FACULTY" && !isChecking,
    [user, isChecking],
  );

  return { user, isAllowed, isChecking };
}
