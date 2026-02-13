/**
 * API client for ISSD Backend communication
 * Backend uses role.code for role identification (e.g., "STUDENT", "FACULTY")
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    full_name: string;
    phone: string;
    role: {
      id: number;
      name: string;
      code: string;
    };
    centre: {
      id: number;
      name: string;
      code: string;
    };
    is_active: boolean;
    created_at: string;
  };
}

export interface StudentReferralInfo {
  referral_code: string;
  confirmed_count: number;
}

class ApiClient {
  private baseURL: string;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string> | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getAccessToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private getAccessToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refresh_token");
    }
    return null;
  }

  private setTokens(access: string, refresh?: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", access);
      if (refresh) {
        localStorage.setItem("refresh_token", refresh);
      }
    }
  }

  private clearTokens(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    }
  }

  /**
   * Handle response and auto-refresh token on 401 errors
   */
  private async handleResponse<T>(
    response: Response,
    retryFn?: () => Promise<Response>,
  ): Promise<T> {
    // If unauthorized and we have a retry function, try to refresh token
    if (response.status === 401 && retryFn) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry the original request with new token
        const newResponse = await retryFn();
        return this.handleResponseWithoutRetry<T>(newResponse);
      } else {
        // Refresh failed, redirect to login
        this.handleAuthFailure();
        throw new Error("Session expired. Please login again.");
      }
    }

    return this.handleResponseWithoutRetry<T>(response);
  }

  private async handleResponseWithoutRetry<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
      }));

      // 0. NEW: Handle our standardized error envelope {error: {code, type, message, fields?}}
      if (error.error && typeof error.error === "object" && error.error.message) {
        const envelope = error.error;
        // If there are field-level errors, format them
        if (envelope.fields && typeof envelope.fields === "object") {
          const fieldMessages = Object.entries(envelope.fields)
            .map(([field, msgs]) =>
              Array.isArray(msgs) ? msgs.join(", ") : String(msgs)
            )
            .join("; ");
          throw new Error(fieldMessages || envelope.message);
        }
        throw new Error(envelope.message);
      }

      // 1. Check for standard DRF 'detail' or 'message'
      if (typeof error.detail === "string") {
        throw new Error(error.detail);
      }
      if (typeof error.message === "string") {
        throw new Error(error.message);
      }

      // 2. Check for 'non_field_errors' (common in DRF)
      if (Array.isArray(error.non_field_errors)) {
        throw new Error(error.non_field_errors.join(", "));
      }

      // 3. Check for specific nested 'errors' object (Laravel/some APIs style)
      if (error.errors && typeof error.errors === "object") {
        const errorMessages = Object.entries(error.errors)
          .map(
            ([field, msgs]) =>
              `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`,
          )
          .join("; ");
        throw new Error(errorMessages || "Validation failed");
      }

      // 4. Check for flat field errors (DRF default style: { "email": ["Invalid"], "password": ["Too short"] })
      // We assume if it's an object where values are arrays of strings, it's a validation error
      const fieldErrors = Object.entries(error)
        .filter(([_, value]) => Array.isArray(value))
        .map(([field, msgs]) => {
          const message = Array.isArray(msgs) ? msgs.join(", ") : msgs;
          return `${message}`; // Just return the message, omitting field name for cleaner UI if possible, or formatting nicely
        });

      if (fieldErrors.length > 0) {
        throw new Error(fieldErrors.join("; "));
      }

      // 5. Fallback
      throw new Error(error.error || "An error occurred");
    }
    return response.json();
  }

  /**
   * Try to refresh the access token
   * Returns true if successful, false otherwise
   */
  private async tryRefreshToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      try {
        await this.refreshPromise;
        return true;
      } catch {
        return false;
      }
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh(refreshToken);

    try {
      await this.refreshPromise;
      return true;
    } catch {
      return false;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(refreshToken: string): Promise<string> {
    const response = await fetch(`${this.baseURL}/auth/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const data = await response.json();

    // Store new access token
    this.setTokens(data.access, data.refresh); // Also store new refresh token if rotated

    console.log("✅ Token refreshed successfully");
    return data.access;
  }

  /**
   * Handle authentication failure - clear tokens and redirect
   */
  private handleAuthFailure(): void {
    this.clearTokens();
    console.log("❌ Authentication failed - session expired");

    // Dispatch custom event for AuthContext to handle
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:sessionExpired"));

      // Redirect to login
      window.location.href = "/";
    }
  }

  /**
   * Helper to make authenticated requests with auto-retry on 401
   */
  private async authenticatedFetch<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    const makeRequest = () =>
      fetch(url, {
        ...options,
        headers: this.getAuthHeaders(),
      });

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest);
  }

  /**
   * Login with email and password
   * POST /api/auth/login/
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/auth/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await this.handleResponse<LoginResponse>(response);
    this.setTokens(data.access, data.refresh);

    // Store user info
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  }

  /**
   * Logout user
   * POST /api/auth/logout/
   */
  async logout(): Promise<void> {
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("refresh_token")
        : null;

    if (refreshToken) {
      try {
        await fetch(`${this.baseURL}/auth/logout/`, {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ refresh: refreshToken }),
        });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }

    this.clearTokens();
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh/
   */
  async refreshToken(): Promise<string> {
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("refresh_token")
        : null;

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${this.baseURL}/auth/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    const data = await this.handleResponse<{ access: string }>(response);

    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", data.access);
    }

    return data.access;
  }

  /**
   * Get current user profile
   * GET /api/auth/me/
   */
  async getCurrentUser(): Promise<LoginResponse["user"]> {
    return this.authenticatedFetch(`${this.baseURL}/auth/me/`, {
      method: "GET",
    });
  }

  /**
   * Create a new user (Super Admin only)
   * POST /api/users/create/
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    return this.authenticatedFetch(`${this.baseURL}/users/create/`, {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  /**
   * Get list of all users
   * GET /api/users/list/
   */
  async getUsers(filters?: {
    role?: string;
    is_active?: boolean;
    non_students?: boolean;
  }): Promise<User[]> {
    const params = new URLSearchParams();
    if (filters?.role) params.append("role", filters.role);
    if (filters?.is_active !== undefined)
      params.append("is_active", String(filters.is_active));
    if (filters?.non_students !== undefined)
      params.append("non_students", String(filters.non_students));

    const url = `${this.baseURL}/users/list/${
      params.toString() ? "?" + params.toString() : ""
    }`;
    return this.authenticatedFetch(url, {
      method: "GET",
    });
  }

  /**
   * Update user details (admin)
   * PATCH /api/users/{id}/
   */
  async updateUser(
    userId: number,
    data: { full_name?: string; phone?: string; role_code?: string },
  ) {
    const url = `${this.baseURL}/users/${userId}/`;
    return this.authenticatedFetch(url, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete user
   * DELETE /api/users/{id}/
   */
  async deleteUser(userId: number) {
    const url = `${this.baseURL}/users/${userId}/`;
    return this.authenticatedFetch(url, {
      method: "DELETE",
    });
  }

  /**
   * Get available roles
   * This is a helper - roles are typically hardcoded based on backend Role model
   */
  getAvailableRoles() {
    return [
      { code: "ADMIN", name: "Admin" },
      { code: "SUPER_ADMIN", name: "Super Admin" },
      { code: "CENTRE_ADMIN", name: "Centre Admin" },
      { code: "ACADEMIC_COORDINATOR", name: "Academic Coordinator" },
      { code: "COURSE_COORDINATOR", name: "Course Coordinator" },
      { code: "FACULTY", name: "Faculty" },
      { code: "STUDENT", name: "Student" },
      { code: "FINANCE", name: "Finance" },
      { code: "ALUMNI", name: "Alumni" },
    ];
  }

  /**
   * Get public list of active courses (no authentication required)
   * GET /api/academics/public/courses/
   */
  async getPublicCourses(): Promise<{
    status: string;
    count: number;
    data: Course[];
  }> {
    const response = await fetch(`${this.baseURL}/academics/public/courses/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return this.handleResponse(response);
  }

  /**
   * Register a new student (public endpoint)
   * POST /api/public/student/register/
   */
  async registerStudent(
    registrationData: StudentRegistrationRequest,
  ): Promise<StudentRegistrationResponse> {
    const response = await fetch(`${this.baseURL}/public/student/register/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registrationData),
    });

    return this.handleResponse(response);
  }

  /**
   * Validate a referral code (public endpoint)
   * GET /api/public/student/referral/validate/?code=CODE
   */
  async validateReferralCode(
    code: string,
  ): Promise<ReferralValidationResponse> {
    const response = await fetch(
      `${this.baseURL}/public/student/referral/validate/?code=${encodeURIComponent(code)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return this.handleResponse(response);
  }

  /**
   * Get all batch templates
   * GET /api/batch/templates/
   */
  async getBatchTemplates(params?: {
    course?: number;
    mode?: string;
    is_active?: boolean;
  }): Promise<BatchTemplate[]> {
    const queryParams = new URLSearchParams();
    if (params?.course) queryParams.append("course", params.course.toString());
    if (params?.mode) queryParams.append("mode", params.mode);
    if (params?.is_active !== undefined)
      queryParams.append("is_active", params.is_active.toString());

    const url = queryParams.toString()
      ? `${this.baseURL}/batch/templates/?${queryParams}`
      : `${this.baseURL}/batch/templates/`;

    return this.authenticatedFetch(url, {
      method: "GET",
    });
  }

  /**
   * Get single batch template
   * GET /api/batch/templates/{id}/
   */
  async getBatchTemplate(id: number): Promise<BatchTemplate> {
    return this.authenticatedFetch(`${this.baseURL}/batch/templates/${id}/`, {
      method: "GET",
    });
  }

  /**
   * Create batch template
   * POST /api/batch/templates/
   */
  async createBatchTemplate(
    data: CreateBatchTemplateRequest,
  ): Promise<BatchTemplate> {
    return this.authenticatedFetch(`${this.baseURL}/batch/templates/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update batch template
   * PUT /api/batch/templates/{id}/
   */
  async updateBatchTemplate(
    id: number,
    data: CreateBatchTemplateRequest,
  ): Promise<BatchTemplate> {
    return this.authenticatedFetch(`${this.baseURL}/batch/templates/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete (disable) batch template
   * DELETE /api/batch/templates/{id}/
   */
  async deleteBatchTemplate(id: number): Promise<void> {
    const makeRequest = () =>
      fetch(`${this.baseURL}/batch/templates/${id}/`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      });

    let response = await makeRequest();

    // Handle 401 with token refresh
    if (response.status === 401) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        response = await makeRequest();
      } else {
        this.handleAuthFailure();
        throw new Error("Session expired. Please login again.");
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
      }));
      throw new Error(
        error.message || error.detail || error.error || "An error occurred",
      );
    }
  }

  /**
   * Get all courses (for dropdown in batch template form)
   * GET /api/batch/courses/
   */
  async getCourses(): Promise<Course[]> {
    return this.authenticatedFetch(`${this.baseURL}/batch/courses/`, {
      method: "GET",
    });
  }

  // ============== Course Management APIs ==============

  /**
   * Get all courses from academics API
   * GET /api/academics/courses/
   * Returns: { status: "success", count: number, data: AcademicCourse[] }
   */
  async getAcademicCourses(): Promise<AcademicCourse[]> {
    const response = await this.authenticatedFetch<{
      status: string;
      count: number;
      data: AcademicCourse[];
    }>(`${this.baseURL}/academics/courses/`, { method: "GET" });
    return response.data;
  }

  /**
   * Create a new course
   * POST /api/academics/courses/
   * Returns: { status: "success", data: AcademicCourse }
   */
  async createCourse(data: CreateCourseRequest): Promise<AcademicCourse> {
    const response = await this.authenticatedFetch<{
      status: string;
      data: AcademicCourse;
    }>(`${this.baseURL}/academics/courses/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Update an existing course
   * PATCH /api/academics/courses/{id}/
   * Returns: { status: "success", data: AcademicCourse }
   */
  async updateCourse(
    id: number,
    data: UpdateCourseRequest,
  ): Promise<AcademicCourse> {
    const response = await this.authenticatedFetch<{
      status: string;
      data: AcademicCourse;
    }>(`${this.baseURL}/academics/courses/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Activate or deactivate a course
   * PATCH /api/academics/courses/{id}/status/
   * Returns: { status: "success", data: AcademicCourse }
   */
  async updateCourseStatus(
    id: number,
    is_active: boolean,
  ): Promise<AcademicCourse> {
    const response = await this.authenticatedFetch<{
      status: string;
      data: AcademicCourse;
    }>(`${this.baseURL}/academics/courses/${id}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ is_active }),
    });
    return response.data;
  }

  /**
   * Delete a course
   * DELETE /api/academics/courses/{id}/delete/
   * Returns: { status: "success", message: string }
   */
  async deleteCourse(id: number): Promise<void> {
    await this.authenticatedFetch<{ status: string; message: string }>(
      `${this.baseURL}/academics/courses/${id}/delete/`,
      {
        method: "DELETE",
      },
    );
  }

  // ============================================
  // Subject Management APIs
  // ============================================

  /**
   * Get all subjects
   * GET /api/academics/modules/
   * Returns: { status: "success", count: number, data: AcademicModule[] }
   */
  async getAcademicModules(): Promise<AcademicModule[]> {
    const response = await this.authenticatedFetch<{
      status: string;
      count: number;
      data: AcademicModule[];
    }>(`${this.baseURL}/academics/modules/`, { method: "GET" });
    return response.data;
  }

  /**
   * Create a new subject
   * POST /api/academics/modules/
   * Returns: { status: "success", data: AcademicModule }
   */
  async createModule(data: createModuleRequest): Promise<AcademicModule> {
    const response = await this.authenticatedFetch<{
      status: string;
      data: AcademicModule;
    }>(`${this.baseURL}/academics/modules/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Update an existing subject
   * PATCH /api/academics/modules/{id}/
   * Returns: { status: "success", data: AcademicModule }
   */
  async updateModule(
    id: number,
    data: updateModuleRequest,
  ): Promise<AcademicModule> {
    const response = await this.authenticatedFetch<{
      status: string;
      data: AcademicModule;
    }>(`${this.baseURL}/academics/modules/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Activate or deactivate a subject
   * PATCH /api/academics/modules/{id}/status/
   * Returns: { status: "success", data: AcademicModule }
   */
  async updateModuleStatus(
    id: number,
    is_active: boolean,
  ): Promise<AcademicModule> {
    const response = await this.authenticatedFetch<{
      status: string;
      data: AcademicModule;
    }>(`${this.baseURL}/academics/modules/${id}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ is_active }),
    });
    return response.data;
  }

  /**
   * Delete a subject
   * DELETE /api/academics/modules/{id}/delete/
   * Returns: { status: "success", message: string }
   */
  async deleteSubject(id: number): Promise<void> {
    await this.authenticatedFetch<{ status: string; message: string }>(
      `${this.baseURL}/academics/modules/${id}/delete/`,
      {
        method: "DELETE",
      },
    );
  }

  // ============================================
  // Course Builder APIs (Course-Subject Assignments)
  // ============================================

  /**
   * Get all subjects assigned to a course
   * GET /api/academics/courses/{course_id}/modules/
   * Permission: academics.view
   */
  async getCourseSubjects(
    courseId: number,
    params?: { is_active?: boolean },
  ): Promise<CourseSubjectsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.is_active !== undefined)
      queryParams.append("is_active", params.is_active.toString());

    const url = queryParams.toString()
      ? `${this.baseURL}/academics/courses/${courseId}/modules/?${queryParams}`
      : `${this.baseURL}/academics/courses/${courseId}/modules/`;

    // Backend returns { modules: [...] } with module_* fields.
    // Normalize to { subjects: [...] } and keep both module_* and subject_* aliases
    const resp = await this.authenticatedFetch<any>(url, { method: "GET" });

    if (resp && Array.isArray(resp.modules)) {
      const modules = resp.modules.map((m: any) => ({
        // keep original module fields
        ...m,
        // provide subject_* aliases for backward compatibility
        subject: m.module,
        subject_code: m.module_code,
        subject_name: m.module_name,
        subject_description: m.module_description,
      }));
      return { ...resp, subjects: modules };
    }

    return resp;
  }

  /**
   * Add a module to a course
   * POST /api/academics/course-modules/
   * Permission: academics.course_builder.manage
   */
  async addSubjectToCourse(
    data: AddSubjectToCourseRequest,
  ): Promise<CourseSubject> {
    const response = await this.authenticatedFetch<{
      status: string;
      data: CourseSubject;
    }>(`${this.baseURL}/academics/course-modules/`, {
      method: "POST",
      body: JSON.stringify({
        course: data.course_id,
        module: data.subject_id,
        sequence_order: data.sequence_order,
        is_active: data.is_active ?? true,
      }),
    });
    return response.data;
  }

  /**
   * Delete a course-module assignment
   */
  async deleteCourseModule(id: number): Promise<void> {
    const url = `${this.baseURL}/academics/course-modules/${id}/`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(error.message || "Failed to delete course module");
    }
    return;
  }

  /**
   * Update a course-module assignment (sequence_order or is_active)
   * PATCH /api/academics/course-modules/{id}/
   * Permission: academics.course_builder.manage
   */
  async updateCourseSubject(
    id: number,
    data: UpdateCourseSubjectRequest,
  ): Promise<CourseSubject> {
    const response = await this.authenticatedFetch<{
      status: string;
      data: CourseSubject;
    }>(`${this.baseURL}/academics/course-modules/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Update course-module status (activate/deactivate)
   * PATCH /api/academics/course-modules/{id}/status/
   * Permission: academics.course_builder.manage
   */
  async updateCourseSubjectStatus(
    id: number,
    is_active: boolean,
  ): Promise<CourseSubject> {
    const response = await this.authenticatedFetch<{
      status: string;
      data: CourseSubject;
    }>(`${this.baseURL}/academics/course-modules/${id}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ is_active }),
    });
    return response.data;
  }

  // ============== Batch Execution APIs (Centre Admin) ==============

  /**
   * Get active batch templates for creating batches
   * GET /api/batches/templates/active/
   */
  async getActiveBatchTemplates(): Promise<BatchTemplate[]> {
    return this.authenticatedFetch(
      `${this.baseURL}/batches/templates/active/`,
      {
        method: "GET",
      },
    );
  }

  /**
   * Get all batches (centre-scoped for Centre Admin)
   * GET /api/batches/
   */
  async getBatches(params?: {
    course?: number;
    status?: string;
    month?: number;
    year?: number;
    is_active?: boolean;
  }): Promise<Batch[]> {
    const queryParams = new URLSearchParams();
    if (params?.course) queryParams.append("course", params.course.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.month) queryParams.append("month", params.month.toString());
    if (params?.year) queryParams.append("year", params.year.toString());
    if (params?.is_active !== undefined)
      queryParams.append("is_active", params.is_active.toString());

    const url = queryParams.toString()
      ? `${this.baseURL}/batches/?${queryParams}`
      : `${this.baseURL}/batches/`;

    return this.authenticatedFetch(url, {
      method: "GET",
    });
  }

  /**
   * Get single batch details
   * GET /api/batches/{id}/
   */
  async getBatch(id: number): Promise<Batch> {
    return this.authenticatedFetch(`${this.baseURL}/batches/${id}/`, {
      method: "GET",
    });
  }

  /**
   * Create batch from template
   * POST /api/batches/
   */
  async createBatch(data: CreateBatchRequest): Promise<Batch> {
    return this.authenticatedFetch(`${this.baseURL}/batches/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update batch status
   * PATCH /api/batches/{id}/status/
   */
  async updateBatchStatus(
    id: number,
    status: "COMPLETED" | "CANCELLED",
  ): Promise<Batch> {
    return this.authenticatedFetch(`${this.baseURL}/batches/${id}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Update batch details
   * PATCH /api/batches/{id}/
   */
  async updateBatch(id: number, data: Partial<Batch>): Promise<Batch> {
    return this.authenticatedFetch(`${this.baseURL}/batches/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete batch
   * DELETE /api/batches/{id}/
   */
  async deleteBatch(id: number): Promise<void> {
    return this.authenticatedFetch(`${this.baseURL}/batches/${id}/`, {
      method: "DELETE",
    });
  }

  // ============== Batch Student Assignment APIs (Centre Admin) ==============

  /**
   * Get eligible students for batch assignment
   * GET /api/batches/{batchId}/eligible-students/
   */
  async getEligibleStudents(batchId: number): Promise<EligibleStudent[]> {
    return this.authenticatedFetch(
      `${this.baseURL}/batches/${batchId}/eligible-students/`,
      { method: "GET" },
    );
  }

  /**
   * Assign students to a batch
   * POST /api/batches/{batchId}/assign-students/
   */
  async assignStudentsToBatch(
    batchId: number,
    studentProfileIds: number[],
  ): Promise<AssignStudentsResponse> {
    return this.authenticatedFetch(
      `${this.baseURL}/batches/${batchId}/assign-students/`,
      {
        method: "POST",
        body: JSON.stringify({ student_profile_ids: studentProfileIds }),
      },
    );
  }

  /**
   * Get batch details with enrolled students
   * GET /api/batches/{batchId}/details/
   */
  async getBatchDetails(batchId: number): Promise<BatchDetails> {
    return this.authenticatedFetch(
      `${this.baseURL}/batches/${batchId}/details/`,
      { method: "GET" },
    );
  }

  // ============== Batch Mentor APIs (Centre Admin) ==============

  /**
   * Get available mentors for a batch
   * GET /api/batches/{batchId}/available-mentors/
   */
  async getAvailableMentors(batchId: number): Promise<AvailableMentor[]> {
    return this.authenticatedFetch(
      `${this.baseURL}/batches/${batchId}/available-mentors/`,
      { method: "GET" },
    );
  }

  /**
   * Assign a mentor to a batch
   * POST /api/batches/{batchId}/assign-mentor/
   */
  async assignMentorToBatch(
    batchId: number,
    mentorId: number,
  ): Promise<AssignMentorResponse> {
    return this.authenticatedFetch(
      `${this.baseURL}/batches/${batchId}/assign-mentor/`,
      {
        method: "POST",
        body: JSON.stringify({ mentor_id: mentorId }),
      },
    );
  }

  // ============== Mentor Dashboard APIs ==============

  /**
   * Get batches assigned to the logged-in mentor
   * GET /api/mentor/my-batches/
   * Access: BATCH_MENTOR only
   */
  async getMentorBatches(): Promise<MentorBatch[]> {
    return this.authenticatedFetch(`${this.baseURL}/mentor/my-batches/`, {
      method: "GET",
    });
  }

  /**
   * Get students in a mentor's assigned batch
   * GET /api/mentor/batches/{batch_id}/students/
   * Access: BATCH_MENTOR only
   */
  async getMentorBatchStudents(batchId: number): Promise<MentorBatchStudent[]> {
    return this.authenticatedFetch(
      `${this.baseURL}/mentor/batches/${batchId}/students/`,
      {
        method: "GET",
      },
    );
  }

  /**
   * Get attendance details for a session
   * GET /api/mentor/sessions/{session_id}/attendance/
   * Access: BATCH_MENTOR only
   */
  async getMentorSessionAttendance(
    sessionId: number,
  ): Promise<MentorSessionAttendance> {
    return this.authenticatedFetch(
      `${this.baseURL}/mentor/sessions/${sessionId}/attendance/`,
      {
        method: "GET",
      },
    );
  }

  /**
   * Get recorded sessions for a mentor's batch
   * GET /api/mentor/batches/{batch_id}/recordings/
   */
  async getMentorBatchRecordings(
    batchId: number,
  ): Promise<MentorBatchRecording[]> {
    return this.authenticatedFetch(
      `${this.baseURL}/mentor/batches/${batchId}/recordings/`,
      { method: "GET" },
    );
  }

  /**
   * Create a recorded session for a mentor's batch
   * POST /api/mentor/batches/{batch_id}/recordings/
   */
  async createMentorBatchRecording(
    batchId: number,
    data: {
      session_date: string;
      meeting_topic: string;
      recording_link: string;
    },
  ): Promise<MentorBatchRecording> {
    return this.authenticatedFetch(
      `${this.baseURL}/mentor/batches/${batchId}/recordings/`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  // ============== Student APIs ==============

  /**
   * Get student's assigned batch
   * GET /api/student/my-batch/
   * Access: STUDENT only
   */
  async getMyBatch(): Promise<StudentBatch | null> {
    const response = await this.authenticatedFetch<
      StudentBatch | StudentBatchResponse
    >(`${this.baseURL}/student/my-batch/`, {
      method: "GET",
    });

    // Handle both response formats
    if (response && typeof response === "object") {
      // If response has 'batch' property (no batch case)
      if ("batch" in response) {
        return response.batch;
      }
      // If response is directly the batch data
      if ("batch_id" in response) {
        return response as StudentBatch;
      }
    }

    return null;
  }

  /**
   * Get recorded classes for student (recorded batches only)
   * GET /api/student/recordings/
   */
  async getStudentRecordedSessions(): Promise<MentorBatchRecording[]> {
    return this.authenticatedFetch(`${this.baseURL}/student/recordings/`, {
      method: "GET",
    });
  }

  /**
   * Get student's referral info
   * GET /api/student/referral/
   * Access: STUDENT only
   */
  async getMyReferralInfo(): Promise<StudentReferralInfo> {
    return this.authenticatedFetch<StudentReferralInfo>(
      `${this.baseURL}/student/referral/`,
      { method: "GET" },
    );
  }

  /**
   * Get modules and faculty in student's assigned batch
   * GET /api/student/my-batch/modules/
   * Access: STUDENT only
   */
  async getMyBatchModules(): Promise<BatchModulesResponse> {
    return this.authenticatedFetch<BatchModulesResponse>(
      `${this.baseURL}/student/my-batch/modules/`,
      {
        method: "GET",
      },
    );
  }

  /**
   * Get subjects and faculty in student's assigned batch (deprecated, use getMyBatchModules)
   * GET /api/student/my-batch/modules/
   * Access: STUDENT only
   */
  async getMyBatchSubjects(): Promise<BatchSubjectsResponse> {
    return this.getMyBatchModules() as Promise<BatchSubjectsResponse>;
  }

  // ============== Student Assessment APIs ==============

  /**
   * Get assessments available to the student
   * GET /api/student/assessments/
   * Access: STUDENT only
   */
  async getStudentAssessments(): Promise<StudentAssessment[]> {
    // Add cache-busting parameter to ensure fresh data
    const timestamp = new Date().getTime();
    return this.authenticatedFetch<StudentAssessment[]>(
      `${this.baseURL}/student/assessments/?_t=${timestamp}`,
      { method: "GET" },
    );
  }

  /**
   * Get assessment details for student
   * GET /api/student/assessments/{id}/
   * Access: STUDENT only
   */
  async getStudentAssessmentDetail(id: number): Promise<AssessmentDetail> {
    return this.authenticatedFetch<AssessmentDetail>(
      `${this.baseURL}/student/assessments/${id}/`,
      { method: "GET" },
    );
  }

  /**
   * Start an assessment attempt
   * POST /api/student/assessments/{id}/start/
   * Access: STUDENT only
   */
  async startAssessmentAttempt(id: number): Promise<AssessmentAttemptResponse> {
    return this.authenticatedFetch<AssessmentAttemptResponse>(
      `${this.baseURL}/student/assessments/${id}/start/`,
      { method: "POST" },
    );
  }

  /**
   * Submit assessment answers
   * POST /api/student/assessments/{id}/submit/
   * Access: STUDENT only
   */
  async submitAssessmentAnswers(
    id: number,
    answers: SubmitAnswerData[],
  ): Promise<AssessmentSubmissionResponse> {
    const response = await fetch(
      `${this.baseURL}/student/assessments/${id}/submit/`,
      {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ answers }),
      },
    );

    // Backend may return a wrapper { message, result, skills_updated }
    // or the raw submission object. Normalize to return the submission result.
    const data = await this.handleResponse<any>(response);
    if (data && typeof data === "object") {
      // If wrapped, normalize the inner result
      const raw = "result" in data && data.result ? data.result : data;

      // Backend uses `marks_obtained` and `result` keys; normalize to frontend shape
      const normalized: any = { ...raw };
      if ("marks_obtained" in raw && !("total_marks_obtained" in raw)) {
        normalized.total_marks_obtained = raw.marks_obtained;
      }
      if ("result" in raw && !("result_status" in raw)) {
        normalized.result_status = raw.result;
      }

      // Ensure numeric fields are numbers
      if (
        normalized.total_marks_obtained !== undefined &&
        typeof normalized.total_marks_obtained !== "number"
      ) {
        normalized.total_marks_obtained =
          Number(normalized.total_marks_obtained) || 0;
      }
      if (
        normalized.percentage !== undefined &&
        typeof normalized.percentage !== "number"
      ) {
        normalized.percentage = Number(normalized.percentage) || 0;
      }

      return normalized as AssessmentSubmissionResponse;
    }
    throw new Error("Invalid submission response");
  }

  /**
   * Get student's assessment attempts
   * GET /api/student/my-attempts/
   * Access: STUDENT only
   */
  async getStudentAttempts(): Promise<StudentAttempt[]> {
    return this.authenticatedFetch<StudentAttempt[]>(
      `${this.baseURL}/student/my-attempts/`,
      { method: "GET" },
    );
  }

  /**
   * Get detailed view of a specific attempt
   * GET /api/student/attempts/{id}/
   * Access: STUDENT only
   */
  async getStudentAttemptDetail(id: number): Promise<StudentAttemptDetail> {
    return this.authenticatedFetch<StudentAttemptDetail>(
      `${this.baseURL}/student/attempts/${id}/`,
      { method: "GET" },
    );
  }

  // ============== Faculty Assessment Result APIs ==============

  /**
   * Get assessment results summary and student results for faculty
   * GET /api/faculty/assessments/{id}/results/
   * Access: FACULTY only
   */
  async getFacultyAssessmentResults(
    assessmentId: number,
  ): Promise<FacultyAssessmentResults> {
    return this.authenticatedFetch<FacultyAssessmentResults>(
      `${this.baseURL}/faculty/assessments/${assessmentId}/results/`,
      { method: "GET" },
    );
  }

  // ============== Faculty Management APIs ==============

  /**
   * Get all faculty profiles
   * GET /api/faculty/
   */
  async getFacultyProfiles(params?: {
    is_active?: boolean;
  }): Promise<FacultyProfile[]> {
    const queryParams = new URLSearchParams();
    if (params?.is_active !== undefined)
      queryParams.append("is_active", params.is_active.toString());

    const url = queryParams.toString()
      ? `${this.baseURL}/faculty/?${queryParams}`
      : `${this.baseURL}/faculty/`;

    return this.authenticatedFetch(url, {
      method: "GET",
    });
  }

  // ============== Faculty Subject Assignment APIs ==============

  /**
   * Get all faculty subject assignments
   * GET /api/faculty/subject-assignments/
   * Permission: faculty.view
   */
  async getFacultySubjectAssignments(params?: {
    faculty_id?: number;
    subject_id?: number;
    is_active?: boolean;
  }): Promise<FacultySubjectAssignment[]> {
    const queryParams = new URLSearchParams();
    if (params?.faculty_id)
      queryParams.append("faculty_id", params.faculty_id.toString());
    if (params?.subject_id)
      queryParams.append("subject_id", params.subject_id.toString());
    if (params?.is_active !== undefined)
      queryParams.append("is_active", params.is_active.toString());

    const url = queryParams.toString()
      ? `${this.baseURL}/faculty/subject-assignments/?${queryParams}`
      : `${this.baseURL}/faculty/subject-assignments/`;

    return this.authenticatedFetch(url, {
      method: "GET",
    });
  }

  /**
   * Assign subject to faculty
   * POST /api/faculty/subject-assignments/
   * Permission: faculty.assign
   */
  async assignSubjectToFaculty(
    data: AssignSubjectToFacultyRequest,
  ): Promise<FacultySubjectAssignment> {
    return this.authenticatedFetch(
      `${this.baseURL}/faculty/subject-assignments/`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  /**
   * Update faculty subject assignment (typically to deactivate)
   * PATCH /api/faculty/subject-assignments/{id}/
   * Permission: faculty.assign
   */
  async updateFacultySubjectAssignmentStatus(
    id: number,
    is_active: boolean,
  ): Promise<FacultySubjectAssignment> {
    return this.authenticatedFetch(
      `${this.baseURL}/faculty/subject-assignments/${id}/`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_active }),
      },
    );
  }

  /**
   * Get faculty assignment summary (subjects and batches)
   * GET /api/faculty/{faculty_id}/assignment-summary/
   * Permission: faculty.view
   */
  async getFacultyAssignmentSummary(
    facultyId: number,
  ): Promise<FacultyAssignmentSummary> {
    return this.authenticatedFetch(
      `${this.baseURL}/faculty/${facultyId}/assignment-summary/`,
      {
        method: "GET",
      },
    );
  }

  // ============== Faculty Batch Assignment APIs ==============

  /**
   * Get all faculty batch assignments
   * GET /api/faculty/batch-assignments/
   * Permission: faculty.view
   */
  async getFacultyBatchAssignments(params?: {
    faculty?: string;
    faculty_id?: number;
    batch_id?: number;
    is_active?: boolean;
  }): Promise<FacultyBatchAssignment[]> {
    const queryParams = new URLSearchParams();
    if (params?.faculty) queryParams.append("faculty", params.faculty);
    if (params?.faculty_id)
      queryParams.append("faculty_id", params.faculty_id.toString());
    if (params?.batch_id)
      queryParams.append("batch_id", params.batch_id.toString());
    if (params?.is_active !== undefined)
      queryParams.append("is_active", params.is_active.toString());

    const url = queryParams.toString()
      ? `${this.baseURL}/faculty/batch-assignments/?${queryParams}`
      : `${this.baseURL}/faculty/batch-assignments/`;

    return this.authenticatedFetch(url, {
      method: "GET",
    });
  }

  /**
   * Assign faculty to batch
   * POST /api/faculty/batch-assignments/
   * Permission: faculty.assign
   */
  async assignFacultyToBatch(
    data: AssignFacultyToBatchRequest,
  ): Promise<FacultyBatchAssignment> {
    return this.authenticatedFetch(
      `${this.baseURL}/faculty/batch-assignments/`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  /**
   * Update faculty batch assignment (typically to deactivate/reactivate)
   * PATCH /api/faculty/batch-assignments/{id}/
   * Permission: faculty.assign
   */
  async updateFacultyBatchAssignmentStatus(
    id: number,
    is_active: boolean,
  ): Promise<FacultyBatchAssignment> {
    return this.authenticatedFetch(
      `${this.baseURL}/faculty/batch-assignments/${id}/`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_active }),
      },
    );
  }

  // ============== Faculty Self-Profile APIs ==============

  /**
   * Get logged-in faculty's own profile
   * GET /api/faculty/me/
   * Permission: IsAuthenticated (faculty role)
   */
  async getFacultySelfProfile(): Promise<FacultySelfProfile> {
    return this.authenticatedFetch(`${this.baseURL}/faculty/me/`, {
      method: "GET",
    });
  }

  /**
   * Update logged-in faculty's own profile (phone and designation only)
   * PATCH /api/faculty/me/
   * Permission: IsAuthenticated (faculty role)
   */
  async updateFacultySelfProfile(data: {
    phone?: string;
    designation?: string;
  }): Promise<FacultySelfProfile> {
    return this.authenticatedFetch(`${this.baseURL}/faculty/me/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get faculty module assignments (supports faculty=me)
   * GET /api/faculty/module-assignments/?faculty=me
   */
  async getFacultyModuleAssignments(params?: {
    faculty?: "me" | number;
    faculty_id?: number;
    module_id?: number;
    is_active?: boolean;
  }): Promise<FacultyModuleAssignment[]> {
    const queryParams = new URLSearchParams();
    if (params?.faculty === "me") {
      queryParams.append("faculty", "me");
    } else if (params?.faculty_id) {
      queryParams.append("faculty_id", params.faculty_id.toString());
    }
    if (params?.module_id)
      queryParams.append("module_id", params.module_id.toString());
    if (params?.is_active !== undefined)
      queryParams.append("is_active", params.is_active.toString());

    const url = queryParams.toString()
      ? `${this.baseURL}/faculty/module-assignments/?${queryParams}`
      : `${this.baseURL}/faculty/module-assignments/`;

    return this.authenticatedFetch(url, {
      method: "GET",
    });
  }
}

interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: {
    id: number;
    name: string;
    code: string;
  };
  centre: {
    id: number;
    name: string;
    code: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateUserRequest {
  email: string;
  full_name: string;
  phone?: string;
  role_code: string;
  // Faculty-specific fields (required when role_code is FACULTY)
  employee_code?: string;
  designation?: string;
  joining_date?: string;
}

interface StudentRegistrationRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
  interested_courses?: string;
  study_mode?: "LIVE" | "RECORDED";
  payment_method?: string;
  referral_code?: string;
  discovery_sources?: string[];
}

interface StudentRegistrationResponse {
  message: string;
  student_id: number;
}

interface ReferralValidationResponse {
  valid: boolean;
  message: string;
}

interface Course {
  id: number;
  name: string;
  code: string;
  description?: string;
  duration_months: number;
  skills?: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface BatchTemplate {
  id: number;
  course: number;
  course_detail: Course;
  name: string;
  mode: "LIVE" | "RECORDED";
  max_students: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateBatchTemplateRequest {
  course: number;
  name: string;
  mode: "LIVE" | "RECORDED";
  max_students: number;
  is_active: boolean;
}

// Academic Course types
interface AcademicCourse {
  id: number;
  code: string;
  name: string;
  description: string;
  duration_months: number;
  skills: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateCourseRequest {
  code: string;
  name: string;
  description?: string;
  duration_months: number;
  skills?: string;
  is_active?: boolean;
}

interface UpdateCourseRequest {
  code?: string;
  name?: string;
  description?: string;
  duration_months?: number;
  skills?: string;
  is_active?: boolean;
}

// Academic Subject types
interface AcademicModule {
  id: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface createModuleRequest {
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

interface updateModuleRequest {
  code?: string;
  name?: string;
  description?: string;
  is_active?: boolean;
}

// Course Subject types (Course Builder)
interface CourseSubject {
  id: number;
  course: number;
  course_code: string;
  course_name: string;
  module: number;
  module_code: string;
  module_name: string;
  module_description: string;
  sequence_order: number;
  is_active: boolean;
}

// Alias for CourseSubject (new naming after subject->module refactoring)
type CourseModule = CourseSubject;

interface CourseSubjectsResponse {
  status: string;
  course: {
    id: number;
    code: string;
    name: string;
  };
  count: number;
  // Backend may return 'modules' (new) or 'subjects' (legacy). Provide both.
  modules?: CourseModule[];
  subjects?: CourseModule[];
}

interface AddSubjectToCourseRequest {
  course_id: number;
  subject_id: number;
  sequence_order: number;
  is_active?: boolean;
}

interface UpdateCourseSubjectRequest {
  sequence_order?: number;
  is_active?: boolean;
}

// Batch Execution types
interface Batch {
  id: number;
  template: number;
  template_detail?: BatchTemplate;
  centre: number;
  centre_name: string;
  centre_code: string;
  code: string;
  start_date: string;
  end_date: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  course_name: string;
  course_code: string;
  course_duration_months: number;
  mode: "LIVE" | "RECORDED";
  max_students: number;
  current_student_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateBatchRequest {
  name: string;
  code: string;
  course_id: number;
  start_date: string;
  end_date: string;
  capacity: number;
}

// Eligible Student for batch assignment
interface EligibleStudent {
  student_profile_id: number;
  full_name: string;
  email: string;
  registration_date: string;
}

// Response when assigning students to batch
interface AssignStudentsResponse {
  message: string;
  batch_id: number;
  batch_code: string;
  assigned_student_ids: number[];
  current_student_count: number;
  max_students: number;
}

// Enrolled student in a batch
interface BatchStudent {
  student_profile_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  joined_at: string;
}

// Batch details with enrolled students
interface BatchDetails {
  id: number;
  code: string;
  template: number;
  template_detail: BatchTemplate;
  centre: number;
  centre_name: string;
  centre_code: string;
  course_name: string;
  course_code: string;
  mode: "LIVE" | "RECORDED";
  start_date: string;
  end_date: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  max_students: number;
  current_student_count: number;
  available_slots: number;
  mentor: number | null;
  mentor_detail: MentorDetail | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  enrolled_students: BatchStudent[];
}

// Faculty types
interface FacultyProfile {
  id: number;
  employee_code: string;
  user: {
    id: number;
    full_name: string;
    email: string;
  };
  designation: string;
  joining_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Faculty Self-Profile types (for faculty dashboard)
interface FacultySelfProfile {
  id: number;
  email: string;
  full_name: string;
  employee_code: string;
  designation: string;
  phone: string;
  joining_date: string;
  is_active: boolean;
  role: {
    id: number;
    name: string;
    code: string;
  };
  centre: {
    id: number;
    name: string;
    code: string;
  } | null;
}

// Faculty Module Assignment types
interface FacultyModuleAssignment {
  id: number;
  faculty: {
    id: number;
    employee_code: string;
    user: {
      id: number;
      full_name: string;
      email: string;
    };
  };
  module: {
    id: number;
    code: string;
    name: string;
    course_name?: string;
  };
  is_active: boolean;
  assigned_at: string;
  assigned_by: {
    id: number;
    full_name: string;
  } | null;
}

// Faculty Subject Assignment types
interface FacultySubjectAssignment {
  id: number;
  faculty: {
    id: number;
    employee_code: string;
    user: {
      id: number;
      full_name: string;
      email: string;
    };
  };
  // backend returns either `module` (new) or `subject` (legacy); frontend uses module when available
  module?: {
    id: number;
    code: string;
    name: string;
  };
  subject?: {
    id: number;
    code: string;
    name: string;
  };
  is_active: boolean;
  assigned_at: string;
  assigned_by: {
    id: number;
    full_name: string;
  } | null;
}

interface AssignSubjectToFacultyRequest {
  faculty_id: number;
  // Use module_id to match backend; legacy field subject_id is no longer sent
  module_id: number;
}

interface FacultyAssignmentSummary {
  faculty: {
    id: number;
    employee_code: string;
    full_name: string;
    email: string;
  };
  subjects: {
    id: number;
    code: string;
    name: string;
  }[];
  batches: unknown[]; // We'll ignore this as per requirements
}

// Faculty Batch Assignment types
interface FacultyBatchAssignment {
  id: number;
  faculty: {
    id: number;
    employee_code: string;
    user: {
      id: number;
      full_name: string;
      email: string;
    };
  };
  batch: {
    id: number;
    code: string;
    course_name: string;
    centre_name: string;
    centre_code: string;
    start_date: string;
    end_date: string;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  };
  is_active: boolean;
  assigned_at: string;
  assigned_by: {
    id: number;
    full_name: string;
  } | null;
}

interface AssignFacultyToBatchRequest {
  faculty_id: number;
  batch_id: number;
}

// Batch Mentor types
interface AvailableMentor {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
}

interface AssignMentorResponse {
  message: string;
  batch_id: number;
  batch_code: string;
  mentor: {
    id: number;
    full_name: string;
    email: string;
    phone: string | null;
  };
}

interface MentorDetail {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
}

// Mentor Dashboard types
interface MentorBatch {
  batch_id: number;
  batch_code: string;
  course_name: string;
  start_date: string;
  end_date: string;
  batch_status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  mode: "LIVE" | "RECORDED";
  total_students: number;
}

interface MentorBatchStudent {
  student_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  joined_at: string;
}

interface MentorSessionAttendanceStudent {
  student_id: number;
  full_name: string;
  email: string;
  status: "PRESENT" | "ABSENT" | null;
}

interface MentorBatchRecording {
  id: number;
  batch: number;
  session_date: string;
  meeting_topic: string;
  recording_link: string;
  uploaded_by: number | null;
  created_at: string;
  updated_at: string;
}

interface MentorSessionAttendance {
  session_id: number;
  batch_code: string;
  module_name: string;
  faculty_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  stats: {
    total_enrolled: number;
    present_count: number;
    absent_count: number;
    not_marked: number;
    attendance_percentage: number;
  };
  students: MentorSessionAttendanceStudent[];
}

// Student Dashboard types
interface StudentBatch {
  batch_id: number;
  batch_code: string;
  course_name: string;
  start_date: string;
  end_date: string;
  batch_status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  mode: "LIVE" | "RECORDED";
  mentor_name: string | null;
  mentor_email: string | null;
  total_students: number;
}

interface StudentBatchResponse {
  message?: string;
  batch: StudentBatch | null;
}

// Student Batch Subjects types
interface BatchSubject {
  module_id: number;
  module_name: string;
  module_code: string;
  faculty_id: number | null;
  faculty_name: string | null;
  faculty_designation: string | null;
  faculty_email: string | null;
}

// Alias for BatchSubject (new naming after subject->module refactoring)
type BatchModule = BatchSubject;

interface BatchSubjectsResponse {
  message: string;
  modules: BatchModule[];
}

// Alias for BatchSubjectsResponse (new naming after subject->module refactoring)
type BatchModulesResponse = BatchSubjectsResponse;

// ==================== Student Assessment Types ====================
interface StudentAssessment {
  id: number;
  title: string;
  description: string;
  batch: {
    id: number;
    code: string;
    course_name: string;
    centre_name: string;
    status: string;
  };
  subject: {
    id: number;
    code: string;
    name: string;
  };
  faculty: {
    id: number;
    full_name: string;
    email: string;
  };
  total_marks: number;
  duration_minutes: number;
  passing_percentage: number;
  start_datetime: string;
  end_datetime: string;
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "COMPLETED";
  questions_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  attempt_info?: {
    id: number;
    status: "IN_PROGRESS" | "SUBMITTED" | "EVALUATED";
    started_at: string;
    submitted_at: string | null;
    total_marks_obtained: number;
    percentage: number;
  } | null;
}

// Assessment Details with questions
interface AssessmentQuestion {
  id: number;
  question_text: string;
  marks: number;
  order: number;
  options: AssessmentOption[];
}

interface AssessmentOption {
  id: number;
  option_text: string;
  is_correct: boolean;
  order: number;
}

interface AssessmentDetail {
  id: number;
  title: string;
  description: string;
  batch_code: string;
  subject_name: string;
  total_marks: number;
  duration_minutes: number;
  passing_percentage: number;
  start_time: string;
  end_time: string;
  questions: AssessmentQuestion[];
  questions_count: number;
}

// Assessment attempt responses
interface AssessmentAttemptResponse {
  attempt_id: number;
  assessment: AssessmentDetail;
  started_at: string;
  time_limit_minutes: number;
}

interface SubmitAnswerData {
  question_id: number;
  selected_option_id: number | null;
}

interface AssessmentSubmissionResponse {
  attempt_id: number;
  total_marks_obtained: number;
  percentage: number;
  status: string;
  result_status: string;
  submitted_at: string;
}

// Student attempts
interface StudentAttempt {
  id: number;
  student: number;
  student_name: string;
  student_email: string;
  assessment: number;
  assessment_title: string;
  assessment_total_marks: number;
  started_at: string;
  submitted_at: string | null;
  total_marks_obtained: number;
  percentage: number;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
  result_status: string;
}

interface StudentAnswer {
  id: number;
  question: number;
  question_text: string;
  selected_option: number | null;
  selected_option_text: string | null;
  correct_option_text: string | null;
  is_correct: boolean;
  marks_obtained: number;
}

interface StudentAttemptDetail extends StudentAttempt {
  answers: StudentAnswer[];
  skill_impacts: any[];
}

// Faculty Assessment Result Types
interface FacultyAssessmentResultsSummary {
  assessment_id: number;
  total_students: number;
  attempts_count: number;
  average_percentage: number;
  highest_score: number;
  lowest_score: number;
  pass_rate: number;
}

interface StudentResultForFaculty {
  id: number;
  student: {
    id: number;
    full_name: string;
    email: string;
  };
  total_marks_obtained: number;
  percentage: number;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
  result_status: string;
  started_at: string;
  submitted_at: string | null;
  answers: StudentAnswer[];
}

interface FacultyAssessmentResults {
  summary: FacultyAssessmentResultsSummary;
  students: StudentResultForFaculty[];
}

export const apiClient = new ApiClient();
export type {
  LoginRequest,
  LoginResponse,
  User,
  CreateUserRequest,
  StudentRegistrationRequest,
  StudentRegistrationResponse,
  BatchTemplate,
  CreateBatchTemplateRequest,
  Course,
  AcademicCourse,
  CreateCourseRequest,
  UpdateCourseRequest,
  AcademicModule,
  createModuleRequest,
  updateModuleRequest,
  CourseSubject,
  CourseModule,
  CourseSubjectsResponse,
  AddSubjectToCourseRequest,
  UpdateCourseSubjectRequest,
  Batch,
  CreateBatchRequest,
  EligibleStudent,
  AssignStudentsResponse,
  BatchStudent,
  BatchDetails,
  FacultyProfile,
  FacultySelfProfile,
  FacultyModuleAssignment,
  FacultySubjectAssignment,
  AssignSubjectToFacultyRequest,
  FacultyAssignmentSummary,
  FacultyBatchAssignment,
  AssignFacultyToBatchRequest,
  AvailableMentor,
  AssignMentorResponse,
  MentorDetail,
  MentorBatch,
  MentorBatchRecording,
  MentorBatchStudent,
  MentorSessionAttendance,
  MentorSessionAttendanceStudent,
  StudentBatch,
  StudentBatchResponse,
  BatchSubject,
  BatchSubjectsResponse,
  BatchModule,
  BatchModulesResponse,
  StudentAssessment,
  AssessmentDetail,
  AssessmentQuestion,
  AssessmentOption,
  AssessmentAttemptResponse,
  SubmitAnswerData,
  AssessmentSubmissionResponse,
  StudentAttempt,
  StudentAnswer,
  StudentAttemptDetail,
  FacultyAssessmentResults,
  FacultyAssessmentResultsSummary,
  StudentResultForFaculty,
};
