"""
Placement URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.placement.views import PlacementListViewSet, StudentPlacementLinkViewSet

router = DefaultRouter()
router.register(r'lists', PlacementListViewSet, basename='placement-list')
router.register(r'student-links', StudentPlacementLinkViewSet,
                basename='student-placement-link')

urlpatterns = [
    path('', include(router.urls)),
]
