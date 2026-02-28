"use client";

import React from 'react';
import { BatchTemplate } from '@/lib/api';

interface BatchTemplateTableProps {
  templates: BatchTemplate[];
  loading: boolean;
  onEdit: (template: BatchTemplate) => void;
  onDisable: (template: BatchTemplate) => void;
}

function BatchTemplateTable({
  templates,
  loading,
  onEdit,
  onDisable
}: BatchTemplateTableProps) {
  
  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-muted"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-secondary border-t border-border"></div>
          ))}
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground/70"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-foreground">No templates found</h3>
        <p className="mt-1 text-muted-foreground">Get started by creating a new batch template.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Course Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Template Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Max Students
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Created Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {templates.map((template) => (
              <tr key={template.id} className="hover:bg-secondary/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-foreground">
                    {template.course_detail.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {template.course_detail.code}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-foreground">{template.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {template.max_students}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      template.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-secondary text-foreground'
                    }`}
                  >
                    {template.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(template.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(template)}
                      className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-md hover:bg-primary/10 transition-colors"
                    >
                      Edit
                    </button>
                    {template.is_active && (
                      <button
                        onClick={() => onDisable(template)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
                      >
                        Disable
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default React.memo(BatchTemplateTable);
