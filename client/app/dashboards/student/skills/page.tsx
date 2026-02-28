"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient, StudentSkillInfo } from "@/lib/api";

const levelColors: Record<string, { bg: string; text: string; bar: string }> = {
  ADVANCED: { bg: "bg-green-100", text: "text-green-800", bar: "bg-green-500" },
  INTERMEDIATE: { bg: "bg-primary/10", text: "text-primary", bar: "bg-primary/80" },
  BEGINNER: { bg: "bg-yellow-100", text: "text-yellow-800", bar: "bg-yellow-500" },
  NOT_ACQUIRED: { bg: "bg-secondary", text: "text-muted-foreground", bar: "bg-muted-foreground/30" },
};

function levelLabel(level: string) {
  return level.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StudentSkillsPage() {
  const [skills, setSkills] = useState<StudentSkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getMySkills();
        setSkills(data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load skills.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Skills</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your skill levels based on assessment performance
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
            {error}
          </div>
        ) : skills.length === 0 ? (
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
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-foreground">
              No skills tracked yet
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete assessments to start building your skill profile.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => {
              const colors = levelColors[skill.level] || levelColors.NOT_ACQUIRED;
              return (
                <div
                  key={skill.skill_id}
                  className="bg-card rounded-lg border border-border shadow-sm p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {skill.skill_name}
                      </h3>
                      {skill.skill_description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {skill.skill_description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                    >
                      {levelLabel(skill.level)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-medium text-foreground">
                        {skill.percentage_score.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1.5 w-full bg-muted rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${colors.bar} transition-all`}
                        style={{ width: `${Math.min(skill.percentage_score, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-secondary/50 rounded px-2 py-1.5 text-center">
                      <span className="font-semibold text-foreground">{skill.assessment_count}</span>
                      <span className="text-muted-foreground ml-1">Assessment{skill.assessment_count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="bg-secondary/50 rounded px-2 py-1.5 text-center">
                      <span className="font-semibold text-foreground">{skill.assignment_count}</span>
                      <span className="text-muted-foreground ml-1">Assignment{skill.assignment_count !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground/70">
                    <span>{skill.attempts_count} assessment{skill.attempts_count !== 1 ? "s" : ""}</span>
                    {skill.last_updated && (
                      <span>
                        Updated{" "}
                        {new Date(skill.last_updated).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
