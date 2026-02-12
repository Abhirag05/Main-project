"""
URL configuration for course materials module.
"""
from django.urls import path
from .views import (
    FacultyMaterialListCreateAPIView,
    FacultyMaterialDetailAPIView,
    FacultyMaterialAssignBatchesAPIView,
    StudentMaterialListAPIView,
)

# Faculty material endpoints — mounted at /api/faculty/materials/
faculty_material_urlpatterns = [
    path('', FacultyMaterialListCreateAPIView.as_view(), name='faculty-material-list-create'),
    path('<int:material_id>/', FacultyMaterialDetailAPIView.as_view(), name='faculty-material-detail'),
    path('<int:material_id>/assign-batches/', FacultyMaterialAssignBatchesAPIView.as_view(), name='faculty-material-assign-batches'),
]

# Student material endpoints — mounted at /api/student/materials/
student_material_urlpatterns = [
    path('', StudentMaterialListAPIView.as_view(), name='student-material-list'),
]
