"""
URL configuration for authentication APIs.
All endpoints are under /api/auth/
"""
from django.urls import path
from .views import (
    LoginAPIView,
    CurrentUserAPIView,
    LogoutAPIView,
    CustomTokenRefreshView,
)

app_name = 'auth_api'

urlpatterns = [
    # POST /api/auth/login/ - Login with email/password, get JWT tokens
    path('login/', LoginAPIView.as_view(), name='login'),

    # POST /api/auth/refresh/ - Refresh access token using refresh token
    path('refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),

    # GET /api/auth/me/ - Get current user details (requires authentication)
    path('me/', CurrentUserAPIView.as_view(), name='current_user'),

    # POST /api/auth/logout/ - Logout and blacklist refresh token
    path('logout/', LogoutAPIView.as_view(), name='logout'),
]
