#!/usr/bin/env python3
"""
Script to fix all import issues in backend files
"""

import os
import re

def fix_imports():
    """Fix all import issues in backend files"""
    
    # Mapping of old imports to new imports
    import_mappings = {
        'services.auth_service import CustomAuthService': 'services.auth_service import AuthService',
        'services.analytics_service import AnalyticsService': 'services.analytics_service_mysql import AnalyticsService',
        'services.video_service import VideoService': 'services.video_service_mysql import VideoService',
        'services.dashboard_service import DashboardService': 'services.dashboard_service_mysql import DashboardService',
        'services.notification_service import NotificationService': 'services.notification_service_mysql import NotificationService',
        'services.recruiter_service import RecruiterService': 'services.recruiter_service_mysql import RecruiterService',
        'services.applicant_service import ApplicantService': 'services.applicant_service_mysql import ApplicantService'
    }
    
    # Type hint mappings
    type_mappings = {
        'CustomAuthService': 'AuthService',
        'Optional[CustomAuthService]': 'Optional[AuthService]',
    }
    
    # Variable instantiation mappings
    var_mappings = {
        'CustomAuthService()': 'AuthService()',
        '_auth_service: Optional[CustomAuthService]': '_auth_service: Optional[AuthService]',
        'def get_auth_service() -> CustomAuthService': 'def get_auth_service() -> AuthService',
    }
    
    # Files to fix
    files_to_fix = [
        'backend/middleware/auth_middleware.py',
        'backend/routers/auth.py',
        'backend/routers/analytics.py',
        'backend/routers/video.py',
        'backend/routers/dashboard_new.py',
        'backend/routers/notifications_new.py',
        'backend/routers/recruiter_new.py',
        'backend/routers/applicant_new.py'
    ]
    
    for filepath in files_to_fix:
        if not os.path.exists(filepath):
            print(f"⚠️  File not found: {filepath}")
            continue
            
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Fix import statements
            for old_import, new_import in import_mappings.items():
                content = content.replace(old_import, new_import)
            
            # Fix type hints
            for old_type, new_type in type_mappings.items():
                content = content.replace(old_type, new_type)
            
            # Fix variable instantiations
            for old_var, new_var in var_mappings.items():
                content = content.replace(old_var, new_var)
            
            # Write back if changed
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Fixed imports in: {filepath}")
            else:
                print(f"ℹ️  No changes needed for: {filepath}")
                
        except Exception as e:
            print(f"❌ Error fixing {filepath}: {e}")

if __name__ == "__main__":
    print("🔧 Fixing all import issues...")
    fix_imports()
    print("\n🎉 Import fixes complete!")
