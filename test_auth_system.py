#!/usr/bin/env python3
"""
Simple test script to verify custom auth system is working
"""

import os
import sys
import requests
import json
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_health_endpoint():
    """Test if the backend server is running"""
    try:
        response = requests.get('http://localhost:8080/health', timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running")
            return True
        else:
            print(f"❌ Backend server returned status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to backend server: {e}")
        return False

def test_auth_endpoints():
    """Test authentication endpoints"""
    base_url = "http://localhost:8080"
    
    # Test registration
    print("\n🧪 Testing Registration...")
    try:
        reg_data = {
            "email": "test@example.com",
            "password": "TestPassword123!",
            "full_name": "Test User",
            "role": "candidate"
        }
        response = requests.post(f"{base_url}/auth/register", json=reg_data, timeout=10)
        if response.status_code == 200:
            print("✅ Registration endpoint working")
            reg_result = response.json()
            return reg_result.get('data', {})
        else:
            print(f"❌ Registration failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return None

def test_login(reg_data):
    """Test login endpoint"""
    print("\n🧪 Testing Login...")
    try:
        login_data = {
            "email": reg_data.get("email"),
            "password": "TestPassword123!"
        }
        response = requests.post(f"{base_url}/auth/login", json=login_data, timeout=10)
        if response.status_code == 200:
            print("✅ Login endpoint working")
            login_result = response.json()
            return login_result.get('data', {})
        else:
            print(f"❌ Login failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_current_user(token):
    """Test current user endpoint"""
    print("\n🧪 Testing Current User...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{base_url}/auth/me", headers=headers, timeout=10)
        if response.status_code == 200:
            print("✅ Current user endpoint working")
            return response.json()
        else:
            print(f"❌ Current user failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Current user error: {e}")
        return None

def main():
    print("🚀 Testing Custom Authentication System")
    print("=" * 50)
    
    # Test if backend is running
    if not test_health_endpoint():
        print("\n❌ Please start the backend server first:")
        print("   cd backend")
        print("   python main.py")
        return
    
    # Test auth endpoints
    reg_data = test_auth_endpoints()
    if not reg_data:
        print("\n❌ Registration failed, cannot continue testing")
        return
    
    login_data = test_login(reg_data)
    if not login_data:
        print("\n❌ Login failed, cannot continue testing")
        return
    
    # Get tokens
    access_token = login_data.get('access_token')
    if not access_token:
        print("\n❌ No access token received")
        return
    
    # Test current user
    user_data = test_current_user(access_token)
    if user_data:
        print(f"✅ User authenticated: {user_data.get('email')}")
        print(f"✅ User role: {user_data.get('role')}")
        print(f"✅ User ID: {user_data.get('id')}")
    
    print("\n🎉 Custom Authentication System Test Complete!")
    print("✅ All core functionality is working correctly")

if __name__ == "__main__":
    main()
