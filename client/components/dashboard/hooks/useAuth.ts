"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: {
    id: number;
    name: string;
    code: string;
  };
  centre: {
    id: number;
    name: string;
    code: string;
  };
  is_active: boolean;
  created_at: string;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        router.push("/");
        return;
      }
      setUser(JSON.parse(storedUser));
      setIsLoading(false);
    };

    loadUser();
  }, [router]);

  const logout = async () => {
    try {
      await apiClient.logout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      localStorage.clear();
      router.push("/");
    }
  };

  return {
    user,
    isLoading,
    logout,
  };
}
