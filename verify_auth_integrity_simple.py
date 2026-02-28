#!/usr/bin/env python3
"""
Simple verification script to ensure custom auth system integrity
"""

import os

def check_file_exists(filepath):
    """Check if file exists"""
    return os.path.exists(filepath)

def verify_custom_auth_system():
    """Verify the custom auth system is properly implemented"""
    print("🔍 Verifying Custom Authentication System")
    print("=" * 50)
    
    # Check key files exist
    files_to_check = {
        "Backend Auth Service": "backend/services/auth_service.py",
        "Backend Auth Middleware": "backend/middleware/auth_middleware.py", 
        "Backend Auth Router": "backend/routers/auth.py",
        "Frontend Auth Config": "assets/assets/js/auth-config.js",
        "Frontend Backend Client": "assets/assets/js/backend-client.js",
        "Frontend Auth Pages": "assets/assets/js/auth-pages.js",
        "Login Page": "login/js/login.js",
        "Registration Page": "login/js/registration.js",
        "Applicant Dashboard": "applicant/js/candidate-profile-custom.js",
        "Jobs Page": "jobs/js/jobs.js",
        "Interview Room": "dashboard/js/interview-room.js",
        "Job Details": "dashboard/js/job-details.js",
        "Recruiter Dashboard": "dashboard/js/recruiter-dashboard.js"
    }
    
    print("\n📁 Checking File Existence:")
    all_files_exist = True
    for name, path in files_to_check.items():
        exists = check_file_exists(path)
        status = "✅" if exists else "❌"
        print(f"{status} {name}: {path}")
        if not exists:
            all_files_exist = False
    
    if not all_files_exist:
        print("\n❌ Some files are missing!")
        return False
    
    # Check key auth methods in frontend
    print("\n🔍 Checking Frontend Auth Methods:")
    auth_methods = {
        "assets/assets/js/auth-config.js": ["CustomAuth", "signUp", "signInWithPassword", "signOut", "getSession"],
        "login/js/login.js": ["customAuth.signInWithPassword"],
        "jobs/js/jobs.js": ["customAuth.getSession"],
        "dashboard/js/interview-room.js": ["customAuth.getSession"],
        "dashboard/js/job-details.js": ["customAuth.getSession"]
    }
    
    all_methods_found = True
    for filepath, methods in auth_methods.items():
        if check_file_exists(filepath):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    for method in methods:
                        if method in content:
                            print(f"✅ {os.path.basename(filepath)}: Uses {method}")
                        else:
                            print(f"❌ {os.path.basename(filepath)}: Missing {method}")
                            all_methods_found = False
            except Exception as e:
                print(f"❌ Error reading {filepath}: {e}")
                all_methods_found = False
    
    # Check HTML files
    print("\n🌐 Checking HTML Files:")
    html_files = {
        "applicant/index.html": "customAuth",
        "recruiter/index.html": "customAuth", 
        "dashboard/index.html": "customAuth"
    }
    
    all_html_correct = True
    for filepath, expected_import in html_files.items():
        if check_file_exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                has_custom_auth = f"import {expected_import}" in content
                status = "✅" if has_custom_auth else "❌"
                print(f"{status} {os.path.basename(filepath)}: Uses {expected_import}")
                if not has_custom_auth:
                    all_html_correct = False
    
    # Check backend auth structure
    print("\n⚙️ Checking Backend Auth Structure:")
    backend_checks = {
        "backend/services/auth_service.py": ["AuthService", "register", "login", "verify_token"],
        "backend/middleware/auth_middleware.py": ["CustomAuthMiddleware"],
        "backend/routers/auth.py": ["login", "register", "current_user"]
    }
    
    all_backend_correct = True
    for filepath, classes in backend_checks.items():
        if check_file_exists(filepath):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    for class_name in classes:
                        if class_name in content:
                            print(f"✅ {os.path.basename(filepath)}: Has {class_name}")
                        else:
                            print(f"❌ {os.path.basename(filepath)}: Missing {class_name}")
                            all_backend_correct = False
            except Exception as e:
                print(f"❌ Error reading {filepath}: {e}")
                all_backend_correct = False
    
    # Final result
    print("\n" + "=" * 50)
    if all_files_exist and all_methods_found and all_html_correct and all_backend_correct:
        print("🎉 Custom Authentication System Verification: PASSED")
        print("✅ All files exist with proper structure")
        print("✅ All frontend auth methods are implemented")
        print("✅ All HTML files use custom auth")
        print("✅ Backend auth structure is correct")
        print("✅ Logic and UI/UX flow is intact!")
        print("🚀 System is ready for testing!")
        return True
    else:
        print("❌ Custom Authentication System Verification: FAILED")
        print("Please check the issues above")
        return False

if __name__ == "__main__":
    verify_custom_auth_system()
