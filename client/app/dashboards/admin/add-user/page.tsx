"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AddUserForm from "@/components/dashboard/AddUserForm";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";

export default function AddUserPage() {
  const router = useRouter();
  const toast = useToast();

  const handleFormSuccess = () => {
    toast.show("success", "Faculty created successfully!");
    router.push("/dashboards/admin/users");
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <AddUserForm onSuccess={handleFormSuccess} />
      </div>
    </DashboardLayout>
  );
}
