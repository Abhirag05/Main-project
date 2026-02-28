// Course Materials API Client for Faculty and Student

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Faculty materials endpoint
const FACULTY_API = BASE_URL.endsWith("/api")
  ? `${BASE_URL}/faculty/materials`
  : `${BASE_URL}/api/faculty/materials`;

// Student materials endpoint
const STUDENT_API = BASE_URL.endsWith("/api")
  ? `${BASE_URL}/student/materials`
  : `${BASE_URL}/api/student/materials`;

// ============================================================
// TYPES
// ============================================================

export interface ModuleMini {
  id: number;
  code: string;
  name: string;
}

export interface BatchMini {
  id: number;
  code: string;
  mode: string; // Delivery mode (e.g. "LIVE")
}

export interface FacultyMini {
  id: number;
  employee_code: string;
  name: string;
}

export interface BatchAssignment {
  id: number;
  batch: BatchMini;
  is_active: boolean;
}

export interface CourseMaterial {
  id: number;
  title: string;
  description: string;
  module: ModuleMini;
  faculty: FacultyMini;
  material_type: string; // "PDF" | "PPT" | "DOC" | "VIDEO" | "LINK"
  file_url: string | null;
  external_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assigned_batches: BatchAssignment[];
}

export interface StudentMaterial {
  id: number;
  title: string;
  description: string;
  module: ModuleMini;
  material_type: string;
  file_url: string | null;
  external_url: string | null;
  faculty_name: string;
  created_at: string;
}

export interface CreateMaterialData {
  title: string;
  description: string;
  module_id: number;
  material_type: string;
  file?: File | null;
  external_url?: string;
  batch_ids: number[];
}

export interface UpdateMaterialData {
  title?: string;
  description?: string;
  material_type?: string;
  file?: File | null;
  external_url?: string;
  is_active?: boolean;
}

// ============================================================
// API CLIENT
// ============================================================

class CourseMaterialAPIClient {
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
      let errorMessage = `Request failed with status ${response.status}`;
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (typeof errorData === "object") {
        const fieldErrors = Object.entries(errorData)
          .map(([key, value]: [string, unknown]) => {
            if (Array.isArray(value)) return `${key}: ${value.join(", ")}`;
            return `${key}: ${value}`;
          })
          .join("; ");
        if (fieldErrors) errorMessage = fieldErrors;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  }

  // ---- Faculty endpoints ----

  async createMaterial(data: CreateMaterialData): Promise<CourseMaterial> {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description || "");
    formData.append("module_id", String(data.module_id));
    formData.append("material_type", data.material_type);

    if (data.file) {
      formData.append("file", data.file);
    }
    if (data.external_url) {
      formData.append("external_url", data.external_url);
    }
    data.batch_ids.forEach((id) => formData.append("batch_ids", String(id)));

    const response = await fetch(`${FACULTY_API}/`, {
      method: "POST",
      headers: this.getHeaders(false), // no Content-Type for multipart
      body: formData,
    });
    return this.handleResponse<CourseMaterial>(response);
  }

  async getFacultyMaterials(params?: {
    module_id?: number;
    material_type?: string;
    is_active?: boolean;
  }): Promise<CourseMaterial[]> {
    const query = new URLSearchParams();
    if (params?.module_id) query.set("module_id", String(params.module_id));
    if (params?.material_type) query.set("material_type", params.material_type);
    if (params?.is_active !== undefined) query.set("is_active", String(params.is_active));
    const qs = query.toString();
    const url = qs ? `${FACULTY_API}/?${qs}` : `${FACULTY_API}/`;
    const response = await fetch(url, { headers: this.getHeaders() });
    return this.handleResponse<CourseMaterial[]>(response);
  }

  async getMaterialDetail(id: number): Promise<CourseMaterial> {
    const response = await fetch(`${FACULTY_API}/${id}/`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<CourseMaterial>(response);
  }

  async updateMaterial(id: number, data: UpdateMaterialData): Promise<CourseMaterial> {
    const hasFile = data.file !== undefined && data.file !== null;
    let body: FormData | string;
    let headers: HeadersInit;

    if (hasFile) {
      const formData = new FormData();
      if (data.title !== undefined) formData.append("title", data.title);
      if (data.description !== undefined) formData.append("description", data.description);
      if (data.material_type !== undefined) formData.append("material_type", data.material_type);
      if (data.is_active !== undefined) formData.append("is_active", String(data.is_active));
      formData.append("file", data.file as File);
      body = formData;
      headers = this.getHeaders(false);
    } else {
      body = JSON.stringify(data);
      headers = this.getHeaders(true);
    }

    const response = await fetch(`${FACULTY_API}/${id}/`, {
      method: "PATCH",
      headers,
      body,
    });
    return this.handleResponse<CourseMaterial>(response);
  }

  async deleteMaterial(id: number): Promise<{ detail: string }> {
    const response = await fetch(`${FACULTY_API}/${id}/`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ detail: string }>(response);
  }

  async assignBatches(materialId: number, batchIds: number[]): Promise<CourseMaterial> {
    const response = await fetch(`${FACULTY_API}/${materialId}/assign-batches/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ batch_ids: batchIds }),
    });
    return this.handleResponse<CourseMaterial>(response);
  }

  // ---- Student endpoint ----

  async getStudentMaterials(params?: {
    module_id?: number;
    material_type?: string;
  }): Promise<StudentMaterial[]> {
    const query = new URLSearchParams();
    if (params?.module_id) query.set("module_id", String(params.module_id));
    if (params?.material_type) query.set("material_type", params.material_type);
    const qs = query.toString();
    const url = qs ? `${STUDENT_API}/?${qs}` : `${STUDENT_API}/`;
    const response = await fetch(url, { headers: this.getHeaders() });
    return this.handleResponse<StudentMaterial[]>(response);
  }
}

export const courseMaterialAPI = new CourseMaterialAPIClient();
