/**
 * Types for Finance Admission Management
 *
 * Student Lifecycle:
 *   PENDING     → Registered, awaiting first payment verification
 *   ACTIVE      → Payment verified, full LMS access
 *   PAYMENT_DUE → Installment overdue, access temporarily revoked
 *   SUSPENDED   → Admin manually suspended access
 *   DROPPED     → Permanently removed from the system
 */

export type AdmissionStatus =
  | "PENDING"
  | "ACTIVE"
  | "PAYMENT_DUE"
  | "SUSPENDED"
  | "DROPPED";

export type PaymentStatus = "PENDING" | "FULL_PAYMENT" | "INSTALLMENT";

export interface StudentAdmission {
  student_profile_id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  centre: string;
  centre_code: string;
  interested_courses: string;
  payment_method: string;
  study_mode?: string;
  discovery_sources?: string[];
  admission_status: AdmissionStatus;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface PaymentVerificationResponse {
  student_profile_id: number;
  user_id: number;
  full_name: string;
  email: string;
  admission_status: AdmissionStatus;
  payment_status?: PaymentStatus;
  message: string;
}

/**
 * Finance API Client
 */
export class FinanceAPI {
  private baseURL: string;

  constructor() {
    const apiBaseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    this.baseURL = `${apiBaseURL}/public/student/finance`;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const token = localStorage.getItem("access_token");
    const url = `${this.baseURL}${endpoint}`;

    console.log("Finance API Request:", { url, hasToken: !!token });

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

    return response.json();
  }

  /**
   * Get all student admissions
   * @param admissionStatus - Optional filter by status
   */
  async getAdmissions(
    admissionStatus?: AdmissionStatus,
  ): Promise<StudentAdmission[]> {
    const params = admissionStatus
      ? `?admission_status=${admissionStatus}`
      : "";
    return this.request<StudentAdmission[]>(`/admissions/${params}`);
  }

  /**
   * Approve a student admission
   */
  async approveAdmission(
    studentProfileId: number,
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/admissions/${studentProfileId}/approve/`,
      {
        method: "PATCH",
      },
    );
  }

  /**
   * Reject a student admission
   */
  async rejectAdmission(
    studentProfileId: number,
    rejectionReason?: string,
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/admissions/${studentProfileId}/reject/`,
      {
        method: "PATCH",
        body: JSON.stringify({ rejection_reason: rejectionReason || "" }),
      },
    );
  }

  /**
   * Verify full payment for a student → ACTIVE
   */
  async verifyFullPayment(
    studentProfileId: number,
  ): Promise<PaymentVerificationResponse> {
    return this.request<PaymentVerificationResponse>(
      `/admissions/${studentProfileId}/verify-full-payment/`,
      {
        method: "PATCH",
      },
    );
  }

  /**
   * Verify installment payment for a student → ACTIVE
   */
  async verifyInstallment(
    studentProfileId: number,
  ): Promise<PaymentVerificationResponse> {
    return this.request<PaymentVerificationResponse>(
      `/admissions/${studentProfileId}/verify-installment/`,
      {
        method: "PATCH",
      },
    );
  }

  /**
   * Mark an installment student as overdue → PAYMENT_DUE
   * Only for ACTIVE installment students.
   */
  async markOverdue(
    studentProfileId: number,
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/admissions/${studentProfileId}/mark-overdue/`,
      {
        method: "PATCH",
      },
    );
  }

  /**
   * Collect overdue installment payment → ACTIVE
   * Only for PAYMENT_DUE students.
   */
  async collectPayment(
    studentProfileId: number,
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/admissions/${studentProfileId}/collect-payment/`,
      {
        method: "PATCH",
      },
    );
  }

  /**
   * Admin suspends a student → SUSPENDED
   */
  async suspendStudent(
    studentProfileId: number,
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/admissions/${studentProfileId}/suspend/`,
      {
        method: "PATCH",
      },
    );
  }

  /**
   * Reactivate a suspended student → ACTIVE
   */
  async reactivateStudent(
    studentProfileId: number,
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/admissions/${studentProfileId}/reactivate/`,
      {
        method: "PATCH",
      },
    );
  }

  /**
   * Permanently drop a student → DROPPED
   */
  async dropStudent(
    studentProfileId: number,
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/admissions/${studentProfileId}/drop/`,
      {
        method: "PATCH",
      },
    );
  }

  /**
   * @deprecated Use suspendStudent / markOverdue instead
   */
  async disableAccess(
    studentProfileId: number,
  ): Promise<PaymentVerificationResponse> {
    return this.request<PaymentVerificationResponse>(
      `/admissions/${studentProfileId}/disable-access/`,
      {
        method: "PATCH",
      },
    );
  }

  /**
   * @deprecated Use reactivateStudent instead
   */
  async enableAccess(
    studentProfileId: number,
  ): Promise<PaymentVerificationResponse> {
    return this.request<PaymentVerificationResponse>(
      `/admissions/${studentProfileId}/enable-access/`,
      {
        method: "PATCH",
      },
    );
  }
}

export const financeAPI = new FinanceAPI();
