/**
 * Timetable API Client
 *
 * Handles all timetable-related API operations:
 * - TimeSlot (recurring schedules)
 * - ClassSession (actual class instances)
 * - CoursePlan (structured syllabus)
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ==========================================
// Type Definitions
// ==========================================

export interface BatchMinimal {
  id: number;
  code: string;
  course_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface ModuleMinimal {
  id: number;
  code: string;
  name: string;
}

export interface FacultyMinimal {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
}

export interface TimeSlot {
  id: number;
  batch: number;
  batch_detail: BatchMinimal;
  module: number;
  module_detail: ModuleMinimal;
  faculty: number;
  faculty_detail: FacultyMinimal;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  room_number: string;
  default_meeting_link: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeSlotCreate {
  batch: number;
  module: number;
  faculty: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number?: string;
  default_meeting_link?: string;
}

export interface TimeSlotUpdate {
  faculty?: number;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  room_number?: string;
  default_meeting_link?: string;
  is_active?: boolean;
}

export type SessionStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED";

export interface ClassSession {
  id: number;
  time_slot: number;
  batch_code: string;
  module_name: string;
  faculty_name: string;
  session_date: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  status: SessionStatus;
  topic: string;
  effective_meeting_link: string;
  recording_link: string;
  attendance_marked?: boolean;
}

export interface ClassSessionDetail extends ClassSession {
  time_slot_detail: TimeSlot;
  course_plan: number | null;
  course_plan_detail: CoursePlanMinimal | null;
  meeting_link: string;
  notes: string;
  cancellation_reason: string;
  created_at: string;
  updated_at: string;
}

export interface ClassSessionCreate {
  time_slot: number;
  session_date: string;
  topic?: string;
  course_plan?: number;
  meeting_link?: string;
  notes?: string;
}

export interface ClassSessionUpdate {
  actual_start_time?: string;
  actual_end_time?: string;
  status?: SessionStatus;
  topic?: string;
  course_plan?: number;
  meeting_link?: string;
  recording_link?: string;
  notes?: string;
  cancellation_reason?: string;
}

export interface BulkSessionCreate {
  time_slot: number;
  start_date: string;
  end_date: string;
}

export interface BatchSessionsGenerate {
  start_date?: string; // Optional - defaults to today or batch start
  end_date?: string; // Optional - defaults to batch end
}

export interface BatchSessionsGenerateResponse {
  message: string;
  batch_code: string;
  sessions_count: number;
  date_range: {
    start: string;
    end: string;
  };
  sessions: ClassSession[]; // Preview of first 20 sessions
}

export interface CoursePlanMinimal {
  id: number;
  topic_title: string;
  sequence_order: number;
  is_completed: boolean;
}

export interface CoursePlan {
  id: number;
  batch: number;
  batch_code: string;
  module: number;
  module_name: string;
  topic_title: string;
  topic_description: string;
  sequence_order: number;
  estimated_hours: number;
  planned_date: string | null;
  actual_date: string | null;
  is_completed: boolean;
  sessions_count: number;
}

export interface CoursePlanDetail extends CoursePlan {
  batch_detail: BatchMinimal;
  module_detail: ModuleMinimal;
  resources: string[];
  linked_sessions: {
    id: number;
    session_date: string;
    status: string;
    topic: string;
  }[];
  created_at: string;
  updated_at: string;
}

export interface CoursePlanCreate {
  batch: number;
  module: number;
  topic_title: string;
  topic_description?: string;
  sequence_order: number;
  estimated_hours?: number;
  planned_date?: string;
  resources?: string[];
}

export interface CoursePlanUpdate {
  topic_title?: string;
  topic_description?: string;
  sequence_order?: number;
  estimated_hours?: number;
  planned_date?: string;
  actual_date?: string;
  is_completed?: boolean;
  resources?: string[];
}

export interface ConflictCheckRequest {
  faculty: number;
  batch?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  exclude_time_slot?: number;
}

export interface ConflictCheckResponse {
  has_conflict: boolean;
  conflicts: {
    id: number;
    batch: string;
    module: string;
    time: string;
    faculty?: string;
  }[];
}

export interface FacultyScheduleSlot {
  id: number;
  batch_code: string;
  module_name: string;
  start_time: string;
  end_time: string;
  room: string;
}

export interface FacultySchedule {
  faculty_id: number;
  faculty_name: string;
  employee_code: string;
  schedule: {
    day: number;
    day_name: string;
    slots: FacultyScheduleSlot[];
  }[];
}

export interface BatchTimetable {
  batch_id: number;
  batch_code: string;
  course: string;
  weekly_schedule: {
    day: number;
    day_name: string;
    slots: {
      id: number;
      subject: string;
      module_code: string;
      faculty: string;
      faculty_code: string;
      start_time: string;
      end_time: string;
      room: string;
      meeting_link: string;
    }[];
  }[];
  upcoming_sessions: ClassSession[];
}

export interface TodaySessions {
  date: string;
  sessions: ClassSession[];
}

// ==========================================
// API Client Class
// ==========================================

class TimetableAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/timetable`;
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

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "An error occurred" }));
      throw new Error(
        error.detail || error.error || error.message || JSON.stringify(error),
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ==========================================
  // TimeSlot Endpoints
  // ==========================================

  async getTimeSlots(params?: {
    batch?: number;
    faculty?: number;
    day_of_week?: number;
    is_active?: boolean;
  }): Promise<TimeSlot[]> {
    const searchParams = new URLSearchParams();
    if (params?.batch) searchParams.append("batch", params.batch.toString());
    if (params?.faculty)
      searchParams.append("faculty", params.faculty.toString());
    if (params?.day_of_week)
      searchParams.append("day_of_week", params.day_of_week.toString());
    if (params?.is_active !== undefined)
      searchParams.append("is_active", params.is_active.toString());

    const query = searchParams.toString();
    return this.request<TimeSlot[]>(`/time-slots/${query ? `?${query}` : ""}`);
  }

  async getTimeSlot(id: number): Promise<TimeSlot> {
    return this.request<TimeSlot>(`/time-slots/${id}/`);
  }

  async createTimeSlot(data: TimeSlotCreate): Promise<TimeSlot> {
    return this.request<TimeSlot>("/time-slots/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTimeSlot(id: number, data: TimeSlotUpdate): Promise<TimeSlot> {
    return this.request<TimeSlot>(`/time-slots/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTimeSlot(id: number): Promise<void> {
    await this.request<void>(`/time-slots/${id}/`, { method: "DELETE" });
  }

  // ==========================================
  // ClassSession Endpoints
  // ==========================================

  async getSessions(params?: {
    batch?: number;
    time_slot?: number;
    date_from?: string;
    date_to?: string;
    status?: SessionStatus;
    faculty?: number;
  }): Promise<ClassSession[]> {
    const searchParams = new URLSearchParams();
    if (params?.batch) searchParams.append("batch", params.batch.toString());
    if (params?.time_slot)
      searchParams.append("time_slot", params.time_slot.toString());
    if (params?.date_from) searchParams.append("date_from", params.date_from);
    if (params?.date_to) searchParams.append("date_to", params.date_to);
    if (params?.status) searchParams.append("status", params.status);
    if (params?.faculty)
      searchParams.append("faculty", params.faculty.toString());

    const query = searchParams.toString();
    return this.request<ClassSession[]>(
      `/sessions/${query ? `?${query}` : ""}`,
    );
  }

  async getSession(id: number): Promise<ClassSessionDetail> {
    return this.request<ClassSessionDetail>(`/sessions/${id}/`);
  }

  async createSession(data: ClassSessionCreate): Promise<ClassSessionDetail> {
    return this.request<ClassSessionDetail>("/sessions/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSession(
    id: number,
    data: ClassSessionUpdate,
  ): Promise<ClassSessionDetail> {
    return this.request<ClassSessionDetail>(`/sessions/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteSession(id: number): Promise<void> {
    await this.request<void>(`/sessions/${id}/`, { method: "DELETE" });
  }

  async createBulkSessions(
    data: BulkSessionCreate,
  ): Promise<{ message: string; sessions: ClassSession[] }> {
    return this.request<{ message: string; sessions: ClassSession[] }>(
      "/sessions/bulk/",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  /**
   * Generate all sessions for a batch's entire duration.
   * Uses all active time slots and generates sessions for each matching day.
   * This is the recommended way to set up recurring sessions for a batch.
   */
  async generateBatchSessions(
    batchId: number,
    options?: BatchSessionsGenerate,
  ): Promise<BatchSessionsGenerateResponse> {
    return this.request<BatchSessionsGenerateResponse>(
      `/batch/${batchId}/generate-sessions/`,
      {
        method: "POST",
        body: JSON.stringify(options || {}),
      },
    );
  }

  // ==========================================
  // CoursePlan Endpoints
  // ==========================================

  async getCoursePlans(params?: {
    batch?: number;
    module?: number;
    is_completed?: boolean;
  }): Promise<CoursePlan[]> {
    const searchParams = new URLSearchParams();
    if (params?.batch) searchParams.append("batch", params.batch.toString());
    if (params?.module) searchParams.append("module", params.module.toString());
    if (params?.is_completed !== undefined)
      searchParams.append("is_completed", params.is_completed.toString());

    const query = searchParams.toString();
    return this.request<CoursePlan[]>(
      `/course-plans/${query ? `?${query}` : ""}`,
    );
  }

  async getCoursePlan(id: number): Promise<CoursePlanDetail> {
    return this.request<CoursePlanDetail>(`/course-plans/${id}/`);
  }

  async createCoursePlan(data: CoursePlanCreate): Promise<CoursePlanDetail> {
    return this.request<CoursePlanDetail>("/course-plans/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCoursePlan(
    id: number,
    data: CoursePlanUpdate,
  ): Promise<CoursePlanDetail> {
    return this.request<CoursePlanDetail>(`/course-plans/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCoursePlan(id: number): Promise<void> {
    await this.request<void>(`/course-plans/${id}/`, { method: "DELETE" });
  }

  async copyCoursePlans(
    sourceBatch: number,
    targetBatch: number,
    subject: number,
  ): Promise<{ message: string; plans: CoursePlan[] }> {
    return this.request<{ message: string; plans: CoursePlan[] }>(
      "/course-plans/copy/",
      {
        method: "POST",
        body: JSON.stringify({
          source_batch: sourceBatch,
          target_batch: targetBatch,
          subject,
        }),
      },
    );
  }

  // ==========================================
  // Utility Endpoints
  // ==========================================

  async checkConflict(
    data: ConflictCheckRequest,
  ): Promise<ConflictCheckResponse> {
    return this.request<ConflictCheckResponse>("/check-conflict/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getFacultySchedule(
    facultyId: number | string,
  ): Promise<FacultySchedule> {
    return this.request<FacultySchedule>(`/faculty/${facultyId}/schedule/`);
  }

  async getBatchTimetable(batchId: number): Promise<BatchTimetable> {
    return this.request<BatchTimetable>(`/batch/${batchId}/timetable/`);
  }

  async getTodaySessions(): Promise<TodaySessions> {
    return this.request<TodaySessions>("/today/");
  }
}

// Export singleton instance
export const timetableAPI = new TimetableAPI();
