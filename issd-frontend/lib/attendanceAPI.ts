/**
 * Attendance API Client
 *
 * Handles all attendance-related API operations for faculty.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ==========================================
// Type Definitions
// ==========================================

export interface StudentForAttendance {
  student_id: number;
  full_name: string;
  email: string;
  roll_no: string | null;
  current_attendance_status: "PRESENT" | "ABSENT" | null;
}

export interface AttendanceStats {
  total_enrolled: number;
  present_count: number;
  absent_count: number;
  not_marked: number;
  attendance_percentage: number;
}

export interface SessionStudentsResponse {
  session_id: number;
  batch_code: string;
  batch_id: number;
  module_name: string;
  module_code: string;
  session_date: string;
  start_time: string;
  end_time: string;
  is_marking_allowed: boolean;
  marking_message: string;
  stats: AttendanceStats;
  students: StudentForAttendance[];
}

export interface AttendanceItem {
  student_id: number;
  status: "PRESENT" | "ABSENT";
}

export interface SaveAttendanceRequest {
  attendance: AttendanceItem[];
}

export interface SaveAttendanceResponse {
  message: string;
  created: number;
  updated: number;
  records: Array<{
    student_id: number;
    status: "PRESENT" | "ABSENT";
    is_new: boolean;
  }>;
}

// ==========================================
// API Client Class
// ==========================================

class AttendanceAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/faculty`;
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
        error.detail ||
          error.error ||
          error.message ||
          error.session ||
          error.attendance ||
          JSON.stringify(error),
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ==========================================
  // Attendance Endpoints
  // ==========================================

  /**
   * Get students for a session with their current attendance status.
   * Faculty must be assigned to the session.
   *
   * GET /api/faculty/sessions/{session_id}/students/
   */
  async getSessionStudents(sessionId: number): Promise<SessionStudentsResponse> {
    return this.request<SessionStudentsResponse>(
      `/sessions/${sessionId}/students/`,
    );
  }

  /**
   * Save or update attendance for a session.
   * Faculty must be assigned to the session.
   *
   * POST /api/faculty/sessions/{session_id}/attendance/
   */
  async saveAttendance(
    sessionId: number,
    data: SaveAttendanceRequest,
  ): Promise<SaveAttendanceResponse> {
    return this.request<SaveAttendanceResponse>(
      `/sessions/${sessionId}/attendance/`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  /**
   * Get attendance statistics for a session.
   *
   * GET /api/faculty/sessions/{session_id}/attendance/stats/
   */
  async getAttendanceStats(sessionId: number): Promise<AttendanceStats> {
    return this.request<AttendanceStats>(
      `/sessions/${sessionId}/attendance/stats/`,
    );
  }
}

// Export singleton instance
export const attendanceAPI = new AttendanceAPI();
