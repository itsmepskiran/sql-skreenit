#!/usr/bin/env python3
"""
Verification script to ensure custom auth system integrity
"""

import os
import re

def check_file_exists(filepath):
    """Check if file exists"""
    return os.path.exists(filepath)

def check_imports(filepath, expected_imports):
    """Check if expected imports exist in file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            for import_name in expected_imports:
                if f"import {import_name}" not in content:
                    return False, f"Missing import: {import_name}"
        return True, "All imports found"
    except Exception as e:
        return False, f"Error reading file: {e}"

def check_function_exists(filepath, function_name):
    """Check if function exists in file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            if f"async function {function_name}" in content or f"function {function_name}" in content:
                return True, f"Function {function_name} found"
            return False, f"Function {function_name} not found"
    except Exception as e:
        return False, f"Error reading file: {e}"

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
    
    # Check frontend imports
    print("\n🔗 Checking Frontend Imports:")
    frontend_checks = {
        "assets/assets/js/auth-config.js": ["CONFIG"],
        "assets/assets/js/backend-client.js": ["CONFIG", "customAuth"],
        "assets/assets/js/auth-pages.js": ["customAuth", "CONFIG"],
        "login/js/login.js": ["customAuth", "CONFIG"],
        "jobs/js/jobs.js": ["customAuth", "CONFIG"],
        "dashboard/js/interview-room.js": ["customAuth", "CONFIG"],
        "dashboard/js/job-details.js": ["customAuth", "CONFIG"],
        "dashboard/js/recruiter-dashboard.js": ["customAuth", "CONFIG"]
    }
    
    all_imports_correct = True
    for filepath, imports in frontend_checks.items():
        if check_file_exists(filepath):
            success, message = check_imports(filepath, imports)
            status = "✅" if success else "❌"
            print(f"{status} {os.path.basename(filepath)}: {message}")
            if not success:
                all_imports_correct = False
    
    # Check key functions
    print("\n⚙️ Checking Key Functions:")
    function_checks = {
        "assets/assets/js/auth-config.js": ["CustomAuth", "signInWithPassword", "signUp", "signOut"],
        "login/js/login.js": ["handleLogin"],
        "jobs/js/jobs.js": ["fetchJobs", "handleApply"],
        "backend/services/auth_service.py": ["AuthService", "register", "login", "verify_token"]
    }
    
    all_functions_exist = True
    for filepath, functions in function_checks.items():
        if check_file_exists(filepath):
            for func in functions:
                success, message = check_function_exists(filepath, func)
                status = "✅" if success else "❌"
                print(f"{status} {os.path.basename(filepath)}: {message}")
                if not success:
                    all_functions_exist = False
    
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
    
    # Final result
    print("\n" + "=" * 50)
    if all_files_exist and all_imports_correct and all_functions_exist and all_html_correct:
        print("🎉 Custom Authentication System Verification: PASSED")
        print("✅ All files exist with proper structure")
        print("✅ All imports are correct")
        print("✅ All key functions are implemented")
        print("✅ HTML files use custom auth")
        print("✅ System is ready for testing!")
        return True
    else:
        print("❌ Custom Authentication System Verification: FAILED")
        print("Please check the issues above")
        return False

if __name__ == "__main__":
    verify_custom_auth_system()
