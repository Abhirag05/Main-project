"use client";

import { Fragment, useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Link from "next/link";

interface BreakdownItem {
  name: string;
  type: string;
  score: number;
  date: string;
}

interface Skill {
  id: number;
  skill: number;
  skill_name: string;
  course_name: string;
  percentage_score: number;
  level: string;
  attempts_count: number;
  last_updated: string;
}

interface DisplaySkill {
  skill_id?: number;
  skill_name: string;
  percentage_score: number | string;
  level: string;
  attempts_count: number;
  last_updated: string | null;
  is_acquired: boolean;
}

export default function StudentSkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [courseName, setCourseName] = useState<string | null>(null);
  const [courseSkills, setCourseSkills] = useState<string[]>([]);
  const [courseSkillsLoading, setCourseSkillsLoading] = useState(true);
  const [courseSkillsError, setCourseSkillsError] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [breakdowns, setBreakdowns] = useState<Record<number, BreakdownItem[]>>({});
  const [loadingBreakdowns, setLoadingBreakdowns] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchSkills();
    fetchCourseSkills();
  }, []);

  const fetchSkills = async () => {
    setSkillsLoading(true);
    setSkillsError(null);
    const token =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/student/my-skills/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Session expired. Please log in again.");
        } else if (res.status === 403) {
          throw new Error("You don't have permission to view skills.");
        } else {
          throw new Error("Unable to load skills. Please try again later.");
        }
      }

      const data = await res.json();
      setSkills(data.skills || []);
    } catch (err) {
      setSkillsError((err as Error).message || "Unable to load skills.");
    } finally {
      setSkillsLoading(false);
    }
  };

  const fetchBreakdown = async (skill: DisplaySkill) => {
    const skillId = skill.skill_id;

    if (!skillId) {
      return;
    }
    
    // If already loaded, just toggle
    if (breakdowns[skillId]) {
      if (selectedSkillId === skillId) {
        setSelectedSkillId(null);
      } else {
        setSelectedSkillId(skillId);
      }
      return;
    }

    setLoadingBreakdowns({ ...loadingBreakdowns, [skillId]: true });
    setSelectedSkillId(skillId);

    const token =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/student/my-skills/${skillId}/breakdown/`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setBreakdowns({ ...breakdowns, [skillId]: data.breakdown || [] });
      }
    } catch (e) {
      console.error("Failed to fetch breakdown:", e);
    } finally {
      setLoadingBreakdowns({ ...loadingBreakdowns, [skillId]: false });
    }
  };

  const getLevelBadgeClass = (level: string) => {
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

  const getLevelDisplay = (level: string) => {
    const levelMap: Record<string, string> = {
      NOT_ACQUIRED: "Not Acquired",
      BEGINNER: "Beginner",
      INTERMEDIATE: "Intermediate",
      ADVANCED: "Advanced",
    };
    return levelMap[level] || level;
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-blue-500";
    if (percentage >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const toNumber = (value: number | string | null | undefined) => {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const normalizeName = (value: string) => value.trim().toLowerCase();

  const fetchCourseSkills = async () => {
    setCourseSkillsLoading(true);
    setCourseSkillsError(null);

    const token =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

    try {
      const batchRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/student/my-batch/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!batchRes.ok) {
        throw new Error("Unable to load your batch details.");
      }

      const batchData = await batchRes.json();
      const batch = "batch" in batchData ? batchData.batch : batchData;

      if (!batch) {
        setCourseName(null);
        setCourseSkills([]);
        return;
      }

      const batchCourseName = batch.course_name as string;
      setCourseName(batchCourseName);

      const coursesRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/academics/public/courses/`,
      );

      if (!coursesRes.ok) {
        throw new Error("Unable to load course skills.");
      }

      const coursesData = await coursesRes.json();
      const courses = Array.isArray(coursesData.data)
        ? coursesData.data
        : Array.isArray(coursesData)
          ? coursesData
          : [];

      const matchedCourse = courses.find(
        (course: { name?: string }) =>
          typeof course.name === "string" &&
          normalizeName(course.name) === normalizeName(batchCourseName),
      );

      if (!matchedCourse) {
        setCourseSkills([]);
        setCourseSkillsError("Course skills not found for your batch.");
        return;
      }

      const skillsList = Array.isArray(matchedCourse.skills)
        ? matchedCourse.skills
        : [];

      setCourseSkills(skillsList);
    } catch (err) {
      setCourseSkillsError((err as Error).message || "Unable to load course skills.");
    } finally {
      setCourseSkillsLoading(false);
    }
  };

  const acquiredSkillMap = new Map(
    skills.map((skill) => [normalizeName(skill.skill_name), skill]),
  );

  const displaySkills: DisplaySkill[] = courseSkills.length
    ? courseSkills.map((name) => {
        const acquired = acquiredSkillMap.get(normalizeName(name));
        if (acquired) {
          return {
            skill_id: acquired.skill || acquired.id,
            skill_name: acquired.skill_name,
            percentage_score: acquired.percentage_score,
            level: acquired.level,
            attempts_count: acquired.attempts_count,
            last_updated: acquired.last_updated,
            is_acquired: true,
          };
        }

        return {
          skill_name: name,
          percentage_score: 0,
          level: "NOT_ACQUIRED",
          attempts_count: 0,
          last_updated: null,
          is_acquired: false,
        };
      })
    : skills.map((skill) => ({
        skill_id: skill.skill || skill.id,
        skill_name: skill.skill_name,
        percentage_score: skill.percentage_score,
        level: skill.level,
        attempts_count: skill.attempts_count,
        last_updated: skill.last_updated,
        is_acquired: true,
      }));

  if (skillsLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading your skills...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (skillsError) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{skillsError}</h3>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Skills</h1>
              <p className="text-gray-600 mt-2">
                Track your skills acquired from assessments and assignments
              </p>
            </div>
            <Link
              href="/dashboards/student"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg
                className="h-5 w-5 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Skills Summary */}
        {displaySkills.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Skills</div>
              <div className="text-3xl font-bold text-gray-900">{displaySkills.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 mb-1">Acquired Skills</div>
              <div className="text-3xl font-bold text-blue-600">
                {displaySkills.filter((s) => s.is_acquired).length}
              </div>
            </div>
          </div>
        )}

        {/* Skills Table */}
        {displaySkills.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No skills acquired yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Complete assessments and assignments to start building your skill profile.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboards/student/assessments"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                View Assessments
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {(courseSkillsLoading || courseSkillsError || courseName) && (
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 text-sm text-gray-600">
                {courseSkillsLoading && <span>Loading course skills...</span>}
                {!courseSkillsLoading && courseName && (
                  <span>Showing all skills for {courseName}.</span>
                )}
                {!courseSkillsLoading && courseSkillsError && (
                  <span>{courseSkillsError}</span>
                )}
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Skill Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Attempts
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displaySkills.map((skill, index) => {
                  const skillId = skill.skill_id;
                  const isExpanded = skillId ? selectedSkillId === skillId : false;
                  const breakdown = skillId ? breakdowns[skillId] || [] : [];
                  const isLoadingBreakdown = skillId ? loadingBreakdowns[skillId] || false : false;
                  const skillPct = toNumber(skill.percentage_score);

                  return (
                    <Fragment key={`skill-${skillId ?? skill.skill_name}`}>
                      {/* Main Skill Row */}
                      <tr
                        key={`row-${skillId}`}
                        className={`transition-colors hover:bg-gray-50 ${isExpanded ? "bg-blue-50/40" : ""}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {skill.skill_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLevelBadgeClass(skill.level)}`}
                          >
                            {getLevelDisplay(skill.level)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3 min-w-[160px]">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${getProgressBarColor(skillPct)}`}
                                style={{ width: `${Math.min(skillPct, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-gray-900 w-14 text-right">
                              {skillPct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                          {skill.attempts_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {skill.last_updated
                            ? new Date(skill.last_updated).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => fetchBreakdown(skill)}
                            disabled={!skill.is_acquired}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                              skill.is_acquired
                                ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            }`}
                          >
                            <svg
                              className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                            {skill.is_acquired ? (isExpanded ? "Hide" : "View") : "N/A"}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Breakdown Row */}
                      {isExpanded && (
                        <tr key={`breakdown-${skillId}`}>
                          <td colSpan={8} className="px-0 py-0">
                            <div className="bg-gray-50 border-t border-b border-gray-200 px-8 py-5">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                  <path
                                    fillRule="evenodd"
                                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Source Breakdown for "{skill.skill_name}"
                              </h4>

                              {isLoadingBreakdown ? (
                                <div className="flex items-center justify-center py-6">
                                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                  <span className="ml-3 text-sm text-gray-500">Loading...</span>
                                </div>
                              ) : breakdown.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">
                                  No detailed breakdown available.
                                </p>
                              ) : (
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100/70">
                                      <tr>
                                        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Activity
                                        </th>
                                        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Source Type
                                        </th>
                                        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Date
                                        </th>
                                        <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Score
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {breakdown.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50">
                                          <td className="px-5 py-3 text-sm font-medium text-gray-900">
                                            {item.name}
                                          </td>
                                          <td className="px-5 py-3 text-sm">
                                            <span
                                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                item.type === "Assessment"
                                                  ? "bg-blue-100 text-blue-800"
                                                  : "bg-purple-100 text-purple-800"
                                              }`}
                                            >
                                              {item.type}
                                            </span>
                                          </td>
                                          <td className="px-5 py-3 text-sm text-gray-500">
                                            {new Date(item.date).toLocaleDateString("en-US", {
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                            })}
                                          </td>
                                          <td className="px-5 py-3 text-sm text-right font-bold text-gray-900">
                                            {item.score.toFixed(1)}%
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {/* Breakdown Summary Footer */}
                                  <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-between items-center">
                                    <span className="text-xs text-gray-500">
                                      {breakdown.length} source{breakdown.length !== 1 ? "s" : ""}
                                    </span>
                                    <span className="text-sm font-bold text-blue-600">
                                      Accumulated Score: {skillPct.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Table Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {displaySkills.length} skill{displaySkills.length !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-gray-400">Click &quot;View&quot; to see assessment &amp; assignment breakdown</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
