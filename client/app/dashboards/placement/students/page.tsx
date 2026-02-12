"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import { useToast } from "@/lib/toast";
import {
  placementAPI,
  StudentWithSkills,
  Skill,
  SkillLevel,
} from "@/lib/placementAPI";

// Helper component for displaying the students table
function PlacementStudentsTable({
  students,
  isLoading,
}: {
  students: StudentWithSkills[];
  isLoading: boolean;
}) {
  const getMasteryColor = (level: string) => {
    if (!level) return "bg-gray-100 text-gray-800 border-gray-200";
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
    if (!level) return "Not acquired";
    return level.charAt(0) + level.slice(1).toLowerCase().replace("_", " ");
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading students...</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <svg
          className="h-12 w-12 text-gray-400 mx-auto mb-4"
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
        <p className="text-gray-600">No students found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Student
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Contact
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Centre
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Course
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Skills & Mastery
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.student_profile_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {student.full_name || "-"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {student.email || "-"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {student.phone_number || "-"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {student.centre_name || "-"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {student.course_name || "-"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {student.skills && student.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {student.skills.map((skill, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getMasteryColor(
                            skill.mastery_level || skill.level || "",
                          )}`}
                        >
                          {skill.skill_name}
                          <span className="ml-1.5 text-xs opacity-75">
                            (
                            {getMasteryLabel(
                              skill.mastery_level || skill.level || "",
                            )}
                            )
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">
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

export default function PlacementStudentsBySkillsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [students, setStudents] = useState<StudentWithSkills[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [skillFilters, setSkillFilters] = useState<
    { skill: string; level: SkillLevel | "" }[]
  >([]);
  const [filterSkill, setFilterSkill] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<SkillLevel | "">("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const toast = useToast();

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
      } catch (error: any) {
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
        const data = await placementAPI.getStudentsWithSkills();
        setStudents(data.results);
      } catch (error: any) {
        console.error("Failed to load students:", error);
        toast.show("error", error.message || "Failed to load students");
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchStudents();
    }
  }, [authLoading, user]);

  const getMasteryColor = (level: string) => {
    if (!level) return "bg-gray-100 text-gray-800 border-gray-200";
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
    if (!level) return "Not acquired";
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

  // Filter students based on search query and skill filters
  const filteredStudents = students.filter((student) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        student.full_name?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query) ||
        student.phone_number?.toLowerCase().includes(query) ||
        student.centre_name?.toLowerCase().includes(query) ||
        student.course_name?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (skillFilters.length > 0) {
      return skillFilters.some((filter) => {
        const studentSkill = student.skills.find(
          (skill) => skill.skill_name === filter.skill,
        );
        if (!studentSkill) return false;
        const level = studentSkill.mastery_level || studentSkill.level || "";
        return matchesExactLevel(level, filter.level);
      });
    }

    return true;
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Students</h1>
            <p className="mt-1 text-sm text-gray-600">
              Browse students and filter by skills or mastery level
            </p>
          </div>
          <Link
            href="/dashboards/placement/lists"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
            Placement Lists
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Filter Students
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skill Filter */}
            <div>
              <label
                htmlFor="skill"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select Skill
              </label>
              <div className="flex gap-2">
                <select
                  id="skill"
                  value={filterSkill}
                  onChange={(e) => setFilterSkill(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Mastery Level (Exact)
              </label>
              <select
                id="mastery"
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as SkillLevel)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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

          {skillFilters.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {skillFilters.map((filter) => (
                <span
                  key={`${filter.skill}-${filter.level}`}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
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

        {/* Students List */}

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
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
              placeholder="Search by name, email, phone, centre, or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Students Table */}
        <PlacementStudentsTable
          students={filteredStudents}
          isLoading={isLoading}
        />

      </div>
    </DashboardLayout>
  );
}
