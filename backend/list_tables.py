#!/usr/bin/env python3
"""
Check what tables actually exist in the database
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

def list_tables():
    """List all tables in the database"""
    try:
        # Try to get table information
        result = supabase.table("information_schema.tables").select("table_name").eq("table_schema", "public").execute()
        if result.data:
            print("✅ Tables found:")
            for table in result.data:
                print(f"  - {table['table_name']}")
        else:
            print("❌ No tables found or can't access information_schema")
            
        # Alternative: try common table names
        common_tables = ["users", "recruiter_profiles", "candidate_profiles", "jobs", "companies"]
        print("\n🔍 Testing common table names:")
        for table in common_tables:
            try:
                result = supabase.table(table).select("*").limit(1).execute()
                print(f"  ✅ {table} - exists")
            except Exception as e:
                print(f"  ❌ {table} - {str(e)[:50]}...")
                
    except Exception as e:
        print(f"❌ Failed to list tables: {e}")

if __name__ == "__main__":
    print("🔍 Checking Database Tables...")
    list_tables()
