"""
URL configuration for user management APIs.
"""
from django.urls import path
from .views import (
    CreateUserAPIView,
    ListUsersAPIView,
    UpdateUserStatusAPIView,
    UserDetailAPIView
)

app_name = 'user_management'

urlpatterns = [
    # POST /api/users/ - Create user (controlled registration)
    path('create/', CreateUserAPIView.as_view(), name='create_user'),

    # GET /api/users/ - List users
    path('list/', ListUsersAPIView.as_view(), name='list_users'),

    # GET /api/users/{id}/ - Get user detail
    path('<int:user_id>/', UserDetailAPIView.as_view(), name='user_detail'),

    # PATCH /api/users/{id}/status/ - Enable/disable user
    path('<int:user_id>/status/', UpdateUserStatusAPIView.as_view(),
         name='update_user_status'),
]
