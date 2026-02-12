"use client";

import React from "react";
import { AcademicCourse } from "@/lib/api";

interface CourseTableProps {
  courses: AcademicCourse[];
  loading: boolean;
  onEdit: (course: AcademicCourse) => void;
  onToggleStatus: (course: AcademicCourse) => void;
  onDelete: (course: AcademicCourse) => void;
}

function CourseTable({
  courses,
  loading,
  onEdit,
  onToggleStatus,
  onDelete,
}: CourseTableProps) {
  // Defensive check: ensure courses is always an array
  const safeCourses = Array.isArray(courses) ? courses : [];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200"></div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 border-t border-gray-200"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (safeCourses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">
          No courses found
        </h3>
        <p className="mt-1 text-gray-500">
          Get started by creating a new course.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Course Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Course Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Skills
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration (Months)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created Date
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {safeCourses.map((course) => (
              <tr
                key={course.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {course.code}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {course.name}
                  </div>
                  {course.description && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {course.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {Array.isArray(course.skills) &&
                    course.skills.length > 0 ? (
                      <div className="line-clamp-2">
                        {course.skills.join(", ")}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {course.duration_months} months
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      course.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {course.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(course.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(course)}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                      title="Edit course"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onToggleStatus(course)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        course.is_active
                          ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "bg-green-50 text-green-700 hover:bg-green-100"
                      }`}
                      title={
                        course.is_active ? "Deactivate course" : "Activate course"
                      }
                    >
                      {course.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => onDelete(course)}
                      className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
                      title="Delete course"
                    >
                      Delete
                    </button>
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

export default React.memo(CourseTable);
