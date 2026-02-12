"""Faculty course material URLs — included at /api/faculty/materials/"""
from django.urls import path
from .views import (
    FacultyMaterialListCreateAPIView,
    FacultyMaterialDetailAPIView,
    FacultyMaterialAssignBatchesAPIView,
)

urlpatterns = [
    path('', FacultyMaterialListCreateAPIView.as_view(), name='faculty-material-list-create'),
    path('<int:material_id>/', FacultyMaterialDetailAPIView.as_view(), name='faculty-material-detail'),
    path('<int:material_id>/assign-batches/', FacultyMaterialAssignBatchesAPIView.as_view(), name='faculty-material-assign-batches'),
]
