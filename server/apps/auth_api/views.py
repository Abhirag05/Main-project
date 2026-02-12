"""
Authentication API views.
JWT-based authentication for Next.js frontend.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from .serializers import (
    LoginSerializer,
    UserDetailSerializer,
    LogoutSerializer
)


class LoginAPIView(APIView):
    """
    POST /api/auth/login/

    Authenticate user with email and password.
    Returns JWT tokens and user details.
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        """Handle login request."""
        serializer = LoginSerializer(
            data=request.data, context={'request': request})

        if serializer.is_valid():
            user = serializer.validated_data['user']

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            # Serialize user data
            user_data = UserDetailSerializer(user).data

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': user_data
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserAPIView(APIView):
    """
    GET /api/auth/me/

    Get current authenticated user details.
    Requires valid JWT access token.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return authenticated user details."""
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutAPIView(APIView):
    """
    POST /api/auth/logout/

    Logout user by blacklisting refresh token.
    Requires valid JWT access token and refresh token in body.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = LogoutSerializer

    def post(self, request):
        """Handle logout request."""
        serializer = LogoutSerializer(data=request.data)

        if serializer.is_valid():
            try:
                refresh_token = serializer.validated_data['refresh']
                token = RefreshToken(refresh_token)
                token.blacklist()

                return Response({
                    'message': 'Successfully logged out.'
                }, status=status.HTTP_200_OK)

            except TokenError:
                return Response({
                    'error': 'Invalid or expired refresh token.'
                }, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenRefreshView(TokenRefreshView):
    """
    POST /api/auth/refresh/

    Refresh access token using refresh token.
    Inherits from SimpleJWT's TokenRefreshView.

    With ROTATE_REFRESH_TOKENS=True, this will return a new refresh token.
    """
    pass
