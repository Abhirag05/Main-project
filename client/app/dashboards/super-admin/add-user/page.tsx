"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AddUserForm from "@/components/dashboard/AddUserForm";
import { useToast } from "@/lib/toast";

export default function AddUserPage() {
  const toast = useToast();

  const handleFormSuccess = () => {
    toast.show("success", "User created successfully!");
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <AddUserForm onSuccess={handleFormSuccess} />
      </div>
    </DashboardLayout>
  );
}
