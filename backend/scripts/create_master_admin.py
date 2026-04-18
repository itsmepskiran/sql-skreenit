#!/usr/bin/env python3
"""
Script to create master admin user with proper password hash
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from backend.database import SessionLocal
from backend.services.mysql_service import MySQLService
import bcrypt

def create_master_admin():
    """Create master admin user with email support@skreenit.com"""
    
    # Check if user already exists
    mysql = MySQLService()
    existing_user = mysql.get_single_record("users", {"email": "support@skreenit.com"})
    
    if existing_user:
        print(f"✅ Admin user already exists: {existing_user['email']}")
        print(f"   Role: {existing_user['role']}")
        print(f"   ID: {existing_user['id']}")
        return True
    
    # Generate password hash for 'Skreenit@2024!'
    password = "Skreenit@2024!"
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Create admin user
    admin_data = {
        "email": "support@skreenit.com",
        "password_hash": password_hash,
        "full_name": "Master Admin",
        "role": "admin",
        "onboarded": True,
        "email_confirmed_at": "2024-01-01 00:00:00"
    }
    
    try:
        with SessionLocal() as db:
            # Insert using raw SQL to bypass model validation
            db.execute(
                """INSERT INTO users (
                    id, email, password_hash, full_name, role, 
                    created_at, updated_at, onboarded, email_confirmed_at
                ) VALUES (
                    :id, :email, :password_hash, :full_name, :role,
                    NOW(), NOW(), :onboarded, :email_confirmed_at
                )"""
            , {
                "id": "master-admin-001",
                "email": admin_data["email"],
                "password_hash": admin_data["password_hash"],
                "full_name": admin_data["full_name"],
                "role": admin_data["role"],
                "onboarded": admin_data["onboarded"],
                "email_confirmed_at": admin_data["email_confirmed_at"]
            })
            db.commit()
        
        print("✅ Master admin user created successfully!")
        print(f"   Email: {admin_data['email']}")
        print(f"   Role: {admin_data['role']}")
        print(f"   Password: {password}")
        print(f"   ID: master-admin-001")
        print("\n🔐 IMPORTANT: Store this password securely!")
        print("   This user has access to ALL data in the system.")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create admin user: {str(e)}")
        return False

if __name__ == "__main__":
    create_master_admin()
