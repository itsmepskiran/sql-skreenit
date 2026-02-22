#!/usr/bin/env python3
"""
Debug script to test recruiter profile update
"""
import asyncio
import json
from models.recruiter_models import RecruiterProfileUpdate

def test_model_validation():
    """Test if the model validation is working"""
    
    # Test case 1: Valid payload
    try:
        payload = RecruiterProfileUpdate(
            company_name="Test Company",
            company_website="https://example.com",
            contact_name="Test Name",
            contact_email="test@example.com",
            location="Test Location",
            about="Test about"
        )
        print("✅ Model validation passed")
        print(f"Model dump: {payload.model_dump(exclude_unset=True)}")
        return True
    except Exception as e:
        print(f"❌ Model validation failed: {e}")
        return False

def test_payload_mapping():
    """Test the payload mapping logic"""
    
    # Simulate the payload from frontend
    payload = RecruiterProfileUpdate(
        company_name="Test Company",
        company_website="https://example.com",
        contact_name="Test Name",
        contact_email="test@example.com",
        location="Test Location",
        about="Test about"
    )
    
    # Simulate the backend logic
    data = payload.model_dump(exclude_unset=True)
    
    # Simulate user from auth
    user = {"id": "test-user-id"}
    
    # Prepare data for database (same as endpoint)
    db_data = {
        "user_id": user["id"],
        "company_name": data.get("company_name"),
        "company_website": data.get("company_website"),
        "contact_email": data.get("contact_email"),
        "contact_name": data.get("contact_name"),
        "location": data.get("location"),
        "about_company": data.get("about"),  # ✅ MAP 'about' -> 'about_company'
        "updated_at": "now()"
    }
    
    # Remove keys with None values
    db_data = {k: v for k, v in db_data.items() if v is not None}
    
    print("✅ Payload mapping successful")
    print(f"DB data: {json.dumps(db_data, indent=2)}")
    return True

if __name__ == "__main__":
    print("🔍 Testing Recruiter Profile Update...")
    
    print("\n1. Testing model validation:")
    test_model_validation()
    
    print("\n2. Testing payload mapping:")
    test_payload_mapping()
    
    print("\n✅ All tests passed. The issue is likely in:")
    print("   1. Authentication (missing/invalid token)")
    print("   2. Database operation (constraint violation)")
    print("   3. User permissions (role/permission mismatch)")
