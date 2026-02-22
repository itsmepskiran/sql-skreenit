#!/usr/bin/env python3
"""
Check the actual schema of recruiter_profiles table
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

def check_table_schema():
    """Check what columns actually exist"""
    try:
        # Try to get schema information
        result = supabase.rpc('get_table_columns', {'table_name': 'recruiter_profiles'}).execute()
        
        if result.data:
            print("✅ Table columns:")
            for col in result.data:
                print(f"  - {col['column_name']}: {col['data_type']}")
        else:
            print("ℹ️  Could not get schema via RPC, trying alternative...")
            
            # Alternative: try to describe the table
            try:
                result = supabase.table("recruiter_profiles").select("*").limit(0).execute()
                print("ℹ️  Table exists but schema check failed")
            except Exception as e:
                print(f"❌ Schema check failed: {e}")
                
    except Exception as e:
        print(f"❌ Schema check failed: {e}")

def test_minimal_upsert():
    """Test with minimal required fields only"""
    try:
        # Try with just user_id first
        minimal_payload = {
            "user_id": "test-debug-user",
            "updated_at": "now()"
        }
        
        result = supabase.table("recruiter_profiles").upsert(
            minimal_payload, on_conflict="user_id"
        ).execute()
        
        print(f"✅ Minimal upsert worked: {result.data}")
        return True
        
    except Exception as e:
        print(f"❌ Minimal upsert failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🔍 Checking recruiter_profiles schema...")
    
    print("\n1. Table schema:")
    check_table_schema()
    
    print("\n2. Testing minimal upsert:")
    test_minimal_upsert()
