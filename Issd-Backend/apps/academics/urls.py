"""
URL routing for Academic Master Data (PHASE 1A).
"""
from django.urls import path
from apps.academics import views

urlpatterns = [
    # Public endpoints (no authentication required)
    path('public/courses/', views.PublicCoursesListAPIView.as_view(),
         name='public-courses-list'),
    
    # Course endpoints
    path('courses/', views.CourseListCreateAPIView.as_view(),
         name='course-list-create'),
    path('courses/<int:pk>/', views.CourseDetailAPIView.as_view(),
         name='course-detail'),
    path('courses/<int:pk>/status/', views.CourseStatusAPIView.as_view(),
         name='course-status'),
    path('courses/<int:pk>/delete/', views.CourseDeleteAPIView.as_view(),
         name='course-delete'),
    path('courses/<int:course_id>/modules/',
         views.CourseModulesAPIView.as_view(), name='course-modules'),

    # Module endpoints
    path('modules/', views.ModuleListCreateAPIView.as_view(),
         name='module-list-create'),
    path('modules/<int:pk>/', views.ModuleDetailAPIView.as_view(),
         name='module-detail'),
    path('modules/<int:pk>/status/', views.ModuleStatusAPIView.as_view(),
         name='module-status'),
    path('modules/<int:pk>/delete/', views.ModuleDeleteAPIView.as_view(),
         name='module-delete'),

    # Course-Module assignment endpoints
    path('course-modules/', views.CourseModuleCreateAPIView.as_view(),
         name='course-module-create'),
    path('course-modules/<int:pk>/', views.CourseModuleDetailAPIView.as_view(),
         name='course-module-detail'),
    path('course-modules/<int:pk>/status/', views.CourseModuleStatusAPIView.as_view(),
         name='course-module-status'),
]
