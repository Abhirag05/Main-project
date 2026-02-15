"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/lib/toast";
import {
  placementAPI,
  PlacementListDetail,
  PlacementListStudent,
} from "@/lib/placementAPI";
import {
  studentProgressAPI,
  StudentWithSkills,
  Skill,
  SkillLevel,
} from "@/lib/studentProgressAPI";
import { isAdminRole } from "@/lib/roles";

/* ── helpers ── */
function getMasteryColor(level: string) {
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
}

function getMasteryLabel(level: string) {
  if (!level) return "N/A";
  return level.charAt(0) + level.slice(1).toLowerCase().replace("_", " ");
}

function normalizeLevel(level: string | null | undefined) {
  if (!level) return "";
  return level.toString().trim().toUpperCase().replace(/\s+/g, "_");
}

export default function PlacementListDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const listId = Number(params.id);

  const [user, setUser] = useState<{ role: { code: string } } | null>(null);
  const [detail, setDetail] = useState<PlacementListDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Assign students modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<StudentWithSkills[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [filterSkill, setFilterSkill] = useState("");
  const [filterLevel, setFilterLevel] = useState<SkillLevel | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(
    new Set()
  );
  const [isAdding, setIsAdding] = useState(false);

  // Edit link modal
  const [isEditLinkOpen, setIsEditLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [isSavingLink, setIsSavingLink] = useState(false);

  // Send link state
  const [isSendingLink, setIsSendingLink] = useState(false);

  // Remove student
  const [removingStudentId, setRemovingStudentId] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        setUser(u);
        if (!isAdminRole(u.role.code)) router.push("/dashboards");
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    if (user && isAdminRole(user.role.code) && listId) fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, listId]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const data = await placementAPI.getPlacementListDetail(listId);
      setDetail(data);
    } catch (err: any) {
      toast.show("error", err.message || "Failed to load placement list");
    } finally {
      setLoading(false);
    }
  };

  /* ── Assign students ── */
  const openAssignModal = async () => {
    setIsAssignOpen(true);
    setSelectedStudentIds(new Set());
    setFilterSkill("");
    setFilterLevel("");
    setSearchQuery("");

    if (allStudents.length === 0) {
      setLoadingStudents(true);
      try {
        const [studentsData, skillsData] = await Promise.all([
          studentProgressAPI.getStudentsWithSkills(),
          studentProgressAPI.getAvailableSkills(),
        ]);
        setAllStudents(studentsData.results || []);
        const unique = (skillsData.skills || []).reduce(
          (acc: Skill[], s) => {
            if (!acc.find((x) => x.name === s.name)) acc.push(s);
            return acc;
          },
          []
        );
        setAvailableSkills(unique);
      } catch (err: any) {
        toast.show("error", err.message || "Failed to load students");
      } finally {
        setLoadingStudents(false);
      }
    }
  };

  // Students already in this list
  const assignedStudentIds = new Set(
    detail?.students
      .filter((s) => s.is_active)
      .map((s) => s.student_details?.id || s.student) || []
  );

  // Filter available students (not already assigned)
  const filteredStudents = allStudents.filter((student) => {
    // Exclude already-assigned
    if (assignedStudentIds.has(student.student_profile_id)) return false;

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        student.full_name?.toLowerCase().includes(q) ||
        student.email?.toLowerCase().includes(q) ||
        student.course_name?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Skill filter
    if (filterSkill) {
      const ss = student.skills.find((s) => s.skill_name === filterSkill);
      if (!ss) return false;
      if (filterLevel) {
        const lvl = ss.mastery_level || ss.level || "";
        if (normalizeLevel(lvl) !== normalizeLevel(filterLevel)) return false;
      }
    }

    return true;
  });

  const toggleStudent = (id: number) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(
        new Set(filteredStudents.map((s) => s.student_profile_id))
      );
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudentIds.size === 0) return;
    setIsAdding(true);
    let successCount = 0;
    let failCount = 0;

    for (const studentId of selectedStudentIds) {
      try {
        await placementAPI.addStudentToList(listId, {
          student_id: studentId,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.show(
        "success",
        `${successCount} student${successCount > 1 ? "s" : ""} added to the list`
      );
    }
    if (failCount > 0) {
      toast.show("error", `Failed to add ${failCount} student(s)`);
    }

    setIsAssignOpen(false);
    setSelectedStudentIds(new Set());
    fetchDetail();
    setIsAdding(false);
  };

  /* ── Remove student ── */
  const handleRemoveStudent = async (studentId: number) => {
    setRemovingStudentId(studentId);
    try {
      await placementAPI.removeStudentFromList(listId, studentId);
      toast.show("success", "Student removed");
      fetchDetail();
    } catch (err: any) {
      toast.show("error", err.message || "Failed to remove student");
    } finally {
      setRemovingStudentId(null);
    }
  };

  /* ── Edit registration link ── */
  const openEditLink = () => {
    setLinkValue(detail?.placement_link || "");
    setIsEditLinkOpen(true);
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLink(true);
    try {
      await placementAPI.updatePlacementList(listId, {
        placement_link: linkValue.trim(),
      });
      toast.show("success", "Registration link updated");
      setIsEditLinkOpen(false);
      fetchDetail();
    } catch (err: any) {
      toast.show("error", err.message || "Failed to update link");
    } finally {
      setIsSavingLink(false);
    }
  };

  /* ── Send registration link ── */
  const handleSendLink = async () => {
    setIsSendingLink(true);
    try {
      const result = await placementAPI.sendRegistrationLink(listId);
      toast.show(
        "success",
        `Registration link sent to ${result.created} student${result.created !== 1 ? "s" : ""}${result.skipped > 0 ? ` (${result.skipped} already had it)` : ""}`
      );
    } catch (err: any) {
      toast.show("error", err.message || "Failed to send registration link");
    } finally {
      setIsSendingLink(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="h-64 bg-gray-50 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!detail) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto text-center py-20">
          <h2 className="text-2xl font-bold text-gray-900">
            Placement list not found
          </h2>
          <button
            onClick={() => router.push("/dashboards/admin/placement/lists")}
            className="mt-4 text-blue-600 hover:underline"
          >
            Back to lists
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const activeStudents = detail.students.filter((s) => s.is_active);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb + back */}
        <button
          onClick={() => router.push("/dashboards/admin/placement/lists")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Placement Lists
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {detail.name}
              </h1>
              {detail.description && (
                <p className="text-gray-600">{detail.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>
                  Created by {detail.created_by_name} on{" "}
                  {new Date(detail.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {activeStudents.length} student
                  {activeStudents.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={openAssignModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Assign Students
              </button>
              <button
                onClick={openEditLink}
                className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                {detail.placement_link ? "Edit Link" : "Add Link"}
              </button>
              {detail.placement_link && activeStudents.length > 0 && (
                <button
                  onClick={handleSendLink}
                  disabled={isSendingLink}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {isSendingLink ? (
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  )}
                  {isSendingLink ? "Sending…" : "Send Link to All"}
                </button>
              )}
            </div>
          </div>

          {/* Registration link display */}
          {detail.placement_link && (
            <div className="mt-4 flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <svg
                className="w-4 h-4 text-green-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <span className="text-green-800 font-medium">
                Registration Link:
              </span>
              <a
                href={detail.placement_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 underline truncate"
              >
                {detail.placement_link}
              </a>
            </div>
          )}
        </div>

        {/* Assigned Students Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Assigned Students
            </h2>
          </div>

          {activeStudents.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No students assigned yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Click &quot;Assign Students&quot; to add students to this
                placement list.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skills
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeStudents.map((entry) => {
                    const s = entry.student_details;
                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                              {s?.full_name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {s?.full_name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {s?.email || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {s?.phone || "—"}
                        </td>
                        <td className="px-6 py-4">
                          {s?.skills && s.skills.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {s.skills.map((skill, idx) => {
                                const level =
                                  skill.mastery_level ||
                                  skill.level ||
                                  "NOT_ACQUIRED";
                                return (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getMasteryColor(level)}`}
                                  >
                                    {skill.skill_name}:{" "}
                                    {getMasteryLabel(level)}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              No skills
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(entry.added_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() =>
                              handleRemoveStudent(
                                s?.id || entry.student
                              )
                            }
                            disabled={
                              removingStudentId ===
                              (s?.id || entry.student)
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {removingStudentId ===
                            (s?.id || entry.student) ? (
                              <svg
                                className="animate-spin h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            )}
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Assign Students Modal ── */}
      {isAssignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex-shrink-0">
              <h2 className="text-lg font-bold text-white">
                Assign Students to {detail.name}
              </h2>
              <p className="text-blue-100 text-sm">
                Filter students by skill and select to add
              </p>
            </div>

            {/* Filters */}
            <div className="px-6 py-4 border-b border-gray-200 space-y-3 flex-shrink-0">
              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
                <input
                  type="text"
                  placeholder="Search by name, email, or course…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                />
              </div>

              {/* Skill + level filters */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Filter by Skill
                  </label>
                  <select
                    value={filterSkill}
                    onChange={(e) => setFilterSkill(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  >
                    <option value="">All Skills</option>
                    {availableSkills.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Minimum Level
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) =>
                      setFilterLevel(e.target.value as SkillLevel | "")
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  >
                    <option value="">Any Level</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>
                  {filteredStudents.length} student
                  {filteredStudents.length !== 1 ? "s" : ""} available ·{" "}
                  {selectedStudentIds.size} selected
                </span>
                {filteredStudents.length > 0 && (
                  <button
                    onClick={toggleAll}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    {selectedStudentIds.size === filteredStudents.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                )}
              </div>
            </div>

            {/* Student list */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {loadingStudents ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                  <p className="mt-3 text-sm text-gray-500">
                    Loading students…
                  </p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm">
                    No available students match the current filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredStudents.map((student) => (
                    <label
                      key={student.student_profile_id}
                      className={`flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                        selectedStudentIds.has(student.student_profile_id)
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.has(
                          student.student_profile_id
                        )}
                        onChange={() =>
                          toggleStudent(student.student_profile_id)
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {student.full_name}
                          </span>
                          {student.course_name && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {student.course_name}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {student.email}
                        </div>
                        {student.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {student.skills.map((skill, i) => {
                              const level =
                                skill.mastery_level ||
                                skill.level ||
                                "NOT_ACQUIRED";
                              return (
                                <span
                                  key={i}
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getMasteryColor(level)}`}
                                >
                                  {skill.skill_name}:{" "}
                                  {getMasteryLabel(level)}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsAssignOpen(false)}
                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isAdding}
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudents}
                disabled={selectedStudentIds.size === 0 || isAdding}
                className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isAdding && (
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {isAdding
                  ? "Adding…"
                  : `Add ${selectedStudentIds.size} Student${selectedStudentIds.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Link Modal ── */}
      {isEditLinkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white">
                Registration Link
              </h2>
              <p className="text-green-100 text-sm">
                Set or update the placement drive registration URL
              </p>
            </div>
            <form onSubmit={handleSaveLink} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Registration URL
                </label>
                <input
                  type="url"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500 hover:border-gray-400 transition-all text-gray-900"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder="https://..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  This link will be shared with all students when you click
                  &quot;Send Link to All&quot;.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsEditLinkOpen(false)}
                  className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSavingLink}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  disabled={isSavingLink}
                >
                  {isSavingLink && (
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {isSavingLink ? "Saving…" : "Save Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
