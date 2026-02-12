"""
User management API views.
All views are JWT-protected and use permission-based authorization.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.users.models import User
from .serializers import (
    CreateUserSerializer,
    UserListSerializer,
    UserDetailSerializer,
    UserStatusSerializer,
    UserUpdateSerializer
)
from common.permissions import permission_required
from apps.audit.services import AuditService


class CreateUserAPIView(APIView):
    """
    POST /api/users/

    Create a new user (controlled registration).
    Permission required: user.create

    Request body:
    {
        "email": "faculty@issd.edu",
        "full_name": "Faculty Name",
        "phone": "9876543210",
        "role_code": "FACULTY"
    }
    """
    permission_classes = [IsAuthenticated, permission_required("user.create")]

    def post(self, request):
        serializer = CreateUserSerializer(data=request.data)

        if serializer.is_valid():
            # Create user
            user = serializer.save()

            # Log the creation
            AuditService.log_user_created(
                user=user,
                created_by=request.user,
                details={'created_via': 'api'}
            )

            # Return created user
            response_serializer = UserDetailSerializer(user)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class ListUsersAPIView(APIView):
    """
    GET /api/users/

    List all users with optional filtering.
    Permission required: user.view

    Query parameters:
    - role: Filter by role code (e.g., ?role=FACULTY)
    - is_active: Filter by active status (e.g., ?is_active=true)
    """
    permission_classes = [IsAuthenticated, permission_required("user.view")]

    def get(self, request):
        # Start with all users
        queryset = User.objects.select_related('role', 'centre').all()

        # Filter by role if provided
        role_code = request.query_params.get('role')
        if role_code:
            queryset = queryset.filter(role__code=role_code)

        # Filter by is_active if provided
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            # Convert string to boolean
            is_active_bool = is_active.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(is_active=is_active_bool)

        # If client asks for non-students only (useful for super-admin UI)
        non_students = request.query_params.get('non_students')
        if non_students and non_students.lower() in ['true', '1', 'yes']:
            queryset = queryset.exclude(role__code='STUDENT')

        # Serialize and return
        serializer = UserListSerializer(queryset, many=True)
        return Response(serializer.data)


class UpdateUserStatusAPIView(APIView):
    """
    PATCH /api/users/{id}/status/

    Enable or disable a user.
    Permission required: user.manage

    Request body:
    {
        "is_active": false
    }
    """
    permission_classes = [IsAuthenticated, permission_required("user.manage")]

    def patch(self, request, user_id):
        # Get the user to update
        user = get_object_or_404(User, id=user_id)

        # Store old status for audit log
        old_status = user.is_active

        # Validate and update
        serializer = UserStatusSerializer(
            user, data=request.data, partial=True)

        if serializer.is_valid():
            updated_user = serializer.save()

            # Log the status change (only if it actually changed)
            if old_status != updated_user.is_active:
                AuditService.log_user_status_changed(
                    user=updated_user,
                    changed_by=request.user,
                    old_status=old_status,
                    new_status=updated_user.is_active,
                    details={'changed_via': 'api'}
                )

            # Return updated user
            response_serializer = UserDetailSerializer(updated_user)
            return Response(response_serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class UserDetailAPIView(APIView):
    """
    GET /api/users/{id}/

    Get detailed information about a specific user.
    Permission required: user.view
    """
    permission_classes = [IsAuthenticated, permission_required("user.view")]

    def get(self, request, user_id):
        user = get_object_or_404(
            User.objects.select_related('role', 'centre'),
            id=user_id
        )
        serializer = UserDetailSerializer(user)
        return Response(serializer.data)

    def patch(self, request, user_id):
        """
        Update user details (admin).
        Permission required: user.manage
        """
        # Enforce manage permission for updates
        permission = permission_required('user.manage')()
        if not permission.has_permission(request, self):
            return Response({'detail': 'You do not have permission to perform this action.'}, status=status.HTTP_403_FORBIDDEN)

        user = get_object_or_404(User, id=user_id)
        serializer = UserUpdateSerializer(data=request.data)
        if serializer.is_valid():
            updated_user = serializer.update(user, serializer.validated_data)

            # Log admin change if any
            changes = getattr(updated_user, '_admin_changes', {})
            if changes:
                try:
                    AuditService.log(
                        action='user.updated',
                        entity='User',
                        entity_id=updated_user.id,
                        performed_by=request.user,
                        details={'changes': changes, 'updated_via': 'api'}
                    )
                except Exception:
                    pass

            response_serializer = UserDetailSerializer(updated_user)
            return Response(response_serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, user_id):
        """
        Permanently delete a user from the database. Permission required: user.manage
        """
        permission = permission_required('user.manage')()
        if not permission.has_permission(request, self):
            return Response({'detail': 'You do not have permission to perform this action.'}, status=status.HTTP_403_FORBIDDEN)

        user = get_object_or_404(User, id=user_id)

        # Prevent deleting superuser accounts via API
        if user.is_superuser:
            return Response({'detail': 'Cannot delete a superuser account.'}, status=status.HTTP_400_BAD_REQUEST)

        user.delete()

        try:
            AuditService.log(
                action='user.deleted',
                entity='User',
                entity_id=user_id,
                performed_by=request.user,
                details={'deleted_via': 'api'}
            )
        except Exception:
            pass

        return Response({'message': 'User deleted successfully.'}, status=status.HTTP_200_OK)
