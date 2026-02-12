/**
 * Types for Finance Admission Management
 */

export type AdmissionStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "FULL_PAYMENT_VERIFIED"
  | "INSTALLMENT_VERIFIED"
  | "INSTALLMENT_PENDING"
  | "DISABLED";

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
  study_mode?: "LIVE" | "RECORDED";
  referred_by_name?: string | null;
  referred_by_code?: string | null;
  referral_confirmed?: boolean;
  discovery_sources?: string[];
  admission_status: AdmissionStatus;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface FinanceReferralItem {
  student_profile_id: number;
  student_name: string;
  student_email: string;
  referred_by_name: string;
  referred_by_email: string;
  referred_by_code: string;
  created_at: string;
}

export interface FinanceReferralConfirmResponse {
  student_profile_id: number;
  referrer_student_profile_id: number;
  message: string;
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
   * Verify full payment for a student
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
   * Verify installment payment for a student
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
   * Disable student access
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
   * Enable student access
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

  /**
   * Get pending referrals for confirmation
   */
  async getPendingReferrals(): Promise<FinanceReferralItem[]> {
    return this.request<FinanceReferralItem[]>(`/referrals/`);
  }

  /**
   * Confirm a referral
   */
  async confirmReferral(
    studentProfileId: number,
  ): Promise<FinanceReferralConfirmResponse> {
    return this.request<FinanceReferralConfirmResponse>(
      `/referrals/${studentProfileId}/confirm/`,
      {
        method: "PATCH",
      },
    );
  }
}

export const financeAPI = new FinanceAPI();
