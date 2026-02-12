"""Student course material URLs — included at /api/student/materials/"""
from django.urls import path
from .views import StudentMaterialListAPIView

urlpatterns = [
    path('', StudentMaterialListAPIView.as_view(), name='student-material-list'),
]
