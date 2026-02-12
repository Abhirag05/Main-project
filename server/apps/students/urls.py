"""
URL configuration for student registration and finance admission management.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.students.views import (
    StudentRegistrationView,
    ReferralCodeValidationView,
    FinanceAdmissionViewSet,
    FinanceReferralViewSet,
    PlacementStudentViewSet,
    MyBatchView,
    MyBatchModulesView,
    StudentReferralView,
    StudentRecordedSessionsView
)


# Router for ViewSets
router = DefaultRouter()
router.register(r'finance/admissions', FinanceAdmissionViewSet,
                basename='finance-admission')
router.register(r'finance/referrals', FinanceReferralViewSet,
                basename='finance-referral')
router.register(r'placement/students', PlacementStudentViewSet,
                basename='placement-students')

urlpatterns = [
    path('register/', StudentRegistrationView.as_view(), name='student-register'),
    path('referral/validate/', ReferralCodeValidationView.as_view(),
         name='referral-validate'),
    path('referral/', StudentReferralView.as_view(), name='student-referral'),
    path('my-batch/', MyBatchView.as_view(), name='student-my-batch'),
    path('my-batch/modules/', MyBatchModulesView.as_view(),
         name='student-my-batch-modules'),
    path('recordings/', StudentRecordedSessionsView.as_view(),
         name='student-recordings'),
    path('', include(router.urls)),
]
