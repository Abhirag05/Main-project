// Assignment API Client for Faculty and Student

// Construct API base URL - handle both with and without /api suffix
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = BASE_URL.endsWith("/api") 
  ? `${BASE_URL}/assignments` 
  : `${BASE_URL}/api/assignments`;

// ============================================================
// TYPES
// ============================================================

export interface Skill {
  id: number;
  name: string;
  description?: string;
}

export interface Assignment {
  id: number;
  batch: number;
  batch_name: string;
  module: number;
  module_name: string;
  faculty: number;
  faculty_name: string;
  title: string;
  description: string;
  assignment_file?: string;
  assignment_file_url?: string;
  has_file?: boolean;
  max_marks: string;
  start_date?: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_overdue: boolean;
  total_submissions?: number;
  evaluated_submissions?: number;
  pending_evaluations?: number;
  my_submission?: StudentSubmissionInfo;
  skills?: Skill[];
}

export interface StudentSubmissionInfo {
  id: number;
  submitted_at: string;
  marks_obtained?: string;
  feedback?: string;
  is_evaluated: boolean;
  is_late_submission: boolean;
}

export interface AssignmentSubmission {
  id: number;
  assignment: number;
  assignment_title?: string;
  module_name?: string;
  student: number;
  student_name?: string;
  student_roll_number?: string;
  student_email?: string;
  subject_name?: string;
  assignment_max_marks?: string;
  submission_file: string;
  submitted_at: string;
  updated_at: string;
  marks_obtained?: string;
  feedback?: string;
  evaluated_at?: string;
  evaluated_by?: number;
  evaluated_by_name?: string;
  is_evaluated: boolean;
  is_late_submission: boolean;
}

export interface AssignmentStatistics {
  assignment_id: number;
  assignment_title: string;
  max_marks: string;
  total_students: number;
  total_submissions: number;
  evaluated_submissions: number;
  pending_evaluations: number;
  not_submitted: number;
  submission_rate: number;
  average_marks?: number;
}

export interface CreateAssignmentData {
  batch: number;
  module: number;
  title: string;
  description: string;
  assignment_file?: File;
  max_marks: number;
  start_date: string;
  due_date: string;
  is_active: boolean;
  skill_ids?: number[];
}

export interface EvaluateSubmissionData {
  marks_obtained: number;
  feedback: string;
}

// ============================================================
// API CLIENT
// ============================================================

class AssignmentAPIClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  }

  private getHeaders(includeContentType: boolean = true): HeadersInit {
    const token = this.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    if (includeContentType) {
      headers["Content-Type"] = "application/json";
    }
    
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Session expired. Please log in again.");
      }
      
      const errorData = await response.json().catch(() => ({}));
      
      // Handle different error response formats
      let errorMessage = `Request failed with status ${response.status}`;
      
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (typeof errorData === 'object') {
        // If it's an object with field errors (like from serializer validation)
        const fieldErrors = Object.entries(errorData)
          .map(([key, value]: [string, any]) => {
            if (Array.isArray(value)) {
              return `${key}: ${value.join(', ')}`;
            }
            return `${key}: ${value}`;
          })
          .join('; ');
        if (fieldErrors) {
          errorMessage = fieldErrors;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  }

  // ============================================================
  // FACULTY ENDPOINTS
  // ============================================================

  /**
   * Create a new assignment
   */
  async createAssignment(data: CreateAssignmentData): Promise<Assignment> {
    const formData = new FormData();
    formData.append("batch", data.batch.toString());
    formData.append("module", data.module.toString());
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("max_marks", data.max_marks.toString());
    formData.append("start_date", data.start_date);
    formData.append("due_date", data.due_date);
    formData.append("is_active", data.is_active.toString());
    
    if (data.assignment_file) {
      formData.append("assignment_file", data.assignment_file);
    }

    // Add skill IDs as separate form fields
    if (data.skill_ids && data.skill_ids.length > 0) {
      data.skill_ids.forEach((skillId) => {
        formData.append("skill_ids", skillId.toString());
      });
    }

    const response = await fetch(
      `${API_BASE}/faculty/assignments/`,
      {
        method: "POST",
        headers: this.getHeaders(false), // Don't set Content-Type for FormData
        body: formData,
      }
    );

    return this.handleResponse<Assignment>(response);
  }

  /**
   * Get all assignments created by faculty
   */
  async getFacultyAssignments(): Promise<Assignment[]> {
    const response = await fetch(
      `${API_BASE}/faculty/assignments/`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    return this.handleResponse<Assignment[]>(response);
  }

  /**
   * Get assignment details
   */
  async getAssignmentDetail(id: number): Promise<Assignment> {
    const response = await fetch(
      `${API_BASE}/faculty/assignments/${id}/`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    return this.handleResponse<Assignment>(response);
  }

  /**
   * Update assignment
   */
  async updateAssignment(
    id: number,
    data: Partial<CreateAssignmentData>
  ): Promise<Assignment> {
    const formData = new FormData();
    
    if (data.batch) formData.append("batch", data.batch.toString());
    if (data.module) formData.append("module", data.module.toString());
    if (data.title) formData.append("title", data.title);
    if (data.description) formData.append("description", data.description);
    if (data.max_marks) formData.append("max_marks", data.max_marks.toString());
    if (data.start_date) formData.append("start_date", data.start_date);
    if (data.due_date) formData.append("due_date", data.due_date);
    if (data.is_active !== undefined) formData.append("is_active", data.is_active.toString());
    if (data.assignment_file) formData.append("assignment_file", data.assignment_file);
    
    // Add skill IDs as separate form fields
    if (data.skill_ids && data.skill_ids.length > 0) {
      data.skill_ids.forEach((skillId) => {
        formData.append("skill_ids", skillId.toString());
      });
    }

    const response = await fetch(
      `${API_BASE}/faculty/assignments/${id}/`,
      {
        method: "PATCH",
        headers: this.getHeaders(false),
        body: formData,
      }
    );

    return this.handleResponse<Assignment>(response);
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(id: number): Promise<void> {
    const response = await fetch(
      `${API_BASE}/faculty/assignments/${id}/`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete assignment");
    }
  }

  /**
   * Get submissions for an assignment
   */
  async getAssignmentSubmissions(
    assignmentId: number,
    evaluated?: boolean
  ): Promise<{ assignment: any; total_submissions: number; submissions: AssignmentSubmission[] }> {
    let url = `${API_BASE}/faculty/assignments/${assignmentId}/submissions/`;
    
    if (evaluated !== undefined) {
      url += `?evaluated=${evaluated}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStatistics(assignmentId: number): Promise<AssignmentStatistics> {
    const response = await fetch(
      `${API_BASE}/faculty/assignments/${assignmentId}/statistics/`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    return this.handleResponse<AssignmentStatistics>(response);
  }

  /**
   * Evaluate a submission
   */
  async evaluateSubmission(
    submissionId: number,
    data: EvaluateSubmissionData
  ): Promise<{ message: string; submission: any }> {
    const response = await fetch(
      `${API_BASE}/faculty/submissions/${submissionId}/evaluate/`,
      {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      }
    );

    return this.handleResponse(response);
  }

  // ============================================================
  // STUDENT ENDPOINTS
  // ============================================================

  /**
   * Get all assignments for student's batch
   */
  async getStudentAssignments(filters?: {
    subject?: number;
    status?: "pending" | "submitted" | "overdue";
  }): Promise<Assignment[]> {
    let url = `${API_BASE}/student/assignments/`;
    
    const params = new URLSearchParams();
    if (filters?.subject) params.append("subject", filters.subject.toString());
    if (filters?.status) params.append("status", filters.status);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    return this.handleResponse<Assignment[]>(response);
  }

  /**
   * Submit an assignment
   */
  async submitAssignment(
    assignmentId: number,
    file: File
  ): Promise<{ message: string; submission: any }> {
    const formData = new FormData();
    formData.append("submission_file", file);

    const response = await fetch(
      `${API_BASE}/student/assignments/${assignmentId}/submit/`,
      {
        method: "POST",
        headers: this.getHeaders(false),
        body: formData,
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Get student's submissions
   */
  async getStudentSubmissions(filters?: {
    evaluated?: boolean;
    module?: number;
  }): Promise<AssignmentSubmission[]> {
    let url = `${API_BASE}/student/submissions/`;
    
    const params = new URLSearchParams();
    if (filters?.evaluated !== undefined) params.append("evaluated", filters.evaluated.toString());
    if (filters?.module) params.append("module", filters.module.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    return this.handleResponse<AssignmentSubmission[]>(response);
  }

  /**
   * Get submission detail
   */
  async getSubmissionDetail(submissionId: number): Promise<AssignmentSubmission> {
    const response = await fetch(
      `${API_BASE}/student/submissions/${submissionId}/`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    return this.handleResponse<AssignmentSubmission>(response);
  }

  /**
   * Get available skills for a batch
   */
  async getBatchSkills(batchId: number): Promise<Skill[]> {
    const response = await fetch(
      `${API_BASE}/faculty/batches/${batchId}/skills/`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    return this.handleResponse<Skill[]>(response);
  }
}

export const assignmentAPIClient = new AssignmentAPIClient();
