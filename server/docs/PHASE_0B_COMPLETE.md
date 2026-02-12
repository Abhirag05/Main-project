# Phase 0B: JWT Authentication - COMPLETE

## Implementation Summary

✅ **JWT Configuration** - SimpleJWT with token rotation and blacklisting
✅ **Auth API App** - New `auth_api` app created
✅ **Serializers** - Frontend-friendly serializers for Next.js
✅ **Login API** - POST /api/auth/login/
✅ **Refresh Token API** - POST /api/auth/refresh/
✅ **Current User API** - GET /api/auth/me/
✅ **Logout API** - POST /api/auth/logout/
✅ **DRF Configuration** - JWT as default authentication

---

## Configuration

### JWT Settings ([config/settings/base.py](config/settings/base.py))

```python
SIMPLE_JWT = {
    # Token lifetimes
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),  # Short-lived for security
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),    # Longer for convenience

    # Token rotation and blacklisting
    "ROTATE_REFRESH_TOKENS": True,   # Generate new refresh token
    "BLACKLIST_AFTER_ROTATION": True,  # Blacklist old refresh token
    "UPDATE_LAST_LOGIN": True,  # Update last_login on refresh

    # Auth header
    "AUTH_HEADER_TYPES": ("Bearer",),
}
```

### DRF Authentication

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}
```

---

## API Endpoints

### 1. Login API

**Endpoint:** `POST /api/auth/login/`  
**Permission:** AllowAny  
**Description:** Authenticate with email and password, receive JWT tokens

#### Request

```json
{
  "email": "admin@issd.edu",
  "password": "your-password"
}
```

#### Success Response (200 OK)

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "admin@issd.edu",
    "full_name": "Admin User",
    "phone": "",
    "role": {
      "id": 1,
      "name": "Super Admin",
      "code": "SUPER_ADMIN"
    },
    "centre": {
      "id": 1,
      "name": "ISSD Main Centre",
      "code": "ISSD-MAIN"
    },
    "is_active": true,
    "created_at": "2025-12-16T10:30:00Z"
  }
}
```

#### Error Responses

- `400 Bad Request` - Invalid credentials or validation error
- `401 Unauthorized` - User inactive

---

### 2. Refresh Token API

**Endpoint:** `POST /api/auth/refresh/`  
**Permission:** AllowAny  
**Description:** Get new access token using refresh token

#### Request

```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

#### Success Response (200 OK)

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..." // New refresh token (rotation enabled)
}
```

#### Error Responses

- `401 Unauthorized` - Invalid or expired refresh token

---

### 3. Current User API

**Endpoint:** `GET /api/auth/me/`  
**Permission:** IsAuthenticated  
**Description:** Get current authenticated user details

#### Request Headers

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

#### Success Response (200 OK)

```json
{
  "id": 1,
  "email": "admin@issd.edu",
  "full_name": "Admin User",
  "phone": "",
  "role": {
    "id": 1,
    "name": "Super Admin",
    "code": "SUPER_ADMIN"
  },
  "centre": {
    "id": 1,
    "name": "ISSD Main Centre",
    "code": "ISSD-MAIN"
  },
  "is_active": true,
  "created_at": "2025-12-16T10:30:00Z"
}
```

#### Error Responses

- `401 Unauthorized` - Invalid or expired access token

---

### 4. Logout API

**Endpoint:** `POST /api/auth/logout/`  
**Permission:** IsAuthenticated  
**Description:** Logout by blacklisting refresh token

#### Request Headers

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

#### Request Body

```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

#### Success Response (200 OK)

```json
{
  "message": "Successfully logged out."
}
```

#### Error Responses

- `400 Bad Request` - Invalid refresh token
- `401 Unauthorized` - Invalid or expired access token

---

## Files Created

### Serializers ([auth_api/serializers.py](auth_api/serializers.py))

- **CentreSerializer** - Minimal centre data
- **RoleSerializer** - Minimal role data
- **UserDetailSerializer** - User with nested role and centre
- **LoginSerializer** - Email/password validation
- **LogoutSerializer** - Refresh token validation

**Important:** Does NOT expose `is_staff` or `is_superuser` (backend-only fields)

### Views ([auth_api/views.py](auth_api/views.py))

- **LoginAPIView** - Handle login, generate JWT tokens
- **CurrentUserAPIView** - Return authenticated user
- **LogoutAPIView** - Blacklist refresh token
- **CustomTokenRefreshView** - Refresh access token

### URLs ([auth_api/urls.py](auth_api/urls.py))

All endpoints under `/api/auth/`:

- `/api/auth/login/`
- `/api/auth/refresh/`
- `/api/auth/me/`
- `/api/auth/logout/`

---

## Testing the APIs

### 1. Start the Development Server

```bash
# Activate virtual environment
venv\Scripts\activate

# Run server
python manage.py runserver
```

### 2. Test Login

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@issd.edu",
    "password": "your-password"
  }'
```

### 3. Test Current User (with access token)

```bash
curl -X GET http://127.0.0.1:8000/api/auth/me/ \
  -H "Authorization: Bearer <your-access-token>"
```

### 4. Test Refresh Token

```bash
curl -X POST http://127.0.0.1:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "<your-refresh-token>"
  }'
```

### 5. Test Logout

```bash
curl -X POST http://127.0.0.1:8000/api/auth/logout/ \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "<your-refresh-token>"
  }'
```

---

## Next.js Integration

### 1. Install Axios (or use fetch)

```bash
npm install axios
```

### 2. Create API Service

```typescript
// lib/api.ts
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add access token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh/`, {
          refresh: refreshToken,
        });

        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);

        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    const { data } = await api.post("/api/auth/login/", { email, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    return data;
  },

  getCurrentUser: async () => {
    const { data } = await api.get("/api/auth/me/");
    return data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    await api.post("/api/auth/logout/", { refresh: refreshToken });
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};

export default api;
```

### 3. Login Component Example

```typescript
// components/LoginForm.tsx
"use client";

import { useState } from "react";
import { authAPI } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await authAPI.login(email, password);
      console.log("Logged in as:", data.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.non_field_errors?.[0] || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
```

---

## Security Features

✅ **Token Rotation** - New refresh token on each refresh
✅ **Token Blacklisting** - Old tokens are blacklisted after rotation
✅ **Short Access Token Lifetime** - 30 minutes (configurable)
✅ **HTTPS Ready** - Use HTTPS in production
✅ **CORS Configured** - Ready for Next.js frontend
✅ **No Sensitive Data** - `is_staff`/`is_superuser` not exposed to frontend

---

## Production Checklist

Before deploying to production:

- [ ] Set `ACCESS_TOKEN_LIFETIME` to 15-30 minutes
- [ ] Set `REFRESH_TOKEN_LIFETIME` to 7-14 days
- [ ] Configure CORS allowed origins (not wildcard)
- [ ] Use HTTPS only
- [ ] Set strong `SECRET_KEY`
- [ ] Enable rate limiting on auth endpoints
- [ ] Set up monitoring for failed login attempts
- [ ] Configure secure cookie settings if using cookie storage
- [ ] Review and test token blacklist cleanup job

---

## Next Phase - 0C

**Upcoming:**

- Permission decorators for DRF views
- Role-based access control in APIs
- Audit logging for sensitive operations
- User management endpoints (CRUD)

---

## Phase 0B Status: ✅ COMPLETE

All authentication endpoints are functional and ready for Next.js integration!
