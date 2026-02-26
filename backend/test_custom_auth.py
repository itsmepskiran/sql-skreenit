#!/usr/bin/env python3
"""
Test script for Custom Authentication System
Tests the core functionality of the custom auth service
"""

import os
import sys
import json
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.auth_service import CustomAuthService
from services.mysql_service import UserService

def test_auth():
    """Test the custom authentication system."""
    print("🔐 Testing Custom Authentication System")
    print("=" * 50)
    
    try:
        # Initialize services
        auth_service = CustomAuthService()
        user_service = UserService()
        
        print("✅ Services initialized successfully")
        
        # Test data
        test_email = "test@example.com"
        test_password = "TestPassword123!"
        test_full_name = "Test User"
        test_mobile = "+1234567890"
        test_location = "Test City"
        test_role = "candidate"
        
        print(f"\n📝 Testing registration for: {test_email}")
        
        # Test 1: Registration
        try:
            # Clean up any existing test user first
            existing_user = user_service.get_user_by_email(test_email)
            if existing_user:
                print(f"⚠️  Cleaning up existing test user...")
                # Note: In a real scenario, you'd want to delete the user
                # For now, we'll just proceed with registration which should fail
            
            registration_result = auth_service.register(
                full_name=test_full_name,
                email=test_email,
                password=test_password,
                mobile=test_mobile,
                location=test_location,
                role=test_role
            )
            
            print("✅ Registration successful!")
            print(f"   User ID: {registration_result['user']['id']}")
            print(f"   Email: {registration_result['user']['email']}")
            print(f"   Role: {registration_result['user']['role']}")
            
            access_token = registration_result['access_token']
            refresh_token = registration_result['refresh_token']
            
        except Exception as e:
            if "already registered" in str(e):
                print("⚠️  User already exists, proceeding to login test...")
            else:
                raise e
        
        # Test 2: Login
        print(f"\n🔑 Testing login for: {test_email}")
        login_result = auth_service.login(test_email, test_password)
        
        print("✅ Login successful!")
        print(f"   User ID: {login_result['user']['id']}")
        print(f"   Email: {login_result['user']['email']}")
        print(f"   Role: {login_result['user']['role']}")
        
        access_token = login_result['access_token']
        refresh_token = login_result['refresh_token']
        
        # Test 3: Token Verification
        print(f"\n🔍 Testing token verification...")
        user_data = auth_service.verify_token(access_token)
        
        print("✅ Token verification successful!")
        print(f"   User ID: {user_data['user_id']}")
        print(f"   Email: {user_data['email']}")
        print(f"   Role: {user_data['role']}")
        
        # Test 4: Token Refresh
        print(f"\n🔄 Testing token refresh...")
        refresh_result = auth_service.refresh_access_token(refresh_token)
        
        print("✅ Token refresh successful!")
        print(f"   New access token generated: {len(refresh_result['access_token'])} chars")
        
        # Test 5: Password Update
        print(f"\n🔧 Testing password update...")
        new_password = "NewTestPassword456!"
        auth_service.update_password(user_data['user_id'], new_password)
        
        print("✅ Password update successful!")
        
        # Test 6: Login with new password
        print(f"\n🔑 Testing login with new password...")
        login_result_new = auth_service.login(test_email, new_password)
        
        print("✅ Login with new password successful!")
        
        print("\n🎉 All tests passed! Custom authentication system is working correctly.")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

def test_middleware_integration():
    """Test that the middleware can be imported and initialized."""
    print("\n🔧 Testing Middleware Integration")
    print("=" * 30)
    
    try:
        from middleware.auth_middleware import CustomAuthMiddleware, EXCLUDED_PATHS
        
        print("✅ Custom middleware imported successfully")
        print(f"   Excluded paths: {len(EXCLUDED_PATHS)} paths configured")
        
        # Test middleware initialization (without FastAPI app)
        class MockApp:
            pass
        
        middleware = CustomAuthMiddleware(MockApp())
        print("✅ Custom middleware initialized successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Middleware test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Custom Auth Tests")
    print("=" * 60)
    
    # Check environment
    print(f"📍 Working directory: {os.getcwd()}")
    print(f"📍 Python path: {sys.path[0]}")
    
    # Run tests
    auth_test_passed = test_auth()
    middleware_test_passed = test_middleware_integration()
    
    print("\n" + "=" * 60)
    print("📊 Test Results:")
    print(f"   Auth Service: {'✅ PASSED' if auth_test_passed else '❌ FAILED'}")
    print(f"   Middleware: {'✅ PASSED' if middleware_test_passed else '❌ FAILED'}")
    
    if auth_test_passed and middleware_test_passed:
        print("\n🎉 All tests passed! Your custom auth system is ready to use.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        sys.exit(1)
