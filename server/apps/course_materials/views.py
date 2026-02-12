"""
Course material API views.
Faculty: upload, list, update, assign-batches, soft-delete.
Student: list materials mapped to their batch.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Prefetch

from .models import CourseMaterial, CourseMaterialBatch
from .serializers import (
    CreateCourseMaterialSerializer,
    CourseMaterialListSerializer,
    UpdateCourseMaterialSerializer,
    AssignBatchesSerializer,
    StudentCourseMaterialSerializer,
)
from apps.faculty.models import FacultyProfile
from apps.batch_management.models import BatchStudent
from common.permissions import permission_required


# ===================================================================
# Helpers
# ===================================================================
def _get_faculty(user):
    """Return FacultyProfile for the authenticated user or None."""
    try:
        return user.faculty_profile
    except FacultyProfile.DoesNotExist:
        return None


# ===================================================================
# Faculty endpoints
# ===================================================================
class FacultyMaterialListCreateAPIView(APIView):
    """
    GET  /api/faculty/materials/        — list own materials
    POST /api/faculty/materials/        — upload new material
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        return [IsAuthenticated()]

    # ---- LIST ----
    def get(self, request):
        faculty = _get_faculty(request.user)
        if not faculty:
            return Response(
                {"error": "Faculty profile not found."},
                status=status.HTTP_403_FORBIDDEN
            )

        active_batch_assignments = CourseMaterialBatch.objects.select_related(
            'batch__template'
        ).filter(is_active=True)

        qs = (
            CourseMaterial.objects
            .filter(faculty=faculty)
            .select_related('module', 'faculty__user')
            .prefetch_related(
                Prefetch(
                    'batch_assignments',
                    queryset=active_batch_assignments,
                    to_attr='active_batch_assignments',
                )
            )
            .order_by('-created_at')
        )

        # Optional filters
        module_id = request.query_params.get('module_id')
        if module_id:
            qs = qs.filter(module_id=module_id)

        material_type = request.query_params.get('material_type')
        if material_type:
            qs = qs.filter(material_type=material_type.upper())

        is_active = request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ('true', '1'))

        serializer = CourseMaterialListSerializer(
            qs, many=True, context={'request': request})
        return Response(serializer.data)

    # ---- CREATE ----
    def post(self, request):
        faculty = _get_faculty(request.user)
        if not faculty:
            return Response(
                {"error": "Faculty profile not found."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Handle batch_ids coming as repeated form fields or JSON list
        data = request.data.copy()
        if 'batch_ids' not in data and 'batch_ids[]' in data:
            data.setlist('batch_ids', data.getlist('batch_ids[]'))

        serializer = CreateCourseMaterialSerializer(
            data=data,
            context={'faculty': faculty, 'request': request}
        )
        if serializer.is_valid():
            material = serializer.save()
            out = CourseMaterialListSerializer(
                material, context={'request': request}
            )
            return Response(out.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FacultyMaterialDetailAPIView(APIView):
    """
    GET    /api/faculty/materials/<id>/  — detail
    PATCH  /api/faculty/materials/<id>/  — update
    DELETE /api/faculty/materials/<id>/  — soft-delete (is_active=False)
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        return [IsAuthenticated()]

    def _get_material(self, request, material_id):
        faculty = _get_faculty(request.user)
        if not faculty:
            return None, Response(
                {"error": "Faculty profile not found."},
                status=status.HTTP_403_FORBIDDEN
            )
        material = get_object_or_404(
            CourseMaterial, id=material_id, faculty=faculty)
        return material, None

    def get(self, request, material_id):
        material, err = self._get_material(request, material_id)
        if err:
            return err
        serializer = CourseMaterialListSerializer(
            material, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, material_id):
        material, err = self._get_material(request, material_id)
        if err:
            return err

        serializer = UpdateCourseMaterialSerializer(data=request.data)
        if serializer.is_valid():
            material = serializer.update(material, serializer.validated_data)
            out = CourseMaterialListSerializer(
                material, context={'request': request})
            return Response(out.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, material_id):
        material, err = self._get_material(request, material_id)
        if err:
            return err
        material.is_active = False
        material.save(update_fields=['is_active'])
        return Response({"detail": "Material deactivated."}, status=status.HTTP_200_OK)


class FacultyMaterialAssignBatchesAPIView(APIView):
    """
    POST /api/faculty/materials/<id>/assign-batches/
    Body: { "batch_ids": [1, 2, 3] }
    Replaces batch mapping for the material.
    """

    def get_permissions(self):
        return [IsAuthenticated()]

    def post(self, request, material_id):
        faculty = _get_faculty(request.user)
        if not faculty:
            return Response(
                {"error": "Faculty profile not found."},
                status=status.HTTP_403_FORBIDDEN
            )

        material = get_object_or_404(
            CourseMaterial, id=material_id, faculty=faculty)

        serializer = AssignBatchesSerializer(
            data=request.data, context={'faculty': faculty}
        )
        if serializer.is_valid():
            serializer.save(material=material)
            out = CourseMaterialListSerializer(
                material, context={'request': request})
            return Response(out.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ===================================================================
# Student endpoints
# ===================================================================
class StudentMaterialListAPIView(APIView):
    """
    GET /api/student/materials/
    Returns materials mapped to the student's active batch.
    Filters: module_id, material_type
    """

    def get_permissions(self):
        return [IsAuthenticated()]

    def get(self, request):
        # Find the student's active batch
        enrollment = (
            BatchStudent.objects
            .filter(student__user=request.user, is_active=True)
            .select_related('batch')
            .first()
        )
        if not enrollment:
            return Response(
                {"error": "You are not enrolled in any active batch."},
                status=status.HTTP_404_NOT_FOUND
            )

        batch = enrollment.batch

        # Materials mapped to this batch and active
        material_ids = (
            CourseMaterialBatch.objects
            .filter(batch=batch, is_active=True, material__is_active=True)
            .values_list('material_id', flat=True)
        )

        qs = (
            CourseMaterial.objects
            .filter(id__in=material_ids)
            .select_related('module', 'faculty__user')
            .order_by('module__name', '-created_at')
        )

        # Filters
        module_id = request.query_params.get('module_id')
        if module_id:
            qs = qs.filter(module_id=module_id)

        material_type = request.query_params.get('material_type')
        if material_type:
            qs = qs.filter(material_type=material_type.upper())

        serializer = StudentCourseMaterialSerializer(
            qs, many=True, context={'request': request}
        )
        return Response(serializer.data)
