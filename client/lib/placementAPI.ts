/**
 * Types for Placement Module
 */

export type AdmissionStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "FULL_PAYMENT_VERIFIED"
  | "INSTALLMENT_VERIFIED"
  | "INSTALLMENT_PENDING"
  | "DISABLED";

export type SkillLevel =
  | "NOT_ACQUIRED"
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED";

export interface StudentSkill {
  skill_name: string;
  level?: SkillLevel;
  mastery_level?: SkillLevel; // Backend sends this for placement lists
  percentage?: number;
  percentage_score?: number; // Backend sends this
  last_updated?: string;
}

export interface Skill {
  id: number;
  name: string;
  description: string;
}

export interface VerifiedStudent {
  student_profile_id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  centre: string;
  centre_code: string;
  interested_courses: string;
  study_mode?: string;
  admission_status: AdmissionStatus;
  created_at: string;
  updated_at: string;
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
 * Placement List Types
 */
export interface PlacementList {
  id: number;
  name: string;
  description: string;
  placement_link?: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  student_count: number;
}

export interface StudentDetailInList {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  skills: StudentSkill[];
  admission_status: AdmissionStatus;
}

export interface PlacementListStudent {
  id: number;
  student: number;
  student_details: StudentDetailInList;
  notes: string;
  added_by: number;
  added_by_name: string;
  added_at: string;
  is_active: boolean;
}

export interface PlacementListDetail extends PlacementList {
  students: PlacementListStudent[];
}

export interface CreatePlacementListData {
  name: string;
  description?: string;
  placement_link?: string;
}

export interface AddStudentToListData {
  student_id: number;
  notes?: string;
}

export interface StudentPlacementLink {
  id: number;
  placement_list: number;
  placement_list_name: string;
  placement_list_description: string;
  placement_link: string;
  sent_at: string;
}

/**
 * Placement API Client
 */
export class PlacementAPI {
  private baseURL: string;
  private placementBaseURL: string;

  constructor() {
    const apiBaseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    this.baseURL = `${apiBaseURL}/public/student/placement`;
    this.placementBaseURL = `${apiBaseURL}/placement`;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    useBaseURL: boolean = true,
  ): Promise<T> {
    const token = localStorage.getItem("access_token");
    const url = useBaseURL
      ? `${this.baseURL}${endpoint}`
      : `${this.placementBaseURL}${endpoint}`;

    console.log(`API Request: ${options?.method || "GET"} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    console.log(`API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: "An error occurred",
      }));
      throw new Error(error.detail || error.error || "Request failed");
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    // Check if response has content before parsing JSON
    const text = await response.text();
    if (!text || text.trim() === "") {
      console.log(
        "Empty response, returning empty array for GET or undefined for DELETE",
      );
      return (options?.method === "DELETE" ? undefined : []) as T;
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON:", text);
      throw new Error("Invalid JSON response from server");
    }
  }

  /**
   * Get all verified students (approved by finance admin)
   * Returns students with FULL_PAYMENT_VERIFIED or INSTALLMENT_VERIFIED status
   */
  async getVerifiedStudents(): Promise<VerifiedStudent[]> {
    return this.request<VerifiedStudent[]>(`/students/`);
  }

  /**
   * Get students with their skills, batch, and course information
   * @param skillName - Optional skill name to filter by
   * @param minMastery - Optional minimum mastery level (NOT_ACQUIRED, BEGINNER, INTERMEDIATE, ADVANCED)
   */
  async getStudentsWithSkills(
    skillName?: string,
    minMastery?: SkillLevel,
  ): Promise<StudentsWithSkillsResponse> {
    const params = new URLSearchParams();
    if (skillName) params.append("skill_name", skillName);
    if (minMastery) params.append("min_mastery", minMastery);

    const queryString = params.toString();
    const endpoint = queryString ? `/students/?${queryString}` : "/students/";

    return this.request<StudentsWithSkillsResponse>(endpoint);
  }

  /**
   * Get all available skills for filtering
   */
  async getAvailableSkills(): Promise<AvailableSkillsResponse> {
    return this.request<AvailableSkillsResponse>("/students/available-skills/");
  }

  /**
   * Get all placement lists
   */
  async getPlacementLists(): Promise<PlacementList[]> {
    return this.request<PlacementList[]>("/lists/", {}, false);
  }

  /**
   * Get a specific placement list with all students
   */
  async getPlacementListDetail(listId: number): Promise<PlacementListDetail> {
    return this.request<PlacementListDetail>(`/lists/${listId}/`, {}, false);
  }

  /**
   * Create a new placement list
   */
  async createPlacementList(
    data: CreatePlacementListData,
  ): Promise<PlacementList> {
    return this.request<PlacementList>(
      "/lists/",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      false,
    );
  }

  /**
   * Update a placement list
   */
  async updatePlacementList(
    listId: number,
    data: Partial<CreatePlacementListData>,
  ): Promise<PlacementList> {
    return this.request<PlacementList>(
      `/lists/${listId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      false,
    );
  }

  /**
   * Delete a placement list
   */
  async deletePlacementList(listId: number): Promise<void> {
    return this.request<void>(
      `/lists/${listId}/`,
      {
        method: "DELETE",
      },
      false,
    );
  }

  /**
   * Add a student to a placement list
   */
  async addStudentToList(
    listId: number,
    data: AddStudentToListData,
  ): Promise<{ message: string; data: PlacementListStudent }> {
    return this.request<{ message: string; data: PlacementListStudent }>(
      `/lists/${listId}/add-student/`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      false,
    );
  }

  /**
   * Remove a student from a placement list
   */
  async removeStudentFromList(
    listId: number,
    studentId: number,
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/lists/${listId}/remove-student/`,
      {
        method: "POST",
        body: JSON.stringify({ student_id: studentId }),
      },
      false,
    );
  }

  /**
   * Send registration links to all students in a placement list
   */
  async sendRegistrationLink(
    listId: number,
  ): Promise<{
    message: string;
    created: number;
    skipped: number;
    total_students: number;
  }> {
    return this.request<{
      message: string;
      created: number;
      skipped: number;
      total_students: number;
    }>(
      `/lists/${listId}/send-registration-link/`,
      {
        method: "POST",
      },
      false,
    );
  }

  /**
   * Get all placement links for logged-in student
   */
  async getStudentPlacementLinks(): Promise<StudentPlacementLink[]> {
    return this.request<StudentPlacementLink[]>(
      `/student-links/`,
      undefined,
      false,
    );
  }
}

export const placementAPI = new PlacementAPI();
