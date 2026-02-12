"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BatchTemplateTable from '@/components/batch/BatchTemplateTable';
import BatchTemplateModal from '@/components/batch/BatchTemplateModal';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { apiClient, BatchTemplate, Course } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function BatchTemplatesPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<any>(null);
  const [templates, setTemplates] = useState<BatchTemplate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BatchTemplate | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [templateToDisable, setTemplateToDisable] = useState<BatchTemplate | null>(null);

  useEffect(() => {
    // Check user role
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        
        // Access control: only SUPER_ADMIN
        if (userData.role.code !== 'SUPER_ADMIN') {
          router.push('/dashboards');
        }
      } else {
        router.push('/login');
      }
    }
  }, [router]);

  useEffect(() => {
    if (user?.role.code === 'SUPER_ADMIN') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesData, coursesData] = await Promise.all([
        apiClient.getBatchTemplates(),
        apiClient.getCourses()
      ]);
      setTemplates(templatesData);
      setCourses(coursesData);
    } catch (err: any) {
      toast.show('error', err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleEdit = (template: BatchTemplate) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleDisable = (template: BatchTemplate) => {
    setTemplateToDisable(template);
    setIsConfirmOpen(true);
  };

  const confirmDisable = async () => {
    if (!templateToDisable) return;

    try {
      await apiClient.deleteBatchTemplate(templateToDisable.id);
      toast.show('success', 'Template disabled successfully');
      fetchData(); // Refresh list
    } catch (err: any) {
      toast.show('error', err.message || 'Failed to disable template');
    } finally {
      setIsConfirmOpen(false);
      setTemplateToDisable(null);
    }
  };

  const handleModalSuccess = () => {
    toast.show(
      'success',
      editingTemplate ? 'Template updated successfully' : 'Template created successfully'
    );
    fetchData(); // Refresh list
  };

  // Access denied state
  if (user && user.role.code !== 'SUPER_ADMIN') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h2>
            <p className="mt-2 text-gray-600">
              You don't have permission to access this page. Only Super Admins can manage batch templates.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Loading initial check
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Batch Templates</h1>
            <p className="mt-1 text-gray-500">
              Reusable batch configurations that serve as blueprints for creating actual batches.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Template
          </button>
        </div>

        {/* Table */}
        <BatchTemplateTable
          templates={templates}
          loading={loading}
          onEdit={handleEdit}
          onDisable={handleDisable}
        />

        {/* Modal */}
        <BatchTemplateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
          template={editingTemplate}
          courses={courses}
        />

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={isConfirmOpen}
          title="Disable Template"
          message={`Are you sure you want to disable "${templateToDisable?.name}"? This template will no longer be available for creating new batches.`}
          confirmText="Disable"
          cancelText="Cancel"
          variant="danger"
          onConfirm={confirmDisable}
          onCancel={() => {
            setIsConfirmOpen(false);
            setTemplateToDisable(null);
          }}
        />

      </div>
    </DashboardLayout>
  );
}
