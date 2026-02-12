# Phase 0C Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 0C ARCHITECTURE                              │
│                     Governance & Authorization Layer                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Postman/Next.js)                        │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ HTTP Request with JWT Token
                                │ Authorization: Bearer <token>
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DJANGO REST FRAMEWORK                                │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       PERMISSION LAYER                                │  │
│  │                    (common/permissions.py)                            │  │
│  │                                                                       │  │
│  │  HasPermission("permission.code")                                    │  │
│  │    ├─ Is user authenticated?         NO → 401 Unauthorized           │  │
│  │    ├─ Is user active?                NO → 403 Forbidden              │  │
│  │    ├─ Is user superuser?             YES → ✅ Allow                  │  │
│  │    └─ user.has_permission(code)?     YES/NO → Allow/Deny             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      API VIEWS LAYER                                  │  │
│  │                  (user_management/views.py)                           │  │
│  │                                                                       │  │
│  │  CreateUserAPIView                                                   │  │
│  │    Permission: user.create                                           │  │
│  │    POST /api/users/                                                  │  │
│  │      ├─ Validate email (unique)                                      │  │
│  │      ├─ Validate role exists                                         │  │
│  │      ├─ Auto-assign default centre                                   │  │
│  │      ├─ Create user with unusable password                           │  │
│  │      └─ Log to audit (AuditService.log_user_created)                 │  │
│  │                                                                       │  │
│  │  ListUsersAPIView                                                    │  │
│  │    Permission: user.view                                             │  │
│  │    GET /api/users/list/?role=FACULTY&is_active=true                  │  │
│  │      ├─ Filter by role (optional)                                    │  │
│  │      ├─ Filter by is_active (optional)                               │  │
│  │      └─ Return user list (field-whitelisted)                         │  │
│  │                                                                       │  │
│  │  UserDetailAPIView                                                   │  │
│  │    Permission: user.view                                             │  │
│  │    GET /api/users/{id}/                                              │  │
│  │                                                                       │  │
│  │  UpdateUserStatusAPIView                                             │  │
│  │    Permission: user.manage                                           │  │
│  │    PATCH /api/users/{id}/status/                                     │  │
│  │      ├─ Update is_active                                             │  │
│  │      └─ Log to audit (AuditService.log_user_status_changed)          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    SERIALIZERS LAYER                                  │  │
│  │                (user_management/serializers.py)                       │  │
│  │                                                                       │  │
│  │  CreateUserSerializer        UserListSerializer                      │  │
│  │    ├─ email                    ├─ id                                 │  │
│  │    ├─ full_name                ├─ email                              │  │
│  │    ├─ phone                    ├─ full_name                          │  │
│  │    └─ role_code                ├─ phone                              │  │
│  │                                ├─ role (nested)                       │  │
│  │  UserStatusSerializer          ├─ centre (nested)                    │  │
│  │    └─ is_active                ├─ is_active                          │  │
│  │                                ├─ date_joined                         │  │
│  │  ❌ NEVER EXPOSED:             └─ last_login                         │  │
│  │    ├─ is_staff                                                       │  │
│  │    ├─ is_superuser             ❌ NEVER EXPOSED:                     │  │
│  │    └─ password                   ├─ is_staff                         │  │
│  │                                  ├─ is_superuser                     │  │
│  │                                  └─ password                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUDIT LOGGING LAYER                                 │
│                         (audit/services.py)                                  │
│                                                                              │
│  AuditService                                                                │
│    ├─ log_user_created(user, created_by, details)                           │
│    ├─ log_user_status_changed(user, changed_by, old, new, details)          │
│    └─ log_role_assigned(user, assigned_by, old_role, new_role, details)     │
│                                                                              │
│  Creates AuditLog entry:                                                     │
│    {                                                                         │
│      "action": "user.created",                                               │
│      "entity": "User",                                                       │
│      "entity_id": "2",                                                       │
│      "performed_by": <User: admin@issd.edu>,                                │
│      "details": {"email": "...", "role": "FACULTY", ...},                    │
│      "timestamp": "2024-01-15T10:30:00Z"                                     │
│    }                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER (PostgreSQL)                         │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │    users     │  │    roles     │  │rbac_permissions│ │   centres   │   │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤   │
│  │ id           │  │ id           │  │ id           │  │ id           │   │
│  │ email        │  │ code         │  │ code         │  │ code         │   │
│  │ full_name    │  │ name         │  │ description  │  │ name         │   │
│  │ phone        │  │ description  │  │ module       │  │ is_active    │   │
│  │ role_id   ───┼──┤ is_active    │  │ is_active    │  └──────────────┘   │
│  │ centre_id ───┼──┼──────────────┘  └──────────────┘                      │
│  │ is_active    │  │                                                        │
│  │ is_superuser │  │                                                        │
│  │ password     │  │                                                        │
│  │ date_joined  │  │                                                        │
│  │ last_login   │  │                                                        │
│  └──────────────┘  │                                                        │
│                    │                                                        │
│  ┌──────────────────────────┐      ┌──────────────────────────┐            │
│  │ rbac_role_permissions    │      │      audit_logs          │            │
│  ├──────────────────────────┤      ├──────────────────────────┤            │
│  │ id                       │      │ id                       │            │
│  │ role_id      ────────────┼──────┤ action                   │            │
│  │ permission_id            │      │ entity                   │            │
│  │ granted_by_id            │      │ entity_id                │            │
│  │ granted_at               │      │ performed_by_id          │            │
│  └──────────────────────────┘      │ details (JSON)           │            │
│                                     │ timestamp (indexed)      │            │
│                                     └──────────────────────────┘            │
│                                                                              │
│  🔍 KEY RELATIONSHIPS:                                                       │
│    users.role_id → roles.id (PROTECT)                                       │
│    users.centre_id → centres.id (PROTECT)                                   │
│    rbac_role_permissions.role_id → roles.id (CASCADE)                       │
│    rbac_role_permissions.permission_id → rbac_permissions.id (CASCADE)      │
│    audit_logs.performed_by_id → users.id (SET_NULL)                         │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                     PERMISSION RESOLUTION FLOW                               │
│                                                                              │
│  Request: POST /api/users/ with role_code="FACULTY"                         │
│                                                                              │
│  Step 1: JWT Authentication                                                 │
│    ├─ Validate token signature                                              │
│    ├─ Check token expiry                                                    │
│    ├─ Check token not blacklisted                                           │
│    └─ Extract user_id from token payload                                    │
│                                                                              │
│  Step 2: Load User from Database                                            │
│    ├─ SELECT * FROM users WHERE id = <user_id>                              │
│    ├─ JOIN roles ON users.role_id = roles.id                                │
│    └─ JOIN centres ON users.centre_id = centres.id                          │
│                                                                              │
│  Step 3: Check IsAuthenticated                                              │
│    └─ Is request.user valid? YES → Continue                                 │
│                                                                              │
│  Step 4: Check HasPermission("user.create")                                 │
│    ├─ Is user authenticated?        YES → Continue                          │
│    ├─ Is user.is_active == True?    YES → Continue                          │
│    ├─ Is user.is_superuser?         YES → ✅ ALLOW (skip perm check)       │
│    │                                 NO  → Continue to permission check     │
│    └─ Call user.has_permission("user.create")                               │
│         ├─ SELECT rp.* FROM rbac_role_permissions rp                        │
│         │   JOIN rbac_permissions p ON rp.permission_id = p.id              │
│         │   WHERE rp.role_id = <user.role_id>                               │
│         │   AND p.code = "user.create"                                      │
│         │   AND p.is_active = True                                          │
│         ├─ Found? YES → ✅ ALLOW                                            │
│         └─ Found? NO  → ❌ DENY (403 Forbidden)                             │
│                                                                              │
│  Step 5: Execute View Logic                                                 │
│    ├─ Validate email (unique check)                                         │
│    ├─ Validate role_code exists                                             │
│    ├─ Get default centre (first active)                                     │
│    ├─ Create user with unusable password                                    │
│    └─ Call AuditService.log_user_created()                                  │
│         └─ INSERT INTO audit_logs (action, entity, ...)                     │
│                                                                              │
│  Step 6: Return Response                                                    │
│    └─ 201 Created with UserDetailSerializer                                 │
│         ├─ Whitelisted fields only                                          │
│         ├─ Nested role object                                               │
│         └─ Nested centre object                                             │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                     MANAGEMENT COMMANDS                                      │
│                                                                              │
│  python manage.py seed_permissions                                           │
│    ├─ Creates 16 canonical permissions                                      │
│    ├─ Modules: user, role, permission, centre, audit, system                │
│    ├─ Idempotent (uses get_or_create)                                       │
│    └─ Output: "Created: 16, Already existed: 0"                             │
│                                                                              │
│  python manage.py assign_default_permissions                                 │
│    ├─ Creates 34 role-permission mappings                                   │
│    ├─ SUPER_ADMIN: 16 permissions (all)                                     │
│    ├─ CENTRE_ADMIN: 8 permissions                                           │
│    ├─ FACULTY: 1 permission (user.view)                                     │
│    ├─ STUDENT: 0 permissions                                                │
│    └─ Output: "New assignments: 34, Already existed: 0"                     │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                     SECURITY GUARANTEES                                      │
│                                                                              │
│  ✅ All APIs require valid JWT token                                        │
│  ✅ All APIs enforce permission checks (except superusers)                  │
│  ✅ Inactive users cannot access any API                                    │
│  ✅ All mutations are audit logged with timestamp & user                    │
│  ✅ Field whitelisting prevents sensitive data leakage                      │
│  ✅ Superuser bypass for emergency access                                   │
│  ✅ Unusable passwords force password reset flow                            │
│  ❌ NEVER expose: is_staff, is_superuser, password                          │
│  ❌ NO public self-registration (admin-controlled only)                     │
│  ❌ NO Django Groups used for business authorization                        │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                     DATA FLOW EXAMPLE                                        │
│                                                                              │
│  Admin creates faculty user:                                                │
│                                                                              │
│  1. POST /api/users/                                                         │
│     {                                                                        │
│       "email": "faculty@issd.edu",                                           │
│       "full_name": "Faculty Name",                                           │
│       "phone": "9876543210",                                                 │
│       "role_code": "FACULTY"                                                 │
│     }                                                                        │
│                                                                              │
│  2. Permission check:                                                        │
│     admin.has_permission("user.create") → True (is_superuser)               │
│                                                                              │
│  3. Validation:                                                              │
│     - Email unique? ✅ Yes                                                   │
│     - Role exists? ✅ Yes (FACULTY role found)                               │
│                                                                              │
│  4. User creation:                                                           │
│     user = User.objects.create(                                              │
│       email="faculty@issd.edu",                                              │
│       full_name="Faculty Name",                                              │
│       phone="9876543210",                                                    │
│       role=<Role: FACULTY>,                                                  │
│       centre=<Centre: ISSD Main Centre>,  # Auto-assigned                   │
│       is_active=True                                                         │
│     )                                                                        │
│     user.set_unusable_password()                                             │
│                                                                              │
│  5. Audit logging:                                                           │
│     AuditLog.objects.create(                                                 │
│       action="user.created",                                                 │
│       entity="User",                                                         │
│       entity_id="2",                                                         │
│       performed_by=<User: admin@issd.edu>,                                   │
│       details={                                                              │
│         "email": "faculty@issd.edu",                                         │
│         "role": "FACULTY",                                                   │
│         "centre": "ISSD-MAIN"                                                │
│       }                                                                      │
│     )                                                                        │
│                                                                              │
│  6. Response (201 Created):                                                  │
│     {                                                                        │
│       "id": 2,                                                               │
│       "email": "faculty@issd.edu",                                           │
│       "full_name": "Faculty Name",                                           │
│       "phone": "9876543210",                                                 │
│       "role": {                                                              │
│         "id": 6,                                                             │
│         "code": "FACULTY",                                                   │
│         "name": "Faculty"                                                    │
│       },                                                                     │
│       "centre": {                                                            │
│         "id": 1,                                                             │
│         "code": "ISSD-MAIN",                                                 │
│         "name": "ISSD Main Centre"                                           │
│       },                                                                     │
│       "is_active": true,                                                     │
│       "date_joined": "2024-01-15T10:30:00Z",                                 │
│       "last_login": null                                                     │
│     }                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

Legend:
  ✅ = Success / Allowed
  ❌ = Denied / Forbidden
  🔍 = Database Query
  → = Data Flow
  ├─ = Branch/Step
  └─ = Final Step
```
