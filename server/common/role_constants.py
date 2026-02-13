"""
Centralised role-code constants used across the server codebase.

The ADMIN_ROLE_CODES tuple lists every legacy role code that should be
treated as "admin-level".  Any permission check that previously looked
for SUPER_ADMIN, CENTRE_ADMIN, or FINANCE (admin)
should now use ``is_admin_role(code)`` or check membership in
``ADMIN_ROLE_CODES``.

Backward-compatible:  the old role rows remain in the database untouched;
this module simply maps them to a single logical "ADMIN" concept.
"""

# ---------------------------------------------------------------------------
# Role codes that are treated as admin-level access
# ---------------------------------------------------------------------------
ADMIN_ROLE_CODES = (
    'SUPER_ADMIN',
    'CENTRE_ADMIN',
    'ADMIN',          # the new consolidated code
    'FINANCE',
    'PLACEMENT',      # kept for backward-compat with existing DB rows
)

# Non-admin roles – kept here for reference; NOT changed.
FACULTY_ROLE = 'FACULTY'
STUDENT_ROLE = 'STUDENT'
BATCH_MENTOR_ROLE = 'BATCH_MENTOR'
ACADEMIC_COORDINATOR_ROLE = 'ACADEMIC_COORDINATOR'
COURSE_COORDINATOR_ROLE = 'COURSE_COORDINATOR'
ALUMNI_ROLE = 'ALUMNI'


def is_admin_role(role_code: str | None) -> bool:
    """Return ``True`` if *role_code* is one of the admin-level roles."""
    return role_code in ADMIN_ROLE_CODES
