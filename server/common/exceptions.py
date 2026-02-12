"""
Centralized exception handler for all DRF API views.
Normalizes all error responses to a consistent envelope:

    {
        "error": {
            "code": <http_status>,
            "type": "validation" | "authentication" | "permission" | "not_found" | "rate_limit" | "server",
            "message": "<user-friendly message>",
            "fields": { ... }   # only for validation errors
        }
    }
"""
import logging

from rest_framework.views import exception_handler
from rest_framework.response import Response

logger = logging.getLogger("issd.exceptions")


def custom_exception_handler(exc, context):
    """
    Drop-in replacement for DRF's default exception handler.
    Registered via REST_FRAMEWORK["EXCEPTION_HANDLER"] in settings.
    """
    response = exception_handler(exc, context)

    if response is not None:
        detail = response.data
        status_code = response.status_code
        error_type = _get_error_type(status_code)

        # --- DRF standard: {"detail": "..."} ---------------------------------
        if isinstance(detail, dict) and "detail" in detail:
            message = str(detail["detail"])
            response.data = _envelope(status_code, error_type, message)

        # --- Field-level validation errors: {"field": ["msg", ...], ...} ------
        elif isinstance(detail, dict):
            # Check if any value is a list (field errors)
            has_field_errors = any(isinstance(v, list) for v in detail.values())
            if has_field_errors:
                # Produce a human-readable summary AND keep the per-field dict
                flat_msgs = []
                for field, msgs in detail.items():
                    if isinstance(msgs, list):
                        flat_msgs.extend(str(m) for m in msgs)
                    else:
                        flat_msgs.append(str(msgs))
                summary = "; ".join(flat_msgs) if flat_msgs else "Please check your input."
                response.data = _envelope(status_code, "validation", summary, fields=detail)
            else:
                # Non-standard dict without field errors
                message = detail.get("error") or detail.get("message") or str(detail)
                response.data = _envelope(status_code, error_type, str(message))

        # --- List of errors ---------------------------------------------------
        elif isinstance(detail, list):
            message = "; ".join(str(d) for d in detail)
            response.data = _envelope(status_code, error_type, message)

        # --- Fallback ---------------------------------------------------------
        else:
            response.data = _envelope(status_code, error_type, str(detail))

        return response

    # Unhandled server error — log full traceback but return generic message
    logger.exception(
        "Unhandled exception in %s",
        context.get("view", "unknown view"),
        exc_info=exc,
    )
    return Response(
        _envelope(500, "server", "Something went wrong. Please try again."),
        status=500,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _envelope(code, error_type, message, fields=None):
    """Build the standard error response body."""
    body = {
        "error": {
            "code": code,
            "type": error_type,
            "message": message,
        }
    }
    if fields:
        body["error"]["fields"] = fields
    return body


def _get_error_type(status_code):
    """Map HTTP status to a semantic type string."""
    mapping = {
        400: "validation",
        401: "authentication",
        403: "permission",
        404: "not_found",
        405: "method_not_allowed",
        429: "rate_limit",
    }
    return mapping.get(status_code, "server")
