#!/usr/bin/env python3
"""
Test with real user ID from the users table
"""
import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Initialize Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(supabase_url, supabase_key)

def get_real_user():
    """Get a real recruiter user from the users table"""
    try:
        result = supabase.table("users").select("*").eq("role", "recruiter").limit(1).execute()
        if result.data:
            user = result.data[0]
            print(f"✅ Found real recruiter user:")
            print(f"   ID: {user['id']}")
            print(f"   Email: {user['email']}")
            print(f"   Role: {user['role']}")
            return user
        else:
            print("❌ No recruiter users found")
            return None
    except Exception as e:
        print(f"❌ Failed to get users: {e}")
        return None

def test_with_real_user():
    """Test profile update with real user"""
    user = get_real_user()
    if not user:
        return
    
    try:
        payload = {
            "user_id": user["id"],  # Use real user ID
            "company_name": "Test Company",
            "company_website": "https://example.com",
            "contact_name": "Test Name",
            "contact_email": "test@example.com",
            "location": "Test Location",
            "about_company": "Test About"
        }
        
        result = supabase.table("recruiter_profiles").upsert(
            payload, on_conflict="user_id"
        ).execute()
        
        print(f"✅ Profile update successful!")
        print(f"   Result: {result.data}")
        return True
        
    except Exception as e:
        print(f"❌ Profile update failed: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Testing with Real User...")
    test_with_real_user()
