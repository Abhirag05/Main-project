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
    StudentProgressViewSet,
    MyBatchView,
    MyBatchModulesView,
    StudentReferralView,
    MySkillsView,
)


# Router for ViewSets
router = DefaultRouter()
router.register(r'finance/admissions', FinanceAdmissionViewSet,
                basename='finance-admission')
router.register(r'finance/referrals', FinanceReferralViewSet,
                basename='finance-referral')
router.register(r'student-progress', StudentProgressViewSet,
                basename='student-progress')

urlpatterns = [
    path('register/', StudentRegistrationView.as_view(), name='student-register'),
    path('referral/validate/', ReferralCodeValidationView.as_view(),
         name='referral-validate'),
    path('referral/', StudentReferralView.as_view(), name='student-referral'),
    path('my-batch/', MyBatchView.as_view(), name='student-my-batch'),
    path('my-batch/modules/', MyBatchModulesView.as_view(),
         name='student-my-batch-modules'),
    path('my-skills/', MySkillsView.as_view(),
         name='student-my-skills'),
    path('', include(router.urls)),
]
