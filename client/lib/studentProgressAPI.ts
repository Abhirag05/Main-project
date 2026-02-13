/**
 * Student Progress API
 *
 * Provides access to student skill data and progress tracking.
 * Reuses existing StudentSkill computation from the assessments module.
 */

export type SkillLevel =
  | "NOT_ACQUIRED"
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED";

export interface StudentSkill {
  skill_name: string;
  level?: SkillLevel;
  mastery_level?: SkillLevel;
  percentage_score?: number;
  last_updated?: string;
}

export interface Skill {
  id: number;
  name: string;
  description: string;
}

export interface StudentWithSkills {
  student_profile_id: number;
  full_name: string;
  email: string;
  phone_number: string | null;
  centre_name?: string | null;
  centre_code?: string | null;
  study_mode: string;
  batch_id: number | null;
  batch_name: string | null;
  batch_code: string | null;
  course_id: number | null;
  course_name: string | null;
  course_code: string | null;
  skills: StudentSkill[];
}

export interface StudentsWithSkillsResponse {
  count: number;
  results: StudentWithSkills[];
}

export interface AvailableSkillsResponse {
  count: number;
  skills: Skill[];
}

/**
 * Student Progress API Client
 */
class StudentProgressAPI {
  private baseURL: string;

  constructor() {
    const apiBaseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    this.baseURL = `${apiBaseURL}/public/student/student-progress`;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem("access_token");
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: "An error occurred",
      }));
      throw new Error(error.detail || error.error || "Request failed");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
      return [] as T;
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response from server");
    }
  }

  /**
   * Get students with their skills, batch, and course information
   */
  async getStudentsWithSkills(
    skillName?: string,
    minMastery?: SkillLevel,
  ): Promise<StudentsWithSkillsResponse> {
    const params = new URLSearchParams();
    if (skillName) params.append("skill_name", skillName);
    if (minMastery) params.append("min_mastery", minMastery);

    const queryString = params.toString();
    const endpoint = queryString ? `/?${queryString}` : "/";

    return this.request<StudentsWithSkillsResponse>(endpoint);
  }

  /**
   * Get all available skills for filtering
   */
  async getAvailableSkills(): Promise<AvailableSkillsResponse> {
    return this.request<AvailableSkillsResponse>("/available-skills/");
  }
}

export const studentProgressAPI = new StudentProgressAPI();
