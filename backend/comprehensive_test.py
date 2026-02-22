#!/usr/bin/env python3
"""
Comprehensive test to debug the recruiter profile issue
"""
import os
from dotenv import load_dotenv
from supabase import create_client
import json

# Load environment
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Initialize Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(supabase_url, supabase_key)

def test_table_exists():
    """Check if table exists"""
    try:
        result = supabase.table("recruiter_profiles").select("count").execute()
        print("✅ recruiter_profiles table exists")
        return True
    except Exception as e:
        print(f"❌ Table doesn't exist: {e}")
        return False

def test_table_columns():
    """Test what columns exist by trying a simple select"""
    try:
        result = supabase.table("recruiter_profiles").select("*").limit(1).execute()
        if result.data:
            print(f"✅ Sample row columns: {list(result.data[0].keys())}")
        else:
            print("ℹ️  Table exists but is empty")
            # Try to insert a test row to see column requirements
            try:
                test_payload = {
                    "user_id": "00000000-0000-0000-0000-000000000000",  # Valid UUID format
                    "company_name": "Test"
                }
                result = supabase.table("recruiter_profiles").insert(test_payload).execute()
                print(f"✅ Insert test successful: {result.data}")
            except Exception as insert_error:
                print(f"❌ Insert failed: {insert_error}")
        return True
    except Exception as e:
        print(f"❌ Column test failed: {e}")
        return False

def test_real_payload():
    """Test with the actual payload format"""
    try:
        # Simulate the exact payload from frontend
        payload = {
            "user_id": "00000000-0000-0000-0000-000000000000",
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
        
        print(f"✅ Real payload test successful: {result.data}")
        return True
        
    except Exception as e:
        print(f"❌ Real payload test failed: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Comprehensive Database Test...")
    
    print("\n1. Testing table existence:")
    test_table_exists()
    
    print("\n2. Testing table columns:")
    test_table_columns()
    
    print("\n3. Testing real payload:")
    test_real_payload()
