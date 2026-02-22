import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load env vars
load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Use SERVICE KEY to bypass RLS for inspection

if not url or not key:
    print("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    exit()

supabase: Client = create_client(url, key)

print("\n🔍 --- DIAGNOSTIC: CHECKING RECRUITER_PROFILES TABLE ---")

try:
    # 1. Try to insert a dummy record to see if columns exist
    # We use a random UUID to avoid conflicts
    dummy_id = "00000000-0000-0000-0000-000000000000"
    
    test_data = {
        "user_id": dummy_id,
        "company_name": "Test Corp",
        "company_website": "https://test.com",
        "contact_name": "Test User",   # <--- The new column
        "contact_email": "test@test.com",
        "location": "Remote",          # <--- The new column
        "about_company": "Checking...",# <--- The mapped column
        "onboarded": False
    }

    print("Attempting to insert test data with new columns...")
    res = supabase.table("recruiter_profiles").upsert(test_data).execute()
    print("✅ SUCCESS: The table HAS all the required columns.")
    
    # Clean up
    supabase.table("recruiter_profiles").delete().eq("user_id", dummy_id).execute()
    print("✅ Cleaned up test record.")

except Exception as e:
    print("\n❌ CRITICAL FAILURE: Your Database is missing columns!")
    print(f"Error Details: {str(e)}")
    
    # Check if table even exists
    try:
        supabase.table("recruiter_profiles").select("count", count="exact").execute()
    except:
        print("⚠️ Warning: The table 'recruiter_profiles' might not exist at all.")
