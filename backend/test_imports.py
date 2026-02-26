"""
Simple test to isolate the import issue.
"""

print("Testing imports...")

try:
    # Test database_minimal import
    from database_minimal import get_db_session
    print("✅ database_minimal import: SUCCESS")
    
    # Test R2 service import
    from services.r2_service import r2_service
    print("✅ r2_service import: SUCCESS")
    
    # Test services import
    from services.mysql_service_updated import user_service, recruiter_service, candidate_service
    print("✅ mysql_service_updated import: FAILED")
    
    print("\nAll imports tested!")
    
except Exception as e:
    print(f"❌ Import error: {e}")

print("Test complete!")
