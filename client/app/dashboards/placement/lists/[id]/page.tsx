"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/components/dashboard/hooks/useAuth";
import {
  placementAPI,
  PlacementListDetail,
  StudentWithSkills,
  AddStudentToListData,
} from "@/lib/placementAPI";
import { useToast } from "@/lib/toast";

export default function PlacementListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = Number(params.id);
  const { user, isLoading: authLoading } = useAuth();

  const [list, setList] = useState<PlacementListDetail | null>(null);
  const [availableStudents, setAvailableStudents] = useState<
    StudentWithSkills[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentNotes, setStudentNotes] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilters, setSkillFilters] = useState<
    { skill: string; level: string }[]
  >([]);
  const [filterSkill, setFilterSkill] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<string>("");
  const [selectedMultipleStudents, setSelectedMultipleStudents] = useState<
    number[]
  >([]);
  const [isSendingLinks, setIsSendingLinks] = useState(false);

  const toast = useToast();

  // Fetch list details
  const fetchList = async () => {
    try {
      setIsLoading(true);
      const data = await placementAPI.getPlacementListDetail(listId);
      setList(data);
    } catch (error: any) {
      toast.show("error", error.message || "Failed to load placement list");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available students
  const fetchAvailableStudents = async () => {
    try {
      const data = await placementAPI.getStudentsWithSkills();
      setAvailableStudents(data.results);
    } catch (error: any) {
      console.error("Failed to load students:", error);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchList();
      fetchAvailableStudents();
    }
  }, [authLoading, user, listId]);

  // Get unique skills from all available students
  const allSkills = Array.from(
    new Set(
      availableStudents.flatMap((student) =>
        student.skills.map((skill) => skill.skill_name),
      ),
    ),
  ).sort();

  // Add multiple students to list
  const handleAddStudents = async () => {
    if (selectedMultipleStudents.length === 0) {
      toast.show("error", "Please select at least one student");
      return;
    }

    try {
      setIsAdding(true);
      let successCount = 0;

      for (const studentId of selectedMultipleStudents) {
        try {
          const data: AddStudentToListData = {
            student_id: studentId,
            notes: studentNotes.trim(),
          };
          await placementAPI.addStudentToList(listId, data);
          successCount++;
        } catch (error) {
          // Continue adding other students even if one fails
          console.error(`Failed to add student ${studentId}:`, error);
        }
      }

      toast.show(
        "success",
        `${successCount} student(s) added to list successfully`,
      );
      setShowAddModal(false);
      setSelectedMultipleStudents([]);
      setStudentNotes("");
      fetchList();
    } catch (error: any) {
      toast.show("error", error.message || "Failed to add students");
    } finally {
      setIsAdding(false);
    }
  };

  // Remove student from list
  const handleRemoveStudent = async (
    studentId: number,
    studentName: string,
  ) => {
    if (!confirm(`Remove ${studentName} from this list?`)) {
      return;
    }

    try {
      await placementAPI.removeStudentFromList(listId, studentId);
      toast.show("success", "Student removed from list");
      fetchList();
    } catch (error: any) {
      toast.show("error", error.message || "Failed to remove student");
    }
  };

  // Send registration link to all students
  const handleSendRegistrationLink = async () => {
    if (!list?.placement_link) {
      toast.show("error", "This list does not have a registration link set");
      return;
    }

    if (list.student_count === 0) {
      toast.show("error", "Add students to the list before sending links");
      return;
    }

    if (
      !confirm(`Send registration link to ${list.student_count} student(s)?`)
    ) {
      return;
    }

    try {
      setIsSendingLinks(true);
      const result = await placementAPI.sendRegistrationLink(listId);
      toast.show(
        "success",
        `Registration links sent to ${result.created} student(s)`,
      );
    } catch (error: any) {
      toast.show("error", error.message || "Failed to send registration links");
    } finally {
      setIsSendingLinks(false);
    }
  };

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

  // Filter students already in list
  const studentsNotInList = availableStudents.filter(
    (student) =>
      !list?.students.some((s) => s.student === student.student_profile_id),
  );

  // Filter for search and skills
  const filteredAvailableStudents = studentsNotInList.filter((student) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !student.full_name.toLowerCase().includes(query) &&
        !student.email.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Skill filters
    if (skillFilters.length > 0) {
      const matchesAny = skillFilters.some((filter) => {
        const studentSkill = student.skills.find(
          (s) => s.skill_name === filter.skill,
        );
        if (!studentSkill) return false;
        const level = studentSkill.mastery_level || studentSkill.level || "";
        return matchesExactLevel(level, filter.level);
      });
      if (!matchesAny) return false;
    }

    return true;
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading list details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!list) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-gray-600">List not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <button
              onClick={() => router.push("/dashboards/placement/lists")}
              className="text-blue-600 hover:text-blue-700 mb-2 flex items-center text-sm"
            >
              <svg
                className="h-4 w-4 mr-1"
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
              Back to Lists
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{list.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {list.description || "No description"}
            </p>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>
                {list.student_count}{" "}
                {list.student_count === 1 ? "student" : "students"}
              </span>
              <span>•</span>
              <span>
                Created {new Date(list.created_at).toLocaleDateString()}
              </span>
              <span>•</span>
              <span>By {list.created_by_name}</span>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Student
          </button>
          {list.placement_link && list.student_count > 0 && (
            <button
              onClick={handleSendRegistrationLink}
              disabled={isSendingLinks}
              className="inline-flex items-center px-4 py-2 mx-5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              title="Send registration link to all students in this list"
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              {isSendingLinks ? "Sending..." : "Send Registration Link"}
            </button>
          )}
        </div>

        {/* Students Table */}
        {list.students.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No students yet
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Add students to this placement list
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Student
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skills
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {list.students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {student.student_details.full_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {student.student_details.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.student_details.phone || "No phone"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {student.student_details.skills.length > 0 ? (
                            student.student_details.skills
                              .slice(0, 3)
                              .map((skill, idx) => {
                                const level =
                                  skill.mastery_level || skill.level || "";
                                const percentage =
                                  skill.percentage ||
                                  skill.percentage_score ||
                                  0;
                                return (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getMasteryColor(level)}`}
                                    title={`${skill.skill_name}: ${percentage}%`}
                                  >
                                    {skill.skill_name}: {getMasteryLabel(level)}
                                  </span>
                                );
                              })
                          ) : (
                            <span className="text-sm text-gray-500">
                              No skills
                            </span>
                          )}
                          {student.student_details.skills.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{student.student_details.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {student.notes || "No notes"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          {new Date(student.added_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs">
                          by {student.added_by_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() =>
                            handleRemoveStudent(
                              student.student,
                              student.student_details.full_name,
                            )
                          }
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Student Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Add Student to List
              </h2>

              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students by name or email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Skill Filters */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Add Skill Filter
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={filterSkill}
                      onChange={(e) => setFilterSkill(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="">Select skill</option>
                      {allSkills.map((skill) => (
                        <option key={skill} value={skill}>
                          {skill}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!filterSkill) return;
                        const normalizedLevel = normalizeLevel(filterLevel);
                        setSkillFilters((prev) => {
                          const existingIndex = prev.findIndex(
                            (f) => f.skill === filterSkill,
                          );
                          if (existingIndex >= 0) {
                            const updated = [...prev];
                            updated[existingIndex] = {
                              skill: filterSkill,
                              level: normalizedLevel,
                            };
                            return updated;
                          }
                          return [
                            ...prev,
                            { skill: filterSkill, level: normalizedLevel },
                          ];
                        });
                        setFilterSkill("");
                        setFilterLevel("");
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      disabled={!filterSkill}
                    >
                      Add
                    </button>
                  </div>
                  {allSkills.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No skills available
                    </p>
                  )}
                </div>

                {/* Skill Level Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mastery Level
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="">Any level</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Active Filters Display */}
              {skillFilters.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-blue-900 mb-2">
                    Active Filters:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skillFilters.map((filter) => (
                      <span
                        key={`${filter.skill}-${filter.level}`}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {filter.skill}
                        {filter.level
                          ? ` • ${getMasteryLabel(filter.level)}`
                          : ""}
                        <button
                          onClick={() =>
                            setSkillFilters((prev) =>
                              prev.filter((f) => f.skill !== filter.skill),
                            )
                          }
                          className="ml-1 hover:text-blue-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSkillFilters([])}
                      className="text-xs text-blue-700 hover:text-blue-800 underline"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              )}

              {/* Student List */}
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {filteredAvailableStudents.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {studentsNotInList.length === 0
                      ? "All students have been added to this list"
                      : "No students found"}
                  </p>
                ) : (
                  <>
                    <div className="text-xs text-gray-600 font-medium mb-2 sticky top-0 bg-white">
                      {selectedMultipleStudents.length} student(s) selected
                    </div>
                    {filteredAvailableStudents.map((student) => (
                      <label
                        key={student.student_profile_id}
                        className="flex items-start p-2 border border-gray-200 rounded hover:bg-blue-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMultipleStudents.includes(
                            student.student_profile_id,
                          )}
                          onChange={() => {
                            setSelectedMultipleStudents((prev) =>
                              prev.includes(student.student_profile_id)
                                ? prev.filter(
                                    (id) => id !== student.student_profile_id,
                                  )
                                : [...prev, student.student_profile_id],
                            );
                          }}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {student.full_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {student.email}
                          </div>
                          {student.skills.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {student.skills.slice(0, 3).map((skill, idx) => {
                                const level =
                                  skill.mastery_level || skill.level || "";
                                return (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${getMasteryColor(level)}`}
                                  >
                                    {skill.skill_name}: {getMasteryLabel(level)}
                                  </span>
                                );
                              })}
                              {student.skills.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{student.skills.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </>
                )}
              </div>

              {/* Notes */}
              {selectedMultipleStudents.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={studentNotes}
                    onChange={(e) => setStudentNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Add notes about this student..."
                    rows={3}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedMultipleStudents([]);
                    setStudentNotes("");
                    setSearchQuery("");
                    setSkillFilters([]);
                    setFilterSkill("");
                    setFilterLevel("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isAdding}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStudents}
                  disabled={isAdding || selectedMultipleStudents.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isAdding
                    ? "Adding..."
                    : `Add ${selectedMultipleStudents.length} Student(s)`}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
