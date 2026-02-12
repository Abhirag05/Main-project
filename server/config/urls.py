"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.batch_management.urls import batch_urlpatterns, mentor_urlpatterns
from apps.attendance.views import StudentAttendanceAPIView

urlpatterns = [
    path('admin/', admin.site.urls),

    # API endpoints
    path('api/auth/', include('apps.auth_api.urls')),
    path('api/users/', include('apps.user_management.urls')),
    path('api/faculty/', include('apps.faculty.urls')),
    # Faculty attendance endpoints
    path('api/faculty/', include('apps.attendance.urls')),
    # Batch Templates & Courses
    path('api/batch/', include('apps.batch_management.urls')),
    # Batch Execution (Centre Admin)
    path('api/batches/', include(batch_urlpatterns)),
    path('api/mentor/', include(mentor_urlpatterns)),  # Mentor Dashboard APIs
    path('api/academics/', include('apps.academics.urls')),
    # Timetable & Course Plan
    path('api/timetable/', include('apps.timetable.urls')),

    # Public endpoints
    path('api/public/student/', include('apps.students.urls')),

    # Student authenticated endpoints
    path('api/student/', include('apps.students.urls')),
    # Student attendance (student-facing)
    path('api/student/attendance/', StudentAttendanceAPIView.as_view()),
    # Placement management
    path('api/placement/', include('apps.placement.urls')),
    path('api/assignments/', include('apps.assignments.urls')),

    # Course Materials
    path('api/faculty/materials/', include('apps.course_materials.faculty_urls')),
    path('api/student/materials/', include('apps.course_materials.student_urls')),
]


# Assessment module URLs - added after core URL patterns to avoid circular imports
urlpatterns += [
    path('api/', include('apps.assessments.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)
