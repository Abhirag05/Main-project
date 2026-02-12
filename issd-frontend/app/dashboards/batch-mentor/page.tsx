"use client";

import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function BatchMentorDashboard() {
  const quickLinks = [
    {
      title: "My Batches",
      description: "View your assigned batch details",
      href: "/dashboards/batch-mentor/my-batches",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: "bg-blue-500",
    },
    {
      title: "My Students",
      description: "View students in your batch",
      href: "/dashboards/batch-mentor/students",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      color: "bg-green-500",
    },
    {
      title: "Batch Management",
      description: "Monitor session attendance",
      href: "/dashboards/batch-mentor/batch-management",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      color: "bg-purple-500",
    },
    {
      title: "Batch Timetable",
      description: "View and manage schedules",
      href: "/dashboards/batch-mentor/timetable",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: "bg-blue-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`inline-flex p-3 rounded-lg ${link.color} text-white mb-4`}>
                  {link.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{link.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{link.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
