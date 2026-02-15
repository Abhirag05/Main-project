"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import { useToast } from "@/lib/toast";
import {
  studentProgressAPI,
  StudentWithSkills,
  Skill,
  SkillLevel,
} from "@/lib/studentProgressAPI";

/* ── helpers ── */
function getMasteryColor(level: string) {
  switch (level) {
    case "ADVANCED":
      return "bg-green-100 text-green-800 border-green-200";
    case "INTERMEDIATE":
      return "bg-primary/10 text-primary border-primary/20";
    case "BEGINNER":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-secondary text-foreground border-border";
  }
}

function getMasteryLabel(level: string) {
  if (!level) return "Not acquired";
  return level.charAt(0) + level.slice(1).toLowerCase().replace("_", " ");
}

function normalizeLevel(level: string | null | undefined) {
  if (!level) return "";
  return level.toString().trim().toUpperCase().replace(/\s+/g, "_");
}

/* ── progress bar ── */
function SkillProgressBar({
  percentage,
  level,
}: {
  percentage: number;
  level: string;
}) {
  const barColor =
    level === "ADVANCED"
      ? "bg-green-500"
      : level === "INTERMEDIATE"
        ? "bg-primary/80"
        : level === "BEGINNER"
          ? "bg-yellow-500"
          : "bg-muted";

  return (
    <div className="w-full bg-muted rounded-full h-2 mt-1">
      <div
        className={`${barColor} h-2 rounded-full transition-all`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

/* ── table ── */
function StudentProgressTable({
  students,
  isLoading,
}: {
  students: StudentWithSkills[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading students…</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow p-8 text-center">
        <svg
          className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <p className="text-muted-foreground">No students found</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Centre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Course
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Skills &amp; Progress
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {students.map((student) => (
              <tr
                key={student.student_profile_id}
                className="hover:bg-secondary/50"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-foreground">
                    {student.full_name || "-"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-foreground">
                    {student.email || "-"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {student.phone_number || "-"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {student.centre_name || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {student.course_name || "-"}
                </td>
                <td className="px-6 py-4">
                  {student.skills && student.skills.length > 0 ? (
                    <div className="space-y-2 min-w-[220px]">
                      {student.skills.map((skill, idx) => {
                        const level =
                          skill.mastery_level || skill.level || "NOT_ACQUIRED";
                        const pct = skill.percentage_score ?? 0;
                        return (
                          <div key={idx}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-foreground/80">
                                {skill.skill_name}
                              </span>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getMasteryColor(level)}`}
                              >
                                {getMasteryLabel(level)} ({Number(pct).toFixed(0)}%)
                              </span>
                            </div>
                            <SkillProgressBar percentage={Number(pct)} level={level} />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground/70 italic">
                      No skills assessed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── page ── */
export default function StudentProgressPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [students, setStudents] = useState<StudentWithSkills[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [skillFilters, setSkillFilters] = useState<
    { skill: string; level: SkillLevel | "" }[]
  >([]);
  const [filterSkill, setFilterSkill] = useState("");
  const [filterLevel, setFilterLevel] = useState<SkillLevel | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      try {
        const data = await studentProgressAPI.getAvailableSkills();
        const unique = data.skills.reduce((acc: Skill[], s) => {
          if (!acc.find((x) => x.name === s.name)) acc.push(s);
          return acc;
        }, []);
        setAvailableSkills(unique);
      } catch (err) {
        console.error("Failed to load skills:", err);
      }
    })();
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      try {
        setIsLoading(true);
        const data = await studentProgressAPI.getStudentsWithSkills();
        setStudents(data.results);
      } catch (err: any) {
        toast.show("error", err.message || "Failed to load students");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [authLoading, user]);

  /* client-side filtering */
  const filtered = students.filter((student) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        student.full_name?.toLowerCase().includes(q) ||
        student.email?.toLowerCase().includes(q) ||
        student.phone_number?.toLowerCase().includes(q) ||
        student.centre_name?.toLowerCase().includes(q) ||
        student.course_name?.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (skillFilters.length > 0) {
      return skillFilters.some((f) => {
        const ss = student.skills.find((s) => s.skill_name === f.skill);
        if (!ss) return false;
        const lvl = ss.mastery_level || ss.level || "";
        if (!f.level) return true;
        return normalizeLevel(lvl) === normalizeLevel(f.level);
      });
    }

    return true;
  });

  if (isLoading && students.length === 0) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading student progress…</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Student Progress
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View students and track their skill levels and progress
          </p>
        </div>

        {/* Skill Filters */}
        <div className="bg-card rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Filter by Skill
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">
                Select Skill
              </label>
              <div className="flex gap-2">
                <select
                  value={filterSkill}
                  onChange={(e) => setFilterSkill(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-card text-foreground"
                >
                  <option value="">Select Skill</option>
                  {availableSkills.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!filterSkill) return;
                    setSkillFilters((prev) => {
                      const idx = prev.findIndex(
                        (f) => f.skill === filterSkill,
                      );
                      if (idx >= 0) {
                        const up = [...prev];
                        up[idx] = { skill: filterSkill, level: filterLevel };
                        return up;
                      }
                      return [
                        ...prev,
                        { skill: filterSkill, level: filterLevel },
                      ];
                    });
                    setFilterSkill("");
                    setFilterLevel("");
                  }}
                  disabled={!filterSkill}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">
                Mastery Level
              </label>
              <select
                value={filterLevel}
                onChange={(e) =>
                  setFilterLevel(e.target.value as SkillLevel | "")
                }
                className="w-full px-4 py-2 border border-border rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-card text-foreground"
              >
                <option value="">Any Level</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
          </div>

          {skillFilters.length > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {skillFilters.map((f) => (
                <span
                  key={`${f.skill}-${f.level}`}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                >
                  {f.skill}
                  {f.level ? ` · ${getMasteryLabel(f.level)}` : ""}
                  <button
                    onClick={() =>
                      setSkillFilters((prev) =>
                        prev.filter((x) => x.skill !== f.skill),
                      )
                    }
                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setSkillFilters([])}
                className="text-sm text-indigo-600 hover:text-indigo-800 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="bg-card rounded-lg shadow p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-muted-foreground/70"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name, email, phone, centre, or course…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-border rounded-md bg-card text-foreground placeholder-gray-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {filtered.length} of {students.length} students
        </div>

        {/* Table */}
        <StudentProgressTable students={filtered} isLoading={isLoading} />
      </div>
    </DashboardLayout>
  );
}
