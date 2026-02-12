from django.urls import path
from .views import StudentAttendanceAPIView

app_name = 'attendance_student'

urlpatterns = [
    path('attendance/', StudentAttendanceAPIView.as_view(),
         name='student-attendance'),
]
