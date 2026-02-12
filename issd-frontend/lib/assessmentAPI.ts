/**
 * Assessment API types and client for Faculty Assessments Module
 * This module handles MCQ-based assessments created by faculty
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ==================== TYPES ====================

export type AssessmentStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "COMPLETED";

export interface Skill {
  id: number;
  name: string;
  level?: string;
}

export interface StudentSkill {
  id: number;
  skill: number;
  skill_name: string;
  course_name: string;
  percentage_score: number;
  level: string;
  attempts_count: number;
  last_updated: string;
}

export interface StudentSkillsResponse {
  summary: {
    total_skills: number;
    by_level: Record<string, number>;
  };
  skills: StudentSkill[];
}

export interface AssessmentBatch {
  id: number;
  code: string;
  course_name: string;
  centre_name: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export interface AssessmentSubject {
  id: number;
  code: string;
  name: string;
}

export interface Assessment {
  id: number;
  title: string;
  batch: AssessmentBatch;
  subject: AssessmentSubject;
  total_marks: number;
  duration_minutes: number;
  skills: Skill[];
  start_datetime: string;
  end_datetime: string;
  status: AssessmentStatus;
  created_at: string;
  updated_at: string;
  questions_count: number;
  faculty: {
    id: number;
    full_name: string;
    email: string;
  };
}

export interface CreateAssessmentRequest {
  title: string;
  batch: number;
  subject: number;
  total_marks: number;
  duration_minutes: number;
  skill_ids: number[];
  start_time: string;
  end_time: string;
}

export interface UpdateAssessmentRequest extends Partial<CreateAssessmentRequest> {}

export interface QuestionOption {
  id?: number;
  option_text: string;
  option_label: "A" | "B" | "C" | "D";
  is_correct: boolean;
}

export interface Question {
  id: number;
  assessment_id: number;
  question_text: string;
  options: QuestionOption[];
  marks: number;
  order: number;
}

export interface CreateQuestionRequest {
  question_text: string;
  options: Omit<QuestionOption, "id">[];
  marks: number;
}

export interface UpdateQuestionRequest extends Partial<CreateQuestionRequest> {}

export interface StudentResult {
  id: number;
  student: {
    id: number;
    full_name: string;
    email: string;
  };
  assessment: {
    id: number;
    title: string;
    total_marks: number;
  };
  score: number;
  percentage: number;
  status: "PASS" | "FAIL" | "PENDING";
  skill_impacts: {
    skill_name: string;
    previous_level: string;
    new_level: string;
  }[];
  submitted_at: string;
}

export interface StudentAnswerDetail {
  question_id: number;
  question_text: string;
  selected_option: string | null;
  correct_option: string;
  is_correct: boolean;
  marks_obtained: number;
  max_marks: number;
}

export interface StudentResultDetail extends StudentResult {
  answers: StudentAnswerDetail[];
}

// Batch and Module for dropdowns
export interface FacultyBatchOption {
  id: number;
  code: string;
  course_id: number;
  course_name: string;
  status: string;
}

export interface BatchModuleOption {
  id: number;
  code: string;
  name: string;
}

export interface CourseSkill {
  id: number;
  name: string;
  description?: string;
}

// ==================== API CLIENT ====================

class AssessmentApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private getAuthHeaders(): HeadersInit {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();

    let data: unknown = null;
    if (rawText) {
      if (contentType.includes("application/json")) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = { message: rawText };
        }
      } else {
        data = { message: rawText };
      }
    }

    if (!response.ok) {
      const errorObj =
        (data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {}) ?? {};
      console.error("API Error Response:", errorObj);

      const message =
        (errorObj["message"] as string) ||
        (errorObj["detail"] as string) ||
        (errorObj["error"] as string);

      if (!message && Object.keys(errorObj).length) {
        const errorMessages = Object.entries(errorObj)
          .map(
            ([field, msgs]) =>
              `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`,
          )
          .join("; ");
        throw new Error(errorMessages || "Validation error");
      }

      throw new Error(
        message ||
          `HTTP error! status: ${response.status} ${response.statusText}`,
      );
    }

    if (!rawText) {
      return {} as T;
    }
    return (data as T) ?? ({} as T);
  }

  // ==================== ASSESSMENT CRUD ====================

  /**
   * Get all assessments for the logged-in faculty
   * GET /api/faculty/assessments/
   */
  async getAssessments(filters?: {
    batch_id?: number;
    status?: AssessmentStatus;
  }): Promise<Assessment[]> {
    const params = new URLSearchParams();
    if (filters?.batch_id)
      params.append("batch_id", filters.batch_id.toString());
    if (filters?.status) params.append("status", filters.status);

    const url = `${this.baseURL}/faculty/assessments/${params.toString() ? "?" + params.toString() : ""}`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * Get single assessment by ID
   * GET /api/faculty/assessments/{id}/
   */
  async getAssessment(id: number): Promise<Assessment> {
    const response = await fetch(`${this.baseURL}/faculty/assessments/${id}/`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * Get logged-in student's skills
   * GET /api/student/my-skills/
   */
  async getStudentSkills(): Promise<StudentSkillsResponse> {
    const response = await fetch(`${this.baseURL}/student/my-skills/`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * Create a new assessment
   * POST /api/faculty/assessments/
   */
  async createAssessment(data: CreateAssessmentRequest): Promise<Assessment> {
    const response = await fetch(`${this.baseURL}/faculty/assessments/`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  /**
   * Update an assessment (only if status is DRAFT)
   * PATCH /api/faculty/assessments/{id}/
   */
  async updateAssessment(
    id: number,
    data: UpdateAssessmentRequest,
  ): Promise<Assessment> {
    const response = await fetch(`${this.baseURL}/faculty/assessments/${id}/`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  /**
   * Delete an assessment (only if status is DRAFT)
   * DELETE /api/faculty/assessments/{id}/
   */
  async deleteAssessment(id: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/faculty/assessments/${id}/`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to delete assessment" }));
      throw new Error(error.message || error.detail);
    }
  }

  /**
   * Publish an assessment (change status from DRAFT to SCHEDULED)
   * POST /api/faculty/assessments/{id}/publish/
   */
  async publishAssessment(id: number): Promise<Assessment> {
    const response = await fetch(
      `${this.baseURL}/faculty/assessments/${id}/publish/`,
      {
        method: "POST",
        headers: this.getAuthHeaders(),
      },
    );
    return this.handleResponse(response);
  }

  // ==================== QUESTIONS CRUD ====================

  /**
   * Get all questions for an assessment
   * GET /api/faculty/assessments/{assessmentId}/questions/
   */
  async getQuestions(assessmentId: number): Promise<Question[]> {
    const response = await fetch(
      `${this.baseURL}/faculty/assessments/${assessmentId}/questions/`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      },
    );
    return this.handleResponse(response);
  }

  /**
   * Create a new question for an assessment
   * POST /api/faculty/assessments/{assessmentId}/questions/
   */
  async createQuestion(
    assessmentId: number,
    data: CreateQuestionRequest,
  ): Promise<Question> {
    const response = await fetch(
      `${this.baseURL}/faculty/assessments/${assessmentId}/questions/`,
      {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      },
    );
    return this.handleResponse(response);
  }

  /**
   * Update a question
   * PATCH /api/faculty/assessments/{assessmentId}/questions/{questionId}/
   */
  async updateQuestion(
    assessmentId: number,
    questionId: number,
    data: UpdateQuestionRequest,
  ): Promise<Question> {
    const response = await fetch(
      `${this.baseURL}/faculty/assessments/${assessmentId}/questions/${questionId}/`,
      {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      },
    );
    return this.handleResponse(response);
  }

  /**
   * Delete a question
   * DELETE /api/faculty/assessments/{assessmentId}/questions/{questionId}/
   */
  async deleteQuestion(
    assessmentId: number,
    questionId: number,
  ): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/faculty/assessments/${assessmentId}/questions/${questionId}/`,
      {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      },
    );
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to delete question" }));
      throw new Error(error.message || error.detail);
    }
  }

  // ==================== RESULTS ====================

  /**
   * Get results for an assessment
   * GET /api/faculty/assessments/{assessmentId}/results/
   */
  async getAssessmentResults(assessmentId: number): Promise<StudentResult[]> {
    const response = await fetch(
      `${this.baseURL}/faculty/assessments/${assessmentId}/results/`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      },
    );

    // Backend may return either an array of student results (older clients)
    // or an object with { summary, students } (current API). Normalize to
    // always return the students array so callers can handle results
    // uniformly.
    if (!response.ok) {
      return this.handleResponse(response as Response);
    }

    const data = await response.json().catch(() => null);
    if (!data) return [];

    if (Array.isArray(data)) return data as StudentResult[];
    if (typeof data === "object" && Array.isArray((data as any).students)) {
      return (data as any).students as StudentResult[];
    }

    // Fallback to empty array
    return [];
  }

  /**
   * Get detailed result for a specific student
   * GET /api/faculty/assessments/{assessmentId}/results/{studentId}/
   */
  async getStudentResultDetail(
    assessmentId: number,
    studentId: number,
  ): Promise<StudentResultDetail> {
    const response = await fetch(
      `${this.baseURL}/faculty/assessments/${assessmentId}/results/${studentId}/`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      },
    );
    return this.handleResponse(response);
  }

  /**
   * Get all results across all assessments (for Results page)
   * GET /api/faculty/assessments/all-results/
   */
  async getAllResults(): Promise<{
    assessments: (Assessment & {
      results_count: number;
      average_score: number;
    })[];
  }> {
    const response = await fetch(
      `${this.baseURL}/faculty/assessments/all-results/`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      },
    );
    return this.handleResponse(response);
  }

  // ==================== HELPER ENDPOINTS ====================

  /**
   * Get batches assigned to the faculty
   * GET /api/faculty/me/batches/
   */
  async getFacultyBatches(): Promise<FacultyBatchOption[]> {
    const response = await fetch(`${this.baseURL}/faculty/me/batches/`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * Get modules for a specific batch
   * GET /api/batch/{batchId}/subjects/
   */
  async getBatchModules(batchId: number): Promise<BatchModuleOption[]> {
    const response = await fetch(`${this.baseURL}/batch/${batchId}/subjects/`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * Get skills for a specific course (derived from batch)
   * GET /api/academics/courses/{courseId}/skills/
   */
  async getCourseSkills(courseId: number): Promise<CourseSkill[]> {
    const response = await fetch(
      `${this.baseURL}/academics/courses/${courseId}/skills/`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      },
    );
    return this.handleResponse(response);
  }

  // ==================== QUESTION BANK METHODS ====================

  /**
   * Get all question banks for the faculty
   * GET /api/faculty/question-banks/
   */
  async getQuestionBanks(): Promise<QuestionBank[]> {
    const response = await fetch(`${this.baseURL}/faculty/question-banks/`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * Get a specific question bank with questions
   * GET /api/faculty/question-banks/{bankId}/
   */
  async getQuestionBank(bankId: number): Promise<QuestionBankDetail> {
    const response = await fetch(
      `${this.baseURL}/faculty/question-banks/${bankId}/`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      },
    );
    return this.handleResponse(response);
  }

  /**
   * Delete a question bank
   * DELETE /api/faculty/question-banks/{bankId}/
   */
  async deleteQuestionBank(bankId: number): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/faculty/question-banks/${bankId}/`,
      {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      },
    );
    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
      }));
      throw new Error(
        error.message || error.detail || "Failed to delete question bank",
      );
    }
  }

  /**
   * Import questions from AIKEN format file
   * POST /api/faculty/question-banks/import-aiken/
   */
  async importAikenFile(
    data: AikenImportRequest,
  ): Promise<AikenImportResponse> {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    const formData = new FormData();
    formData.append("bank_name", data.bank_name);
    formData.append("subject_id", data.subject_id.toString());
    formData.append("file", data.file);
    if (data.description) {
      formData.append("description", data.description);
    }

    const response = await fetch(
      `${this.baseURL}/faculty/question-banks/import-aiken/`,
      {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
      }));
      throw error;
    }
    return response.json();
  }

  /**
   * Import questions from a question bank into an assessment
   * POST /api/faculty/assessments/{assessmentId}/import-from-bank/
   */
  async importFromBank(
    assessmentId: number,
    data: ImportFromBankRequest,
  ): Promise<ImportFromBankResponse> {
    const response = await fetch(
      `${this.baseURL}/faculty/assessments/${assessmentId}/import-from-bank/`,
      {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      },
    );
    return this.handleResponse(response);
  }
}

export const assessmentApiClient = new AssessmentApiClient();

// ==================== QUESTION BANK TYPES ====================

export interface BankQuestion {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  is_active: boolean;
  created_at: string;
}

export interface QuestionBank {
  id: number;
  name: string;
  description: string;
  subject: number;
  subject_name: string;
  faculty: number;
  faculty_name: string;
  questions_count: number;
  is_active: boolean;
  created_at: string;
}

export interface QuestionBankDetail extends QuestionBank {
  questions: BankQuestion[];
}

export interface AikenImportRequest {
  bank_name: string;
  subject_id: number;
  file: File;
  description?: string;
}

export interface AikenImportResponse {
  bank_id: number;
  bank_name: string;
  questions_imported: number;
  message: string;
}

export interface AikenImportError {
  error: string;
  errors?: { line_number: number; message: string }[];
}

export interface ImportFromBankRequest {
  bank_id: number;
  number_of_questions: number;
  randomize?: boolean;
  marks_per_question?: number;
}

export interface ImportFromBankResponse {
  questions_imported: number;
  message: string;
}
