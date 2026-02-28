#!/usr/bin/env python3
"""
Script to fix .env file encoding issues
"""

import os
import shutil

def fix_env_encoding():
    """Fix .env file encoding by removing null bytes and saving as UTF-8"""
    env_path = "backend/.env"
    backup_path = "backend/.env.backup"
    
    if not os.path.exists(env_path):
        print("❌ .env file not found")
        return False
    
    try:
        # Create backup
        shutil.copy2(env_path, backup_path)
        print(f"✅ Created backup: {backup_path}")
        
        # Read the file in binary mode to handle null bytes
        with open(env_path, 'rb') as f:
            content_bytes = f.read()
        
        # Remove null bytes and try to decode
        cleaned_bytes = content_bytes.replace(b'\x00', b'')
        
        # Try to decode as UTF-8, if fails try latin-1
        try:
            content_str = cleaned_bytes.decode('utf-8')
        except UnicodeDecodeError:
            content_str = cleaned_bytes.decode('latin-1', errors='ignore')
        
        # Write back as UTF-8
        with open(env_path, 'w', encoding='utf-8') as f:
            f.write(content_str)
        
        print("✅ Fixed .env file encoding")
        print("✅ File saved as UTF-8 without null bytes")
        return True
        
    except Exception as e:
        print(f"❌ Error fixing .env file: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Fixing .env file encoding...")
    if fix_env_encoding():
        print("\n🎉 .env file encoding fixed successfully!")
        print("You can now run: python main.py")
    else:
        print("\n❌ Failed to fix .env file encoding")
        print("Please manually edit the .env file and save it as UTF-8")
