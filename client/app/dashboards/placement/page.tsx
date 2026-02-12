"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import {
  placementAPI,
  StudentWithSkills,
  Skill,
  SkillLevel,
} from "@/lib/placementAPI";

export default function PlacementDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [students, setStudents] = useState<StudentWithSkills[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [skillFilters, setSkillFilters] = useState<
    { skill: string; level: SkillLevel | "" }[]
  >([]);
  const [filterSkill, setFilterSkill] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<SkillLevel | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available skills on mount
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const data = await placementAPI.getAvailableSkills();

        // Deduplicate skills by name
        const uniqueSkills = data.skills.reduce((acc: Skill[], skill) => {
          if (!acc.find((s) => s.name === skill.name)) {
            acc.push(skill);
          }
          return acc;
        }, []);

        setAvailableSkills(uniqueSkills);
      } catch (error: unknown) {
        console.error("Failed to load skills:", error);
      }
    };

    if (!authLoading && user) {
      fetchSkills();
    }
  }, [authLoading, user]);

  // Fetch all students once
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await placementAPI.getStudentsWithSkills();
        setStudents(data.results);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Failed to load students:", error);
        setError(errorMessage || "Failed to load students");
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchStudents();
    }
  }, [authLoading, user]);

  const getMasteryColor = (level: string) => {
    switch (level) {
      case "ADVANCED":
        return "bg-green-100 text-green-800 border-green-200";
      case "INTERMEDIATE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "BEGINNER":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getMasteryLabel = (level: string) => {
    return level.charAt(0) + level.slice(1).toLowerCase().replace("_", " ");
  };

  const normalizeLevel = (level: string | null | undefined) => {
    if (!level) return "";
    return level.toString().trim().toUpperCase().replace(/\s+/g, "_");
  };

  const matchesExactLevel = (
    studentLevel: string | null | undefined,
    exactLevel: string,
  ) => {
    if (!exactLevel) return true;
    return normalizeLevel(studentLevel) === normalizeLevel(exactLevel);
  };

  const filteredStudents = students.filter((student) => {
    if (skillFilters.length === 0) return true;
    return skillFilters.some((filter) => {
      const studentSkill = student.skills.find(
        (skill) => skill.skill_name === filter.skill,
      );
      if (!studentSkill) return false;
      const level = studentSkill.level || studentSkill.mastery_level || "";
      return matchesExactLevel(level, filter.level);
    });
  });

  if (isLoading && students.length === 0) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading students...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/dashboards/placement/lists"
            className="inline-flex items-center rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <svg
              className="h-5 w-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Manage Placement Lists
          </Link>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Filter Students
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Skill Filter */}
            <div>
              <label
                htmlFor="skill"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Select Skill
              </label>
              <div className="flex gap-2">
                <select
                  id="skill"
                  value={filterSkill}
                  onChange={(e) => setFilterSkill(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="" className="text-gray-900">
                    Select Skill
                  </option>
                  {availableSkills.map((skill) => (
                    <option
                      key={skill.id}
                      value={skill.name}
                      className="text-gray-900"
                    >
                      {skill.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!filterSkill) return;
                    setSkillFilters((prev) => {
                      const existingIndex = prev.findIndex(
                        (f) => f.skill === filterSkill,
                      );
                      if (existingIndex >= 0) {
                        const updated = [...prev];
                        updated[existingIndex] = {
                          skill: filterSkill,
                          level: filterLevel,
                        };
                        return updated;
                      }
                      return [
                        ...prev,
                        { skill: filterSkill, level: filterLevel },
                      ];
                    });
                    setFilterSkill("");
                    setFilterLevel("");
                  }}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                  disabled={!filterSkill}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Mastery Level Filter */}
            <div>
              <label
                htmlFor="mastery"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Mastery Level
              </label>
              <select
                id="mastery"
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as SkillLevel)}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="" className="text-gray-900">
                  Any Level
                </option>
                <option value="BEGINNER" className="text-gray-900">
                  Beginner
                </option>
                <option value="INTERMEDIATE" className="text-gray-900">
                  Intermediate
                </option>
                <option value="ADVANCED" className="text-gray-900">
                  Advanced
                </option>
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {skillFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {skillFilters.map((filter) => (
                <span
                  key={`${filter.skill}-${filter.level}`}
                  className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800"
                >
                  {filter.skill}
                  {filter.level ? ` • ${getMasteryLabel(filter.level)}` : ""}
                  <button
                    onClick={() =>
                      setSkillFilters((prev) =>
                        prev.filter((f) => f.skill !== filter.skill),
                      )
                    }
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setSkillFilters([])}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Student List */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Students ({filteredStudents.length})
            </h2>
          </div>

          {error && (
            <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="mt-4 text-gray-500">
                No students found matching the selected criteria
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Student
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Contact
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Batch
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Course
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Mode
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Skills & Mastery
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.student_profile_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Student */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {student.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.full_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {student.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.phone_number || "N/A"}
                        </div>
                      </td>

                      {/* Batch */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {student.batch_name || (
                            <span className="text-gray-400 italic">
                              Not Assigned
                            </span>
                          )}
                        </div>
                        {student.batch_code && (
                          <div className="text-xs text-gray-500">
                            {student.batch_code}
                          </div>
                        )}
                      </td>

                      {/* Course */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {student.course_name || (
                            <span className="text-gray-400 italic">
                              Not Assigned
                            </span>
                          )}
                        </div>
                        {student.course_code && (
                          <div className="text-xs text-gray-500">
                            {student.course_code}
                          </div>
                        )}
                      </td>

                      {/* Mode */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.study_mode === "RECORDED"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {student.study_mode || "LIVE"}
                        </span>
                      </td>

                      {/* Skills */}
                      <td className="px-6 py-4">
                        {student.skills.length === 0 ? (
                          <span className="text-sm text-gray-400 italic">
                            No skills assessed
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {student.skills.map((skill, index) => (
                              <div
                                key={index}
                                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getMasteryColor(
                                  skill.level || "",
                                )}`}
                                title={`${skill.skill_name}: ${(skill.percentage_score || 0).toFixed(0)}%`}
                              >
                                <span className="font-semibold truncate max-w-30">
                                  {skill.skill_name}
                                </span>
                                <span className="mx-1.5 text-gray-400">•</span>
                                <span className="whitespace-nowrap">
                                  {(skill.percentage_score || 0).toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
