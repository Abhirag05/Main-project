"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient, MentorBatchRecording } from "@/lib/api";

export default function StudentRecordedClassesPage() {
  const router = useRouter();
  const [recordings, setRecordings] = useState<MentorBatchRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const batch = await apiClient.getMyBatch();
        if (!batch) {
          setError("You are not assigned to any batch yet.");
          return;
        }

        if (batch.mode !== "RECORDED") {
          router.push("/dashboards/student/timetable");
          return;
        }

        const data = await apiClient.getStudentRecordedSessions();
        setRecordings(data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load recordings.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View recorded classes for your batch
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
            {error}
          </div>
        ) : recordings.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground/70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-foreground">
              No recordings yet
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No recordings have been uploaded yet.
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Topic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Recording
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {recordings.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 text-sm text-foreground/80">
                      {new Date(r.session_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {r.meeting_topic}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary">
                      <a
                        href={r.recording_link}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
