# Testing JWT Authentication APIs

## Prerequisites

Ensure you have:

- ✅ Virtual environment activated
- ✅ Database migrated
- ✅ Superuser created (admin@issd.edu)
- ✅ Server running: `python manage.py runserver`

## Quick Test Script

Save this as `test_auth_apis.py` in your project root:

```python
"""
Quick script to test all authentication APIs.
Run with: python test_auth_apis.py
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/auth"

# Test credentials (change to your actual superuser)
EMAIL = "admin@issd.edu"
PASSWORD = "your-password-here"  # CHANGE THIS

def print_response(title, response):
    """Pretty print response."""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")

def test_login():
    """Test login API."""
    url = f"{BASE_URL}/login/"
    data = {
        "email": EMAIL,
        "password": PASSWORD
    }
    response = requests.post(url, json=data)
    print_response("1. LOGIN API", response)

    if response.status_code == 200:
        tokens = response.json()
        return tokens.get('access'), tokens.get('refresh')
    return None, None

def test_current_user(access_token):
    """Test current user API."""
    url = f"{BASE_URL}/me/"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    response = requests.get(url, headers=headers)
    print_response("2. CURRENT USER API (GET /me/)", response)

def test_refresh_token(refresh_token):
    """Test token refresh API."""
    url = f"{BASE_URL}/refresh/"
    data = {
        "refresh": refresh_token
    }
    response = requests.post(url, json=data)
    print_response("3. REFRESH TOKEN API", response)

    if response.status_code == 200:
        tokens = response.json()
        return tokens.get('access'), tokens.get('refresh')
    return None, None

def test_logout(access_token, refresh_token):
    """Test logout API."""
    url = f"{BASE_URL}/logout/"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    data = {
        "refresh": refresh_token
    }
    response = requests.post(url, json=data, headers=headers)
    print_response("4. LOGOUT API", response)

def test_unauthorized_access():
    """Test accessing protected endpoint without token."""
    url = f"{BASE_URL}/me/"
    response = requests.get(url)
    print_response("5. UNAUTHORIZED ACCESS (No Token)", response)

def main():
    """Run all tests."""
    print("\n" + "="*60)
    print(" TESTING JWT AUTHENTICATION APIs")
    print("="*60)

    # Test 1: Login
    access_token, refresh_token = test_login()
    if not access_token:
        print("\n❌ Login failed! Check your credentials.")
        return

    # Test 2: Get current user with access token
    test_current_user(access_token)

    # Test 3: Refresh tokens
    new_access, new_refresh = test_refresh_token(refresh_token)

    # Test 4: Logout (blacklist token)
    if new_refresh:
        test_logout(new_access, new_refresh)

    # Test 5: Try accessing without token
    test_unauthorized_access()

    print("\n" + "="*60)
    print(" ✅ ALL TESTS COMPLETED")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
```

## Running the Tests

### 1. Install requests (if not already installed)

```bash
pip install requests
```

### 2. Update credentials in the script

Edit `test_auth_apis.py` and set your actual password:

```python
PASSWORD = "your-actual-password"
```

### 3. Run the test script

```bash
# Make sure server is running in another terminal
python test_auth_apis.py
```

## Expected Output

You should see:

### 1. Login Success

```
Status Code: 200
{
  "access": "eyJ0eXAiOiJKV1QiL...",
  "refresh": "eyJ0eXAiOiJKV1QiL...",
  "user": {
    "id": 1,
    "email": "admin@issd.edu",
    "full_name": "Admin User",
    ...
  }
}
```

### 2. Current User

```
Status Code: 200
{
  "id": 1,
  "email": "admin@issd.edu",
  "full_name": "Admin User",
  "role": {
    "code": "SUPER_ADMIN",
    "name": "Super Admin"
  },
  ...
}
```

### 3. Token Refresh

```
Status Code: 200
{
  "access": "eyJ0eXAiOiJKV1QiL...",  // New access token
  "refresh": "eyJ0eXAiOiJKV1QiL..."  // New refresh token (rotated)
}
```

### 4. Logout

```
Status Code: 200
{
  "message": "Successfully logged out."
}
```

### 5. Unauthorized Access

```
Status Code: 401
{
  "detail": "Authentication credentials were not provided."
}
```

## Manual Testing with cURL

### Login

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@issd.edu","password":"your-password"}'
```

### Get Current User

```bash
curl -X GET http://127.0.0.1:8000/api/auth/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token

```bash
curl -X POST http://127.0.0.1:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh":"YOUR_REFRESH_TOKEN"}'
```

### Logout

```bash
curl -X POST http://127.0.0.1:8000/api/auth/logout/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refresh":"YOUR_REFRESH_TOKEN"}'
```

## Testing with Postman/Insomnia

1. **Import Collection** - Create a new collection with these endpoints
2. **Set Base URL** - `http://127.0.0.1:8000/api/auth`
3. **Login** - POST to `/login/`, save access and refresh tokens
4. **Set Authorization** - Bearer Token with saved access token
5. **Test other endpoints** - `/me/`, `/refresh/`, `/logout/`

## Common Issues

### 1. "Authentication credentials were not provided"

- **Cause**: Missing or invalid Authorization header
- **Fix**: Add `Authorization: Bearer <token>` header

### 2. "Token is invalid or expired"

- **Cause**: Access token expired (30 min lifetime)
- **Fix**: Use refresh endpoint to get new access token

### 3. "Unable to log in with provided credentials"

- **Cause**: Wrong email/password
- **Fix**: Verify credentials, ensure user is active

### 4. "User account is not properly configured"

- **Cause**: User missing role or centre
- **Fix**: All users must have role and centre assigned

## Verifying Token Blacklist

After logout, try using the blacklisted refresh token:

```bash
# This should fail with "Token is blacklisted"
curl -X POST http://127.0.0.1:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh":"BLACKLISTED_TOKEN"}'
```

## Next Steps

Once all tests pass:

1. ✅ Integrate with Next.js frontend
2. ✅ Implement protected routes
3. ✅ Add role-based permissions (Phase 0C)
4. ✅ Deploy to production

---

**All tests passing?** Phase 0B is complete! 🎉
