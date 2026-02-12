const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface StudentSessionAttendance {
  session_id: number;
  batch_code: string;
  module_name: string;
  session_date: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  topic?: string | null;
  attendance_status?: "PRESENT" | "ABSENT" | null;
}

class StudentAttendanceAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/student`;
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

  async getMyAttendance(): Promise<StudentSessionAttendance[]> {
    const res = await fetch(`${this.baseURL}/attendance/`, {
      headers: this.getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || "Failed to fetch attendance",
      );
    }

    const data = await res.json();
    return data.attendance || [];
  }
}

export const studentAttendanceAPI = new StudentAttendanceAPI();
