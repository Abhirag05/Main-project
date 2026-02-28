"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentAdmissionsTable from "@/components/shared/StudentAdmissionsTable";
import { useToast } from "@/lib/toast";
import { financeAPI, StudentAdmission } from "@/lib/financeAPI";
import { isAdminRole } from "@/lib/roles";

export default function AdminVerifiedStudentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [admissions, setAdmissions] = useState<StudentAdmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const toast = useToast();

  const fetchAdmissions = async () => {
    try {
      setIsLoading(true);
      const data = await financeAPI.getAdmissions("ACTIVE");
      setAdmissions(data);
    } catch (error: any) {
      toast.show("error", error.message || "Failed to load verified students");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchAdmissions();
    }
  }, [authLoading, user]);

  if (!authLoading && user && !isAdminRole(user.role.code)) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Verified Students</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Students with verified payment and active access
            </p>
          </div>
          <button
            onClick={fetchAdmissions}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground/80 bg-card hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50"
          >
            <svg
              className={`-ml-1 mr-2 h-5 w-5 text-muted-foreground ${isLoading ? "animate-spin" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <StudentAdmissionsTable
          admissions={admissions}
          isLoading={isLoading}
          onVerifyFullPayment={() => {}}
          onVerifyInstallment={() => {}}
          onDisableAccess={() => {}}
          onEnableAccess={() => {}}
          isProcessing={isProcessing}
        />
      </div>
    </DashboardLayout>
  );
}
