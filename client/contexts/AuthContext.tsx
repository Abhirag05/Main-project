"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// Type definitions for User and Auth state
export type User = {
  id: number;
  username: string;
  email: string;
  role?: string; // Add role for multi-dashboard support
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken?: string, userData?: User) => void;
  logout: () => void;
};

// Create the Auth Context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider Component
 * Manages authentication state and provides auth methods to the entire app
 * Note: Auth tokens are automatically attached by axios interceptors in lib/axios.ts
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * CORE: Logout function
   * Clears all auth state and localStorage, then redirects to login
   */
  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    console.log("✅ User logged out successfully");
    router.push("/");
  }, [router]);

  // CORE: Restore session from localStorage on app mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("access_token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to restore session:", error);
      // Clear corrupted data
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for session expired events from API client
  useEffect(() => {
    const handleSessionExpired = () => {
      console.log("🔒 Session expired - logging out");
      logout();
    };

    window.addEventListener("auth:sessionExpired", handleSessionExpired);
    
    return () => {
      window.removeEventListener("auth:sessionExpired", handleSessionExpired);
    };
  }, [logout]);

  /**
   * CORE: Login function
   * Stores JWT tokens and user data in state and localStorage
   * @param accessToken - JWT access token from backend
   * @param refreshToken - Optional JWT refresh token
   * @param userData - Optional user data (if not provided, will be fetched)
   */
  const login = (
    accessToken: string,
    refreshToken?: string,
    userData?: User
  ) => {
    // Store access token
    setAccessToken(accessToken);
    localStorage.setItem("access_token", accessToken);

    // Store refresh token if provided
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }

    // Store user data if provided
    if (userData) {
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    }

    console.log("✅ User logged in successfully");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to access Auth Context
 * Throws error if used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
