"""
Test all imports to find what's failing
"""

print("Testing imports...")

try:
    print("1. Testing config...")
    from config import validate_config, ALLOWED_ORIGINS
    print("✅ Config import: SUCCESS")
except Exception as e:
    print(f"❌ Config import: {e}")

try:
    print("2. Testing services...")
    from services.mysql_services_simple import user_service, recruiter_service, candidate_service, dashboard_service, notification_service, video_service
    print("✅ Services import: SUCCESS")
except Exception as e:
    print(f"❌ Services import: {e}")

try:
    print("3. Testing routers...")
    from routers import auth, applicant_new as applicant, recruiter_new as recruiter, dashboard_new as dashboard, notifications_new as notifications
    print("✅ Routers import: SUCCESS")
except Exception as e:
    print(f"❌ Routers import: {e}")

try:
    print("4. Testing database...")
    from database_minimal import create_tables
    print("✅ Database import: SUCCESS")
except Exception as e:
    print(f"❌ Database import: {e}")

print("Import test complete!")
